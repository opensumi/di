import { Injectable, Injector, Autowired, Inject } from '../../src';
import * as InjectorError from '../../src/error';

describe('动态多例创建', () => {
  it('能够动态传递 Arguments, 且使用覆盖的实现', () => {
    @Injectable()
    class AClass {}

    class Parent {
      @Autowired()
      a!: AClass;

      constructor(public d: symbol) {}
    }

    @Injectable()
    class Child extends Parent {}

    const injector = new Injector([AClass, { token: Parent, useClass: Child }]);
    const dynamic = Symbol('dynamic');
    const instance = injector.get(Parent, [dynamic]);
    expect(instance).toBeInstanceOf(Child);
    expect(instance.a).toBeInstanceOf(AClass);
    expect(instance.d).toBe(dynamic);
  });

  it('能够动态传递 Arguments, 且使用单例的实现', () => {
    @Injectable()
    class AClass {}

    class Parent {
      @Autowired()
      a!: AClass;

      constructor(@Inject('d') public d: symbol) {}
    }

    @Injectable()
    class ChildImpl extends Parent {}
    const persistArgs = Symbol('persist');
    const dynamicArgs = Symbol('dynamic');

    const injector = new Injector([
      AClass,
      { token: 'd', useValue: persistArgs },
      { token: Parent, useClass: ChildImpl },
    ]);

    const persistOne = injector.get(Parent);
    expect(persistOne).toBeInstanceOf(ChildImpl);
    expect(persistOne.a).toBeInstanceOf(AClass);
    expect(persistOne.d).toBe(persistArgs);

    const dynamicOne = injector.get(Parent, [dynamicArgs]);
    expect(dynamicOne).toBeInstanceOf(ChildImpl);
    expect(dynamicOne.a).toBeInstanceOf(AClass);
    expect(dynamicOne.d).toBe(dynamicArgs);
    expect(dynamicOne.a).toBe(persistOne.a);
  });

  it('能够动态传递 Arguments, 且使用 Value 覆盖的实现', () => {
    @Injectable()
    class AClass {}

    class Parent {
      @Autowired()
      a!: AClass;

      constructor(public d: symbol) {}
    }

    const dynamic = Symbol('dynamic');
    class OtherImpl {
      a = new AClass();

      d = dynamic;
    }

    const injector = new Injector([AClass, { token: Parent, useValue: new OtherImpl() }]);
    const instance = injector.get(Parent, [dynamic]);
    expect(instance).toBeInstanceOf(OtherImpl);
    expect(instance.a).toBeInstanceOf(AClass);
    expect(instance.d).toBe(dynamic);
  });

  it('传递创建多例的参数到错误的 Token 中，会创建不了多例', () => {
    @Injectable()
    class AClass {}

    const dynamic = Symbol('dynamic');
    expect(() => {
      const injector = new Injector([AClass]);
      injector.get('Token' as any, [dynamic]);
    }).toThrow(InjectorError.noProviderError('Token'));
  });
  it('支持使用 token 来创建多例', () => {
    @Injectable({ multiple: true })
    class MultipleCase {
      constructor(public d: number) {}
      getNumber() {
        return this.d;
      }
    }

    const token = Symbol('token');
    const injector = new Injector([
      {
        token,
        useClass: MultipleCase,
      },
    ]);

    const a1 = injector.get(token, [1]);
    const a2 = injector.get(token, [2]);
    expect(a1.getNumber()).toBe(1);
    expect(a2.getNumber()).toBe(2);
  });
});
