import * as Helper from '../../src/helper/parameter-helper';
import { ConstructorOf } from '../../src';

describe(__filename, () => {
  let Parent: ConstructorOf<any>;
  let Constructor: ConstructorOf<any>;

  beforeEach(() => {
    Parent = class {};
    Constructor = class extends Parent {};
  });

  it('什么都没定义的时候结果是空的', () => {
    const ret = Helper.getParameterDeps(Constructor);
    expect(ret).toEqual([]);
  });

  it('基本的添加依赖', () => {
    const dep = 'dep';
    Helper.setParameters(Constructor, [dep]);

    const ret = Helper.getParameterDeps(Constructor);
    expect(ret).toEqual([dep]);
  });

  it('指定第二个参数的依赖', () => {
    const dep1 = 'dep';
    Helper.setParameters(Constructor, [dep1]);

    const dep2 = 'dep2';
    Helper.setParameterIn(Constructor, { token: dep2 }, 1);

    const ret = Helper.getParameterDeps(Constructor);
    expect(ret).toEqual([dep1, dep2]);
  });

  it('给父类添加依赖，能个正常查出', () => {
    const dep = 'dep';
    Helper.setParameters(Parent, [dep]);

    const ret = Helper.getParameterDeps(Constructor);
    expect(ret).toEqual([dep]);
  });

  it('给父类指定依赖，能够正常查出', () => {
    const dep1 = 'dep';
    Helper.setParameters(Parent, [dep1]);

    const dep2 = 'dep2';
    Helper.setParameterIn(Parent, { token: dep2 }, 1);

    const ret = Helper.getParameterDeps(Constructor);
    expect(ret).toEqual([dep1, dep2]);
  });

  it('从子类设置的依赖能够覆盖父类的依赖', () => {
    Helper.setParameters(Parent, [ 'parent', 'parent' ]);
    const parentDeps = Helper.getParameterDeps(Parent);
    expect(parentDeps).toEqual([ 'parent', 'parent' ]);

    Helper.setParameters(Constructor, [ 'child', 'child' ]);
    const childDeps = Helper.getParameterDeps(Constructor);
    expect(childDeps).toEqual([ 'child', 'child' ]);
  });

  it('不同位置的 Token 描述能够合并', () => {
    Helper.setParameterIn(Parent, { token: 'parent' }, 0);
    Helper.setParameterIn(Constructor, { token: 'child' }, 1);
    const deps = Helper.getParameterDeps(Constructor);
    expect(deps).toEqual([ 'parent', 'child' ]);
  });

  it('能够得到构造依赖和 Token 定义的结果产物', () => {
    Helper.setParameters(Constructor, [ 'parameter1', 'parameter2' ]);
    Helper.setParameterIn(Constructor, { token: 'token' }, 1);

    const deps = Helper.getParameterDeps(Constructor);
    expect(deps).toEqual([ 'parameter1', 'token' ]);

    const opts = Helper.getParameterOpts(Constructor);
    expect(opts).toEqual([{ token: 'parameter1' }, { token: 'token' }]);
  });
});
