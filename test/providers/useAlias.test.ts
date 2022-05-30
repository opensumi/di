import { asSingleton, Autowired, Inject, Injectable, Injector } from '../../src';

describe('useAlias is work', () => {
  it('can alias useValue', () => {
    const injector = new Injector();
    const single1 = { company: 'AntGroup' };
    const tokenA = Symbol('tokenA');
    const tokenB = Symbol('tokenB');
    injector.addProviders(
      {
        token: tokenA,
        useValue: single1,
      },
      {
        token: tokenB,
        useAlias: tokenA,
      },
    );
    const aa = injector.get(tokenA);
    const bb = injector.get(tokenB);
    expect(aa).toBe(bb);
  });
  it('can alias useClass', () => {
    const injector = new Injector();
    @Injectable()
    class A {}

    const tokenA = Symbol('tokenA');
    const tokenB = Symbol('tokenB');
    injector.addProviders(
      {
        token: tokenA,
        useClass: A,
      },
      {
        token: tokenB,
        useAlias: tokenA,
      },
    );
    const aa = injector.get(tokenA);
    const bb = injector.get(tokenB);
    expect(aa).toBe(bb);
  });
  it('can alias useFactory', () => {
    const injector = new Injector();
    const tokenA = Symbol('tokenA');
    const tokenB = Symbol('tokenB');
    injector.addProviders(
      {
        token: tokenA,
        useFactory: () => () => 1,
      },
      {
        token: tokenB,
        useAlias: tokenA,
      },
    );
    const aa = injector.get(tokenA);
    const bb = injector.get(tokenB);
    expect(aa()).toEqual(bb());
  });
});
