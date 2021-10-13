import * as Helper from '../../src/helper/injector-helper';
import { ConstructorOf, InstanceOpts } from '../../src';

// tslint:disable-next-line
const pkg = require('../../package.json');

describe(__filename, () => {
  let Parent: ConstructorOf<any>;
  let Constructor: ConstructorOf<any>;

  beforeEach(() => {
    Parent = class {};
    Constructor = class extends Parent {};
  });

  it('设置可注入，并正常读取', () => {
    Helper.markInjectable(Constructor);
    expect(Helper.isInjectable(Constructor)).toBe(true);
    expect(Helper.getInjectableOpts(Constructor)).toEqual({ version: pkg.version });
  });

  it('设置注入配置，并正常读取', () => {
    const opts = {};
    Helper.markInjectable(Constructor, opts);
    expect(Helper.isInjectable(Constructor)).toBe(true);
    expect(Helper.getInjectableOpts(Constructor)).toEqual({ version: pkg.version });
  });

  it('设置父亲的注入配置，并读取', () => {
    const opts = {};
    Helper.markInjectable(Parent, opts);
    expect(Helper.isInjectable(Constructor)).toBe(true);
    expect(Helper.getInjectableOpts(Constructor)).toEqual({ version: pkg.version });
  });

  it('InstanceOpts 只会和自己的数据合并', () => {
    const parentOpts: InstanceOpts = { multiple: true };
    const childOpts: InstanceOpts = { tag: 'tag' };

    Helper.markInjectable(Parent, parentOpts);
    expect(Helper.getInjectableOpts(Constructor)).toEqual({ ...parentOpts, version: pkg.version });

    Helper.markInjectable(Constructor, childOpts);
    expect(Helper.getInjectableOpts(Constructor)).toEqual({ ...childOpts, version: pkg.version });

    const childOpts2: InstanceOpts = { domain: 'domain' };
    Helper.markInjectable(Constructor, childOpts2);
    expect(Helper.getInjectableOpts(Constructor)).toEqual({ ...childOpts, ...childOpts2, version: pkg.version });
  });

  it('不同版本设置的时候，会报错', () => {
    const opts = {};
    Helper.markInjectable(Parent, opts);
    expect(Helper.isInjectable(Constructor)).toBe(true);
    expect(Helper.getInjectableOpts(Constructor)).toEqual({ version: pkg.version });
  });
});
