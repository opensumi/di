import { Injectable, Aspect, Around, IAroundJoinPoint, Injector } from '../src';

describe('aspect', () => {
  jest.setTimeout(50 * 1000);

  it('test around hook: union model1', async () => {
    function delay(value: number, time: number): Promise<number> {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(value);
        }, time);
      });
    }

    @Injectable()
    class TestClass {
      async add(a: number, b: number): Promise<number> {
        const data = await delay(a + b, 1000);
        console.log('TestClass add result', data);
        return data;
      }
    }

    @Aspect()
    @Injectable()
    class TestAspect {
      @Around<TestClass, [number, number], number>(TestClass, 'add', { await: true })
      async interceptAdd(joinPoint: IAroundJoinPoint<TestClass, [number, number], number>) {
        expect(joinPoint.getMethodName()).toBe('add');
        expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
        expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
        await joinPoint.proceed();
        const result = await joinPoint.getResult();
        console.log('TestAspect', result);
      }
    }

    @Aspect()
    @Injectable()
    class TestAspect2 {
      @Around<TestClass, [number, number], number>(TestClass, 'add', { await: true })
      async interceptAdd(joinPoint: IAroundJoinPoint<TestClass, [number, number], number>) {
        const other = await delay(10, 1000);
        console.log('TestAspect2 async', other);
        expect(joinPoint.getMethodName()).toBe('add');
        expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
        expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
        await joinPoint.proceed();
        const result = await joinPoint.getResult();
        console.log('TestAspect2', result);
      }
    }

    const injector = new Injector();
    injector.addProviders(TestClass);
    injector.addProviders(TestAspect);
    injector.addProviders(TestAspect2);

    const testClass = injector.get(TestClass);

    const result = await testClass.add(1, 2);
    console.log('TestClass invoke result', result);

    expect(result).toBe(3);
  });

  it('test union model: union model2', async () => {
    function delay(value: number, time: number): Promise<number> {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(value);
        }, time);
      });
    }

    @Injectable()
    class TestClass {
      async add(a: number, b: number): Promise<number> {
        const data = await delay(a + b, 1000);
        console.log('TestClass add result', data);
        return data;
      }
    }

    @Aspect()
    @Injectable()
    class TestAspect {
      @Around<TestClass, [number, number], number>(TestClass, 'add', { await: true })
      async interceptAdd(joinPoint: IAroundJoinPoint<TestClass, [number, number], number>) {
        expect(joinPoint.getMethodName()).toBe('add');
        expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
        expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
        joinPoint.proceed();
        const result = await joinPoint.getResult();
        console.log('TestAspect', result);
      }
    }

    @Aspect()
    @Injectable()
    class TestAspect2 {
      @Around<TestClass, [number, number], number>(TestClass, 'add', { await: true })
      async interceptAdd(joinPoint: IAroundJoinPoint<TestClass, [number, number], number>) {
        const other = await delay(10, 1000);
        console.log('TestAspect2 async', other);
        expect(joinPoint.getMethodName()).toBe('add');
        expect(joinPoint.getOriginalArgs()).toBeInstanceOf(Array);
        expect(joinPoint.getThis()).toBeInstanceOf(TestClass);
        joinPoint.proceed();
        const result = await joinPoint.getResult();
        console.log('TestAspect2', result);
      }
    }

    const injector = new Injector();
    injector.addProviders(TestClass);
    injector.addProviders(TestAspect);
    injector.addProviders(TestAspect2);

    const testClass = injector.get(TestClass);

    const result = await testClass.add(1, 2);
    console.log('TestClass invoke result', result);

    expect(result).toBe(3);
  });

  it('aspect针对token注入的内容，不会多次实例化', () => {
    const spy = jest.fn();

    @Injectable()
    class B {
      async do() {
        console.log('do');
      }
    }
    @Aspect()
    @Injectable()
    class A {
      constructor() {
        spy();
      }

      @Around(B, 'do', { await: true })
      async aroundDo() {
        console.log('aroundDo');
      }
    }
    const token = 'token';

    const injector = new Injector();
    injector.addProviders({
      token,
      useClass: A,
    });
    injector.addProviders(B);
    injector.get(token);
    injector.get(B);
    expect(spy).toHaveBeenCalledTimes(1);

    const b = injector.get(B);
    b.do();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
