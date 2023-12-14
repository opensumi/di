/* eslint-disable no-console */
import { asSingleton, Autowired, Inject, Injectable, Injector } from '../src';
import * as Error from '../src/error';

describe('use cases', () => {
  it('使用 Autowired 动态注入依赖', () => {
    const spy = jest.fn();
    @Injectable()
    class A {
      constructor() {
        spy();
      }
    }

    @Injectable()
    class B {
      @Autowired()
      a!: A;
    }

    const injector = new Injector();
    injector.parseDependencies(B);

    const b = injector.get(B);
    // B 被实例化出来之后，A 还没有被实例化出来
    expect(b).toBeInstanceOf(B);
    expect(spy).toBeCalledTimes(0);
    // A 被访问的时候才被实例化出来
    expect(b.a).toBeInstanceOf(A);
    expect(spy).toBeCalledTimes(1);
  });

  it('使用 Inject 定义构造依赖', () => {
    const spy = jest.fn();

    @Injectable()
    class A {
      constructor() {
        spy();
      }
    }

    @Injectable()
    class B {
      constructor(public a: A) {}
    }

    const injector = new Injector();
    injector.parseDependencies(B);

    const b = injector.get(B);
    expect(spy).toBeCalledTimes(1);
    expect(b).toBeInstanceOf(B);
    expect(b.a).toBeInstanceOf(A);
  });

  it('单例与多例模式', () => {
    @Injectable()
    class Single {}

    @Injectable({ multiple: true })
    class Multiple {}

    const injector = new Injector([Single, Multiple]);
    const single1 = injector.get(Single);
    const single2 = injector.get(Single);
    expect(single1).toBe(single2);

    const multiple1 = injector.get(Multiple);
    const multiple2 = injector.get(Multiple);
    expect(multiple1).not.toBe(multiple2);
  });

  it('使用 Token 进行依赖注入', () => {
    const AToken = Symbol('A');

    interface A {
      log(): void;
    }

    @Injectable()
    class AImpl implements A {
      log() {
        // nothing
      }
    }

    @Injectable()
    class B {
      constructor(@Inject(AToken) public a: A) {}
    }

    @Injectable()
    class C {
      @Autowired(AToken)
      a!: A;
    }

    const injector = new Injector([
      B,
      C,
      {
        token: AToken,
        useClass: AImpl,
      },
    ]);

    const b = injector.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.a).toBeInstanceOf(AImpl);

    const c = injector.get(C);
    expect(c).toBeInstanceOf(C);
    expect(c.a).toBeInstanceOf(AImpl);
    expect(b.a).toBe(c.a);
  });

  it('使用 TypeProvider 创建实例', () => {
    @Injectable()
    class A {}

    const injector = new Injector([A]);
    const a = injector.get(A);
    expect(a).toBeInstanceOf(A);
  });

  it('使用 ClassProvider 创建实例', () => {
    const token = 'Token';

    @Injectable()
    class A {}

    const provider = {
      token,
      useClass: A,
    };

    const injector = new Injector([provider]);
    const a = injector.get(token);
    expect(a).toBeInstanceOf(A);
  });

  it('使用 ValueProvider 创建实例', () => {
    const token = 'Token';

    @Injectable()
    class A {}

    const provider = {
      token,
      useValue: new A(),
    };

    const injector = new Injector([provider]);
    const a = injector.get(token);
    expect(a).toBe(provider.useValue);
  });

  it('使用 FactoryProvider 创建实例', () => {
    const token = 'Token';

    @Injectable()
    class A {}

    const provider = {
      token,
      useFactory: () => new A(),
    };

    const injector = new Injector([provider]);
    const a = injector.get(token);
    expect(a).toBeInstanceOf(A);
  });

  it('FactoryProvider 是创建的多例', () => {
    const token = 'Token';

    @Injectable()
    class A {}

    const provider = {
      token,
      useFactory: () => new A(),
    };

    const injector = new Injector([provider]);
    const a = injector.get(token);
    const b = injector.get(token);
    expect(a).not.toBe(b);
  });

  it('提供了 asSingleton 来实现工厂模式的单例', () => {
    const token = 'Token';

    @Injectable()
    class A {}

    const provider = {
      token,
      useFactory: asSingleton(() => new A()),
    };

    const injector = new Injector([provider]);
    const a = injector.get(token);
    const b = injector.get(token);
    expect(a).toBe(b);
  });

  it('使用抽象函数作为 Token', () => {
    abstract class Logger {
      abstract log(msg: string): void;
    }

    @Injectable()
    class LoggerImpl implements Logger {
      log(msg: string) {
        console.log(msg);
      }
    }

    @Injectable()
    class App {
      @Autowired()
      logger!: Logger;
    }

    const injector = new Injector();
    expect(() => {
      injector.get(Logger);
    }).toThrow(Error.noProviderError(Logger));

    injector.addProviders({
      token: Logger,
      useClass: LoggerImpl,
    });
    const app = injector.get(App);
    expect(app.logger).toBeInstanceOf(LoggerImpl);
  });

  it('能够动态传递 Arguments', () => {
    @Injectable()
    class A {}

    class T {
      @Autowired()
      a!: A;

      constructor(public d: symbol) {}
    }

    const injector = new Injector([A]);
    const dynamic = Symbol('dynamic');
    const t = injector.get(T, [dynamic]);
    expect(t.a).toBeInstanceOf(A);
    expect(t.d).toBe(dynamic);
  });
});
