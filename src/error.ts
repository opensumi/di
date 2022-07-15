import { CreateState, Token } from './declare';

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

export function tagOnlyError(expectTag: string, currentTag: string) {
  return new Error(`Expect creating class in Injector with tag: ${expectTag}, but current: ${currentTag}.`);
}

export function noInjectableError(target: object) {
  return new Error(
    `Target ${stringify(target)} has not decorated by Injectable. Maybe you have multiple packages installed.`,
  );
}

export function notInjectError(target: object, index: number) {
  return new Error(
    `The ${index}th constructor parameter of ${stringify(
      target,
    )} has not decorated by \`Inject\`, or maybe you want to set \`multiple\` in the Injectable decorator.`,
  );
}

export function notSupportTokenError(target: object, key: string | symbol, token: any) {
  const tokenType = String(token);
  const reason =
    '(1) Please check your `tsconfig.json` to enable `emitDecoratorMetadata` and `experimentalDecorators`. (2) Has not defined token cause TS compiled to Object. (3) Has circular dependencies cause reading property error.';
  return new Error(
    `Autowired error: The type of property ${String(key)} of ${stringify(
      target,
    )} is unsupported. Allowed type: string/number/function, but received "${tokenType}". ${reason}`,
  );
}

export function noInjectorError(target: object) {
  return new Error(`Cannot find the Injector of ${stringify(target)}`);
}

export function circularError(target: object, state: CreateState) {
  const tokenTrace = [];
  let current: CreateState | undefined = state;
  while (current) {
    tokenTrace.push(current.token);
    current = current.parent;
  }

  const traceResult = tokenTrace
    .reverse()
    .map((v) => stringify(v))
    .join(' > ');

  return new Error(`Detected circular dependencies when creating ${stringify(target)}. ` + traceResult);
}
