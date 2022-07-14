import { ConstructorOf, FactoryFunction } from './declare';

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

export function createThisClass<T, C extends ConstructorOf<T> = ConstructorOf<T>>(ctor: C) {
  return (injector: Injector, ...moreArgs: ConstructorParameters<C>) => {
    return new ctor(...moreArgs);
  };
}
