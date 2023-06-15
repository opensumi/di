import { Injectable, Injector } from '../../src';

describe('domain', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  it('if domain is not found, getFromDomain will not throw error', () => {
    @Injectable()
    class T {}

    injector.addProviders(T);
    const result = injector.getFromDomain('domain');
    expect(result).toEqual([]);
  });

  it('if domain is registered, we can get instance through domain', () => {
    @Injectable({ domain: 'domain' })
    class T {}

    // T is not registered in injector
    const result = injector.getFromDomain('domain');
    expect(result).toEqual([]);
    const a = injector.get(T);
    expect(a).toBeInstanceOf(T);
    const result2 = injector.getFromDomain('domain');
    expect(result2).toEqual([a]);
  });

  it('Use string as domain', () => {
    @Injectable({ domain: 'domain' })
    class T {}

    @Injectable({ domain: 'domain' })
    class K {}

    injector.addProviders(T, K);
    const result = injector.getFromDomain('domain');
    expect(result.length).toBe(2);
    expect(result[0]).toBeInstanceOf(T);
    expect(result[1]).toBeInstanceOf(K);
  });

  it('Use Token as domain', () => {
    const domain = Symbol('domain');

    @Injectable({ domain })
    class T {}

    @Injectable({ domain })
    class K {}

    injector.addProviders(T, K);
    const result = injector.getFromDomain(domain);
    expect(result.length).toBe(2);
    expect(result[0]).toBeInstanceOf(T);
    expect(result[1]).toBeInstanceOf(K);
  });

  it('cross multiple domains', () => {
    @Injectable({ domain: ['domain1', 'domain2'] })
    class T {}

    @Injectable({ domain: ['domain3', 'domain2'] })
    class K {}

    injector.addProviders(T, K);
    const result1 = injector.getFromDomain('domain1');
    expect(result1.length).toBe(1);

    const result2 = injector.getFromDomain('domain2');
    expect(result2.length).toBe(2);

    const result3 = injector.getFromDomain('domain3');
    expect(result3.length).toBe(1);
  });
});
