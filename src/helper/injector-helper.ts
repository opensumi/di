import 'reflect-metadata';
import { InstanceOpts } from '../declare';

// 如果使用 import 的方式，会导致 tsc 编译过不了
// 原因：import json 需要开启 resolveJsonModule，然后 tsc 会把 package.json 也放到产物中，导致产物目录结构有问题
// eslint-disable-next-line
const { version } = require('../../package.json');

const INJECTOR_KEY = Symbol('INJECTOR_KEY');

export function getInjectorOfInstance(instance: object) {
  return (instance as any)[INJECTOR_KEY] || null;
}

export function setInjector(instance: any, injector: object) {
  (instance as any)[INJECTOR_KEY] = injector;
}

export function removeInjector(instance: any) {
  delete (instance as any)[INJECTOR_KEY];
}

const INJECTABLE_KEY = Symbol('INJECTABLE_KEY');
const defaultInstanceOpts: InstanceOpts = {};

export function markInjectable(target: object, opts: InstanceOpts = defaultInstanceOpts) {
  // 合并的时候只合并当前对象的数据
  const currentOpts = Reflect.getOwnMetadata(INJECTABLE_KEY, target);
  Reflect.defineMetadata(INJECTABLE_KEY, { ...opts, ...currentOpts, version }, target);
}

export function getInjectableOpts(target: object): InstanceOpts | undefined {
  // 可注入性的参数可以继承自父级
  return Reflect.getMetadata(INJECTABLE_KEY, target);
}

export function isInjectable(target: object) {
  return !!getInjectableOpts(target);
}

let index = 0;
export function createId(name: string) {
  return `${name}_${index++}`;
}
