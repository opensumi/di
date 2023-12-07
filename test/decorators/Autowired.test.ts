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
  it('will throw error if the Token is not defined, when performing dependency injection.', () => {
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

  it('define dependencies with null, expect an error', () => {
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

  it('Define dependencies using the original Number, expect an error', () => {
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
