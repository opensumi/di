import { Injectable, Injector } from '../src';

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
console.log(b.a); // print 'true'
