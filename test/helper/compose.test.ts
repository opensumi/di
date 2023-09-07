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

    const middleware2: Middleware<ExampleContext> = async (ctx) => {
      const name = ctx.getName();
      console.log(`middleware2: ${name}`);
      await ctx.proceed();
      const result = ctx.getResult();
      console.log(`middleware2 result: ${result}`);
      console.log(`middleware2 after: ${name}`);
    };

    const all = compose<ExampleContext>([middleware1, middleware2]);
    let ret = undefined as any;
    await all({
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
  });
});
