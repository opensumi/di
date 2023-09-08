import compose, { Middleware } from '../../src/helper/compose';

describe('di compose', () => {
  it('can worked', async () => {
    interface ExampleContext {
      getName(): string;
      getResult(): any;
    }

    const mockFn = jest.fn();

    const middleware1: Middleware<ExampleContext> = async (ctx) => {
      const name = ctx.getName();
      console.log(`middleware1: ${name}`);
      await ctx.proceed();
      const result = ctx.getResult();
      console.log(`middleware1 result: ${result}`);
      console.log(`middleware1 after: ${name}`);
    };
    middleware1.awaitPromise = true;

    const middleware2: Middleware<ExampleContext> = async (ctx) => {
      const name = ctx.getName();
      console.log(`middleware2: ${name}`);
      await ctx.proceed();
      const result = ctx.getResult();
      expect(result).toBe('final result');
      console.log(`middleware2 result: ${result}`);
      console.log(`middleware2 after: ${name}`);
    };
    middleware2.awaitPromise = true;
    const all = compose<ExampleContext>([middleware1, middleware2]);
    let ret = undefined as any;
    const result = all({
      getName() {
        return 'example';
      },
      async proceed() {
        mockFn();
        ret = 'final result';
      },
      getResult(): any {
        return ret;
      },
    });
    // if the first of the middleware await, the result will be a promise
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(mockFn).toBeCalledTimes(1);
  });

  it('can worked with sync', async () => {
    interface ExampleContext {
      getName(): string;
      getResult(): any;
    }
    const middleware1: Middleware<ExampleContext> = async (ctx) => {
      const name = ctx.getName();
      console.log(`middleware1: ${name}`);
      ctx.proceed();
      const result = ctx.getResult();
      console.log(`middleware1 result: ${result}`);
      console.log(`middleware1 after: ${name}`);
    };

    const middleware2: Middleware<ExampleContext> = async (ctx) => {
      const name = ctx.getName();
      console.log(`middleware2: ${name}`);
      ctx.proceed();
      const result = ctx.getResult();
      console.log(`middleware2 result: ${result}`);
      console.log(`middleware2 after: ${name}`);
    };

    const all = compose<ExampleContext>([middleware1, middleware2]);
    let ret = undefined as any;
    const result = all({
      getName() {
        return 'example';
      },
      proceed() {
        console.log('invoked');
        ret = 'final result';
      },
      getResult(): any {
        return ret;
      },
    });
    expect(result).toBeFalsy();
  });
  it('will throw error when call proceed twice', async () => {
    interface ExampleContext {
      getName(): string;
      getResult(): any;
    }
    const middleware1: Middleware<ExampleContext> = (ctx) => {
      const name = ctx.getName();
      console.log(`middleware1: ${name}`);
      ctx.proceed();
      const result = ctx.getResult();
      console.log(`middleware1 result: ${result}`);
      console.log(`middleware1 after: ${name}`);
    };

    const middleware2: Middleware<ExampleContext> = (ctx) => {
      const name = ctx.getName();
      console.log(`middleware2: ${name}`);
      ctx.proceed();
      ctx.proceed();
      const result = ctx.getResult();
      console.log(`middleware2 result: ${result}`);
      console.log(`middleware2 after: ${name}`);
    };

    const all = compose<ExampleContext>([middleware1, middleware2]);
    let ret = undefined as any;
    expect(() => {
      all({
        getName() {
          return 'example';
        },
        proceed() {
          console.log('invoked');
          ret = 'final result';
        },
        getResult(): any {
          return ret;
        },
      });
    }).toThrowError('ctx.proceed() called multiple times');
  });
});
