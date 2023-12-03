import * as Helper from '../../src/helper/provider-helper';
import {
  Token,
  TypeProvider,
  ValueProvider,
  FactoryProvider,
  ClassProvider,
  CreatorStatus,
  Injectable,
} from '../../src';

describe(__filename, () => {
  @Injectable()
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

  it('getProvidersFromTokens', () => {
    const ret = Helper.getProvidersFromTokens([clsToken, strToken, symbolToken]);
    expect(ret).toEqual([A]);
  });

  it('parseTokenFromProvider', () => {
    expect(Helper.parseTokenFromProvider(typeProvider)).toBe(A);
    expect(Helper.parseTokenFromProvider(valueProvider)).toBe(A);
    expect(Helper.parseTokenFromProvider(factoryProvider)).toBe(A);
    expect(Helper.parseTokenFromProvider(classProvider)).toBe(A);
  });

  it('parseCreatorFromProvider', () => {
    expect(Helper.parseCreatorFromProvider(typeProvider)).toMatchObject({
      parameters: [],
      useClass: A,
    });

    const creator = Helper.parseCreatorFromProvider(valueProvider);
    expect(creator.instance?.has(A)).toBeTruthy;
    expect(creator.status).toBe(CreatorStatus.done);

    expect(Helper.parseCreatorFromProvider(factoryProvider)).toMatchObject({
      useFactory: factoryProvider.useFactory,
    });

    expect(Helper.parseCreatorFromProvider(classProvider)).toMatchObject({
      parameters: [],
      useClass: A,
    });
  });
});
