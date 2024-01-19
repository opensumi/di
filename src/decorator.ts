import {
  Token,
  InstanceOpts,
  MethodName,
  HookType,
  IBeforeAspectHookFunction,
  IAfterAspectHookFunction,
  IAroundAspectHookFunction,
  IHookOptions,
  IAfterReturningAspectHookFunction,
  IAfterThrowingAspectHookFunction,
  IAroundHookOptions,
} from './types';
import {
  addDeps,
  getInjectorOfInstance,
  getParameterDeps,
  isToken,
  markAsAspect,
  markAsHook,
  markInjectable,
  setParameterIn,
  setParameters,
} from './helper';
import { noInjectorError, notInjectError, tokenInvalidError } from './error';

/**
 * Decorate a Class to mark it as injectable
 * @param opts
 */
export function Injectable(opts?: InstanceOpts): ClassDecorator {
  return <T extends Function>(target: T) => {
    markInjectable(target, opts);

    const params = Reflect.getMetadata('design:paramtypes', target);
    if (Array.isArray(params)) {
      setParameters(target, params);

      // If it supports multiple instances, do not check the injectability of the constructor dependencies
      if (opts && opts.multiple) {
        return;
      }

      // Check the injectability of the constructor dependencies
      const depTokens = getParameterDeps(target);
      depTokens.forEach((item, index) => {
        if (!isToken(item)) {
          throw notInjectError(target, index);
        }
      });
    }
  };
}

interface InjectOpts {
  /**
   * Default value when the token is not found
   */
  default?: any;
}

/**
 * Associate the constructor parameters with a specific injection token
 *
 * @param token
 */
export function Inject(token: Token, opts: InjectOpts = {}): ParameterDecorator {
  return (target, _: string | symbol | undefined, index: number) => {
    setParameterIn(target, { ...opts, token }, index);
  };
}

/**
 * Decorator for optional dependencies in the constructor
 * @param token
 */
export function Optional(token: Token = Symbol()): ParameterDecorator {
  return (target, _: string | symbol | undefined, index: number) => {
    setParameterIn(target, { default: undefined, token }, index);
  };
}

/**
 * Decorate a class attribute, and only start using the injector to create an instance when this attribute is accessed
 * @param token
 */
export function Autowired(token?: Token, opts?: InstanceOpts): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const INSTANCE_KEY = Symbol('INSTANCE_KEY');

    let realToken = token as Token;
    if (realToken === undefined) {
      realToken = Reflect.getMetadata('design:type', target, propertyKey);
    }

    if (!isToken(realToken)) {
      throw tokenInvalidError(target, propertyKey, realToken);
    }

    // Add the dependency of the constructor
    addDeps(target, realToken);

    const descriptor: PropertyDescriptor = {
      configurable: true,
      enumerable: true,
      get(this: any) {
        if (!this[INSTANCE_KEY]) {
          const injector = getInjectorOfInstance(this);

          if (!injector) {
            throw noInjectorError(this);
          }

          this[INSTANCE_KEY] = injector.get(realToken, opts);
          injector.onceInstanceDisposed(this[INSTANCE_KEY], () => {
            this[INSTANCE_KEY] = undefined;
          });
        }

        return this[INSTANCE_KEY];
      },
    };

    // return a descriptor and compiler(tsc/babel/...) will automatically perform define.
    return descriptor;
  };
}

// hooks start

/**
 * mark a class as an aspect
 */
export function Aspect() {
  return (target: any) => {
    markAsAspect(target);
  };
}

/**
 * Hook before method execution
 *
 * The order of hooks follows the onion model
 * @param token
 * @param method
 */
export function Before<ThisType = any, Args extends any[] = any, Result = any>(
  token: Token,
  method: MethodName,
  options: IHookOptions = {},
) {
  return <T extends Record<K, IBeforeAspectHookFunction<ThisType, Args, Result>>, K extends MethodName>(
    target: T,
    property: K,
  ) => {
    markAsHook(target, property, HookType.Before, token, method, options);
  };
}

/**
 * Hook after the method ends
 *
 * The order of hooks follows the onion model
 * @param token
 * @param method
 */
export function After<ThisType = any, Args extends any[] = any, Result = any>(
  token: Token,
  method: MethodName,
  options: IHookOptions = {},
) {
  return <T extends Record<K, IAfterAspectHookFunction<ThisType, Args, Result>>, K extends MethodName>(
    target: T,
    property: K,
  ) => {
    markAsHook(target, property, HookType.After, token, method, options);
  };
}

/**
 * around hook, this method performs consistently with the onion model
 * @param token
 * @param method
 * @description
 */
export function Around<ThisType = any, Args extends any[] = any, Result = any>(
  token: Token,
  method: MethodName,
  options: IAroundHookOptions = {},
) {
  return <T extends Record<K, IAroundAspectHookFunction<ThisType, Args, Result>>, K extends MethodName>(
    target: T,
    property: K,
  ) => {
    markAsHook(target, property, HookType.Around, token, method, options);
  };
}

/**
 * Hook after the method ends (and after callback to the outer layer).
 * the hook will be executed even if the method throws an error
 * @param token
 * @param method
 * @param options
 */
export function AfterReturning<ThisType = any, Args extends any[] = any, Result = any>(
  token: Token,
  method: MethodName,
  options: IHookOptions = {},
) {
  return <T extends Record<K, IAfterReturningAspectHookFunction<ThisType, Args, Result>>, K extends MethodName>(
    target: T,
    property: K,
  ) => {
    markAsHook(target, property, HookType.AfterReturning, token, method, options);
  };
}

/**
 * Hook after the method throws an exception (or PromiseRejection)
 *
 * the hook will be executed even if the method throws an error
 * @param token
 * @param method
 * @param options
 */
export function AfterThrowing<ThisType = any, Args extends any[] = any, Result = any>(
  token: Token,
  method: MethodName,
  options: IHookOptions = {},
) {
  return <T extends Record<K, IAfterThrowingAspectHookFunction<ThisType, Args, Result>>, K extends MethodName>(
    target: T,
    property: K,
  ) => {
    markAsHook(target, property, HookType.AfterThrowing, token, method, options);
  };
}
