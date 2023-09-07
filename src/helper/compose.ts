interface CallStack {
  index: number;
}

export type Context<T> = {
  proceed(): Promise<void> | void;
} & T;

export type Optional<T extends object, K extends keyof T = keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type PureContext<T> = Optional<Context<T>, 'proceed'>;

export interface Composed<C> {
  (ctx: PureContext<C>): Promise<void> | void;
}

export interface Middleware<C> {
  (ctx: Context<C>): Promise<void> | void;
  awaitPromise?: boolean;
}

function dispatch<C>(
  middlewareList: Middleware<C>[],
  depth: number,
  stack: CallStack,
  ctx: PureContext<C>,
): Promise<void> | void {
  if (depth <= stack.index) {
    throw new Error('joinPoint.proceed() called multiple times');
  }

  stack.index = depth;

  const { length } = middlewareList;

  let maybePromise: Promise<void> | void;
  if (depth <= length) {
    if (depth < length) {
      const middleware = middlewareList[depth];

      maybePromise = middleware({
        ...ctx,
        proceed: () => {
          return dispatch(middlewareList, depth + 1, stack, ctx);
        },
      } as Context<C>);

      if (middleware.awaitPromise) {
        maybePromise = Promise.resolve(maybePromise);
      }
    } else if (ctx.proceed) {
      // 这里可以不用 Promise.resolve
      // 但是为了兼容旧的表现，这里还是加上了
      maybePromise = ctx.proceed();
    }
  }

  return maybePromise;
}

export default function compose<C>(middlewareList: Middleware<C>[]): Composed<C> {
  return (ctx) => {
    const stack = { index: -1 };
    return dispatch<C>(middlewareList, 0, stack, ctx);
  };
}
