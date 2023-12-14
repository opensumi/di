import { Injectable, Injector, CreatorStatus, Autowired } from '../../src';

@Injectable()
class A {}

@Injectable()
class B {
  @Autowired()
  a!: A;
}

describe('dispose', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector();
  });

  it('销毁不存在的对象不会出错', () => {
    injector.disposeOne('noop');
  });

  it('销毁没有初始化的 Provider ', () => {
    const spy = jest.fn();

    @Injectable()
    class DisposeCls {
      dispose = spy;
    }

    injector.addProviders(DisposeCls);
    injector.disposeOne(DisposeCls);
    injector.disposeAll();

    expect(spy).toBeCalledTimes(0);
  });

  it('成功销毁单个对象', () => {
    const a = injector.get(A);
    expect(injector.hasInstance(a)).toBeTruthy();

    injector.disposeOne(A);
    expect(injector.hasInstance(a)).toBeFalsy();

    const creator = injector.creatorMap.get(A);
    expect(creator!.status).toBe(CreatorStatus.init);
    expect(creator!.instances).toBeUndefined();

    const a2 = injector.get(A);
    expect(a).not.toBe(a2);
  });

  it('成功进行批量对象销毁', () => {
    const a = injector.get(A);
    const b = injector.get(B);
    expect(injector.hasInstance(a)).toBeTruthy();
    expect(injector.hasInstance(b)).toBeTruthy();

    injector.disposeAll();
    expect(injector.hasInstance(a)).toBeFalsy();
    expect(injector.hasInstance(b)).toBeFalsy();

    const creatorA = injector.creatorMap.get(A);
    expect(creatorA!.status).toBe(CreatorStatus.init);
    expect(creatorA!.instances).toBeUndefined();

    const creatorB = injector.creatorMap.get(B);
    expect(creatorB!.status).toBe(CreatorStatus.init);
    expect(creatorB!.instances).toBeUndefined();

    const a2 = injector.get(A);
    expect(a).not.toBe(a2);
  });

  it('销毁单个对象的时候成功调用对象的 dispose 函数', () => {
    const spy = jest.fn();

    @Injectable()
    class DisposeCls {
      dispose = spy;
    }

    const instance = injector.get(DisposeCls);
    expect(injector.hasInstance(instance)).toBeTruthy();
    expect(instance).toBeInstanceOf(DisposeCls);

    injector.disposeOne(DisposeCls);
    expect(injector.hasInstance(instance)).toBeFalsy();
    expect(spy).toBeCalledTimes(1);

    injector.disposeOne(DisposeCls);
    expect(spy).toBeCalledTimes(1);
  });

  it('销毁全部的时候成功调用对象的 dispose 函数', () => {
    const spy = jest.fn();

    @Injectable()
    class DisposeCls {
      dispose = spy;
    }

    const instance = injector.get(DisposeCls);
    expect(injector.hasInstance(instance)).toBeTruthy();
    expect(instance).toBeInstanceOf(DisposeCls);

    injector.disposeAll();
    expect(injector.hasInstance(instance)).toBeFalsy();
    expect(spy).toBeCalledTimes(1);

    injector.disposeOne(DisposeCls);
    expect(spy).toBeCalledTimes(1);
  });

  it("dispose an instance will also dispose it's instance", () => {
    const spy = jest.fn();

    @Injectable()
    class A {
      constructor() {
        spy();
      }
    }

    @Injectable()
    class B {
      @Autowired()
      a!: A;
    }

    const instance = injector.get(B);
    expect(injector.hasInstance(instance)).toBeTruthy();
    expect(instance).toBeInstanceOf(B);
    expect(instance.a).toBeInstanceOf(A);
    expect(spy).toBeCalledTimes(1);

    injector.disposeOne(A);
    const creatorA = injector.creatorMap.get(A)!;
    expect(creatorA.status).toBe(CreatorStatus.init);
    expect(creatorA.instances).toBeUndefined();

    expect(instance.a).toBeInstanceOf(A);
    expect(spy).toBeCalledTimes(2);
  });
});

describe('dispose asynchronous', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector();
  });

  it('销毁不存在的对象不会出错', async () => {
    await injector.disposeOne('noop');
  });

  it('销毁没有初始化的 Provider ', async () => {
    const spy = jest.fn();

    @Injectable()
    class DisposeCls {
      async dispose() {
        spy();
      }
    }

    injector.addProviders(DisposeCls);
    await injector.disposeOne(DisposeCls);
    await injector.disposeAll();

    expect(spy).toBeCalledTimes(0);
  });

  it('成功销毁单个对象', async () => {
    const a = injector.get(A);
    expect(injector.hasInstance(a)).toBeTruthy();

    await injector.disposeOne(A);
    expect(injector.hasInstance(a)).toBeFalsy();

    const creator = injector.creatorMap.get(A);
    expect(creator!.status).toBe(CreatorStatus.init);
    expect(creator!.instances).toBeUndefined();

    const a2 = injector.get(A);
    expect(a).not.toBe(a2);
  });

  it('成功进行批量对象销毁', async () => {
    const a = injector.get(A);
    const b = injector.get(B);
    expect(injector.hasInstance(a)).toBeTruthy();
    expect(injector.hasInstance(b)).toBeTruthy();

    await injector.disposeAll();
    expect(injector.hasInstance(a)).toBeFalsy();
    expect(injector.hasInstance(b)).toBeFalsy();

    const creatorA = injector.creatorMap.get(A);
    expect(creatorA!.status).toBe(CreatorStatus.init);
    expect(creatorA!.instances).toBeUndefined();

    const creatorB = injector.creatorMap.get(B);
    expect(creatorB!.status).toBe(CreatorStatus.init);
    expect(creatorB!.instances).toBeUndefined();

    const a2 = injector.get(A);
    expect(a).not.toBe(a2);
  });

  it('销毁单个对象的时候成功调用对象的 dispose 函数', async () => {
    const spy = jest.fn();

    @Injectable()
    class DisposeCls {
      dispose = spy;
    }

    const instance = injector.get(DisposeCls);
    expect(injector.hasInstance(instance)).toBeTruthy();
    expect(instance).toBeInstanceOf(DisposeCls);

    await injector.disposeOne(DisposeCls);
    expect(injector.hasInstance(instance)).toBeFalsy();
    expect(spy).toBeCalledTimes(1);

    await injector.disposeOne(DisposeCls);
    expect(spy).toBeCalledTimes(1);
  });

  it('销毁全部的时候成功调用对象的 dispose 函数', async () => {
    const spy = jest.fn();

    @Injectable()
    class DisposeCls {
      async dispose() {
        spy();
      }
    }
    const instance = injector.get(DisposeCls);
    expect(injector.hasInstance(instance)).toBeTruthy();
    expect(instance).toBeInstanceOf(DisposeCls);

    await injector.disposeAll();
    expect(injector.hasInstance(instance)).toBeFalsy();
    expect(spy).toBeCalledTimes(1);

    await injector.disposeOne(DisposeCls);
    expect(spy).toBeCalledTimes(1);
  });

  it("dispose creator with multiple instance will call instances's dispose method", async () => {
    const spy = jest.fn();

    @Injectable({ multiple: true })
    class DisposeCls {
      dispose = async () => {
        spy();
      };
    }

    const instance = injector.get(DisposeCls);
    expect(injector.hasInstance(instance)).toBeTruthy();
    expect(instance).toBeInstanceOf(DisposeCls);

    const instance2 = injector.get(DisposeCls);
    expect(injector.hasInstance(instance2)).toBeTruthy();
    expect(instance2).toBeInstanceOf(DisposeCls);

    await injector.disposeOne(DisposeCls);
    expect(injector.hasInstance(instance)).toBeFalsy();
    expect(injector.hasInstance(instance2)).toBeFalsy();
    expect(spy).toBeCalledTimes(2);

    await injector.disposeOne(DisposeCls);
    expect(spy).toBeCalledTimes(2);
  });

  it("dispose an instance will also dispose it's instance", async () => {
    const spy = jest.fn();

    @Injectable()
    class A {
      constructor() {
        spy();
      }
      async dispose() {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    @Injectable()
    class B {
      @Autowired()
      a!: A;
    }

    const instance = injector.get(B);
    expect(injector.hasInstance(instance)).toBeTruthy();
    expect(instance).toBeInstanceOf(B);
    expect(instance.a).toBeInstanceOf(A);
    expect(spy).toBeCalledTimes(1);

    await injector.disposeOne(A);
    const creatorA = injector.creatorMap.get(A);
    expect(creatorA!.status).toBe(CreatorStatus.init);
    expect(creatorA!.instances).toBeUndefined();

    expect(instance.a).toBeInstanceOf(A);
    expect(spy).toBeCalledTimes(2);
  });

  it('dispose should dispose instance of useFactory', () => {
    const injector = new Injector();
    let aValue = 1;
    const token = Symbol.for('A');

    injector.addProviders(
      ...[
        {
          token,
          useFactory: () => aValue,
        },
      ],
    );

    @Injectable()
    class B {
      @Autowired(token)
      a!: number;
    }

    const instance = injector.get(B);
    expect(injector.hasInstance(instance)).toBeTruthy();
    expect(instance).toBeInstanceOf(B);
    expect(instance.a).toBe(1);

    injector.disposeOne(token);
    aValue = 2;
    expect(instance.a).toBe(2);
  });
});
