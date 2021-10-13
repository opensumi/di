import * as Helper from '../../src/helper/dep-helper';
import { ConstructorOf } from '../../src';

describe(__filename, () => {
  let Parent: ConstructorOf<any>;
  let Constructor: ConstructorOf<any>;

  beforeEach(() => {
    Parent = class {};
    Constructor = class extends Parent {};
  });

  it('没有定义依赖的时候查询出来是空的', () => {
    const depsFromConstructor = Helper.getAllDeps(Constructor);
    expect(depsFromConstructor).toEqual([]);

    const instance = new Constructor();
    const depsFromInstance = Helper.getAllDeps(instance);
    expect(depsFromInstance).toEqual([]);
  });

  it('基本的依赖定义', () => {
    const dep = 'Test';
    Helper.addDeps(Constructor, dep);

    const depsFromConstructor = Helper.getAllDeps(Constructor);
    expect(depsFromConstructor).toEqual([ dep ]);
  });

  it('在父级进行依赖定义', () => {
    const dep = 'Test';
    Helper.addDeps(Parent, dep);

    const depsFromConstructor = Helper.getAllDeps(Constructor);
    expect(depsFromConstructor).toEqual([ dep ]);
  });

  it('依赖取值出来应该是去重的结果', () => {
    const dep = 'Test';
    Helper.addDeps(Parent, dep, dep);

    const depsFromConstructor = Helper.getAllDeps(Constructor);
    expect(depsFromConstructor).toEqual([ dep ]);
  });

  it('在父级进行依赖定义，并且再新定义', () => {
    const dep1 = 'dep1';
    Helper.addDeps(Parent, dep1);

    const dep2 = 'dep2';
    Helper.addDeps(Constructor, dep2);

    const depsFromParentConstructor = Helper.getAllDeps(Parent);
    expect(depsFromParentConstructor).toEqual([ dep1 ]);

    const depsFromConstructor = Helper.getAllDeps(Constructor);
    expect(depsFromConstructor).toEqual([ dep1, dep2 ]);
  });

  it('当前一个依赖包含了后面的所有依赖的时候，应该正确解析', () => {
    const Dep1 = class {};
    const Dep2 = class {};
    const Dep3 = class {};

    Helper.addDeps(Dep1, Dep2, Dep3);
    Helper.addDeps(Dep2, Dep3);

    const deps = Helper.getAllDeps(Dep1, Dep2);
    const depsAgain = Helper.getAllDeps(Dep2);

    expect(deps).toEqual([ Dep2, Dep3 ]);
    expect(depsAgain).toEqual([ Dep3 ]);
  });
});
