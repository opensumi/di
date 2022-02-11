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
  ParameterOpts,
  Domain,
  Tag,
  IHookStore,
  IValidAspectHook,
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

    const selfProvider = {
      token: INJECTOR_TOKEN,
      useValue: this,
    };
    this.addProviders(selfProvider, ...providers);
  }

  createChild(providers: Provider[] = [], opts: InjectorOpts = {}) {
    const injector = new Injector(providers, { ...this.opts, ...opts }, this);

    if (opts.dropdownForTag) {
      for (const [token, creator] of this.creatorMap.entries()) {
        if (creator.dropdownForTag && opts.tag === creator.tag && !injector.creatorMap.has(token)) {
          injector.creatorMap.set(token, creator);

          const targetTokenMap = injector.tagMatrix.get(creator.tag!) || new Map<Token, Token>();
          const currentTokenMap = this.tagMatrix.get(creator.tag!);
          for (const [key, value] of currentTokenMap!.entries()) {
            targetTokenMap.set(key, value);
          }
          injector.tagMatrix.set(creator.tag!, targetTokenMap);
        }
      }
    }

    return injector;
  }

  get<T extends ConstructorOf<any>>(token: T, args?: ConstructorParameters<T>, opts?: InstanceOpts): TokenResult<T>;
  get<T extends Token>(token: T, opts?: InstanceOpts): TokenResult<T>;
  get<T extends Token>(
    token: T,
    args?: InstanceOpts | ConstructorParameters<any>,
    opts?: InstanceOpts,
  ): TokenResult<T> {
    if (!Array.isArray(args)) {
      opts = args;
      args = undefined;
    }

    let creator: InstanceCreator | null = null;
    let injector: Injector = this;

    // 如果传递了 args 参数，一定是对 class 进行多例创建
    if (args) {
      if (!isTypeProvider(token)) {
        throw InjectorError.classTokenOnly(token);
      }

      // 此时一定是使用多例配置
      opts = {
        ...opts,
        multiple: true,
      };

      // 尝试直接从当前已有的实现去解析创建器，且 injector 一直使用当前上下文
      [creator] = this.getCreator(token);

      // FIXME: 下一个大版本 breaking change，不允许非 Injectable 的 Class 当做 Token
      if (!creator) {
        creator = {
          opts: {},
          parameters: [],
          useClass: token,
        };
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
    return this.createInstance(creator, token, injector, opts, args as ConstructorParameters<any>);
  }

  getFromDomain(...domains: Domain[]) {
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
        return opt.hasOwnProperty('default');
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
    if (instance && typeof instance[key] === 'function') {
      instance[key]();
    }

    creator.instance = undefined;
    creator.status = CreatorStatus.init;
  }

  disposeAll(key = 'dispose') {
    const creatorMap = this.creatorMap;
    const toDisposeInstances = new Set<any>();

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
      instance[key]();
    }
  }

  protected getTagToken(token: Token, tag: Tag): Token | undefined | null {
    const tokenMap: Map<Token, Token> = this.tagMatrix.get(tag) || new Map();

    if (tokenMap.has(token)) {
      return tokenMap.get(token);
    } else if (this.parent) {
      return this.parent.getTagToken(token, tag);
    } else {
      return null;
    }
  }

  private setProviders(providers: Provider[], opts: AddProvidersOpts = {}) {
    for (const provider of providers) {
      const originToken = Helper.parseTokenFromProvider(provider);
      const tag = Helper.parseTagFromProvider(provider);
      const token = Helper.hasTag(provider) ? this.exchangeToken(originToken, provider.tag) : originToken;
      const current = opts.deep ? this.getCreator(token)[0] : this.creatorMap.get(token);

      const isOverride = [
        // 先判断 provider 是否有 override 定义
        () => (Helper.isTypeProvider(provider) ? false : provider.override),
        // 判断这是否是一次 override 强制行为
        () => opts.override,
        // 如果没有当前 provider 或者当前值是默认对象，执行覆盖
        () => !current || current.isDefault,
      ].some((fn) => fn());

      if (isOverride) {
        const creator = Helper.parseCreatorFromProvider(provider);
        this.creatorMap.set(token, creator);

        if (isClassCreator(creator)) {
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
    const creator = this.creatorMap.get(token) || null;
    if (creator) {
      return [creator, this];
    }

    if (this.parent) {
      return this.parent.getCreator(token);
    }

    return [null, this];
  }

  private createInstance(
    creator: InstanceCreator,
    token: Token,
    ctx: Injector,
    defaultOpts?: InstanceOpts,
    args?: any[],
  ) {
    if (creator.dropdownForTag && creator.tag !== this.tag) {
      throw InjectorError.tagOnlyError(String(creator.tag), String(this.tag));
    }

    // ClassCreator 的时候，需要进行多例状态判断
    if (Helper.isClassCreator(creator)) {
      const opts = defaultOpts ?? creator.opts;
      if (!opts.multiple && creator.status === CreatorStatus.done) {
        return creator.instance;
      }

      return this.createInstanceFromClassCreator(creator, token, ctx, opts, args);
    }

    if (Helper.isFactoryCreator(creator)) {
      return applyHooks(creator.useFactory(this), token, this.hookStore);
    }

    // 此时一定是 ValueCreator，不适用 Hook
    return creator.instance;
  }

  private createInstanceFromClassCreator(
    creator: ClassCreator,
    token: Token,
    injector: Injector,
    opts: InstanceOpts,
    defaultArgs?: any[],
  ) {
    const cls = creator.useClass;
    const currentStatus = creator.status;

    // 如果尝试去创建一个正在创建的对象，一定是循环依赖导致的
    if (currentStatus === CreatorStatus.creating) {
      throw InjectorError.circularError(cls);
    }

    creator.status = CreatorStatus.creating;

    try {
      const args = defaultArgs ?? this.getParameters(creator.parameters);
      const instance = this.createInstanceWithInjector(cls, token, injector, args);
      creator.status = CreatorStatus.init;

      // 如果不是多例配置，那么默认是单例配置
      if (!opts.multiple) {
        creator.status = CreatorStatus.done;
        creator.instance = instance;
      }

      return instance;
    } catch (e) {
      // 如果创建对象的过程中发生了异常，把状态回滚
      creator.status = currentStatus;
      throw e;
    }
  }

  private getParameters(parameters: ParameterOpts[]) {
    return parameters.map((opts) => {
      const [creator, injector] = this.getCreator(opts.token);
      if (creator) {
        return this.createInstance(creator, opts.token, injector);
      }

      if (!creator && opts.hasOwnProperty('default')) {
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
