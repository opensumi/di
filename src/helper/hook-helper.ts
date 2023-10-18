import 'reflect-metadata';
import {
  IHookStore,
  IDisposable,
  Token,
  IHookMap,
  MethodName,
  ClassCreator,
  IBeforeJoinPoint,
  IJoinPoint,
  HookType,
  IBeforeAspectHook,
  IAfterThrowingAspectHook,
  IAfterReturningAspectHook,
  IAroundAspectHook,
  IAfterAspectHook,
  IAfterJoinPoint,
  IAroundJoinPoint,
  IValidAspectHook,
  IHookOptions,
  IAfterReturningJoinPoint,
  IAfterThrowingJoinPoint,
  IInstanceHooks,
} from '../declare';
import compose, { Middleware } from './compose';

export const HOOKED_SYMBOL = Symbol('COMMON_DI_HOOKED');

export function applyHooks<T = any>(instance: T, token: Token, hooks: IHookStore): T {
  if (typeof instance !== 'object') {
    // Only object can be hook.
    return instance;
  }
  if (!hooks.hasHooks(token)) {
    return instance;
  }

  // One disadvantage of using a proxy is that it can be difficult to intercept certain methods
  // that are defined using bound functions.
  //
  // If the methods of a class defined using a bound function such as a = () => this.b() are used,
  // the b() function cannot be intercepted correctly.
  const hookedCache: Map<MethodName, any> = new Map();
  const proxy = new Proxy(instance as any, {
    get: (target, prop) => {
      if (prop === HOOKED_SYMBOL) {
        return true;
      }
      const raw = target[prop];
      if (typeof raw === 'function' && hooks.getHooks(token, prop).length > 0) {
        if (!hookedCache.has(prop)) {
          hookedCache.set(prop, createHookedFunction(prop, raw, hooks.getHooks(token, prop)));
        }
        return hookedCache.get(prop);
      }
      return raw;
    },
  });

  return proxy;
}

/**
 * To use hooks to assemble a final wrapped function
 * @param rawMethod the original method
 * @param hooks hooks
 */
export function createHookedFunction<ThisType, Args extends any[], Result>(
  methodName: MethodName,
  rawMethod: (...args: Args) => Result,
  hooks: Array<IValidAspectHook<ThisType, Args, Result>>,
): (...args: Args) => Result {
  const beforeHooks: Array<IBeforeAspectHook<ThisType, Args, Result>> = [];
  const afterHooks: Array<IAfterAspectHook<ThisType, Args, Result>> = [];
  const aroundHooks: Array<IAroundAspectHook<ThisType, Args, Result>> = [];
  const afterReturningHooks: Array<IAfterReturningAspectHook<ThisType, Args, Result>> = [];
  const afterThrowingHooks: Array<IAfterThrowingAspectHook<ThisType, Args, Result>> = [];
  // Onion model
  hooks.forEach((h) => {
    if (isBeforeHook(h)) {
      // for the "before hook", the first one to come is executed first.
      beforeHooks.push(h);
    } else if (isAfterHook(h)) {
      // For the "after hook", the one that comes later is executed first.
      afterHooks.unshift(h);
    } else if (isAroundHook(h)) {
      // For the "around hook", the one that comes later is executed first.
      aroundHooks.unshift(h);
    } else if (isAfterReturningHook(h)) {
      afterReturningHooks.push(h);
    } else if (isAfterThrowingHook(h)) {
      afterThrowingHooks.push(h);
    }
  });

  return function (this: any, ...args: Args) {
    let promise: Promise<any> | undefined | void;
    let ret: Result = undefined as any;
    let error: Error | undefined;
    const self = this;
    const originalArgs: Args = args;

    try {
      promise = runAroundHooks();

      if (promise) {
        // If there is one hook that is asynchronous, convert all of them to asynchronous.
        promise = promise.then(() => {
          return ret;
        });
        return promise as any;
      } else {
        return ret;
      }
    } catch (e) {
      error = e as Error;
      runAfterThrowing();
      throw e;
    } finally {
      if (error) {
        // noop
      } else {
        // 异步逻辑
        let p: Promise<Result> | undefined;
        if (promise) {
          p = promise;
        }

        if (p) {
          // p is a promise, use Promise's reject and resolve at this time
          p.then(
            () => {
              runAfterReturning();
            },
            (e) => {
              error = e;
              runAfterThrowing();
            },
          );
        } else {
          runAfterReturning();
        }
      }
    }

    function runAroundHooks(): Promise<void> | void {
      const hooks = aroundHooks.map((v) => {
        const fn = v.hook as Middleware<IAroundJoinPoint<ThisType, Args, Result>>;
        return fn;
      });
      const composed = compose<IAroundJoinPoint<ThisType, Args, Result>>(hooks);

      const aroundJoinPoint: IAroundJoinPoint<ThisType, Args, Result> = {
        getArgs: () => {
          return args;
        },
        getMethodName: () => {
          return methodName;
        },
        getOriginalArgs: () => {
          return originalArgs;
        },
        getResult: () => {
          return ret;
        },
        getThis: () => {
          return self;
        },
        setArgs: (_args: Args) => {
          args = _args;
        },
        setResult: (_ret: Result) => {
          ret = _ret;
        },
        proceed: () => {
          const maybePromise = wrapped();
          if (maybePromise && isPromiseLike(maybePromise)) {
            return maybePromise.then(() => Promise.resolve());
          }
        },
      };

      return composed(aroundJoinPoint);
    }

    function runBeforeHooks(): Promise<void> | undefined {
      if (beforeHooks.length === 0) {
        return;
      }
      let _inThisHook = true;
      const beforeJointPont: IBeforeJoinPoint<ThisType, Args, Result> = {
        getArgs: () => {
          return args;
        },
        getMethodName: () => {
          return methodName;
        },
        getOriginalArgs: () => {
          return originalArgs;
        },
        getThis: () => {
          return self;
        },
        setArgs: (_args: Args) => {
          if (!_inThisHook) {
            throw new Error('It is not allowed to set the parameters after the Hook effect time is over');
          }
          args = _args;
        },
      };

      return runHooks(beforeHooks, beforeJointPont, () => {
        _inThisHook = false;
      });
    }

    function runAfterHooks(): Promise<void> | undefined {
      if (afterHooks.length === 0) {
        return;
      }
      let _inThisHook = true;
      const afterJoinPoint: IAfterJoinPoint<ThisType, Args, Result> = {
        getArgs: () => {
          return args;
        },
        getMethodName: () => {
          return methodName;
        },
        getOriginalArgs: () => {
          return originalArgs;
        },
        getResult: () => {
          return ret;
        },
        getThis: () => {
          return self;
        },
        setResult: (_ret: Result) => {
          if (!_inThisHook) {
            throw new Error('It is not allowed to set the return value after the Hook effect time is over');
          }
          ret = _ret;
        },
      };

      return runHooks(afterHooks, afterJoinPoint, () => {
        _inThisHook = false;
      });
    }

    function runAfterReturning() {
      if (afterReturningHooks.length === 0) {
        return;
      }
      const afterReturningJoinPoint: IAfterReturningJoinPoint<ThisType, Args, Result> = {
        getArgs: () => {
          return args;
        },
        getMethodName: () => {
          return methodName;
        },
        getOriginalArgs: () => {
          return originalArgs;
        },
        getResult: () => {
          return ret;
        },
        getThis: () => {
          return self;
        },
      };

      afterReturningHooks.forEach((hook) => {
        try {
          hook.hook(afterReturningJoinPoint);
        } catch (e) {
          // no op, ignore error on AfterReturning
        }
      });
    }

    function runAfterThrowing() {
      if (afterThrowingHooks.length === 0) {
        return;
      }
      const afterThrowingJoinPoint: IAfterThrowingJoinPoint<ThisType, Args, Result> = {
        getError: () => {
          return error;
        },
        getMethodName: () => {
          return methodName;
        },
        getOriginalArgs: () => {
          return originalArgs;
        },
        getThis: () => {
          return self;
        },
      };

      afterThrowingHooks.forEach((hook) => {
        try {
          hook.hook(afterThrowingJoinPoint);
        } catch (e) {
          // no op, ignore error on AfterThrowing
        }
      });
    }

    function wrapped(): Result | void | Promise<Result | void> {
      promise = runBeforeHooks();

      if (promise) {
        promise = promise.then(() => {
          ret = rawMethod.apply(self, args);
          return;
        });
      } else {
        ret = rawMethod.apply(self, args);
      }

      if (promise) {
        promise = promise.then(() => {
          return runAfterHooks();
        });
      } else {
        promise = runAfterHooks();
      }

      if (promise) {
        return promise.then(() => {
          return ret;
        });
      } else {
        return ret;
      }
    }
  };
}

function isBeforeHook<ThisType, Args extends any[], Result>(
  hook: IValidAspectHook<ThisType, Args, Result>,
): hook is IBeforeAspectHook<ThisType, Args, Result> {
  return hook && hook.type === HookType.Before;
}

function isAfterHook<ThisType, Args extends any[], Result>(
  hook: IValidAspectHook<ThisType, Args, Result>,
): hook is IAfterAspectHook<ThisType, Args, Result> {
  return hook && hook.type === HookType.After;
}

function isAroundHook<ThisType, Args extends any[], Result>(
  hook: IValidAspectHook<ThisType, Args, Result>,
): hook is IAroundAspectHook<ThisType, Args, Result> {
  return hook && hook.type === HookType.Around;
}

function isAfterReturningHook<ThisType, Args extends any[], Result>(
  hook: IValidAspectHook<ThisType, Args, Result>,
): hook is IAfterReturningAspectHook<ThisType, Args, Result> {
  return hook && hook.type === HookType.AfterReturning;
}

function isAfterThrowingHook<ThisType, Args extends any[], Result>(
  hook: IValidAspectHook<ThisType, Args, Result>,
): hook is IAfterThrowingAspectHook<ThisType, Args, Result> {
  return hook && hook.type === HookType.AfterThrowing;
}

export function isPromiseLike(thing: any): thing is Promise<any> {
  return !!(thing as Promise<any>).then;
}

function runHooks<
  T extends { awaitPromise?: boolean; hook: (joinPoint: P) => Promise<void> | void },
  P extends IJoinPoint,
>(hooks: T[], joinPoint: P, then: () => void) {
  let promise: Promise<void> | undefined;
  for (const hook of hooks) {
    promise = runOneHook(hook, joinPoint, promise);
  }
  if (promise) {
    promise = promise.then(then);
  } else {
    then();
  }
  return promise;
}

function runOneHook<
  T extends { awaitPromise?: boolean; hook: (joinPoint: P) => Promise<void> | void },
  P extends IJoinPoint,
>(hook: T, joinPoint: P, promise: Promise<any> | undefined): Promise<void> | undefined {
  if (hook.awaitPromise) {
    promise = promise || Promise.resolve();
    promise = promise.then(() => {
      return hook.hook(joinPoint);
    });
  } else {
    if (promise) {
      promise = promise.then(() => {
        hook.hook(joinPoint);
        return;
      });
    } else {
      hook.hook(joinPoint);
    }
  }
  return promise;
}

export class HookStore implements IHookStore {
  private hooks: IHookMap = new Map<Token, IInstanceHooks>();

  constructor(private parent?: IHookStore) {}

  createHooks(hooks: IValidAspectHook[]): IDisposable {
    const disposers: IDisposable[] = hooks.map((hook) => {
      return this.createOneHook(hook);
    });
    return {
      dispose: () => {
        disposers.forEach((disposer) => {
          disposer.dispose();
        });
      },
    };
  }

  hasHooks(token: Token) {
    if (!this.hooks.has(token)) {
      if (this.parent) {
        return this.parent.hasHooks(token);
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  getHooks(token: Token, method: string | number | symbol): IValidAspectHook[] {
    let hooks: IValidAspectHook[] = [];
    if (this.parent) {
      hooks = this.parent.getHooks(token, method);
    }
    if (this.hooks.get(token)?.has(method)) {
      hooks = hooks.concat(this.hooks.get(token)!.get(method)!);
    }
    return hooks;
  }

  createOneHook(hook: IValidAspectHook): IDisposable {
    const token = hook.target;
    if (!this.hooks.has(token)) {
      this.hooks.set(token, new Map());
    }
    const instanceHooks = this.hooks.get(token)!;
    if (!instanceHooks.has(hook.method)) {
      instanceHooks.set(hook.method, []);
    }
    // TODO: 支持order
    instanceHooks.get(hook.method)!.push(hook);
    return {
      dispose: () => {
        this.removeOneHook(hook);
      },
    };
  }

  removeOneHook(hook: IValidAspectHook): void {
    const token = hook.target;
    if (!this.hooks.has(token)) {
      return;
    }
    const instanceHooks = this.hooks.get(token)!;
    if (!instanceHooks.has(hook.method)) {
      return;
    }
    const methodHooks = instanceHooks.get(hook.method)!;
    const index = methodHooks.indexOf(hook);
    if (index > -1) {
      methodHooks.splice(index, 1);
    }
  }
}

const HOOK_KEY = Symbol('HOOK_KEY');
const ASPECT_KEY = Symbol('ASPECT_KEY');

export type IHookMetadata = Array<{
  prop: MethodName;
  type: HookType;
  target: Token;
  targetMethod: MethodName;
  options: IHookOptions;
}>;

export function markAsAspect(target: object) {
  Reflect.defineMetadata(ASPECT_KEY, true, target);
}

export function markAsHook(
  target: object,
  prop: MethodName,
  type: HookType,
  hookTarget: Token,
  targetMethod: MethodName,
  options: IHookOptions,
) {
  let hooks = Reflect.getOwnMetadata(HOOK_KEY, target);
  if (!hooks) {
    hooks = [];
    Reflect.defineMetadata(HOOK_KEY, hooks, target);
  }
  hooks.push({ prop, type, target: hookTarget, targetMethod, options });
}
export function isAspectCreator(target: object) {
  return !!Reflect.getMetadata(ASPECT_KEY, (target as ClassCreator).useClass);
}

export function getHookMeta(target: any): IHookMetadata {
  return Reflect.getOwnMetadata(HOOK_KEY, target.prototype) || [];
}

export function isHooked(target: any): boolean {
  return target && !!target[HOOKED_SYMBOL];
}
