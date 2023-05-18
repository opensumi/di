import { Injectable, Injector, Autowired } from '../../src';

describe('hasInstance', () => {
  @Injectable()
  class A {}

  @Injectable()
  class B {
    @Autowired()
    a!: A;
  }

  @Injectable({ multiple: true })
  class C {}

  it('能够通过 hasInstance 查到单例对象的存在性', () => {
    const token = 'token';
    const instance = {};
    const provider = { token, useValue: instance };
    const injector = new Injector([provider, B, C]);

    expect(injector.hasInstance(instance)).toBe(true);

    const b = injector.get(B);
    expect(injector.hasInstance(b)).toBe(true);

    const c = injector.get(C);
    expect(injector.hasInstance(c)).toBe(false);
  });

  it('hasInstance 支持 primitive 的判断', () => {
    const token = 'token';
    const instance = true;
    const provider = { token, useValue: instance };
    const injector = new Injector([provider, B, C]);

    expect(injector.hasInstance(instance)).toBe(true);

    const b = injector.get(B);
    expect(injector.hasInstance(b)).toBe(true);

    const c = injector.get(C);
    expect(injector.hasInstance(c)).toBe(false);
  });
});
