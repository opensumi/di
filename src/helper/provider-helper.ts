import { Provider, Token, Tag, InstanceCreator, CreatorStatus, InstanceOpts } from '../types';
import {
  isValueProvider,
  isClassProvider,
  isTypeProvider,
  isFactoryProvider,
  isInjectableToken,
  isAliasProvider,
} from './is-function';
import { getParameterOpts } from './parameter-helper';
import { getAllDeps } from './dep-helper';
import { getInjectableOpts } from './injector-helper';
import { noInjectableError } from '../error';

export function getProvidersFromTokens(targets: Token[]) {
  const spreadDeps: Token[] = getAllDeps(...targets);
  const allDeps = targets.concat(spreadDeps);

  return allDeps.filter(isInjectableToken);
}

export function parseTokenFromProvider(provider: Provider): Token {
  if (isTypeProvider(provider)) {
    return provider;
  } else {
    return provider.token;
  }
}

export function hasTag<T extends Provider | InstanceCreator | InstanceOpts>(target: T): target is T & { tag: Tag } {
  if (typeof target === 'function') {
    return false;
  } else {
    return Object.prototype.hasOwnProperty.call(target, 'tag');
  }
}

export function parseCreatorFromProvider(provider: Provider): InstanceCreator {
  const basicObj = isTypeProvider(provider)
    ? {}
    : {
        dropdownForTag: provider.dropdownForTag,
        tag: provider.tag,
      };

  if (isValueProvider(provider)) {
    return {
      instances: new Set([provider.useValue]),
      isDefault: provider.isDefault,
      status: CreatorStatus.done,
      ...basicObj,
    };
  } else if (isFactoryProvider(provider)) {
    return {
      isDefault: provider.isDefault,
      useFactory: provider.useFactory,
      ...basicObj,
    };
  } else if (isAliasProvider(provider)) {
    return {
      useAlias: provider.useAlias,
    };
  } else {
    const isDefault = isClassProvider(provider) ? provider.isDefault : false;
    const useClass = isClassProvider(provider) ? provider.useClass : provider;

    const opts = getInjectableOpts(useClass);
    if (!opts) {
      throw noInjectableError(useClass);
    }

    const parameters = getParameterOpts(useClass);

    return {
      isDefault,
      opts,
      parameters,
      useClass,
      ...basicObj,
    };
  }
}
