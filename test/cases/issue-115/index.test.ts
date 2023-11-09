import { Injector } from '../../../src';
import { TestClass } from './TestClass';
import { TestClassToken, TestToken } from './const';

const injector = new Injector();
injector.addProviders({
  token: TestToken,
  useValue: 'test',
});
injector.addProviders({
  token: TestClassToken,
  useClass: TestClass,
});

describe('issue-115', () => {
  it('should work', () => {
    expect(injector.get(TestClassToken).value).toBe('test');
  });
});
