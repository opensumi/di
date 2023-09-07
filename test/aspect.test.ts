import { Injectable, Aspect, Around, IAroundJoinPoint, Injector } from '../src';

describe('aspect', () => {
  jest.setTimeout(1000 * 1000);
  /**
   * 下面的 case 目前输出：
   * TestAspect2 async 10
   * 然后执行超时
   */
  it('异步的hook异常, promise无法结束', async () => {
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

  /**
   * 下面的 case 目前输出：
   * TestAspect2 async 10
   * TestAspect2 undefined
   * TestClass invoke result undefined
   * 到这里单测就停了，其实后续会再执行
   * TestAspect undefined
   * TestClass add result 3
   */
  it('异步的hook异常, 等待的promise错误', async () => {
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
});
