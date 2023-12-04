interface CallStack {
  depth: number;
}

export type Optional<T extends object, K extends keyof T = keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Context<T> = {
  proceed(): Promise<void> | void;
} & T;

export type PureContext<T> = Optional<Context<T>, 'proceed'>;

export interface Composed<C> {
  (ctx: PureContext<C>): Promise<void> | void;
}

export interface Middleware<C> {
  (ctx: Context<C>): Promise<void> | void;
}

function dispatch<C>(
  middlewareList: Middleware<C>[],
  idx: number,
  stack: CallStack,
  ctx: PureContext<C>,
): Promise<void> | void {
  if (idx <= stack.depth) {
    throw new Error('ctx.proceed() called multiple times');
  }

  stack.depth = idx;

  let maybePromise: Promise<void> | void | undefined;

  if (idx < middlewareList.length) {
    const middleware = middlewareList[idx];

    maybePromise = middleware({
      ...ctx,
      proceed: () => dispatch(middlewareList, idx + 1, stack, ctx),
    } as Context<C>);
  } else if (ctx.proceed) {
    maybePromise = ctx.proceed();
  }

  return maybePromise;
}

export default function compose<C>(middlewareList: Middleware<C>[]): Composed<C> {
  return (ctx) => {
    const stack: CallStack = { depth: -1 };
    return dispatch<C>(middlewareList, 0, stack, ctx);
  };
}
