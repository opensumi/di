import * as Helper from '../../src/helper/utils';

describe('utils helper', () => {
  it('uniq', () => {
    const obj = {};
    const arr = [1, 2, obj, obj, 3];
    const result = Helper.uniq(arr);
    expect(result).toEqual([1, 2, obj, 3]);
  });

  it('flatten', () => {
    const arr = [[1, 2, 3], [4, 5, 6], 7, 8];
    const result = Helper.flatten(arr);
    expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    const deepArr = [[1, 2, [3, 4, [5, [6]], 7], 8, [9, [10], 11], 12], 13, 14, 15];
    const deepResult = Helper.flatten(deepArr);
    expect(deepResult).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });
});
