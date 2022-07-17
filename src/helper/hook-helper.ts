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

export const HOOKED_SYMBOL = Symbol('COMMON_DI_HOOKED');

export function applyHooks<T = any>(instance: T, token: Token, hooks: IHookStore): T {
  if (typeof instance !== 'object') {
    // Only object can be hook.
    return instance;
  }
  if (!hooks.hasHooks(token)) {
    // fallback
    // experimental 特性， 不影响原来使用
    // 但是这样要求hook添加必须在instance创建前
    return instance;
  }
  // 使用 proxy 模式存在一个弊端，
  // 就是如果class的方法是使用 a = () => this.b() 类似这种 bound function 写的, 并且内部有this调用的函数，
  // 此处的 b() 无法被正确拦截
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
 * 使用hooks将函数组装成一个hook后的最终函数
 * @param rawMethod 原始方法
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
      // 对于 before hook ，先来的先执行
      beforeHooks.push(h);
    } else if (isAfterHook(h)) {
      // 对于 after hook ，后来的先执行
      afterHooks.unshift(h);
    } else if (isAroundHook(h)) {
      // around 后来的先执行
      aroundHooks.unshift(h);
    } else if (isAfterReturningHook(h)) {
      afterReturningHooks.push(h);
    } else if (isAfterThrowingHook(h)) {
      afterThrowingHooks.push(h);
    }
  });

  // around 在最外层, 后来的先执行
  return function (this: any, ...args: Args) {
    let promise: Promise<any> | undefined;
    let ret: Result = undefined as any;
    let error: Error | undefined;
    const self = this;
    const originalArgs: Args = args;

    try {
      runAroundHooks();

      if (promise) {
        promise = promise.then(() => {
          return ret;
        }); // 有一个hook为异步，全部转换为异步
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
        } else if (isPromiseLike(ret)) {
          p = ret;
        }

        if (p) {
          // 是异步, 此时使用promise的reject和resolve
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

    function runAroundHooks(): Promise<void> | undefined {
      let i = 0;
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
        proceed: () => {
          i++;
          promise = runAroundHookAtIndex(i);
          return promise;
        },
        setArgs: (_args: Args) => {
          args = _args;
        },
        setResult: (_ret: Result) => {
          ret = _ret;
        },
      };

      function runAroundHookAtIndex(index: number): Promise<void> | undefined {
        const aroundHook = aroundHooks[index];
        if (!aroundHook) {
          // 最内层
          wrapped();
          if (promise) {
            // 说明在before和after的hook中产生了异步
            return promise;
          }
        } else {
          promise = runOneHook(aroundHook, aroundJoinPoint, promise);
          return promise;
        }
      }

      return runAroundHookAtIndex(0);
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
            throw new Error('不允许在Hook作用时间结束后设置参数');
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
            throw new Error('不允许在Hook作用时间结束后设置返回值');
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
          // no op, 忽略AfterReturning中的错误
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
          // no op, 忽略AfterThrowing中的错误
        }
      });
    }

    function wrapped(): Result {
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
        }) as any; // 挂载了async hook方法
      } else {
        return ret as any;
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

function isPromiseLike(thing: any): thing is Promise<any> {
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
    // 如果要求await hook，如果之前有promise，直接用，不然创建Promise给下一个使用
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

  private removeOneHook(hook: IValidAspectHook): void {
    const token = hook.target;
    if (!this.hooks.has(token)) {
      return;
    }
    const instanceHooks = this.hooks.get(token)!;
    if (!instanceHooks.has(hook.method)) {
      return;
    }
    const index = instanceHooks.get(hook.method)!.indexOf(hook);
    if (index > -1) {
      instanceHooks.get(hook.method)!.splice(index, 1);
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
