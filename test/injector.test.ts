import {
  Autowired,
  Injectable,
  Injector,
  INJECTOR_TOKEN,
  Inject,
  Optional,
  Aspect,
  Before,
  After,
  Around,
  HookType,
  IBeforeJoinPoint,
  IAfterJoinPoint,
  IAroundJoinPoint,
  AfterReturning,
  IAfterReturningJoinPoint,
  AfterThrowing,
  IAfterThrowingJoinPoint,
} from '../src';
import * as InjectorError from '../src/error';

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

    try {
      injector.get(DToken);
    } catch (error) {
      console.log(`🚀 ~ file: injector.test.ts ~ line 121 ~ it ~ error`, error);
    }

    expect(() => injector.get(DToken)).toThrow(
      InjectorError.circularError(D, {
        token: DToken,
        from: {
          token: EToken,
          from: {
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

  describe('hasInstance', () => {
    it('能够通过 hasInstance 查到单例对象的存在性', () => {
      const token = 'token';
      const instance = {};
      const provider = { token, useValue: instance };
      const injector = new Injector([provider, B, C]);

      expect(injector.hasInstance(instance)).toBe(true);

      const b = injector.get(B);
      expect(injector.hasInstance(b)).toBe(true);

      const c = injector.get(C);
      expect(injector.hasInstance(c)).toBe(false);
    });
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

  describe('overrideProviders', () => {
    let injector: Injector;

    beforeEach(() => {
      injector = new Injector();
    });

    it('使用 overrideProviders 会覆盖原有的 Provider', () => {
      injector.addProviders(A);
      const a1 = injector.get(A);

      injector.overrideProviders({ token: A, useValue: '' });
      const a2 = injector.get(A);

      expect(a1).toBeInstanceOf(A);
      expect(a2).toBe('');
    });

    it('使用 addProviders 覆盖原有的 Provider', () => {
      injector.addProviders(A);
      const a1 = injector.get(A);

      injector.addProviders({ token: A, useValue: 'a2' });
      const a2 = injector.get(A);

      injector.addProviders({ token: A, useValue: 'a3', override: true });
      const a3 = injector.get(A);

      expect(a1).toBeInstanceOf(A);
      expect(a2).toBeInstanceOf(A);
      expect(a3).toBe('a3');
    });
  });

  describe('Tag', () => {
    let injector: Injector;

    beforeEach(() => {
      injector = new Injector();
    });

    it('能够正常从 Tag 获取对象', () => {
      const token = Symbol('token');
      const tag = 'tag';
      const value = Symbol('value');

      injector.addProviders({
        tag,
        token,
        useValue: value,
      });

      const instance = injector.get(token, { tag });
      expect(instance).toBe(value);

      expect(() => {
        injector.get(token);
      }).toThrow(InjectorError.noProviderError(token));
    });

    it('空字符串能够作为 Tag 正常创建对象', () => {
      const token = Symbol('token');
      const tag = '';
      const value = Symbol('value');

      injector.addProviders({
        tag,
        token,
        useValue: value,
      });

      const instance = injector.get(token, { tag });
      expect(instance).toBe(value);

      expect(() => {
        injector.get(token);
      }).toThrow(InjectorError.noProviderError(token));
    });

    it('数字 0 能够作为 Tag 正常创建对象', () => {
      const token = Symbol('token');
      const tag = 0;
      const value = Symbol('value');

      injector.addProviders({
        tag,
        token,
        useValue: value,
      });

      const instance = injector.get(token, { tag });
      expect(instance).toBe(value);

      expect(() => {
        injector.get(token);
      }).toThrow(InjectorError.noProviderError(token));
    });

    it('数字 1 能够作为 Tag 正常创建对象', () => {
      const token = Symbol('token');
      const tag = 1;
      const value = Symbol('value');

      injector.addProviders({
        tag,
        token,
        useValue: value,
      });

      const instance = injector.get(token, { tag });
      expect(instance).toBe(value);

      expect(() => {
        injector.get(token);
      }).toThrow(InjectorError.noProviderError(token));
    });

    it('没有定义 Tag Provider 的时候会获取默认值', () => {
      const token = Symbol('token');
      const tag = 'tag';
      const value = Symbol('value');

      injector.addProviders({
        token,
        useValue: value,
      });

      const instance = injector.get(token, { tag });
      expect(instance).toBe(value);

      const instanceWithoutTag = injector.get(token);
      expect(instanceWithoutTag).toBe(value);
    });

    it('使用 Autowired 能够正常获取值', () => {
      const token = Symbol('token');
      const tag = 'tag';
      const value = Symbol('value');

      injector.addProviders({
        token,
        useValue: value,
      });

      @Injectable()
      class TagParent {
        @Autowired(token, { tag })
        tagValue: any;
      }

      const parent = injector.get(TagParent);
      expect(parent).toBeInstanceOf(TagParent);
      expect(parent.tagValue).toBe(value);
    });

    it('Child 能够正确获取 Parent 的 Tag 对象', () => {
      const token = Symbol('token');
      const tag = 'tag';
      const value = Symbol('value');

      injector.addProviders({
        tag,
        token,
        useValue: value,
      });

      const childInjector = injector.createChild();
      const parentTagToken = injector.exchangeToken(token, tag);
      const childTagToken = childInjector.exchangeToken(token, tag);
      expect(parentTagToken).toBe(childTagToken);

      const instance = childInjector.get(token, { tag });
      expect(instance).toBe(value);
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

  describe('严格模式', () => {
    let injector: Injector;

    beforeEach(() => {
      injector = new Injector([], { strict: true });
    });

    it('严格模式下，没有预先添加 Provider 的时候，会报错', () => {
      @Injectable()
      class T {}

      expect(() => injector.get(T)).toThrow(InjectorError.noProviderError(T));
    });

    it('严格模式下，构造函数的参数依赖会报错', () => {
      const token = Symbol('noop');

      @Injectable()
      class T {
        constructor(@Inject(token) public a: string) {}
      }

      expect(() => {
        injector.addProviders(T);
        injector.get(T);
      }).toThrow(InjectorError.noProviderError(token));
    });

    it('严格模式下，overrideProviders 能正常生效', () => {
      const token = Symbol('noop');

      @Injectable()
      class T {}

      @Injectable()
      class T2 {}

      injector.addProviders(T);
      const t1 = injector.get(T);
      expect(t1).toBeInstanceOf(T);

      injector.overrideProviders({ token: T, useClass: T2 });
      const t2 = injector.get(T);
      expect(t2).toBeInstanceOf(T2);
    });
  });

  describe('domain', () => {
    let injector: Injector;

    beforeEach(() => {
      injector = new Injector([]);
    });

    it('没有描述 domain 的情况下，getFromDomain 不会报错', () => {
      @Injectable()
      class T {}

      injector.addProviders(T);
      const result = injector.getFromDomain('domain');
      expect(result).toEqual([]);
    });

    it('有描述 domain，get 之后可以从 domain 获取', () => {
      @Injectable({ domain: 'domain' })
      class T {}

      const result = injector.getFromDomain('domain');
      expect(result).toEqual([]);
      const a = injector.get(T);
      expect(a).toBeInstanceOf(T);
      const result2 = injector.getFromDomain('domain');
      expect(result2).toEqual([a]);
    });

    it('使用 string 作为 domain', () => {
      @Injectable({ domain: 'domain' })
      class T {}

      @Injectable({ domain: 'domain' })
      class K {}

      injector.addProviders(T, K);
      const result = injector.getFromDomain('domain');
      expect(result.length).toBe(2);
      expect(result[0]).toBeInstanceOf(T);
      expect(result[1]).toBeInstanceOf(K);
    });

    it('使用 Token 作为 domain', () => {
      const domain = Symbol('domain');

      @Injectable({ domain })
      class T {}

      @Injectable({ domain })
      class K {}

      injector.addProviders(T, K);
      const result = injector.getFromDomain(domain);
      expect(result.length).toBe(2);
      expect(result[0]).toBeInstanceOf(T);
      expect(result[1]).toBeInstanceOf(K);
    });

    it('交叉多个 Domain', () => {
      @Injectable({ domain: ['domain1', 'domain2'] })
      class T {}

      @Injectable({ domain: ['domain3', 'domain2'] })
      class K {}

      injector.addProviders(T, K);
      const result1 = injector.getFromDomain('domain1');
      expect(result1.length).toBe(1);

      const result2 = injector.getFromDomain('domain2');
      expect(result2.length).toBe(2);

      const result3 = injector.getFromDomain('domain3');
      expect(result3.length).toBe(1);
    });
  });

  describe('id', () => {
    it('创建注册器实例的时候会有 ID 数据', () => {
      const injector1 = new Injector();
      const injector2 = new Injector();
      expect(injector1.id.startsWith('Injector')).toBeTruthy();
      expect(injector1.id).not.toBe(injector2.id);
    });

    it('实例对象有 ID 数据', () => {
      const injector = new Injector();
      const instance1 = injector.get(A);
      const instance2 = injector.get(A);
      const instance3 = injector.get(B);

      expect((instance1 as any).__injectorId).toBe(injector.id);
      expect((instance2 as any).__injectorId).toBe(injector.id);
      expect((instance3 as any).__injectorId).toBe(injector.id);

      expect((instance1 as any).__id.startsWith('Instance')).toBeTruthy();
      expect((instance1 as any).__id).toBe((instance2 as any).__id);
      expect((instance1 as any).__id).not.toBe((instance3 as any).__id);
    });
  });

  describe('hook', () => {
    it('使用代码来创建hook', async () => {
      const injector = new Injector();
      @Injectable()
      class TestClass {
        add(a: number, b: number): number {
          return a + b;
        }
      }

      @Injectable()
      class TestClass1 {
        add(a: number, b: number): number {
          return a + b;
        }
      }

      @Injectable()
      class TestClass2 {
        add(a: number, b: number): number {
          return a + b;
        }
      }

      @Injectable()
      class TestClass3 {
        add(a: number, b: number): number {
          return a + b;
        }
      }

      @Injectable()
      class TestClass4 {
        async add(a: number, b: number): Promise<number> {
          return a + b;
        }
      }

      @Injectable()
      class TestClass5 {
        async add(a: number, b: number): Promise<number> {
          return a + b;
        }
      }

      injector.createHook<TestClass, [number, number], number>({
        hook: (joinPoint: IBeforeJoinPoint<TestClass, [number, number], number>) => {
          const [a, b] = joinPoint.getArgs();
          joinPoint.setArgs([a + 1, b + 1]);
        },
        method: 'add',
        target: TestClass,
        type: HookType.Before,
      });
      injector.createHook({
        hook: () => undefined,
        method: 'add',
        target: TestClass,
        type: 'other' as any, // 不会造成任何影响(为了提高覆盖率)
      });
      const testClass = injector.get(TestClass);
      expect(testClass.add(1, 2)).toBe(5);
      expect(testClass.add(3, 4)).toBe(9);

      // 同步变成异步
      // Async hook on sync target
      injector.createHook<TestClass1, [number, number], number>({
        awaitPromise: true,
        hook: async (joinPoint: IBeforeJoinPoint<TestClass1, [number, number], number>) => {
          const [a, b] = joinPoint.getArgs();
          await new Promise((resolve) => {
            setTimeout(resolve, 1000);
          });
          joinPoint.setArgs([a + 1, b + 1]);
        },
        method: 'add',
        target: TestClass1,
        type: HookType.Before,
      });
      injector.createHook<TestClass1, [number, number], number>({
        hook: (joinPoint: IBeforeJoinPoint<TestClass1, [number, number], number>) => {
          const [a, b] = joinPoint.getArgs();
          joinPoint.setArgs([a + 2, b + 2]);
        },
        method: 'add',
        target: TestClass1,
        type: HookType.Before,
      });
      const testClass1 = injector.get(TestClass1);
      const ret = testClass1.add(1, 2);
      expect(ret).toBeInstanceOf(Promise);
      expect(await ret).toBe(9);

      injector.createHook<TestClass2, [number, number], number>({
        hook: async (joinPoint) => {
          const result = joinPoint.getResult();
          joinPoint.setResult(result + 1);
        },
        method: 'add',
        target: TestClass2,
        type: HookType.After,
      });
      const testClass2 = injector.get(TestClass2);
      expect(testClass2.add(1, 2)).toBe(4);

      injector.createHooks([
        {
          hook: (joinPoint) => {
            joinPoint.proceed();
            const result = joinPoint.getResult();
            if (result === 3) {
              return joinPoint.setResult(10);
            }
          },
          method: 'add',
          target: TestClass3,
          type: HookType.Around,
        },
      ]);
      const testClass3 = injector.get(TestClass3);
      expect(testClass3.add(1, 2)).toBe(10);
      expect(testClass3.add(1, 3)).toBe(4);

      // Async hook on async target
      injector.createHooks([
        {
          awaitPromise: true,
          hook: async (joinPoint) => {
            joinPoint.proceed();
            const result = await joinPoint.getResult();
            if (result === 3) {
              return joinPoint.setResult(10);
            }
          },
          method: 'add',
          target: TestClass4,
          type: HookType.Around,
        },
      ]);
      const testClass4 = injector.get(TestClass4);
      expect(await testClass4.add(1, 2)).toBe(10);

      // Sync hook on async target
      injector.createHook<TestClass5, [number, number], number>({
        hook: async (joinPoint) => {
          const [a, b] = joinPoint.getArgs();
          joinPoint.setArgs([a + 1, b + 1]);
          joinPoint.proceed();
        },
        method: 'add',
        target: TestClass5,
        type: HookType.Around,
      });
      const testClass5 = injector.get(TestClass5);
      expect(await testClass5.add(1, 2)).toBe(5);
    });

    it('使用注解来创建hook', async () => {
      const TestClassToken = Symbol();

      const pendings: Array<Promise<any>> = [];
      @Injectable()
      class TestClass {
        exp = 1;

        add(a: number, b: number): number {
          return a + b;
        }

        addPromise(a: number, b: number): number {
          return a + b;
        }

        minus(a: number, b: number): number {
          return a - b;
        }

        multiple(a: number, b: number): number {
          this.exp *= a * b;
          return a * b;
        }

        throwError(): void {
          throw new Error('testError');
        }

        throwError2(): void {
          throw new Error('testError2');
        }

        async throwRejection(): Promise<void> {
          throw new Error('testRejection');
        }

        // 测试内部方法调用是否成功被拦截
        anotherAdd(a: number, b: number) {
          return this.add(a, b);
        }

        // 不会被成功拦截
        bindedAdd = (a: number, b: number) => {
          return this.add(a, b);
        };
      }

      @Aspect()
      @Injectable()
      class TestAspect {
        record = 2;

        multipleTime = 0;

        thrownError: any;

        thrownRejection: any;

        @Before<TestClass, [number, number], number>(TestClass, 'add')
        interceptAdd(joinPoint: IBeforeJoinPoint<TestClass, [number, number], number>) {
          const [a, b] = joinPoint.getArgs();
          expect(joinPoint.getMethodName()).toBe('add');
          expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
          joinPoint.setArgs([a * 10, b * 10]);
          pendings.push(
            new Promise<void>((resolve, reject) => {
              setTimeout(() => {
                try {
                  expect(() => joinPoint.setArgs([1, 0])).toThrowError();
                  resolve();
                } catch (e) {
                  reject(e);
                }
              }, 100);
            }),
          );
        }

        @Before<TestClass, [number, number], Promise<number>>(TestClass, 'addPromise')
        interceptAddPromise(joinPoint: IBeforeJoinPoint<TestClass, [number, number], Promise<number>>) {
          const [a, b] = joinPoint.getArgs();
          expect(joinPoint.getMethodName()).toBe('addPromise');
          expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
          joinPoint.setArgs([a * 10, b * 10]);
        }

        @After<TestClass, [number, number], Promise<number>>(TestClass, 'addPromise', { await: true })
        async interceptAddPromiseAfter(joinPoint: IAfterJoinPoint<TestClass, [number, number], Promise<number>>) {
          const result = await joinPoint.getResult();
          expect(joinPoint.getMethodName()).toBe('addPromise');
          expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
          await new Promise((resolve) => {
            setTimeout(resolve, 1000);
          });
          joinPoint.setResult(Promise.resolve(result * 5));
        }

        @After<TestClass, [number, number], number>(TestClass, 'minus')
        interceptMinus(joinPoint: IAfterJoinPoint<TestClass, [number, number], number>) {
          expect(joinPoint.getMethodName()).toBe('minus');
          expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
          const result = joinPoint.getResult();
          joinPoint.setResult(result * 20);
          pendings.push(
            new Promise<void>((resolve, reject) => {
              setTimeout(() => {
                try {
                  expect(() => joinPoint.setResult(100)).toThrowError();
                  resolve();
                } catch (e) {
                  reject(e);
                }
              }, 100);
            }),
          );
        }

        @Around<TestClass, [number, number], number>(TestClass, 'multiple')
        interceptMultiple(joinPoint: IAroundJoinPoint<TestClass, [number, number], number>) {
          expect(joinPoint.getMethodName()).toBe('multiple');
          expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
          joinPoint.proceed();
          const result = joinPoint.getResult();
          this.record *= result;
          joinPoint.setResult(this.record);
        }

        @AfterReturning(TestClass, 'multiple')
        afterMultiple(joinPoint: IAfterReturningJoinPoint<TestClass, [number, number], number>) {
          expect(joinPoint.getMethodName()).toBe('multiple');
          expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
          expect(joinPoint.getResult()).toBe(this.record);
          this.multipleTime++;
        }

        @AfterReturning(TestClass, 'multiple')
        afterMultipleButThrowError(joinPoint: IAfterReturningJoinPoint<TestClass, [number, number], number>) {
          throw new Error('error in AfterReturning');
        }

        @Before<TestClass, [number, number], number>(TestClassToken, 'add')
        interceptAddByToken(joinPoint: IBeforeJoinPoint<TestClass, [number, number], number>) {
          expect(joinPoint.getMethodName()).toBe('add');
          expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
          const [a, b] = joinPoint.getArgs();
          joinPoint.setArgs([a * 20, b * 20]);
        }

        @AfterThrowing(TestClass, 'throwError')
        afterThrowError(joinPoint: IAfterThrowingJoinPoint<TestClass, [number, number], number>) {
          expect(joinPoint.getMethodName()).toBe('throwError');
          expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
          this.thrownError = joinPoint.getError();
        }

        @Before<TestClass, [], void>(TestClass, 'throwError2')
        beforeThrowError2(joinPoint: IBeforeJoinPoint<TestClass, [], void>) {
          expect(joinPoint.getArgs().length).toBe(0);
          return;
        }

        @AfterThrowing(TestClass, 'throwRejection')
        afterThrowRejection(joinPoint: IAfterThrowingJoinPoint<TestClass, [number, number], number>) {
          expect(joinPoint.getMethodName()).toBe('throwRejection');
          expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
          expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
          this.thrownRejection = joinPoint.getError();
        }
      }

      @Aspect()
      @Injectable()
      class EmptyTestAspect {}

      const injector = new Injector();
      injector.addProviders({ token: TestClassToken, useClass: TestClass });
      injector.addProviders(TestAspect);
      injector.addProviders(EmptyTestAspect);
      const testClass = injector.get(TestClass);
      const testClassByToken = injector.get(TestClassToken);
      const aspector = injector.get(TestAspect);
      expect(testClass.add(1, 2)).toBe(30);
      expect(testClass.anotherAdd(1, 2)).toBe(30);
      expect(testClass.bindedAdd(1, 2)).toBe(3);
      expect(await testClass.addPromise(1, 2)).toBe(150);
      expect(testClassByToken.add(1, 2)).toBe(60);
      expect(testClassByToken.anotherAdd(1, 2)).toBe(60);
      expect(testClass.minus(2, 9)).toBe(-140);
      expect(testClass.multiple(1, 2)).toBe(4);
      expect(aspector.multipleTime).toBe(1);
      expect(injector.get(TestAspect).record).toBe(4);
      expect(testClass.exp).toBe(2);
      expect(testClass.multiple(3, 4)).toBe(48);
      expect(injector.get(TestAspect).record).toBe(48);
      expect(testClass.exp).toBe(24);

      expect(() => testClass.throwError()).toThrowError(aspector.thrownError);
      let rejected = false;
      try {
        await testClass.throwRejection();
      } catch (e) {
        rejected = true;
        expect(aspector.thrownRejection).toBe(e);
      }

      expect(rejected).toBeTruthy();
      expect(() => testClass.throwError2()).toThrowError();

      await Promise.all(pendings);
    });

    it('子injector应该正确拦截', () => {
      @Injectable()
      class TestClass {
        add(a: number, b: number): number {
          return a + b;
        }

        minus(a: number, b: number): number {
          return a - b;
        }

        multiple(a: number, b: number): number {
          return a * b;
        }
      }

      @Injectable()
      class TestClass2 {
        add(a: number, b: number): number {
          return a + b;
        }

        minus(a: number, b: number): number {
          return a - b;
        }

        multiple(a: number, b: number): number {
          return a * b;
        }
      }
      @Aspect()
      @Injectable()
      class TestAspect {
        @Before(TestClass, 'add')
        interceptAdd(joinPoint: IBeforeJoinPoint<TestClass, [number, number], number>) {
          const [a, b] = joinPoint.getArgs();
          joinPoint.setArgs([a * 10, b * 10]);
        }

        @Before(TestClass2, 'add')
        interceptAdd2(joinPoint: IBeforeJoinPoint<TestClass2, [number, number], number>) {
          const [a, b] = joinPoint.getArgs();
          joinPoint.setArgs([a * 10, b * 10]);
        }
      }

      @Aspect()
      @Injectable()
      class TestAspect2 {
        @Before(TestClass, 'add')
        interceptAdd(joinPoint: IBeforeJoinPoint<TestClass, [number, number], number>) {
          const [a, b] = joinPoint.getArgs();
          joinPoint.setArgs([a * 20, b * 20]);
        }
        @Before(TestClass2, 'add')
        interceptAdd2(joinPoint: IBeforeJoinPoint<TestClass2, [number, number], number>) {
          const [a, b] = joinPoint.getArgs();
          joinPoint.setArgs([a * 20, b * 20]);
        }
      }

      const injector = new Injector([TestClass], { strict: true });
      const injector2 = injector.createChild();
      injector.addProviders(TestAspect);
      injector2.addProviders(TestAspect2);
      injector2.addProviders(TestClass2);
      const testClass = injector.get(TestClass);
      const testClassChild = injector2.get(TestClass);
      const testClassChild2 = injector2.get(TestClass2);
      expect(testClass.add(1, 2)).toBe(30);
      expect(testClassChild.add(1, 2)).toBe(30); // 仅仅命中parent中的Hook
      expect(testClassChild2.add(1, 2)).toBe(600); // 两边的hook都会命中
    });
  });

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
      }).toThrow(InjectorError.onMultipleCaseNoCreatorFound('Token'));
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
