import { Chain, Token } from './declare';

function stringify(target: object | Token) {
  if (typeof target === 'object') {
    return target.constructor.name;
  } else if (typeof target === 'function') {
    return target.name;
  } else {
    return String(target);
  }
}

export function noProviderError(...tokens: Token[]) {
  return new Error(`Cannot find Provider of ${tokens.map((t) => stringify(t)).join(', ')}`);
}

export function onMultipleCaseNoCreatorFound(token: Token) {
  return new Error(`在进行多例数据创建的时候，没有找到该 Token（"${stringify(token)}"）对应的 Provider。`);
}

export function tagOnlyError(expectTag: string, currentTag: string) {
  return new Error(`期望在 ${expectTag} 的注册器中创建对象，但是当前是 ${currentTag}`);
}

export function noInjectableError(target: object) {
  return new Error(`需要保证 ${stringify(target)} 必须是被 Injectable 装饰过的，可能是安装了多个版本导致的。`);
}

export function notInjectError(target: object, index: number) {
  return new Error(
    `单例模式下 ${stringify(
      target,
    )} 的构造函数第 ${index} 个参数是不可被 Inject 的，请使用 Inject 装饰或改成多例（修改 Injectable 的参数）。`,
  );
}

export function notSupportTokenError(target: object, key: string | symbol, token: any) {
  const tokenType = String(token);
  const reason =
    '排查下面三种可能:（1）ts 的配置里面没有开启 experimentalDecorators 和 emitDecoratorMetadata。（2）没有定义 token 对象导致 TS 编译成 Object。（3）循环依赖导致读取对象失败。';
  return new Error(
    `${stringify(target)} 的属性 ${stringify(
      key,
    )} 是不支持的依赖类型。只支持 string、number、function 类型，但是当前是 "${tokenType}"。${reason}`,
  );
}

export function noInjectorError(target: object) {
  return new Error(`Cannot find the Injector of ${stringify(target)}`);
}

export function circularError(target: object, chain: Chain) {
  const creatorChain = [];
  let current: Chain | undefined = chain;
  while (current) {
    creatorChain.push(current.token);
    current = current.from;
  }

  const chainResult = creatorChain
    .reverse()
    .map((v) => stringify(v))
    .join(' > ');

  return new Error(`Detected circular dependencies when creating ${stringify(target)}. ` + chainResult);
}
