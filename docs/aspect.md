# Aspect

## Quick Start

```ts
const AToken = Symbol('AToken');
interface AToken {
  add(a: number): number;
}

@Injectable()
class AImpl {
  private sum = 0;

  add(a: number) {
    this.sum += a;
    return this.sum;
  }
}

@Aspect()
@Injectable()
class OneAspectOfA {
  // 拦截 AToken 实现 class 的 add 方法，在 add 方法执行前，将它的参数乘以2
  @Before(AToken, 'add')
  beforeAdd(joinPoint: IBeforeJoinPoint<AToken, [number], number>) {
    const [a] = joinPoint.getArgs();
    joinPoint.setArgs([a * 2]);
  }
  @After(AToken, 'add')
  afterAdd(joinPoint: IAfterJoinPoint<AToken, [number], number>) {
    const ret = joinPoint.getResult();
    joinPoint.setResult(ret * 5); // 将返回值乘以5
  }
}

// 必须添加 Aspect 的 class
injector.addProviders(OneAspectOfA);
```

这种情况下，第一次调用 `const hookedSum = injector.get(AToken).add(2)` 后, AImpl 中的 sum 为 4, hookedSum 为 20

## Other hooks

```ts
@Around(AToken, 'add')
aroundAdd(joinPoint: IAroundJoinPoint<AToken, [number, number], number>) {
  const [a, b] = joinPoint.getArgs();
  if (a === b) {
    console.log('adding two same numbers');
  }
  joinPoint.proceed();
  const result = joinPoint.getResult();
  if (result === 10) {
     joinPoint.setResult(result * 10);
  }
}

@AfterReturning(AToken, 'add')
afterReturningAdd(joinPoint: IAfterReturningJoinPoint<AToken, [number, number], number>) {
  const ret = joinPoint.getResult();
  console.log('the return value is ' + ret);
}

@AfterThrowing(AToken, 'add') afterThrowingAdd(joinPoint: IAfterReturningJoinPoint<AToken, [number, number], number>) {
   const error = joinPoint.getError(); console.error('产生了一个错误', error);
}
```
