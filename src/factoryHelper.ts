import { FactoryFunction } from './types';

import type { Injector } from './injector';

export function asSingleton<T>(func: FactoryFunction<T>): FactoryFunction<T> {
  let instance: T | undefined;
  return (injector: Injector) => {
    if (instance === undefined) {
      instance = func(injector);
    }
    return instance;
  };
}
