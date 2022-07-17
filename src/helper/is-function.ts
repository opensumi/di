import {
  Provider,
  Token,
  TypeProvider,
  ClassProvider,
  FactoryProvider,
  ValueProvider,
  InstanceCreator,
  ValueCreator,
  ClassCreator,
  FactoryCreator,
  CreatorStatus,
  AliasProvider,
  AliasCreator,
} from '../declare';
import { isInjectable } from './injector-helper';

export function isTypeProvider(provider: Provider | Token): provider is TypeProvider {
  return typeof provider === 'function';
}

export function isClassProvider(provider: Provider): provider is ClassProvider {
  return !!(provider as ClassProvider).useClass;
}

export function isFactoryProvider(provider: Provider): provider is FactoryProvider {
  return !!(provider as FactoryProvider).useFactory;
}

export function isValueProvider(provider: Provider): provider is ValueProvider {
  return Object.prototype.hasOwnProperty.call(provider, 'useValue');
}

export function isAliasProvider(provider: Provider): provider is AliasProvider {
  return Object.prototype.hasOwnProperty.call(provider, 'useAlias');
}

export function isInjectableToken(token: Token): token is TypeProvider {
  return typeof token === 'function' && isInjectable(token);
}

const errorConstructors = new Set([Object, String, Number, Boolean]);

const tokenTypes = new Set(['function', 'string', 'symbol']);
export function isToken(token: any): token is Token {
  if (typeof token === 'function') {
    return !errorConstructors.has(token);
  }

  return tokenTypes.has(typeof token);
}

export function isValueCreator(creator: InstanceCreator): creator is ValueCreator {
  return (creator as ValueCreator).status === CreatorStatus.done;
}

export function isClassCreator(creator: InstanceCreator): creator is ClassCreator {
  return !!(creator as ClassCreator).useClass;
}

export function isFactoryCreator(creator: InstanceCreator): creator is FactoryCreator {
  return !!(creator as FactoryCreator).useFactory;
}

export function isAliasCreator(creator: InstanceCreator): creator is AliasCreator {
  return Object.prototype.hasOwnProperty.call(creator, 'useAlias');
}
