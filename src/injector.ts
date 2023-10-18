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
  IDisposable,
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
import { EventEmitter } from './helper/event';

export class Injector {
  id = Helper.createId('Injector');

  depth = 0;
  tag?: string;
  hookStore: IHookStore;
  parent?: Injector;

  private tagMatrix = new Map<Tag, Map<Token, Token>>();
  private domainMap = new Map<Domain, Token[]>();
  creatorMap = new Map<Token, InstanceCreator>();
  instanceRefMap = new Map<any, string>();

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

    let creator: InstanceCreator | null = null;
    let injector: Injector = this;

    // If user passed the args parameter, he want to instantiate the class
    if (args) {
      // At this time, it must not be singleton
      opts = {
        ...opts,
        multiple: true,
      };
      // here we do not use the parsed injector(the second return value of `getCreator`)
      [creator] = this.getCreator(token);

      if (!creator) {
        // if there is no specific Creator, then:
        // 1. if token is a Class, we also allow the not-Injectable Class as Token, we just instantiate this Class
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
      // firstly, use tag to exchange token
      if (opts && Helper.hasTag(opts)) {
        const tagToken = this.exchangeToken(token, opts.tag);
        [creator, injector] = this.getCreator(tagToken);
      }

      // if there is no Creator, then use the token to find the Creator
      if (!creator) {
        [creator, injector] = this.getCreator(token);
      }

      // if in non-strict mode, parse dependencies and providers automatically when get
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

  private getTokenForDomain(domain: Domain): Token[] {
    let tokens = this.domainMap.get(domain) || [];
    if (this.parent) {
      tokens = tokens.concat(this.parent.getTokenForDomain(domain));
    }
    return tokens;
  }

  getFromDomain<T = any>(...domains: Domain[]): Array<T> {
    const tokenSet = new Set<Token>();

    for (const domain of domains) {
      const arr = this.getTokenForDomain(domain);
      arr.forEach((item) => tokenSet.add(item));
    }

    const tokens = Array.from(tokenSet);
    return tokens.map((token) => this.get(token));
  }

  /**
   * Only check this injector whether has the singleton instance.
   */
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

    // make sure all dependencies have corresponding providers
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

  private instanceDisposedEmitter = new EventEmitter<string>();

  onceInstanceDisposed(instance: any, cb: () => void) {
    const instanceId = this.getInstanceId(instance);
    if (!instanceId) {
      return;
    }
    return this.instanceDisposedEmitter.once(instanceId, cb);
  }

  disposeOne(token: Token, key = 'dispose') {
    const [creator] = this.getCreator(token);
    if (!creator || creator.status === CreatorStatus.init) {
      return;
    }

    const instance = creator.instance;
    const instanceId = this.getInstanceId(instance);
    this.instanceRefMap.delete(instance);

    let maybePromise: Promise<unknown> | undefined;
    if (instance && typeof instance[key] === 'function') {
      maybePromise = instance[key]();
    }

    creator.instance = undefined;
    creator.status = CreatorStatus.init;

    if (maybePromise && Helper.isPromiseLike(maybePromise)) {
      maybePromise = maybePromise.then(() => {
        instanceId && this.instanceDisposedEmitter.emit(instanceId);
      });
    } else {
      instanceId && this.instanceDisposedEmitter.emit(instanceId);
    }
    return maybePromise;
  }

  disposeAll(key = 'dispose'): Promise<void> {
    const creatorMap = this.creatorMap;

    const promises: (Promise<unknown> | undefined)[] = [];

    for (const token of creatorMap.keys()) {
      promises.push(this.disposeOne(token, key));
    }

    return Promise.all(promises).finally(() => {
      this.instanceDisposedEmitter.dispose();
    }) as unknown as Promise<void>;
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
      const current = opts.deep ? this.getCreator(token)[0] : this.resolveToken(token)[1];

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
        // use effect to Make sure there are no cycles
        void this.resolveToken(token);

        if (isClassCreator(creator)) {
          const domain = creator.opts.domain;
          if (domain) {
            const domains = Array.isArray(domain) ? domain : [domain];
            this.addToDomain(domains, token);
          }
          if (isAspectCreator(creator)) {
            const hookMetadata = getHookMeta(creator.useClass);
            let toDispose: IDisposable | undefined;
            let instance: any;
            const getInstance = () => {
              if (!instance) {
                instance = this.get(creator.useClass);
                this.onceInstanceDisposed(instance, () => {
                  if (toDispose) {
                    toDispose.dispose();
                    toDispose = undefined;
                  }
                  instance = undefined;
                  // remove the aspect creator when the instance is disposed
                  this.creatorMap.delete(creator.useClass);
                });
              }

              return instance;
            };

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
            toDispose = this.hookStore.createHooks(preprocessedHooks);
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

  private instanceIdGenerator = Helper.createIdFactory('Instance');
  private getNextInstanceId() {
    return this.instanceIdGenerator.create();
  }

  private resolveToken(token: Token): [Token, InstanceCreator | undefined] {
    let creator = this.creatorMap.get(token);

    const paths = [token];

    while (creator && isAliasCreator(creator)) {
      token = creator.useAlias;

      if (paths.includes(token)) {
        throw InjectorError.aliasCircularError(paths, token);
      }
      paths.push(token);
      creator = this.creatorMap.get(token);
    }

    return [token, creator];
  }

  private getCreator(token: Token): [InstanceCreator | null, Injector] {
    const creator: InstanceCreator | undefined = this.resolveToken(token)[1];

    if (creator) {
      return [creator, this];
    }

    if (this.parent) {
      return this.parent.getCreator(token);
    }

    return [null, this];
  }

  private getOrSaveInstanceId(instance: any, id: string) {
    if (this.instanceRefMap.has(instance)) {
      return this.instanceRefMap.get(instance)!;
    }
    this.instanceRefMap.set(instance, id);
    return id;
  }

  private createInstance(ctx: Context, defaultOpts?: InstanceOpts, args?: any[]) {
    const { creator, token } = ctx;

    if (creator.dropdownForTag && creator.tag !== this.tag) {
      throw InjectorError.tagOnlyError(String(creator.tag), String(this.tag));
    }

    if (Helper.isClassCreator(creator)) {
      const opts = defaultOpts ?? creator.opts;
      // if a class creator is singleton, and the instance is already created, return the instance.
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
      const nextId = this.getNextInstanceId();
      const instance = this.createInstanceWithInjector(cls, token, injector, args, nextId);
      void this.getOrSaveInstanceId(instance, nextId);
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

  private createInstanceWithInjector(
    cls: ConstructorOf<any>,
    token: Token,
    injector: Injector,
    args: any[],
    id: string,
  ) {
    // when creating an instance, set injector to prototype, so that the constructor can access it.
    // after creating the instance, remove the injector from prototype to prevent memory leaks.
    setInjector(cls.prototype, injector);
    const ret = new cls(...args);
    removeInjector(cls.prototype);

    // mount injector on the instance, so that the inner object can access the injector in the future.
    setInjector(ret, injector);
    Object.assign(ret, {
      __id: id,
      __injectorId: injector.id,
    });

    return applyHooks(ret, token, this.hookStore);
  }

  getInstanceId(instance: any) {
    return this.instanceRefMap.get(instance);
  }
}
