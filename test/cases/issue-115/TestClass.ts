import { Injectable, Autowired } from '../../../src';

import { TestToken } from './const';

@Injectable()
export class TestClass {
  @Autowired(TestToken)
  public value!: string;
}
