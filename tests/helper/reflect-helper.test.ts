import * as Helper from '../../src/helper/reflect-helper';
import { ConstructorOf } from '../../src';

describe(__filename, () => {
  let Parent: ConstructorOf<any>;
  let Constructor: ConstructorOf<any>;

  beforeEach(() => {
    Parent = class {};
    Constructor = class extends Parent {};
  });

  it('从构造函数设置 Meta 数据', () => {
    const instance = new Constructor();
    const propertyKey = 'propertyKey';
    const meta = Helper.createConstructorMetadataManager(Symbol());
    expect(meta.get(Constructor)).toBeUndefined();
    expect(meta.get(Constructor, 'propertyKey')).toBeUndefined();

    const value1 = {};
    meta.set(value1, Constructor);
    expect(meta.get(Constructor)).toBe(value1);
    expect(meta.get(instance)).toBe(value1);

    const value2 = {};
    meta.set(value2, Constructor, propertyKey);
    expect(meta.get(Constructor, propertyKey)).toBe(value2);
    expect(meta.get(instance, propertyKey)).toBe(value2);

    const parentMata = Helper.createConstructorMetadataManager(Symbol());
    const value3 = {};
    parentMata.set(value3, Parent);
    expect(parentMata.get(Constructor)).toBe(value3);
    expect(parentMata.get(instance)).toBe(value3);

    const value4 = {};
    parentMata.set(value4, Parent, propertyKey);
    expect(parentMata.get(Constructor, propertyKey)).toBe(value4);
    expect(parentMata.get(instance, propertyKey)).toBe(value4);
  });

  it('从实例对象设置 Meta 数据', () => {
    const instance = new Constructor();
    const propertyKey = 'propertyKey';
    const meta = Helper.createConstructorMetadataManager(Symbol());
    expect(meta.get(Constructor)).toBeUndefined();
    expect(meta.get(Constructor, 'propertyKey')).toBeUndefined();

    const value1 = {};
    meta.set(value1, instance);
    expect(meta.get(Constructor)).toBe(value1);
    expect(meta.get(instance)).toBe(value1);

    const value2 = {};
    meta.set(value2, instance, propertyKey);
    expect(meta.get(Constructor, propertyKey)).toBe(value2);
    expect(meta.get(instance, propertyKey)).toBe(value2);
  });

  it('一般的 Meta 数据设置', () => {
    const propertyKey = 'propertyKey';
    const meta = Helper.createMetadataManager(Symbol());
    expect(meta.get(Constructor)).toBeUndefined();
    expect(meta.get(Constructor, 'propertyKey')).toBeUndefined();

    const value1 = {};
    meta.set(value1, Constructor);
    expect(meta.get(Constructor)).toBe(value1);

    const value2 = {};
    meta.set(value2, Constructor, propertyKey);
    expect(meta.get(Constructor, propertyKey)).toBe(value2);
  });
});
