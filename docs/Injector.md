# Injector

The `Injector` is where we used to get instance, register provider.

## Example

```ts

```

## Use multiple

```ts
import { Injectable, Injector } from '../src';

@Injectable()
class Single {}

@Injectable({ multiple: true })
class Multiple {}

const injector = new Injector();
injector.addProviders(Single, Multiple);

const single1 = injector.get(Single);
const single2 = injector.get(Single);
console.log(single1 === single2); // print 'true'

const multiple1 = injector.get(Multiple);
const multiple2 = injector.get(Multiple);
console.log(multiple1 === multiple2); // print 'false'
```
