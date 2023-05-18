import { Injectable, Injector } from '../../src';

describe('domain', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector([]);
  });

  it('没有描述 domain 的情况下，getFromDomain 不会报错', () => {
    @Injectable()
    class T {}

    injector.addProviders(T);
    const result = injector.getFromDomain('domain');
    expect(result).toEqual([]);
  });

  it('有描述 domain，get 之后可以从 domain 获取', () => {
    @Injectable({ domain: 'domain' })
    class T {}

    const result = injector.getFromDomain('domain');
    expect(result).toEqual([]);
    const a = injector.get(T);
    expect(a).toBeInstanceOf(T);
    const result2 = injector.getFromDomain('domain');
    expect(result2).toEqual([a]);
  });

  it('使用 string 作为 domain', () => {
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

  it('使用 Token 作为 domain', () => {
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

  it('交叉多个 Domain', () => {
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
