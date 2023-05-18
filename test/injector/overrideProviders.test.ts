import { Injector, Injectable } from '../../src';

describe('overrideProviders', () => {
  let injector: Injector;

  @Injectable()
  class A {}

  beforeEach(() => {
    injector = new Injector();
  });

  it('使用 overrideProviders 会覆盖原有的 Provider', () => {
    injector.addProviders(A);
    const a1 = injector.get(A);

    injector.overrideProviders({ token: A, useValue: '' });
    const a2 = injector.get(A);

    expect(a1).toBeInstanceOf(A);
    expect(a2).toBe('');
  });

  it('使用 addProviders 覆盖原有的 Provider', () => {
    injector.addProviders(A);
    const a1 = injector.get(A);

    injector.addProviders({ token: A, useValue: 'a2' });
    const a2 = injector.get(A);

    injector.addProviders({ token: A, useValue: 'a3', override: true });
    const a3 = injector.get(A);

    expect(a1).toBeInstanceOf(A);
    expect(a2).toBeInstanceOf(A);
    expect(a3).toBe('a3');
  });
});
