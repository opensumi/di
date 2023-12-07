import {
  After,
  AfterReturning,
  AfterThrowing,
  Around,
  Aspect,
  Autowired,
  Before,
  HookType,
  IAfterJoinPoint,
  IAfterReturningJoinPoint,
  IAfterThrowingJoinPoint,
  IAroundJoinPoint,
  IBeforeJoinPoint,
  Injectable,
  Injector,
} from '../../src';

describe('hook', () => {
  it('could use code to create hook', async () => {
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
      type: 'other' as any, // for coverage
    });
    const testClass = injector.get(TestClass);
    expect(testClass.add(1, 2)).toBe(5);
    expect(testClass.add(3, 4)).toBe(9);

    // Async hook on sync target
    // the sync method will be wrapped to async method
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

  it('could use decorator to create hook', async () => {
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

  describe('hook priority', () => {
    it("hook's priority should work case1", async () => {
      @Injectable()
      class TestClass {
        async add(a: number, b: number): Promise<number> {
          return a + b;
        }
      }
      const injector = new Injector();

      const resultArray = [] as number[];

      injector.createHook<TestClass, [number, number], number>({
        hook: async (joinPoint) => {
          resultArray.push(1);
          joinPoint.proceed();
          resultArray.push(2);
          return joinPoint.setResult(9);
        },
        method: 'add',
        target: TestClass,
        type: HookType.Around,
        priority: 1001,
      });

      injector.createHooks([
        {
          hook: async (joinPoint) => {
            resultArray.push(0);
            joinPoint.proceed();
            resultArray.push(3);
            const result = await joinPoint.getResult();
            if (result === 9) {
              return joinPoint.setResult(10);
            }
          },
          method: 'add',
          target: TestClass,
          type: HookType.Around,
          priority: 10011,
        },
      ]);

      const testClass = injector.get(TestClass);
      expect(await testClass.add(1, 2)).toBe(9);
      expect(resultArray).toEqual([1, 0, 3, 2]);
    });

    it("hook's priority should work case2", async () => {
      @Injectable()
      class TestClass {
        async add(a: number, b: number): Promise<number> {
          return a + b;
        }
      }
      const injector = new Injector();

      const resultArray = [] as number[];

      injector.createHook<TestClass, [number, number], number>({
        hook: async (joinPoint) => {
          resultArray.push(1);
          joinPoint.proceed();
          resultArray.push(2);
          return joinPoint.setResult(9);
        },
        method: 'add',
        target: TestClass,
        type: HookType.Around,
        priority: 1001,
      });

      injector.createHooks([
        {
          hook: async (joinPoint) => {
            resultArray.push(0);
            joinPoint.proceed();
            resultArray.push(3);
            const result = await joinPoint.getResult();
            if (result === 9) {
              return joinPoint.setResult(10);
            }
          },
          method: 'add',
          target: TestClass,
          type: HookType.Around,
          priority: 100,
        },
      ]);

      const testClass = injector.get(TestClass);
      expect(await testClass.add(1, 2)).toBe(10);
      expect(resultArray).toEqual([0, 1, 2, 3]);
    });
  });

  it('can work in child injector', () => {
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
    expect(testClassChild.add(1, 2)).toBe(30); // on hooked by parent
    expect(testClassChild2.add(1, 2)).toBe(600); // will hooked by parent and child
  });

  it('could dispose proxied instance', () => {
    const constructorSpy = jest.fn();

    @Injectable()
    class TestClass {
      exp = 1;

      constructor() {
        constructorSpy();
      }

      add(a: number, b: number): number {
        return a + b;
      }
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
      }
    }

    @Injectable()
    class Example {
      @Autowired()
      testClass!: TestClass;

      run() {
        return this.testClass.add(1, 2);
      }
    }

    const injector = new Injector();
    injector.addProviders(TestClass);
    injector.addProviders(TestAspect);
    const testClass = injector.get(TestClass);
    expect(testClass.add(1, 2)).toBe(30);

    const example = injector.get(Example);
    expect(example.run()).toBe(30);

    expect(constructorSpy).toBeCalledTimes(1);

    injector.disposeOne(TestClass);

    expect(example.run()).toBe(30);
    expect(constructorSpy).toBeCalledTimes(2);
  });

  it('could dispose hook', () => {
    const constructorSpy = jest.fn();

    @Injectable()
    class TestClass {
      exp = 1;

      constructor() {
        constructorSpy();
      }

      add(a: number, b: number): number {
        return a + b;
      }
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
      }
    }

    @Injectable()
    class Example {
      @Autowired()
      testClass!: TestClass;

      run() {
        return this.testClass.add(1, 2);
      }
    }

    const injector = new Injector();
    injector.addProviders(TestClass);
    injector.addProviders(TestAspect);
    const testClass = injector.get(TestClass);
    expect(testClass.add(1, 2)).toBe(30);

    const example = injector.get(Example);
    expect(example.run()).toBe(30);

    expect(constructorSpy).toBeCalledTimes(1);

    injector.disposeOne(TestClass);
    injector.disposeOne(TestAspect);

    expect(example.run()).toBe(3);
    expect(testClass.add(1, 2)).toBe(3);

    expect(constructorSpy).toBeCalledTimes(2);

    injector.addProviders(TestAspect);
    injector.disposeOne(TestClass);

    expect(example.run()).toBe(30);
    expect(testClass.add(1, 2)).toBe(30);
    const testClass2 = injector.get(TestClass);
    expect(testClass2.add(1, 2)).toBe(30);
  });
});
