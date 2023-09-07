import type { Injector } from './injector';

export type ConstructorOf<T = any> = new (...args: any[]) => T;
export type TokenResult<T extends Token> = T extends ConstructorOf<infer R> ? R : any;

export type Token = string | symbol | Function;
export type Tag = string | number;
export type Domain = string | symbol;

// An identifier to get the Injector.
export const INJECTOR_TOKEN: Token = Symbol('INJECTOR_TOKEN');

/**
 * Represents the state in this round of creating.
 */
export interface Context<T extends BasicCreator = InstanceCreator> {
  injector: Injector;
  token: Token;
  creator: T;
  /**
   * Refers to the state of the last time in the recursive creation process
   */
  parent?: Context<T>;
}

// A Provider that can be directly instantiated.
export type TypeProvider = ConstructorOf<any>;

interface BasicProvider {
  token: Token;
  tag?: Tag;
  dropdownForTag?: boolean;
  isDefault?: boolean;
  override?: boolean;
}

/**
 * Provide a `class` that is used to instantiated
 */
export interface ClassProvider extends BasicProvider {
  useClass: ConstructorOf<any>;
}

/**
 * Provide a `value` that is used to get
 */
export interface ValueProvider extends BasicProvider {
  useValue: any;
}

export interface AliasProvider extends BasicProvider {
  useAlias: Token;
}

export interface FactoryFunction<T = any> {
  (injector: Injector): T;
}

export interface FactoryProvider<T = any> extends BasicProvider {
  useFactory: FactoryFunction<T>;
}

export type Provider = ClassProvider | TypeProvider | ValueProvider | AliasProvider | FactoryProvider<any>;

export enum CreatorStatus {
  init,
  creating,
  done,
}

interface BasicCreator {
  tag?: Tag;
  dropdownForTag?: boolean;
  status?: CreatorStatus;
  /**
   * Store the instantiated object.
   */
  instance?: any;
  /**
   * Represent this creator is parsed from `Parameter`. and the params of Inject has set `default` attribution.
   */
  isDefault?: boolean;
}

export interface ValueCreator extends BasicCreator {
  instance: any;
  status: CreatorStatus.done;
}

export interface ParameterOpts {
  token: Token;
  default?: any;
}

export interface ClassCreator extends BasicCreator {
  opts: InstanceOpts;
  parameters: ParameterOpts[];
  useClass: ConstructorOf<any>;
}

export interface FactoryCreator<T = any> extends BasicCreator {
  useFactory: FactoryFunction<T>;
}

export interface AliasCreator extends BasicCreator {
  useAlias: Token;
}

export type InstanceCreator = ValueCreator | ClassCreator | FactoryCreator | AliasCreator;

export interface InstanceOpts {
  version?: string;
  multiple?: boolean;
  tag?: Tag;
  domain?: Domain | Domain[];
}

export interface InjectorOpts {
  strict?: boolean;
  dropdownForTag?: boolean;
  tag?: string;
}

export interface AddProvidersOpts {
  override?: boolean;
  deep?: boolean;
}

export type MethodName = string | number | symbol;

export enum HookType {
  Before = 'Before',
  After = 'After',
  Around = 'Around',
  AfterReturning = 'AfterReturning',
  AfterThrowing = 'AfterThrowing',
}

export type IBeforeAspectHookFunction<ThisType = any, Args extends any[] = any[], Result = any> = (
  joinPoint: IBeforeJoinPoint<ThisType, Args, Result>,
) => void | Promise<void>;
export type IAfterAspectHookFunction<ThisType = any, Args extends any[] = any[], Result = any> = (
  joinPoint: IAfterJoinPoint<ThisType, Args, Result>,
) => void | Promise<void>;
export type IAroundAspectHookFunction<ThisType = any, Args extends any[] = any[], Result = any> = (
  joinPoint: IAroundJoinPoint<ThisType, Args, Result>,
) => void | Promise<void>;
export type IAfterReturningAspectHookFunction<ThisType = any, Args extends any[] = any[], Result = any> = (
  joinPoint: IAfterReturningJoinPoint<ThisType, Args, Result>,
) => void | Promise<void>;
export type IAfterThrowingAspectHookFunction<ThisType = any, Args extends any[] = any[], Result = any> = (
  joinPoint: IAfterThrowingJoinPoint<ThisType, Args, Result>,
) => void | Promise<void>;

export type IAspectHookTypeFunction<ThisType, Args extends any[], Result> =
  | IBeforeAspectHookFunction<ThisType, Args, Result>
  | IAfterAspectHookFunction<ThisType, Args, Result>
  | IAroundAspectHookFunction<ThisType, Args, Result>
  | IAfterReturningAspectHookFunction<ThisType, Args, Result>
  | IAfterThrowingAspectHookFunction<ThisType, Args, Result>;

export type IInstanceHooks = Map<MethodName, IValidAspectHook[]>;
export type IHookMap = Map<Token, IInstanceHooks>;

/**
 * Describe how to hook a method
 */
export interface IAspectHook<ThisType = any, Args extends any[] = any[], Result = any> {
  target: Token;
  method: MethodName;
  awaitPromise?: boolean;
  type: HookType;
  hook: IAspectHookTypeFunction<ThisType, Args, Result>;
}

export type IValidAspectHook<ThisType = any, Args extends any[] = any[], Result = any> =
  | IBeforeAspectHook<ThisType, Args, Result>
  | IAfterAspectHook<ThisType, Args, Result>
  | IAroundAspectHook<ThisType, Args, Result>
  | IAfterReturningAspectHook<ThisType, Args, Result>
  | IAfterThrowingAspectHook<ThisType, Args, Result>;

export interface IBeforeAspectHook<ThisType = any, Args extends any[] = any[], Result = any>
  extends IAspectHook<ThisType, Args, Result> {
  type: HookType.Before;
  hook: IBeforeAspectHookFunction<ThisType, Args, Result>;
}

export interface IAfterAspectHook<ThisType = any, Args extends any[] = any[], Result = any>
  extends IAspectHook<ThisType, Args, Result> {
  type: HookType.After;
  hook: IAfterAspectHookFunction<ThisType, Args, Result>;
}

export interface IAfterReturningAspectHook<ThisType = any, Args extends any[] = any[], Result = any>
  extends IAspectHook<ThisType, Args, Result> {
  type: HookType.AfterReturning;
  hook: IAfterReturningAspectHookFunction<ThisType, Args, Result>;
}

export interface IAroundAspectHook<ThisType = any, Args extends any[] = any[], Result = any>
  extends IAspectHook<ThisType, Args, Result> {
  type: HookType.Around;
  hook: IAroundAspectHookFunction<ThisType, Args, Result>;
}

export interface IAfterThrowingAspectHook<ThisType = any, Args extends any[] = any[], Result = any>
  extends IAspectHook<ThisType, Args, Result> {
  type: HookType.AfterThrowing;
  hook: IAfterThrowingAspectHookFunction<ThisType, Args, Result>;
}

export interface IJoinPoint<ThisType = any, Args extends any[] = any, Result = any> {
  getThis(): ThisType;
  getMethodName(): MethodName;
  getOriginalArgs(): Args;
}

export interface IBeforeJoinPoint<ThisType, Args extends any[], Result> extends IJoinPoint<ThisType, Args, Result> {
  getArgs(): Args;
  setArgs(args: Args): void;
}

export interface IAfterJoinPoint<ThisType, Args extends any[], Result> extends IJoinPoint<ThisType, Args> {
  getArgs(): Args;
  getResult(): Result;
  setResult(result: Result): void;
}

export interface IAroundJoinPoint<ThisType, Args extends any[], Result> extends IJoinPoint<ThisType, Args> {
  getArgs(): Args;
  setArgs(args: Args): void;
  getResult(): Result;
  setResult(result: Result): void;
  proceed(): Promise<void> | void;
}

export interface IAfterReturningJoinPoint<ThisType, Args extends any[], Result> extends IJoinPoint<ThisType, Args> {
  getArgs(): Args;
  getResult(): Result;
}

export interface IAfterThrowingJoinPoint<ThisType, Args extends any[], Result> extends IJoinPoint<ThisType, Args> {
  getError(): Error | undefined;
}

export interface IHookStore {
  createHooks(hooks: IValidAspectHook[]): IDisposable;
  createOneHook<ThisType, Args extends any[], Result>(hook: IValidAspectHook<ThisType, Args, Result>): IDisposable;
  getHooks(token: Token, method: MethodName): IValidAspectHook[];
  hasHooks(token: Token): boolean;
}

export interface IDisposable {
  dispose: () => void;
}

export interface IHookOptions {
  // Whether to wait for the hook (if the return value of the hook is a promise)
  await?: boolean;
}
