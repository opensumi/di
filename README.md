# common-di

> 基于 Angular DI 的设计自行实现的一个依赖注入的工具，https://angular.io/guide/dependency-injection。

如果你想在项目中使用工厂模式或者依赖反转，那么必不可少的需要一个依赖注入的工具。这个工具将会帮助你很好的帮助你实现依赖反转，而不在关系那些对象实例化的细节。同时，因为对象的实例化在注册器中进行创建，所以单例模式也很容易在这里实现。

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#API)
- [Example Readmes](#example-readmes)
- [Related Efforts](#related-efforts)

## Background

出于对于 DI 的需要，并且调研市场上的 DI 工具，都有一些不太满意的地方，所以自己写了一个工具来实现 Angular 定义的 DI 模式。

- Inversify.Js 用法太过于死板，显示的 Token 模式，导致要写很多代码，相较于 API 还是 Angular 的 Token 和 Provider 的设计更容易理解。
- injection-js 从 Angular 抽离出来的 DI 工具，因为具有 Angular 的 Module 设计，一般的 DI 是不需要要的。

### Token

查找实例的唯一标记，类型描述如下：
```ts
export type Token = string | symbol | Function;
```

### Provider

为 Token 提供实例的定义，一共有四种类型的 Provider 定义：
```ts
export type Provider = 
  ClassProvider | 
  TypeProvider | 
  ValueProvider | 
  FactoryProvider;
```

#### ClassProvider
定义一个 Token 使用某个特定的构造函数的时候会用到的 Provider。
```ts
export interface ClassProvider {
  token: Token;
  useClass: ConstructorOf<any>;
}
```

在依赖反转之后，构造函数都依赖抽象而不依赖实例的时候会非常有效。比如下面的例子：
```ts
interface Driveable {
  drive(): void;
}

@Injectable()
class Student {
  @Autowired('Driveable')
  mBike: Driveable;

  goToSchool() {
    console.log('go to school');
    mBike.drive();
  }
}
```

学生对象依赖的是一个可驾驶的交通工具，可以在创建对象的时候提供一个自行车，也可以在创建的时候提供一个汽车：
```ts
@Injectable()
class Car implements Driveable {
  drive() {
    console.log('by car')
  }
}

injector.addProviders(Student)
injector.addProviders({
  token: 'Driveable',
  useClass: Car,
})

const student = injector.get(Student);
student.goToSchool(); // print 'go to school by car' 
```

#### TypeProvider
token 和 useClass 都是一样的 ClassProvider，一般不会直接用到，使用 Autowired 如果是一个 Function，就会转换成这个类型。

#### ValueProvider
和 ClassProvider 一样作用，但是直接提供一个对象实例的 Provider。
```ts
export interface ValueProvider {
  token: Token;
  useValue: any;
}
```

#### FactoryProvider
和 ClassProvider 一样作用，但是提供一个函数进行对象实例创建的 Provider。
```ts
export interface FactoryProvider {
  token: Token;
  useFactory: () => any;
}
```

## Install

```sh
$ tnpm install @ali/common-di --save
```

## Usage

### 对 Construtor 进行构造注入
```ts
@Injectable()
class A {
  constructor() {
    console.log('Create A');
  }
}

@Injectable()
class B {
  constructor(public a: A){}
}

const injector = new Injector();
injector.addProviders(A, B);

const b = injector.get(B); // print 'Create A'
console.log(b.a instanceof A) // print 'true'
```


### 使用 Autowired 进行动态注入
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


### 单例与多例的用法
```ts
@Injectable()
class Single {
  constructor() {}
}

@Injectable({ multiple: true })
class Multiple {
  constructor() {}
}

const injector = new Injector();
injector.addProviders(Single, Multiple);

const single1 = injector.get(Single);
const single2 = injector.get(Single);
console.log(single1 === single2); // print 'true'

const multiple1 = injector.get(Multiple);
const multiple2 = injector.get(Multiple);
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
console.log(app.logger instanceof LoggerImpl); // print 'true'
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

### @Injectable
```ts
interface InstanceOpts {
  multiple?: boolean;
}
function Injectable(opts?: InstanceOpts): ClassDecorator;

@Injectable({ multiple: true })
class A {}

const injector = new Injector([A]);

const a = injector.get(A);
console.log(injector.hasInstance(a)) // print 'false'
```
所有需要被 Injector 创建的构造函数都应该使用这个装饰器修饰才可以正常使用，否则会报错
- multiple: 是否启用多例模式，一旦启用了多例模式之后，Injector 将不会持有实例对象的引用。


### @Autowired
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


### @Inject
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
多态实现：
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

const injector = new Injector([A])
const b = injector.get(B, []);
console.log(b.a instanceof A); // print 'true'
```

### Injector.hasInstance
Injector 中是否具备某个对象的单例引用

## Example Readmes

更多的用例可以 [点击查看](test/use-case.test.ts).

## Related Efforts

- [Angular](https://angular.io/guide/dependency-injection) - Angular 的 DI 工具使用文档 
- [injection-js](https://github.com/mgechev/injection-js) - 把 Agular 的 DI 抽取出来的单独仓库。
- [InversifyJS](https://github.com/inversify/InversifyJS) - 目前社区中比较受欢迎的 DI 库，但是感觉用法比较麻烦。
- [power-di](https://github.com/zhang740/power-di) - 支付宝小程序目前使用的 DI 工具。



