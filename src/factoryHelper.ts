import { ConstructorOf, FactoryFunction, FactoryProvider } from './declare';

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

export interface ICreateAsFactoryOptions {
  singleton?: boolean;
}

export function createClassAsFactory<T, C extends ConstructorOf<T> = ConstructorOf<T>>(
  ctor: C,
  opts?: ICreateAsFactoryOptions,
): FactoryProvider<T> {
  let factory = ((injector: Injector, ...moreArgs: ConstructorParameters<C>) => {
    return new ctor(...moreArgs);
  }) as unknown as FactoryFunction<T>;

  if (opts?.singleton) {
    factory = asSingleton<T>(factory);
  }

  return {
    token: ctor,
    useFactory: factory,
  };
}
