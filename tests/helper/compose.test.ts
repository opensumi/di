import compose, { Middleware } from '../../src/compose';

interface ExampleContext {
  getName(): string;
  getResult(): any;
}

describe('di compose', () => {
  it('should work', async () => {
    const arr = [] as number[];

    const mockFn = jest.fn();

    const middleware1: Middleware<ExampleContext> = async (ctx) => {
      const name = ctx.getName();
      console.log(`middleware1: ${name}`);
      arr.push(1);
      await ctx.proceed();
      const result = ctx.getResult();
      console.log(`middleware1 result: ${result}`);
      console.log(`middleware1 after: ${name}`);
      arr.push(6);
    };

    const middleware2: Middleware<ExampleContext> = async (ctx) => {
      const name = ctx.getName();
      console.log(`middleware2: ${name}`);
      arr.push(2);
      await ctx.proceed();
      const result = ctx.getResult();
      expect(result).toBe('final result');
      console.log(`middleware2 result: ${result}`);
      console.log(`middleware2 after: ${name}`);
      arr.push(5);
    };

    const middleware3: Middleware<ExampleContext> = async (ctx) => {
      const name = ctx.getName();
      console.log(`middleware3: ${name}`);
      arr.push(3);
      await ctx.proceed();
      const result = ctx.getResult();
      expect(result).toBe('final result');
      console.log(`middleware3 result: ${result}`);
      console.log(`middleware3 after: ${name}`);
      arr.push(4);
    };

    const all = compose<ExampleContext>([middleware1, middleware2, middleware3]);
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
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(mockFn).toBeCalledTimes(1);
    expect(arr).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6]));
  });

  it('can worked with sync', () => {
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

  it('should be able to be called multiple times', () => {
    interface WrappedContext {
      arr: number[];
      push: (num: number) => void;
    }

    const middleware1: Middleware<WrappedContext> = (ctx) => {
      ctx.push(1);
      ctx.proceed();
      ctx.push(4);
    };

    const middleware2: Middleware<WrappedContext> = (ctx) => {
      ctx.push(2);
      ctx.proceed();
      ctx.push(3);
    };

    const all = compose<WrappedContext>([middleware1, middleware2]);
    const context1 = {
      arr: [],
      proceed() {
        console.log('invoked');
      },
      push(num) {
        this.arr.push(num);
      },
    } as WrappedContext;
    const context2 = {
      arr: [],
      proceed() {
        console.log('invoked');
      },
      push(num) {
        this.arr.push(num);
      },
    } as WrappedContext;
    all(context1);
    all(context2);

    expect(context1.arr).toEqual(context2.arr);
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

  it('should reject on errors in middleware', async () => {
    const arr = [] as number[];

    const mockFn = jest.fn();

    const middleware1: Middleware<ExampleContext> = async (ctx) => {
      const name = ctx.getName();
      console.log(`middleware1: ${name}`);
      arr.push(1);
      await ctx.proceed();
      const result = ctx.getResult();
      console.log(`middleware1 result: ${result}`);
      console.log(`middleware1 after: ${name}`);
      arr.push(6);
    };

    const middleware2: Middleware<ExampleContext> = async (ctx) => {
      const name = ctx.getName();
      console.log(`middleware2: ${name}`);
      arr.push(2);
      await ctx.proceed();
      const result = ctx.getResult();
      expect(result).toBe('final result');
      console.log(`middleware2 result: ${result}`);
      console.log(`middleware2 after: ${name}`);
      arr.push(5);
    };

    const middleware3: Middleware<ExampleContext> = async (ctx) => {
      throw new Error('error in middleware3');
    };

    const all = compose<ExampleContext>([middleware1, middleware2, middleware3]);
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
    expect(arr).toEqual(expect.arrayContaining([1, 2]));
    expect(result).rejects.toThrowError('error in middleware3');
  });
});
