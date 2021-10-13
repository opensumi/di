import { Token } from './declare';

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
  return new Error(`没有找到 ${tokens.map((t) => stringify(t)).join(', ')} 的 Provider`);
}

export function classTokenOnly(token: Token) {
  return new Error(`直接进行多例数据创建的时候，只支持 class，而不是 "${stringify(token)}"`);
}

export function tagOnlyError(expectTag: string, currentTag: string) {
  return new Error(`期望在 ${expectTag} 的注册器中创建对象，但是当前是 ${currentTag}`);
}

export function noInjectableError(target: object) {
  return new Error(`需要保证 ${stringify(target)} 必须是被 Injectable 装饰过的，可能是安装了多个版本导致的，可以 tnpm update 彻底重装依赖解决。`);
}

export function notInjectError(target: object, index: number) {
  return new Error(`${stringify(target)} 的构造函数第 ${index} 个参数是不支持的依赖, 非构造函数需要使用 Inject 装饰`);
}

export function notSupportTokenError(target: object, key: string | symbol, token: any) {
  const tokenType = String(token);
  const reason = '排查下面三种可能：（1）ts 的配置里面没有开启 experimentalDecorators 和 emitDecoratorMetadata。（3）没有定义 token 对象导致 TS 编译成 Object。（3）循环依赖导致读取对象失败。';
  return new Error(`${stringify(target)} 的属性 ${stringify(key)} 是不支持的依赖类型。只支持 string、number、function 类型，但是当前是 "${tokenType}"。${reason}`);
}

export function noInjectorError(target: object) {
  return new Error(`没有找到 ${stringify(target)} 应该存在的注册器`);
}

export function circularError(target: object) {
  return new Error(`在创建 ${stringify(target)} 的时候遇见了循环依赖`);
}
