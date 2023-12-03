import { HookStore, applyHooks, isHooked } from '../../src/helper';
import { HookType } from '../../src';

describe('hook store test', () => {
  const token1 = Symbol();

  it('可以创建和删除hook', () => {
    const hookStore = new HookStore();
    const disposer = hookStore.createHooks([
      {
        hook: () => undefined,
        method: 'method',
        target: token1,
        type: HookType.Before,
      },
      {
        hook: () => undefined,
        method: 'method',
        target: token1,
        type: HookType.After,
      },
    ]);
    expect(hookStore.getHooks(token1, 'method').length).toBe(2);
    disposer.dispose();
    expect(hookStore.getHooks(token1, 'method').length).toBe(0);
    disposer.dispose();
    (hookStore as any).hooks.get(token1).clear();
    disposer.dispose();
    (hookStore as any).hooks.delete(token1);
    disposer.dispose();
  });

  it('子store中可以拿到父store的hook', () => {
    const hookStore = new HookStore();
    const childHookStore = new HookStore(hookStore);
    const disposer = hookStore.createHooks([
      {
        hook: () => undefined,
        method: 'method',
        target: token1,
        type: HookType.Before,
      },
    ]);
    childHookStore.createHooks([
      {
        hook: () => undefined,
        method: 'method',
        target: token1,
        type: HookType.After,
      },
    ]);
    expect(hookStore.getHooks(token1, 'method').length).toBe(1);
    expect(childHookStore.getHooks(token1, 'method').length).toBe(2);
  });

  it('apply Hook测试', () => {
    const valueRet = applyHooks('1', token1, new HookStore());
    expect(valueRet).toBe('1');

    const hookStore = new HookStore();
    hookStore.createHooks([
      {
        hook: () => undefined,
        method: 'a',
        target: token1,
        type: HookType.After,
      },
    ]);
    const objectRet = applyHooks({}, token1, hookStore);
    expect(isHooked(objectRet)).toBeTruthy();

    const objectRetNoHooks = applyHooks({}, token1, new HookStore());
    expect(isHooked(objectRetNoHooks)).toBeFalsy();
  });
});
