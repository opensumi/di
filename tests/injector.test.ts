import { Autowired, Injectable, Injector, INJECTOR_TOKEN, Inject, Optional } from '../src';
import * as InjectorError from '../src/error';
import { getInjectorOfInstance } from '../src/helper';

describe('test injector work', () => {
  @Injectable()
  class A {}

  @Injectable()
  class B {
    @Autowired()
    a!: A;
  }

  @Injectable({ multiple: true })
  class C {}

  const DToken = Symbol('D');
  const EToken = Symbol('E');

  @Injectable()
  class D {
    constructor(@Inject(EToken) public e: any) {}
  }

  @Injectable()
  class E {
    constructor(@Inject(DToken) public d: any) {}
  }

  it('从静态函数创建 Injector', () => {
    const injector = new Injector();
    injector.parseDependencies(B);

    const b = injector.get(B);
    expect(b).toBeInstanceOf(B);
    expect(b.a).toBeInstanceOf(A);
    expect(injector.get(INJECTOR_TOKEN)).toBe(injector);
  });

  it('get INJECTOR_TOKEN in the constructor', () => {
    const injector = new Injector();

    @Injectable()
    class E {
      @Autowired(INJECTOR_TOKEN)
      injector!: Injector;
      constructor() {
        expect(this.injector).toBe(injector);
      }
    }

    const e = injector.get(E);
    expect(e).toBeInstanceOf(E);
    expect(injector.get(INJECTOR_TOKEN)).toBe(injector);
  });

  it('使用多例模式创建对象', () => {
    const injector = new Injector([A, B, C]);
    const b1 = injector.get(B, { multiple: true });
    const b2 = injector.get(B, { multiple: true });
    expect(b1).toBeInstanceOf(B);
    expect(b2).toBeInstanceOf(B);
    expect(b1).not.toBe(b2);
    expect(b1.a).toBe(b2.a);

    const c1 = injector.get(C);
    const c2 = injector.get(C);
    expect(c1).not.toBe(c2);
  });

  it('使用多例模式创建对象，构造函数依赖时不会创建多例', () => {
    @Injectable()
    class T {
      constructor(public a: A) {}
    }

    const injector = new Injector([T, A]);

    const t1 = injector.get(T, { multiple: true });
    const t2 = injector.get(T, { multiple: true });
    expect(t1).toBeInstanceOf(T);
    expect(t2).toBeInstanceOf(T);
    expect(t1).not.toBe(t2);
    expect(t1.a).toBe(t2.a);
  });

  it('重复添加依赖，不会产生多个 Creator', () => {
    const injector = new Injector([B]);

    const b1 = injector.get(B);
    expect(b1).toBeInstanceOf(B);

    const b2 = injector.get(B);
    expect(b2).toBe(b1);
  });

  it('同一个 Token 有不同的 Provider 的时候使用第一个', () => {
    const temp = {};
    const injector = new Injector([B, { token: B, useValue: temp }]);

    const b = injector.get(B);
    expect(b).toBeInstanceOf(B);
  });

  it('添加一个没有提供 Provider 的依赖', () => {
    const injector = new Injector();
    expect(() => injector.get('noop')).toThrow(InjectorError.noProviderError('noop'));
  });

  it('有循环依赖的对象创建的时候会报错', () => {
    const injector = new Injector([
      { token: EToken, useClass: E },
      { token: DToken, useClass: D },
    ]);

    expect(() => injector.get(DToken)).toThrow(
      InjectorError.circularError(D, {
        token: DToken,
        parent: {
          token: EToken,
          parent: {
            token: DToken,
          },
        },
      } as any),
    );
  });

  it('没有定义 Injectable 的依赖', () => {
    class T {}
    expect(() => new Injector([T])).toThrow(InjectorError.noInjectableError(T));
  });

  describe('addProviders', () => {
    let injector: Injector;

    beforeEach(() => {
      injector = new Injector();
    });

    it('使用 addProviders 不会覆盖原有的 Provider', () => {
      injector.addProviders(A);
      const a1 = injector.get(A);

      injector.addProviders({ token: A, useValue: '' });
      const a2 = injector.get(A);

      expect(a1).toBe(a2);
    });
  });

  describe('创建对象时发生异常', () => {
    it('创建对象时发生异常，creator 的状态会回滚', () => {
      const injector = new Injector();

      @Injectable()
      class ErrorCls {
        constructor() {
          throw new Error('test');
        }
      }

      expect(() => {
        injector.get(ErrorCls);
      }).toThrow('test');

      const creator = injector.creatorMap.get(ErrorCls);
      expect(creator && creator.status).toBeUndefined();
    });
  });

  describe('默认值', () => {
    it('带有默认值的对象', () => {
      @Injectable()
      class T {
        constructor(@Inject('a', { default: 'aaa' }) public a: string) {}
      }

      const injector = new Injector();
      injector.parseDependencies(T);
      const t = injector.get(T);
      expect(t.a).toBe('aaa');

      injector.addProviders({ token: 'a', useValue: 'bbb' });
      const childInjector = injector.createChild([T]);
      const t2 = childInjector.get(T);
      expect(t2.a).toBe('bbb');
    });

    it('严格模式下，带有默认值的对象', () => {
      @Injectable()
      class T {
        constructor(@Inject('a', { default: 'aaa' }) public a: string) {}
      }

      const injector = new Injector([], { strict: true });
      injector.addProviders(T);
      const t = injector.get(T);
      expect(t.a).toBe('aaa');

      injector.addProviders({ token: 'a', useValue: 'bbb' });
      const childInjector = injector.createChild([T]);
      const t2 = childInjector.get(T);
      expect(t2.a).toBe('bbb');
    });

    it('带有默认赋值的对象', () => {
      @Injectable()
      class T {
        constructor(@Optional('a') public a: string = 'aaa') {}
      }

      const injector = new Injector([T]);
      const t = injector.get(T);
      expect(t.a).toBe('aaa');

      injector.addProviders({ token: 'a', useValue: 'bbb' });
      const childInjector = injector.createChild([T]);
      const t2 = childInjector.get(T);
      expect(t2.a).toBe('bbb');
    });

    it('Optional 不传递 Token', () => {
      @Injectable()
      class T {
        constructor(@Optional() public a: string = 'aaa') {}
      }

      const injector = new Injector([T]);
      const t = injector.get(T);
      expect(t.a).toBe('aaa');
    });
  });

  describe('injector 访问', () => {
    it('构造函数内能够访问 injector', () => {
      const injector = new Injector();

      const testFn = jest.fn();

      @Injectable()
      class ChildCls {}

      @Injectable()
      class ParentCls {
        @Autowired()
        private child!: ChildCls;

        constructor() {
          testFn(this.child);
        }
      }

      const parent = injector.get(ParentCls);
      expect(parent).toBeInstanceOf(ParentCls);
      expect(testFn).toBeCalledTimes(1);
      expect(testFn.mock.calls[0][0]).toBeInstanceOf(ChildCls);
    });
  });

  describe('parseDependencies', () => {
    it('没有提供完整属性依赖，parse 会报错', () => {
      const injector = new Injector();

      expect(() => {
        injector.parseDependencies(D);
      }).toThrow(InjectorError.noProviderError(EToken));
    });

    it('没有提供完整的构造函数依赖，parse 会报错', () => {
      @Injectable()
      class T {
        constructor(@Inject('a') public a: string) {}
      }

      const injector = new Injector();
      expect(() => {
        injector.parseDependencies(T);
      }).toThrow(InjectorError.noProviderError('a'));
    });

    it('新的 scope 解析出来的 creator 不会覆盖父级', () => {
      const injector = new Injector();
      const childInjector = injector.createChild();

      injector.parseDependencies(A);
      childInjector.parseDependencies(B);

      const a = childInjector.get(A);
      const b = childInjector.get(B);
      expect(b.a).toBe(a);
      expect(childInjector.hasInstance(a)).toBeFalsy();
    });
  });

  describe('createChild', () => {
    it('createChild 得到一个新的 Scope', () => {
      const injector = new Injector();
      injector.addProviders(A);

      const injector1 = injector.createChild([C]);
      const injector2 = injector.createChild([C]);

      expect(injector1.get(A)).toBe(injector2.get(A));
      expect(injector1.get(C)).not.toBe(injector2.get(C));
    });

    it('createChild 带有 tag 的 provider 下落', () => {
      const injector = new Injector([], { strict: true });
      injector.addProviders({
        dropdownForTag: true,
        tag: 'Tag',
        token: 'Token',
        useClass: A,
      });

      expect(() => {
        injector.get('Token', { tag: 'Tag' });
      }).toThrow(InjectorError.tagOnlyError('Tag', 'undefined'));

      const childInjector = injector.createChild([], {
        dropdownForTag: true,
        tag: 'Tag',
      });
      const a = childInjector.get('Token', { tag: 'Tag' });
      expect(a).toBeInstanceOf(A);
    });

    it('createChild 会自动下落 strict 配置', () => {
      const injector = new Injector([], { strict: true });
      const childInjector = injector.createChild([], {
        dropdownForTag: true,
        tag: 'Tag',
      });

      expect(() => {
        childInjector.get('Token', { tag: 'Tag' });
      }).toThrow(InjectorError.noProviderError('Token'));
    });

    it('三个 Token 四个对象', () => {
      @Injectable()
      class ParentClsC {}

      @Injectable()
      class ParentClsB {
        @Autowired()
        c!: ParentClsC;
      }

      @Injectable()
      class ChildClsA {
        @Autowired()
        b!: ParentClsB;

        @Autowired()
        c!: ParentClsC;
      }

      const parent = new Injector();
      parent.addProviders(ParentClsB);

      const child = parent.createChild();
      child.addProviders(ChildClsA);
      child.addProviders(ParentClsC);

      const a = child.get(ChildClsA);
      const b = a.b;
      const c1 = a.c;
      const c2 = b.c;
      expect(c1).not.toBe(c2);
      expect(child.hasInstance(c1)).toBeTruthy();
      expect(child.hasInstance(c2)).toBeFalsy();
      expect(parent.hasInstance(c1)).toBeFalsy();
      expect(parent.hasInstance(c2)).toBeTruthy();
    });
  });

  describe('strict: false', () => {
    let injector: Injector;

    beforeEach(() => {
      injector = new Injector();
    });

    it('普通模式下，可以直接获取一个 Injectable 对象的实例', () => {
      @Injectable()
      class T {}

      const t = injector.get(T);
      expect(t).toBeInstanceOf(T);
    });
  });

  describe('id', () => {
    it('创建注册器实例的时候会有 ID 数据', () => {
      const injector1 = new Injector();
      const injector2 = new Injector();
      expect(injector1.id.startsWith('Injector')).toBeTruthy();
      expect(injector1.id).not.toBe(injector2.id);
    });

    it('could get id from the instance', () => {
      const injector = new Injector();
      const instance1 = injector.get(A);
      const instance2 = injector.get(A);
      const instance3 = injector.get(B);

      expect(getInjectorOfInstance(instance1)!.id).toBe(injector.id);
      expect(getInjectorOfInstance(instance2)!.id).toBe(injector.id);
      expect(getInjectorOfInstance(instance3)!.id).toBe(injector.id);
    });
  });

  describe('extends class should also support createChild', () => {
    class NewInjector extends Injector {
      funcForNew() {
        return 1;
      }
    }
    const tokenA = Symbol('A');
    const injector = new NewInjector();
    injector.addProviders({
      token: tokenA,
      useValue: 'A',
    });

    expect(injector.get(tokenA)).toBe('A');
    expect(injector.funcForNew()).toBe(1);
    const child = injector.createChild([
      {
        token: tokenA,
        useValue: 'B',
      },
    ]);

    expect(child.get(tokenA)).toBe('B');
    expect(child.funcForNew()).toBe(1);
  });
});
