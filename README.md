# @opensumi/di

[中文文档](./README-zh_CN.md)

[![CI](https://github.com/opensumi/di/actions/workflows/ci.yml/badge.svg)](https://github.com/opensumi/di/actions/workflows/ci.yml) [![NPM Version][npm-image]][npm-url] [![NPM downloads][download-image]][download-url] [![Test Coverage][test-image]][test-url] [![License][license-image]][license-url] [![Bundle size for @opensumi/di][pkg-size-img]][pkg-size]

[npm-image]: https://img.shields.io/npm/v/@opensumi/di.svg
[npm-url]: https://www.npmjs.com/package/@opensumi/di
[download-image]: https://img.shields.io/npm/dm/@opensumi/di.svg
[download-url]: https://npmjs.org/package/@opensumi/di
[license-image]: https://img.shields.io/npm/l/@opensumi/di.svg
[license-url]: https://github.com/opensumi/di/blob/main/LICENSE
[test-image]: https://codecov.io/gh/opensumi/di/branch/main/graph/badge.svg?token=07JAPLU957
[test-url]: https://codecov.io/gh/opensumi/di
[pkg-size]: https://pkg-size.dev/@opensumi/di
[pkg-size-img]: https://pkg-size.dev/badge/bundle/43685

> Inspired By [Angular](https://angular.io/guide/dependency-injection).

This tool will help you achieve dependency inversion effectively without concerning the details of object instantiation. Additionally, since object instantiation is done within a registry, both the factory pattern and singleton pattern can be easily implemented.

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [API](#API)
- [Examples](#examples)
- [FAQ](#faq)
- [Related Efforts](#related-efforts)

## Install

```sh
npm install @opensumi/di --save
yarn add @opensumi/di
```

## Quick Start

Let's start with a simple example:

```ts
import { Injector } from '@opensumi/di';

// we create a new Injector instance
const injector = new Injector();

const TokenA = Symbol('TokenA');
injector.addProviders({
  token: TokenA,
  useValue: 1,
});
injector.get(TokenA) === 1; // true
```

The `Injector` class is the starting point of all things. We create a `injector`, and we add a provider into it:

```ts
injector.addProviders({
  token: TokenA,
  useValue: 1,
});
```

We use a `ValueProvider` here, and its role is to provide a value:

```ts
interface ValueProvider {
  token: Token;
  useValue: any;
}
```

We have the following several kinds of the provider. According to the different Provider kinds, Injector will use different logic to provide the value that you need.

```ts
type Provider = ClassProvider | ValueProvider | FactoryProvider | AliasProvider;
```

A token is used to find the real value in the Injector, so token should be a global unique value.

```ts
type Token = string | symbol | Function;
```

and now we want get value from the `Injector`, just use `Injector.get`:

```ts
injector.get(TokenA) === 1;
```

### Providers

Here are all the providers we have:

#### ClassProvider

Declare a provider that includes a constructor and its token.

```ts
interface ClassProvider {
  token: Token;
  useClass: ConstructorOf<any>;
}
```

After dependency inversion, constructors depending on abstractions instead of instances can be highly effective. For example, consider the following example:

```ts
interface Drivable {
  drive(): void;
}

@Injectable()
class Student {
  @Autowired('Drivable')
  mBike: Drivable;

  goToSchool() {
    console.log('go to school');
    this.mBike.drive();
  }
}
```

The student object depends on a drivable mode of transportation, which can be provided either as a bicycle or a car during object creation:

```ts
@Injectable()
class Car implements Drivable {
  drive() {
    console.log('by car');
  }
}

injector.addProviders(Student, {
  token: 'Drivable',
  useClass: Car,
});

const student = injector.get(Student);
student.goToSchool(); // print 'go to school by car'
```

#### ValueProvider

This provider is used to provide a value:

```ts
interface ValueProvider {
  token: Token;
  useValue: any;
}
```

```ts
const TokenA = Symbol('TokenA');
injector.addProviders({
  token: TokenA,
  useValue: 1,
});
injector.get(TokenA) === 1; // true
```

#### FactoryProvider

Declare a provider, and later you can use this token to invoke this factory function.

```ts
interface FactoryFunction<T = any> {
  (injector: Injector): T;
}
interface FactoryProvider {
  token: Token;
  useFactory: FactoryFunction<T>;
}
```

It also provides some helper functions for the factory pattern:

1. `asSingleton`

You can implement a singleton factory by using this helper:

```ts
const provider = {
  token,
  useFactory: asSingleton(() => new A()),
};
```

#### AliasProvider

Sets a token to the alias of an existing token.

```ts
interface AliasProvider {
  // New Token
  token: Token;
  // Existing Token
  useAlias: Token;
}
```

and then you can use:

```ts
const TokenA = Symbol('TokenA');
const TokenB = Symbol('TokenB');
injector.addProviders(
  {
    token: TokenA,
    useValue: 1,
  },
  {
    token: TokenB,
    useAlias: TokenA,
  },
);
injector.get(TokenA) === 1; // true
injector.get(TokenB) === 1; // true
```

### Perform constructor injection

In this example, you can see the `class B` depends on `class A`,And declare this dependency relationship in the parameter list of the constructor.:

So, during the instantiation process of `class B`, the Injector will automatically create the `A` instance and inject it into the `B` instance.

```ts
@Injectable()
class A {
  constructor() {
    console.log('Create A');
  }
}

@Injectable()
class B {
  constructor(public a: A) {}
}

const injector = new Injector();
injector.addProviders(A, B);

const b = injector.get(B); // print 'Create A'
console.log(b.a instanceof A); // print 'true'
```

### Use `@Autowired` for dynamic injection

```ts
@Injectable()
class A {
  constructor() {
    console.log('Create A');
  }
}

@Injectable()
class B {
  @Autowired()
  a: A;
}

const injector = new Injector();
injector.addProviders(A, B);

const b = injector.get(B);
console.log(b.a instanceof A); // print 'Create A'; print 'true'
```

### Use Singleton pattern Or Multiton pattern

```ts
@Injectable()
class Singleton {
  constructor() {}
}

@Injectable({ multiple: true })
class Multiton {
  constructor() {}
}

const injector = new Injector();
injector.addProviders(Singleton, Multiton);

const single1 = injector.get(Singleton);
const single2 = injector.get(Singleton);
console.log(single1 === single2); // print 'true'

const multiple1 = injector.get(Multiton);
const multiple2 = injector.get(Multiton);
console.log(multiple1 === multiple2); // print 'false'
```

### Depend on abstractions rather than implementations

```ts
const LOGGER_TOKEN = Symbol('LOGGER_TOKEN');

interface Logger {
  log(msg: string): void;
}

@Injectable()
class App {
  @Autowired(LOGGER_TOKEN)
  logger: Logger;
}

@Injectable()
class LoggerImpl implements Logger {
  log(msg: string) {
    console.log(msg);
  }
}

const injector = new Injector();
injector.addProviders(App);
injector.addProviders({
  token: LOGGER_TOKEN,
  useClass: LoggerImpl,
});

const app = injector.get(App);
console.log(app.logger instanceof LoggerImpl); // print 'true'
```

### Use an abstract class as a Token

```ts
abstract class Logger {
  abstract log(msg: string): void;
}

@Injectable()
class LoggerImpl implements Logger {
  log(msg: string) {
    console.log(msg);
  }
}

@Injectable()
class App {
  @Autowired()
  logger: Logger;
}

const injector = new Injector();
injector.addProviders(App);
injector.addProviders({
  token: Logger,
  useClass: LoggerImpl,
});

const app = injector.get(App);
console.log(app.logger instanceof LoggerImpl); // print 'true'
```

## API

### decorator: @Injectable

```ts
interface InstanceOpts {
  multiple?: boolean;
}
function Injectable(opts?: InstanceOpts): ClassDecorator;

@Injectable({ multiple: true })
class A {}

const injector = new Injector([A]);

const a = injector.get(A);
console.log(injector.hasInstance(a)); // print 'false'
```

All constructor functions that need to be created by the Injector must be decorated with this decorator in order to work properly. Otherwise, an error will be thrown.

- multiple: Whether to enable the multiple instance mode or not, once the multiple instance mode is enabled, the Injector will not hold references to instance objects.

### decorator: @Autowired

```ts
function Autowired(token?: Token): PropertyDecorator;

@Injectable()
class A {}

@Injectable()
class B {
  @Autowired()
  a: A;
}
```

Decorating a property will allow the registry to dynamically create a dependency instance, which will only be created when it is accessed. For example, in the given example, the instance of class A will be created only when `b.a` is accessed.

> It's important to note that since `Autowired` depends on an instance of the `Injector`, only objects created by the `Injector` can use this decorator.

### decorator: @Inject

```ts
function Inject(token: string | symbol): ParameterDecorator;

interface IA {
  log(): void;
}

@Injectable()
class B {
  constructor(@Inject('IA') a: IA) {}
}
```

When performing dependency injection in a constructor parameter, it is necessary to specify the decorator for the dependency token when a constructor depends on an abstraction that is passed into the constructor. In such cases, you will need to use this decorator.

### Injector.get

```ts
interface Injector<T extends Token> {
  get(token: ConstructorOf<any>, args?: ConstructorParameters<T>, opts?: InstanceOpts): TokenResult<T>;
  get(token: T, opts?: InstanceOpts): TokenResult<T>;
}
```

You can use this method to create an instance of a specific token from the `Injector`.

if you pass a constructor as the first parameter and provide constructor arguments as the second parameter (if any), the Injector will directly create an instance of the constructor and apply dependency injection. In this case, the constructor does not need to be decorated with Injectable and can still create objects successfully. For example:

```ts
@Injectable()
class A {}

class B {
  @Autowired()
  a: A;
}

const injector = new Injector([A]);
const b = injector.get(B, []);
console.log(b.a instanceof A); // print 'true'
```

### Injector.hasInstance

Whether have an instantiated object in the Injector.

### markInjectable

```ts
import { markInjectable } from '@opensumi/di';
import { Editor } from 'path/to/package';

markInjectable(Editor);
```

You can use this function to mark some Class as Injectable.

## Examples

See More Examples [in the test case](test/use-case.test.ts).

## FAQ

Please see [FAQ.md](docs/faq.md).

## Related Efforts

- [Angular](https://angular.io/guide/dependency-injection) Dependency injection in Angular
- [injection-js](https://github.com/mgechev/injection-js) It is an extraction of the Angular's ReflectiveInjector.
- [InversifyJS](https://github.com/inversify/InversifyJS) A powerful and lightweight inversion of control container for JavaScript & Node.js apps powered by TypeScript.
- [power-di](https://github.com/zhang740/power-di) A lightweight Dependency Injection library.
