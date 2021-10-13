import 'reflect-metadata';
import * as Helper from './helper';
import * as Error from './error';
import { Token,
  InstanceOpts,
  MethodName,
  HookType,
  IBeforeAspectHookFunction,
  IAfterAspectHookFunction,
  IAroundAspectHookFunction,
  IHookOptions,
  IAfterReturningAspectHookFunction,
  IAfterThrowingAspectHookFunction,
} from './declare';
import { Injector } from './injector';
import { makeAsAspect, makeAsHook} from './helper';

/**
 * 装饰一个构造函数是否是可以被依赖注入的构造函数
 * @param opts
 */
export function Injectable(opts?: InstanceOpts): ClassDecorator {
  // tslint:disable-next-line:ban-types
  return <T extends Function>(target: T) => {
    Helper.markInjectable(target, opts);

    const designParams = Reflect.getMetadata('design:paramtypes', target);
    if (Array.isArray(designParams)) {
      Helper.setParameters(target, designParams);

      // 如果是多例的对象，就不去检查构造依赖的可注入性
      if (opts && opts.multiple) {
        return;
      }

      // 检查依赖的可注入性
      const deps = Helper.getParameterDeps(target);
      deps.forEach((item, index) => {
        if (!Helper.isToken(item)) {
          throw Error.notInjectError(target, index);
        }
      });
    }
  };
}

interface InjectOpts {
  default?: any;
}

/**
 * 把构造函数的参数和一个特定的注入标记关联起来
 * @param token
 */
export function Inject(token: string | symbol, opts: InjectOpts = {}) {
  // tslint:disable-next-line:ban-types
  return <T extends Function>(target: T, _: string | symbol, index: number) => {
    Helper.setParameterIn(target, { ...opts, token }, index);
  };
}

/**
 * 构造函数可选依赖的装饰器
 * @param token
 */
export function Optional(token: string | symbol = Symbol()) {
  // tslint:disable-next-line:ban-types
  return <T extends Function>(target: T, _: string | symbol, index: number) => {
    Helper.setParameterIn(target, { default: undefined, token }, index);
  };
}

// 兼容之前错误的命名
export const Optinal = Optional;

/**
 * 装饰一个类的属性，当这个属性被访问的时候，才开始使用注射器创建实例
 * @param token
 */
export function Autowired(token?: Token, opts?: InstanceOpts): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const INSTANCE_KEY = Symbol('INSTANCE_KEY');

    let dependency = token;
    if (token === undefined) {
      dependency = Reflect.getMetadata('design:type', target, propertyKey);
    }

    if (!Helper.isToken(dependency)) {
      throw Error.notSupportTokenError(target, propertyKey, dependency);
    }

    // 添加构造函数的依赖
    Helper.addDeps(target, dependency);

    const descriptor: PropertyDescriptor = {
      configurable: true,
      enumerable: true,
      get(this: any) {
        // 每个对象的依赖只创建一次
        if (!this[INSTANCE_KEY]) {
          const injector: Injector | null = Helper.getInjectorOfInstance(this);

          if (!injector) {
            throw Error.noInjectorError(this);
          }

          this[INSTANCE_KEY] = injector.get(dependency!, opts);
        }

        return this[INSTANCE_KEY];
      },
    };

    // 返回 descriptor，编译工具会自动进行 define
    return descriptor;
  };
}

// hooks start

/**
 * 声明这是一个包含了 Hook 的 Class
 *
 * @description
 *    典型用法
 *
 *    const AToken = Symbol('AToken');
 *
 *    interface AToken {
 *      add(a: number): number
 *    }
 *
 *    @Injectable()
 *    Class AImpl {
 *
 *       private sum = 0;
 *
 *       add(a: number) {
 *          this.sum += a;
 *          return this.sum;
 *       }
 *
 *    }
 *
 *    @Aspect()
 *    @Injectable()
 *    Class OneAspectOfA {
 *
 *       // 拦截 AToken 实现 class 的 add 方法，在 add 方法执行前，将它的参数乘以2
 *       @Before(AToken, 'add')
 *       beforeAdd(joinPoint: IBeforeJoinPoint<AToken, [number], number>) {
 *          const [a] = joinPoint.getArgs();
 *          joinPoint.setArgs([a * 2]);
 *       }
 *
 *       @After(AToken, 'add')
 *       afterAdd(joinPoint: IAfterJoinPoint<AToken, [number], number>) {
 *          const ret = joinPoint.getResult();
 *          joinPoint.setResult(ret * 5); // 将返回值乘以5
 *       }
 *    }
 *
 *    // 必须添加 Aspect 的 class
 *    injector.addProviders(OneAspectOfA);
 *
 *    这种情况下，第一次调用 const hookedSum = injector.get(AToken).add(2) 后,
 *    AImpl 中的 sum 为 4, hookedSum 为 20
 */
export function Aspect() {
  return (target: any) => {
    makeAsAspect(target);
  };
}

/**
 * 在方法执行前进行 hook
 *    @Before(AToken, 'add')
 *    beforeAdd(joinPoint: IBeforeJoinPoint<AToken, [number, number], number>) {
 *      const [a, b] = joinPoint.getArgs();
 *      joinPoint.setArgs([a * 10, b * 10]);
 *    }
 * hook 的顺序遵循洋葱模型
 * @param token
 * @param method
 */
export function Before<ThisType = any, Args extends any[] = any, Result = any>(token: Token, method: MethodName,
                                                                               options: IHookOptions = {}) {
  return <T  extends Record<K, IBeforeAspectHookFunction<ThisType, Args, Result>>,
    K extends MethodName>(target: T, property: K) => {
    makeAsHook(target, property, HookType.Before, token, method, options);
  };
}

/**
 * 在方法结束后进行 hook
 *    @After(AToken, 'add')
 *    afterAdd(joinPoint: IAfterJoinPoint<AToken, [number, number], number>) {
 *      const ret = joinPoint.getResult();
 *      joinPoint.setResult(ret * 10); // 将返回值乘以10
 *    }
 * hook 的顺序遵循洋葱模型
 * @param token
 * @param method
 */
export function After<ThisType = any, Args extends any[] = any, Result = any>(token: Token, method: MethodName,
                                                                              options: IHookOptions = {}) {
  return <T  extends Record<K, IAfterAspectHookFunction<ThisType, Args, Result>>,
    K extends MethodName>(target: T, property: K) => {
    makeAsHook(target, property, HookType.After, token, method, options);
  };
}

/**
 * 环绕型 Hook
 *    @Around(AToken, 'add')
 *    aroundAdd(joinPoint: IAroundJoinPoint<AToken, [number, number], number>) {
 *      const [a, b] = joinPoint.getArgs();
 *      if (a === b) {
 *        console.log('adding two same numbers');
 *      }
 *      joinPoint.proceed();
 *      const result = joinPoint.getResult();
 *      if (result === 10) {
 *         joinPoint.setResult(result * 10);
 *      }
 *    }
 * around 型 hook 是先来的被后来的包裹
 * @param token
 * @param method
 * @description
 */
export function Around<ThisType = any, Args extends any[] = any, Result = any>(token: Token, method: MethodName,
                                                                               options: IHookOptions = {}) {
  return <T  extends Record<K, IAroundAspectHookFunction<ThisType, Args, Result>>,
    K extends MethodName>(target: T, property: K) => {
    makeAsHook(target, property, HookType.Around, token, method, options);
  };
}

/**
 * 在方法结束（并且回调给外层之后）后进行 hook
 *    @AfterReturning(AToken, 'add')
 *    afterReturningAdd(joinPoint: IAfterReturningJoinPoint<AToken, [number, number], number>) {
 *      const ret = joinPoint.getResult();
 *      console.log('the return value is ' + ret);
 *    }
 * hook 全都会执行, 即使出错
 * @param token
 * @param method
 * @param options
 */
export function AfterReturning<ThisType = any, Args extends any[] = any, Result = any>(token: Token, method: MethodName,
                                                                                       options: IHookOptions = {}) {
  return <T  extends Record<K, IAfterReturningAspectHookFunction<ThisType, Args, Result>>,
    K extends MethodName>(target: T, property: K) => {
    makeAsHook(target, property, HookType.AfterReturning, token, method, options);
  };
}

/**
 * 在方法抛出异常（或者PromiseRejection）后进行 hook
 *    @AfterThrowing(AToken, 'add')
 *    afterThrowingAdd(joinPoint: IAfterReturningJoinPoint<AToken, [number, number], number>) {
 *      const error = joinPoint.getError();
 *      console.error('产生了一个错误', error);
 *    }
 * hook 全都会执行, 即使出错
 * @param token
 * @param method
 * @param options
 */
export function AfterThrowing<ThisType = any, Args extends any[] = any, Result = any>(token: Token, method: MethodName,
                                                                                      options: IHookOptions = {}) {
  return <T  extends Record<K, IAfterThrowingAspectHookFunction<ThisType, Args, Result>>,
    K extends MethodName>(target: T, property: K) => {
    makeAsHook(target, property, HookType.AfterThrowing, token, method, options);
  };
}
