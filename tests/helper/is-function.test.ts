import * as Helper from '../../src/helper/is-function';
import {
  Token,
  ValueProvider,
  TypeProvider,
  FactoryProvider,
  ClassProvider,
  markInjectable,
  CreatorStatus,
} from '../../src';

describe('is function', () => {
  class A {}
  const clsToken: Token = A;
  const strToken: Token = 'strToken';
  const symbolToken: Token = Symbol('symbolToken');

  const typeProvider: TypeProvider = A;
  const valueProvider: ValueProvider = {
    token: A,
    useValue: new A(),
  };
  const factoryProvider: FactoryProvider = {
    token: A,
    useFactory: () => new A(),
  };
  const classProvider: ClassProvider = {
    token: A,
    useClass: A,
  };

  it('isTypeProvider', () => {
    expect(Helper.isTypeProvider(typeProvider)).toBe(true);
    expect(Helper.isTypeProvider(strToken)).toBe(false);
  });

  it('isClassProvider', () => {
    expect(Helper.isClassProvider(classProvider)).toBe(true);
    expect(Helper.isClassProvider(valueProvider)).toBe(false);
  });

  it('isFactoryProvider', () => {
    expect(Helper.isFactoryProvider(factoryProvider)).toBe(true);
    expect(Helper.isFactoryProvider(valueProvider)).toBe(false);
  });

  it('isValueProvider', () => {
    const emptyValueProvider = { token: '1', useValue: '' };
    expect(Helper.isValueProvider(emptyValueProvider)).toBe(true);

    const nullValueProvider = { token: '1', useValue: null };
    expect(Helper.isValueProvider(nullValueProvider)).toBe(true);

    const undefinedValueProvider = { token: '1', useValue: undefined };
    expect(Helper.isValueProvider(undefinedValueProvider)).toBe(true);

    expect(Helper.isValueProvider(valueProvider)).toBe(true);
    expect(Helper.isValueProvider(factoryProvider)).toBe(false);
  });

  it('isInjectableToken', () => {
    expect(Helper.isInjectableToken(strToken)).toBe(false);
    expect(Helper.isInjectableToken(clsToken)).toBe(false);

    class B {}
    markInjectable(B);
    expect(Helper.isInjectableToken(B)).toBe(true);
  });

  it('isToken', () => {
    expect(Helper.isToken(strToken)).toBe(true);
    expect(Helper.isToken(clsToken)).toBe(true);
    expect(Helper.isToken(symbolToken)).toBe(true);
    expect(Helper.isToken(1)).toBe(false);
  });

  it('isValueCreator', () => {
    expect(Helper.isValueCreator(factoryProvider)).toBe(false);
    expect(Helper.isValueCreator({ status: CreatorStatus.done, instances: new Set([A]) })).toBe(true);
  });

  it('isFactoryCreator', () => {
    expect(Helper.isClassCreator(factoryProvider)).toBe(false);
    expect(Helper.isClassCreator({ opts: {}, parameters: [], useClass: A })).toBe(true);
  });

  it('isFactoryCreator', () => {
    expect(Helper.isFactoryCreator(factoryProvider)).toBe(true);
    expect(Helper.isFactoryCreator({ opts: {}, parameters: [], useClass: A })).toBe(false);
  });
});
