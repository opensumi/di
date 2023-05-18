import { Injectable, Injector, Inject } from '../../src';
import * as InjectorError from '../../src/error';

describe('严格模式', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([], { strict: true });
  });

  it('严格模式下，没有预先添加 Provider 的时候，会报错', () => {
    @Injectable()
    class T {}

    expect(() => injector.get(T)).toThrow(InjectorError.noProviderError(T));
  });

  it('严格模式下，构造函数的参数依赖会报错', () => {
    const token = Symbol('noop');

    @Injectable()
    class T {
      constructor(@Inject(token) public a: string) {}
    }

    expect(() => {
      injector.addProviders(T);
      injector.get(T);
    }).toThrow(InjectorError.noProviderError(token));
  });

  it('严格模式下，overrideProviders 能正常生效', () => {
    const token = Symbol('noop');

    @Injectable()
    class T {}

    @Injectable()
    class T2 {}

    injector.addProviders(T);
    const t1 = injector.get(T);
    expect(t1).toBeInstanceOf(T);

    injector.overrideProviders({ token: T, useClass: T2 });
    const t2 = injector.get(T);
    expect(t2).toBeInstanceOf(T2);
  });
});
