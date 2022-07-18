import * as Helper from './helper';
import * as InjectorError from './error';
import {
  INJECTOR_TOKEN,
  Provider,
  Token,
  InstanceCreator,
  CreatorStatus,
  TokenResult,
  InstanceOpts,
  ConstructorOf,
  ClassCreator,
  InjectorOpts,
  AddProvidersOpts,
  Domain,
  Tag,
  IHookStore,
  IValidAspectHook,
  Context,
  ParameterOpts,
} from './declare';
import {
  isClassCreator,
  setInjector,
  removeInjector,
  isTypeProvider,
  applyHooks,
  HookStore,
  isAspectCreator,
  getHookMeta,
  isAliasCreator,
} from './helper';

export class Injector {
  id = Helper.createId('Injector');
  creatorMap = new Map<Token, InstanceCreator>();
  depth = 0;
  tag?: string;
  hookStore: IHookStore;
  parent?: Injector;

  private tagMatrix = new Map<Tag, Map<Token, Token>>();
  private domainMap = new Map<string | symbol, Token[]>();
  private opts: InjectorOpts;

  constructor(providers: Provider[] = [], opts: InjectorOpts = {}, parent?: Injector) {
    this.opts = opts;
    this.tag = opts.tag;

    if (parent) {
      this.parent = parent;
      this.depth = parent.depth + 1;
      this.hookStore = new HookStore(this.parent.hookStore);
    } else {
      this.hookStore = new HookStore();
    }

    this.addProviders(
      {
        token: INJECTOR_TOKEN,
        useValue: this,
      },
      ...providers,
    );
  }

  createChild(providers: Provider[] = [], opts: InjectorOpts = {}): InstanceType<ConstructorOf<this>> {
    const injector = new (this.constructor as ConstructorOf<this>)(providers, { ...this.opts, ...opts }, this);

    if (opts.dropdownForTag) {
      for (const [token, creator] of this.creatorMap.entries()) {
        if (creator.dropdownForTag && creator.tag && opts.tag === creator.tag && !injector.creatorMap.has(token)) {
          injector.creatorMap.set(token, creator);

          const targetTokenMap = injector.tagMatrix.get(creator.tag) || new Map<Token, Token>();
          const currentTokenMap = this.tagMatrix.get(creator.tag);
          if (currentTokenMap) {
            for (const [key, value] of currentTokenMap.entries()) {
              targetTokenMap.set(key, value);
            }
          }
          injector.tagMatrix.set(creator.tag, targetTokenMap);
        }
      }
    }

    return injector;
  }

  /**
   * If the token is an alias, find the finally token
   */
  resolveAliasToken<T extends Token>(token: T) {
    let [aliasCreator] = this.getCreator(token);

    while (aliasCreator && isAliasCreator(aliasCreator)) {
      token = aliasCreator.useAlias as T;

      [aliasCreator] = this.getCreator(token);
    }

    return token;
  }

  get<T extends ConstructorOf<any>>(token: T, args?: ConstructorParameters<T>, opts?: InstanceOpts): TokenResult<T>;
  get<T extends Token>(token: T, opts?: InstanceOpts): TokenResult<T>;
  get<T extends Token, K extends ConstructorOf<any> = ConstructorOf<any>>(
    token: T,
    opts?: ConstructorParameters<K>,
  ): TokenResult<T>;
  get<T extends Token, K extends ConstructorOf<any> = ConstructorOf<any>>(
    token: T,
    args?: InstanceOpts | ConstructorParameters<K>,
    opts?: InstanceOpts,
  ): TokenResult<T> {
    if (!Array.isArray(args)) {
      opts = args;
      args = undefined;
    }

    token = this.resolveAliasToken(token);

    let creator: InstanceCreator | null = null;
    let injector: Injector = this;

    // 如果传递了 args 参数，一定是对 class 进行多例创建
    if (args) {
      // 此时一定是使用多例配置
      opts = {
        ...opts,
        multiple: true,
      };

      // 尝试直接从当前已有的实现去解析创建器，且 injector 一直使用当前上下文
      [creator] = this.getCreator(token);

      if (!creator) {
        // 如果没有找到 Creator，那么：
        // 1. 该 Class 没有使用 Injectable 注解
        //    我们也允许非 Injectable 的 Class 当做 Token，直接实例化该 Class
        if (isTypeProvider(token)) {
          creator = {
            opts: {},
            parameters: [],
            useClass: token,
          };
        } else {
          throw InjectorError.noProviderError(token);
        }
      }
    } else {
      // 首先用 Tag 去置换 Token 进行对象实例化
      if (opts && Helper.hasTag(opts)) {
        const tagToken = this.exchangeToken(token, opts.tag);
        [creator, injector] = this.getCreator(tagToken);
      }

      // 如果没有得到创建器，就从单纯的 Token 去查找创建器
      if (!creator) {
        [creator, injector] = this.getCreator(token);
      }

      // 非严格模式下，会自动在 get 的时候去解析依赖和 provider
      if (isTypeProvider(token) && !creator && !this.opts.strict) {
        this.parseDependencies(token);
        [creator, injector] = this.getCreator(token);
      }
    }

    if (!creator) {
      throw InjectorError.noProviderError(token);
    }

    const ctx = {
      token,
      creator,
      injector,
    } as Context<InstanceCreator>;

    return this.createInstance(ctx, opts, args as ConstructorParameters<K>);
  }

  getFromDomain<T = any>(...domains: Domain[]): Array<T> {
    const tokenSet = new Set<any>();

    for (const domain of domains) {
      const arr = this.domainMap.get(domain) || [];
      arr.forEach((item) => tokenSet.add(item));
    }

    const tokens = Array.from(tokenSet);
    return tokens.map((token) => this.get(token));
  }

  hasInstance(instance: any) {
    for (const creator of this.creatorMap.values()) {
      if (creator.instance === instance) {
        return true;
      }
    }

    return false;
  }

  addProviders(...providers: Provider[]) {
    this.setProviders(providers);
  }

  overrideProviders(...providers: Provider[]) {
    this.setProviders(providers, { override: true });
  }

  parseDependencies(...targets: Token[]) {
    const deepDeps: Token[] = Helper.getAllDeps(...targets);
    const allDeps = targets.concat(deepDeps);
    const providers = Helper.uniq(allDeps.filter(Helper.isInjectableToken));
    this.setProviders(providers, { deep: true });

    const defaultProviders = Helper.flatten(
      providers.map((p) => {
        return Helper.getParameterOpts(p);
      }),
    )
      .filter((opt) => {
        return Object.prototype.hasOwnProperty.call(opt, 'default');
      })
      .map((opt) => ({
        isDefault: true,
        token: opt.token,
        useValue: opt.default,
      }));

    this.setProviders(defaultProviders, { deep: true });

    // 确保所有的依赖都有对应的 Provider
    const notProvidedDeps = allDeps.filter((d) => !this.getCreator(d)[0]);
    if (notProvidedDeps.length) {
      throw InjectorError.noProviderError(...notProvidedDeps);
    }
  }

  exchangeToken(token: Token, tag: Tag) {
    const current = this.getTagToken(token, tag);
    if (current) {
      return current;
    }

    const tokenMap: Map<Token, Token> = this.tagMatrix.get(tag) || new Map();
    const tagToken = Symbol(tag);
    tokenMap.set(token, tagToken);
    this.tagMatrix.set(tag, tokenMap);
    return tagToken;
  }

  createHooks(hooks: IValidAspectHook[]) {
    return this.hookStore.createHooks(hooks);
  }

  createHook<ThisType, Args extends any[], Result>(hook: IValidAspectHook<ThisType, Args, Result>) {
    return this.hookStore.createOneHook(hook);
  }

  disposeOne(token: Token, key = 'dispose') {
    const creator = this.creatorMap.get(token);
    if (!creator || creator.status === CreatorStatus.init) {
      return;
    }

    const instance = creator.instance;
    let maybePromise: Promise<unknown> | undefined;
    if (instance && typeof instance[key] === 'function') {
      maybePromise = instance[key]();
    }

    creator.instance = undefined;
    creator.status = CreatorStatus.init;
    return maybePromise;
  }

  disposeAll(key = 'dispose') {
    const creatorMap = this.creatorMap;
    const toDisposeInstances = new Set<any>();

    const promises: Promise<unknown>[] = [];

    // 还原对象状态
    for (const creator of creatorMap.values()) {
      const instance = creator.instance;

      if (creator.status === CreatorStatus.done) {
        if (instance && typeof instance[key] === 'function') {
          toDisposeInstances.add(instance);
        }

        creator.instance = undefined;
        creator.status = CreatorStatus.init;
      }
    }

    // 执行销毁函数
    for (const instance of toDisposeInstances) {
      const maybePromise = instance[key]();
      if (maybePromise) {
        promises.push(maybePromise);
      }
    }

    return Promise.all(promises);
  }

  protected getTagToken(token: Token, tag: Tag): Token | undefined | null {
    const tokenMap = this.tagMatrix.get(tag);

    if (tokenMap && tokenMap.has(token)) {
      return tokenMap.get(token);
    } else if (this.parent) {
      return this.parent.getTagToken(token, tag);
    }

    return null;
  }

  private setProviders(providers: Provider[], opts: AddProvidersOpts = {}) {
    for (const provider of providers) {
      const originToken = Helper.parseTokenFromProvider(provider);
      const token = Helper.hasTag(provider) ? this.exchangeToken(originToken, provider.tag) : originToken;
      const current = opts.deep ? this.getCreator(token)[0] : this.creatorMap.get(token);

      const shouldBeSet = [
        // use provider's override attribute.
        Helper.isTypeProvider(provider) ? false : provider.override,
        // use opts.override. The user explicitly call `overrideProviders`.
        opts.override,
        // if this token do not have corresponding creator, use override
        // if the creator is default(it is a fallback value), it means we can override it.
        !current || current.isDefault,
      ].some(Boolean);

      if (shouldBeSet) {
        const creator = Helper.parseCreatorFromProvider(provider);

        this.creatorMap.set(token, creator);
        if (isAliasCreator(creator)) {
          // Make sure there are no cycles
          const paths = [token, creator.useAlias];
          let [aliasCreator] = this.getCreator(creator.useAlias);

          while (aliasCreator && isAliasCreator(aliasCreator)) {
            if (paths.includes(aliasCreator.useAlias)) {
              throw InjectorError.aliasCircularError(paths, aliasCreator.useAlias);
            }
            paths.push(aliasCreator.useAlias);
            [aliasCreator] = this.getCreator(aliasCreator.useAlias);
          }
        } else if (isClassCreator(creator)) {
          const domain = creator.opts.domain;
          if (domain != null) {
            const domains = Array.isArray(domain) ? domain : [domain];
            this.addToDomain(domains, token);
          }
          if (isAspectCreator(creator)) {
            const hookMetadata = getHookMeta(creator.useClass);
            const getInstance = () => this.get(token);
            const preprocessedHooks: IValidAspectHook[] = hookMetadata.map((metadata) => {
              const wrapped = (...args: any[]) => {
                const instance = getInstance();
                return instance[metadata.prop].call(instance, ...args);
              };
              return {
                awaitPromise: metadata.options.await,
                hook: wrapped,
                method: metadata.targetMethod,
                target: metadata.target,
                type: metadata.type,
              };
            });
            this.hookStore.createHooks(preprocessedHooks);
          }
        }
      }
    }
  }

  private addToDomain(domains: Domain[], token: Token) {
    for (const domain of domains) {
      const tokens = this.domainMap.get(domain) || [];
      tokens.push(token);
      this.domainMap.set(domain, tokens);
    }
  }

  private getCreator(token: Token): [InstanceCreator | null, Injector] {
    const creator = this.creatorMap.get(token);
    if (creator) {
      return [creator, this];
    }

    if (this.parent) {
      return this.parent.getCreator(token);
    }

    return [null, this];
  }

  private createInstance(ctx: Context, defaultOpts?: InstanceOpts, args?: any[]) {
    const { creator, token } = ctx;

    if (creator.dropdownForTag && creator.tag !== this.tag) {
      throw InjectorError.tagOnlyError(String(creator.tag), String(this.tag));
    }

    // ClassCreator 的时候，需要进行多例状态判断
    if (Helper.isClassCreator(creator)) {
      const opts = defaultOpts ?? creator.opts;
      if (!opts.multiple && creator.status === CreatorStatus.done) {
        return creator.instance;
      }

      return this.createInstanceFromClassCreator(ctx as Context<ClassCreator>, opts, args);
    }

    if (Helper.isFactoryCreator(creator)) {
      return applyHooks(creator.useFactory(this), token, this.hookStore);
    }

    // must be ValueCreator, no need to hook.
    return creator.instance;
  }

  private createInstanceFromClassCreator(ctx: Context<ClassCreator>, opts: InstanceOpts, defaultArgs?: any[]) {
    const { creator, token, injector } = ctx;

    const cls = creator.useClass;
    const currentStatus = creator.status;

    // If you try to create an instance whose status is creating, it must be caused by circular dependencies.
    if (currentStatus === CreatorStatus.creating) {
      throw InjectorError.circularError(cls, ctx);
    }

    creator.status = CreatorStatus.creating;

    try {
      const args = defaultArgs ?? this.getParameters(creator.parameters, ctx);
      const instance = this.createInstanceWithInjector(cls, token, injector, args);
      creator.status = CreatorStatus.init;

      // if not allow multiple, save the instance in creator.
      if (!opts.multiple) {
        creator.status = CreatorStatus.done;
        creator.instance = instance;
      }

      return instance;
    } catch (e) {
      // rollback the status if exception occurs
      creator.status = currentStatus;
      throw e;
    }
  }

  private getParameters(parameters: ParameterOpts[], state: Context<InstanceCreator>) {
    return parameters.map((opts) => {
      const [creator, injector] = this.getCreator(opts.token);

      if (creator) {
        return this.createInstance(
          {
            injector,
            creator,
            token: opts.token,
            parent: state,
          },
          undefined,
          undefined,
        );
      }

      if (!creator && Object.prototype.hasOwnProperty.call(opts, 'default')) {
        return opts.default;
      }
      throw InjectorError.noProviderError(opts.token);
    });
  }

  private createInstanceWithInjector(cls: ConstructorOf<any>, token: Token, injector: Injector, args: any[]) {
    // 在创建对象的过程中，先把 injector 挂载到 prototype 上，让构造函数能够访问
    // 创建完实例之后从 prototype 上去掉 injector，防止内存泄露
    setInjector(cls.prototype, injector);
    const ret = new cls(...args);
    removeInjector(cls.prototype);

    // 在实例上挂载 injector，让以后的对象内部都能访问到 injector
    setInjector(ret, injector);
    Object.assign(ret, {
      __id: Helper.createId('Instance'),
      __injectorId: injector.id,
    });

    return applyHooks(ret, token, this.hookStore);
  }
}
