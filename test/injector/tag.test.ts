import { Injectable, Injector, Autowired } from '../../src';
import * as InjectorError from '../../src/error';

describe('Tag', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = new Injector();
  });

  it('能够正常从 Tag 获取对象', () => {
    const token = Symbol('token');
    const tag = 'tag';
    const value = Symbol('value');

    injector.addProviders({
      tag,
      token,
      useValue: value,
    });

    const instance = injector.get(token, { tag });
    expect(instance).toBe(value);

    expect(() => {
      injector.get(token);
    }).toThrow(InjectorError.noProviderError(token));
  });

  it('空字符串能够作为 Tag 正常创建对象', () => {
    const token = Symbol('token');
    const tag = '';
    const value = Symbol('value');

    injector.addProviders({
      tag,
      token,
      useValue: value,
    });

    const instance = injector.get(token, { tag });
    expect(instance).toBe(value);

    expect(() => {
      injector.get(token);
    }).toThrow(InjectorError.noProviderError(token));
  });

  it('数字 0 能够作为 Tag 正常创建对象', () => {
    const token = Symbol('token');
    const tag = 0;
    const value = Symbol('value');

    injector.addProviders({
      tag,
      token,
      useValue: value,
    });

    const instance = injector.get(token, { tag });
    expect(instance).toBe(value);

    expect(() => {
      injector.get(token);
    }).toThrow(InjectorError.noProviderError(token));
  });

  it('数字 1 能够作为 Tag 正常创建对象', () => {
    const token = Symbol('token');
    const tag = 1;
    const value = Symbol('value');

    injector.addProviders({
      tag,
      token,
      useValue: value,
    });

    const instance = injector.get(token, { tag });
    expect(instance).toBe(value);

    expect(() => {
      injector.get(token);
    }).toThrow(InjectorError.noProviderError(token));
  });

  it('没有定义 Tag Provider 的时候会获取默认值', () => {
    const token = Symbol('token');
    const tag = 'tag';
    const value = Symbol('value');

    injector.addProviders({
      token,
      useValue: value,
    });

    const instance = injector.get(token, { tag });
    expect(instance).toBe(value);

    const instanceWithoutTag = injector.get(token);
    expect(instanceWithoutTag).toBe(value);
  });

  it('使用 Autowired 能够正常获取值', () => {
    const token = Symbol('token');
    const tag = 'tag';
    const value = Symbol('value');

    injector.addProviders({
      token,
      useValue: value,
    });

    @Injectable()
    class TagParent {
      @Autowired(token, { tag })
      tagValue: any;
    }

    const parent = injector.get(TagParent);
    expect(parent).toBeInstanceOf(TagParent);
    expect(parent.tagValue).toBe(value);
  });

  it('Child 能够正确获取 Parent 的 Tag 对象', () => {
    const token = Symbol('token');
    const tag = 'tag';
    const value = Symbol('value');

    injector.addProviders({
      tag,
      token,
      useValue: value,
    });

    const childInjector = injector.createChild();
    const parentTagToken = injector.exchangeToken(token, tag);
    const childTagToken = childInjector.exchangeToken(token, tag);
    expect(parentTagToken).toBe(childTagToken);

    const instance = childInjector.get(token, { tag });
    expect(instance).toBe(value);
  });
});
