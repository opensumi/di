import { Injectable, Injector } from '../../src';
import { aliasCircularError } from '../../src/error';

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
  it('can resolve nested alias', () => {
    const injector = new Injector();
    const single1 = { company: 'AntGroup' };
    const tokenA = Symbol('tokenA');
    const tokenB = Symbol('tokenB');
    const tokenC = Symbol('tokenC');
    injector.addProviders(
      {
        token: tokenA,
        useValue: single1,
      },
      {
        token: tokenB,
        useAlias: tokenA,
      },
      {
        token: tokenC,
        useAlias: tokenB,
      },
    );
    const aa = injector.get(tokenA);
    const bb = injector.get(tokenB);
    expect(aa).toBe(bb);
    const cc = injector.get(tokenC);
    expect(aa).toBe(cc);
  });
  it('can detect useAlias Token registration cycle', () => {
    const injector = new Injector();
    const single1 = { company: 'AntGroup' };
    const tokenA = Symbol('tokenA');
    const tokenB = Symbol('tokenB');
    const tokenC = Symbol('tokenC');

    expect(() => {
      injector.addProviders(
        {
          token: tokenA,
          useValue: single1,
        },
        {
          token: tokenB,
          useAlias: tokenC,
        },
        {
          token: tokenC,
          useAlias: tokenB,
        },
      );
      // Because tokenC is added later, so the first one in the array is tokenC, and tokenC alias to tokenB.
      // So the cycle is C **alias to** B **alias to** C
    }).toThrowError(aliasCircularError([tokenC, tokenB], tokenC));
  });
});
