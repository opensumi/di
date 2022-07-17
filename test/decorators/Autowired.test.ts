import * as Error from '../../src/error';
import { Autowired, Injectable } from '../../src';

describe('Autowired decorator', () => {
  it('do not support number type', () => {
    expect(() => {
      @Injectable()
      class B {
        @Autowired()
        a!: number;
      }
      return B;
    }).toThrow();
  });
  it('进行依赖注入的时候，没有定义 Token 会报错', () => {
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
    }).toThrow(Error.tokenInvalidError(class B {}, 'a', Object));
  });

  it('使用 null 进行依赖定义，期望报错', () => {
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

  it('使用原始 Number 进行依赖定义，期望报错', () => {
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
});
