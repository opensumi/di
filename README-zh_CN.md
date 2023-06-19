# @opensumi/di

这个工具将会帮助你很好的帮助你实现依赖反转，而不在关系那些对象实例化的细节。同时，因为对象的实例化在注册器中进行创建，所以工厂模式和单例模式都很容易实现。

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

让我们从一个简单的例子开始:

```ts
import { Injector } from '@opensumi/di';

// 创建一个 Injector，这是一个 IoC 容器
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

这是目前支持的 Provider 类型:

#### ClassProvider

定义一个 Token 使用某个特定的构造函数的时候会用到的 Provider。

```ts
interface ClassProvider {
  token: Token;
  useClass: ConstructorOf<any>;
}
```

在依赖反转之后，构造函数都依赖抽象而不依赖实例的时候会非常有效。比如下面的例子：

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

学生对象依赖的是一个可驾驶的交通工具，可以在创建对象的时候提供一个自行车，也可以在创建的时候提供一个汽车：

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

提供一个函数进行对象实例创建的 Provider。

```ts
interface FactoryFunction<T = any> {
  (injector: Injector): T;
}
interface FactoryProvider {
  token: Token;
  useFactory: FactoryFunction<T>;
}
```

同时也提供了一些工厂模式的帮助函数：

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

### 对构造函数进行注入

在下面这个例子里，你会发现 `class B` 依赖于 `class A`，并且在构造函数的参数列表中声明了这个依赖关系，所以在 `B` 的实例创建过程中，Injector 会自动创建 `A` 的实例，并且注入到 `B` 的实例中。

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

const b = injector.get(B); // 打印 'Create A'
console.log(b.a instanceof A); // 打印 'true'
```

### 使用 `@Autowired()` 进行动态注入

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
console.log(b.a instanceof A); // 1. 打印 'Create A', 2. 打印 'true'
```

### 可以创建单例或者多例

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

### 类型依赖抽象而不是依赖实现的用法

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
console.log(app.logger instanceof LoggerImpl); // 打印 'true'
```

### 使用抽象函数作为 Token 进行依赖注入

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

所有需要被 Injector 创建的构造函数都应该使用这个装饰器修饰才可以正常使用，否则会报错。

- multiple: 是否启用多例模式，一旦启用了多例模式之后，Injector 将不会持有实例对象的引用。

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

修饰一个属性会被注册器动态创建依赖实例，而这个依赖实例只有在被使用的时候才会被创建出来。比如上面的例子中，只有访问到 `b.a` 的时候，才会创建 A 的实例。

> 需要注意的是，因为 Autowired 依赖着 Injector 的实例，所以只有从 Injector 创建出来的对象可以使用这个装饰器

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

在构造函数进行依赖注入的时候，需要特别指定依赖 Token 的时候的装饰器。当一个构造函数依赖某个抽象，并且这个抽象是在构造函数中传递进来的时候，会需要使用这个装饰器。

### Injector.get

```ts
interface Injector<T extends Token> {
  get(token: ConstructorOf<any>, args?: ConstructorParameters<T>, opts?: InstanceOpts): TokenResult<T>;
  get(token: T, opts?: InstanceOpts): TokenResult<T>;
}
```

从 Injector 获取一个对象实例的方法，如果传递的是一个构造函数，第二个参数可以传递构造函数 Arguments 数据，此时将会直接将构造函数创建实例返回，并附加依赖注入的功能，此时的构造函数不需要被 Injectable 装饰也能正常创建对象。例如下面这样：

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
