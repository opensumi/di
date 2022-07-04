import * as Error from '../src/error';
import { Autowired, Injectable, Inject, Injector, getInjectableOpts } from '../src';

// eslint-disable-next-line
const pkg = require('../package.json');

describe(__filename, () => {
  it('Autowired 进行依赖注入的时候，没有定义 Token 会报错', () => {
    expect(() => {
      interface A {
        log(): void;
      }
      @Injectable()
      class B {
        @Autowired()
        a!: A;
      }
      return B;
    }).toThrow(Error.notSupportTokenError(class B {}, 'a', Object));
  });

  it('Autowired 使用 null 进行依赖定义，期望报错', () => {
    expect(() => {
      interface A {
        log(): void;
      }
      @Injectable()
      class B {
        @Autowired(null as any)
        a!: A;
      }
      return B;
    }).toThrow();
  });

  it('Autowired 使用原始 Number 进行依赖定义，期望报错', () => {
    expect(() => {
      interface A {
        log(): void;
      }
      @Injectable()
      class B {
        @Autowired(Number)
        a!: A;
      }
      return B;
    }).toThrow();
  });

  it('Injectable 的时候允许多次描述', () => {
    @Injectable({ multiple: true })
    @Injectable({ domain: [] })
    class A {}

    @Injectable({ domain: [] })
    @Injectable({ multiple: true })
    class B {}

    const optsA = getInjectableOpts(A);
    expect(optsA).toEqual({ multiple: true, domain: [], version: pkg.version });

    const optsB = getInjectableOpts(B);
    expect(optsB).toEqual({ multiple: true, domain: [], version: pkg.version });
  });

  it('构造函数进行依赖注入的时候，没有定义 Token 会报错', () => {
    expect(() => {
      @Injectable()
      class B {
        constructor(public a: any) {}
      }
      return B;
    }).toThrow(Error.notInjectError(class B {}, 0));
  });

  it('使用数字作为 Token 进行依赖注入的时候，没有定义 Token 会报错', () => {
    expect(() => {
      @Injectable()
      class B {
        constructor(@Inject(1 as any) public a: any) {}
      }
      return B;
    }).toThrow(Error.notInjectError(class B {}, 0));
  });

  it('单纯的对象使用 Autowired 进行装饰的时候，找不到 Injector 的报错', () => {
    @Injectable()
    class A {}

    class B {
      @Autowired()
      a!: A;
    }

    const b = new B();

    expect(() => {
      return b.a;
    }).toThrow(Error.noInjectorError(b));
  });

  it('父类被 Injectable 装饰过，子类可以创建', () => {
    @Injectable()
    class A {}
    class B extends A {}

    const injector = new Injector([B]);
    expect(injector.get(B)).toBeInstanceOf(B);
  });

  it('多例模式下，每个对象只会创建一个依赖', () => {
    @Injectable({ multiple: true })
    class A {}

    @Injectable()
    class D {}

    @Injectable()
    class B {
      @Autowired()
      a!: A;

      @Autowired()
      d!: D;
    }

    @Injectable()
    class C {
      @Autowired()
      a!: A;

      @Autowired()
      d!: D;
    }

    const injector = new Injector();
    const b = injector.get(B);
    const c = injector.get(C);

    expect(b.a).toBe(b.a);
    expect(c.a).toBe(c.a);
    expect(b.a).not.toBe(c.a);
    expect(b.a).not.toBe(b.d);
    expect(b.d).toBe(c.d);
  });

  it('多例模式下，多次对同一个对象进行依赖，应该有多个实例', () => {
    @Injectable({ multiple: true })
    class A {}

    @Injectable()
    class B {
      @Autowired()
      a1!: A;

      @Autowired()
      a2!: A;
    }

    const injector = new Injector();
    const b = injector.get(B);
    expect(b.a1).toBe(b.a1);
    expect(b.a2).toBe(b.a2);
    expect(b.a1).not.toBe(b.a2);
  });

  it('装饰器解析出来的依赖不是正确的 Token 的时候需要报错', () => {
    expect(() => {
      @Injectable()
      class InjectError {
        constructor(public a: string) {}
      }
    }).toThrow(Error.notInjectError(class InjectError {}, 0));

    expect(() => {
      @Injectable({ multiple: true })
      class NoError {
        constructor(public a: string) {}
      }
    }).not.toThrow();

    expect(() => {
      interface AA {
        a: string;
      }

      @Injectable()
      class InjectError {
        constructor(public a: AA) {}
      }
    }).toThrow(Error.notInjectError(class InjectError {}, 0));

    expect(() => {
      enum AAEnum {
        aa,
      }

      @Injectable()
      class InjectError {
        constructor(public aa: AAEnum) {}
      }
    }).toThrow(Error.notInjectError(class InjectError {}, 0));

    expect(() => {
      @Injectable()
      class InjectError {
        constructor(public a: number) {}
      }
    }).toThrow(Error.notInjectError(class InjectError {}, 0));

    expect(() => {
      @Injectable()
      class InjectError {
        constructor(public a: 1) {}
      }
    }).toThrow(Error.notInjectError(class InjectError {}, 0));

    expect(() => {
      @Injectable()
      class InjectError {
        constructor(public a: boolean) {}
      }
    }).toThrow(Error.notInjectError(class InjectError {}, 0));
  });
  it('can avoid runtime error with `Cannot set property on getter`', () => {
    expect.assertions(1);
    @Injectable()
    class A {}

    @Injectable()
    class B {
      @Autowired(A)
      a1!: A | null;

      trySet() {
        this.a1 = null;
      }
    }

    const injector = new Injector();
    const b = injector.get(B);
    b.trySet();
    expect(b.a1).toBeDefined();
  });
});
