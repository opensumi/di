import { EventEmitter } from '../../src/helper/event';

describe('event emitter', () => {
  it('basic usage', () => {
    const emitter = new EventEmitter<{
      [key: string]: [string];
    }>();

    const spy = jest.fn();
    const spy2 = jest.fn();
    emitter.on('test', spy);
    emitter.on('foo', spy2);

    expect(emitter.hasListener('test')).toBe(true);
    const listeners = emitter.getListeners('test');
    expect(listeners.length).toBe(1);

    emitter.emit('test', 'hello');
    expect(spy).toBeCalledWith('hello');
    emitter.off('test', spy);

    const listeners2 = emitter.getListeners('test');
    expect(listeners2.length).toBe(0);

    emitter.emit('test', 'hello');
    expect(spy).toBeCalledTimes(1);

    emitter.once('test', spy);
    emitter.emit('test', 'hello');
    expect(spy).toBeCalledTimes(2);
    emitter.emit('test', 'hello');
    expect(spy).toBeCalledTimes(2);

    emitter.off('bar', spy);

    emitter.dispose();

    emitter.emit('test', 'hello');
    expect(spy).toBeCalledTimes(2);
  });

  it('many listeners listen to one event', () => {
    const emitter = new EventEmitter<{
      [key: string]: [string];
    }>();
    const spy = jest.fn();
    const spy2 = jest.fn();
    emitter.on('test', spy);
    emitter.on('test', spy2);
    emitter.emit('test', 'hello');
    expect(spy).toBeCalledWith('hello');
    expect(spy2).toBeCalledWith('hello');

    emitter.off('test', spy);
    emitter.emit('test', 'hello');
    expect(spy).toBeCalledTimes(1);
    expect(spy2).toBeCalledTimes(2);

    emitter.dispose();
  });

  it('can dispose event listener by using returned function', () => {
    const emitter = new EventEmitter<{
      [key: string]: [string];
    }>();
    const spy = jest.fn();
    const spy2 = jest.fn();
    const spy3 = jest.fn();
    const disposeSpy = emitter.on('test', spy);
    emitter.on('test', spy2);

    const disposeSpy3 = emitter.once('test', spy3);
    disposeSpy3();

    emitter.emit('test', 'hello');
    expect(spy).toBeCalledWith('hello');
    expect(spy2).toBeCalledWith('hello');

    disposeSpy();
    emitter.emit('test', 'hello');
    expect(spy).toBeCalledTimes(1);
    expect(spy2).toBeCalledTimes(2);
    expect(spy3).toBeCalledTimes(0);
    emitter.dispose();
  });
});

describe('event emitter types', () => {
  it('basic usage', () => {
    const emitter = new EventEmitter<{
      test: [string, string];
      foo: [string];
    }>();

    const spy = jest.fn();
    const spy2 = jest.fn();

    emitter.on('test', spy);
    emitter.on('foo', spy2);

    expect(emitter.hasListener('test')).toBe(true);
    const listeners = emitter.getListeners('test');
    expect(listeners.length).toBe(1);

    emitter.emit('test', 'hello', 'world');
    expect(spy).toBeCalledWith('hello', 'world');
    emitter.off('test', spy);

    const listeners2 = emitter.getListeners('test');
    expect(listeners2.length).toBe(0);

    emitter.emit('test', 'hello', 'world');
    expect(spy).toBeCalledTimes(1);

    emitter.once('test', spy);
    emitter.emit('test', 'hello', 'world');
    expect(spy).toBeCalledTimes(2);
    emitter.emit('test', 'hello', 'world');
    expect(spy).toBeCalledTimes(2);

    emitter.off('bar' as any, spy);

    emitter.dispose();

    emitter.emit('test' as any, 'hello');
    expect(spy).toBeCalledTimes(2);
  });

  it('many listeners listen to one event', () => {
    const emitter = new EventEmitter<{
      [key: string]: [string];
    }>();
    const spy = jest.fn();
    const spy2 = jest.fn();
    emitter.on('test', spy);
    emitter.on('test', spy2);
    emitter.emit('test', 'hello');
    expect(spy).toBeCalledWith('hello');
    expect(spy2).toBeCalledWith('hello');

    emitter.off('test', spy);
    emitter.emit('test', 'hello');
    expect(spy).toBeCalledTimes(1);
    expect(spy2).toBeCalledTimes(2);

    emitter.dispose();
  });

  it('can dispose event listener by using returned function', () => {
    const emitter = new EventEmitter<{
      [key: string]: [string];
    }>();
    const spy = jest.fn();
    const spy2 = jest.fn();
    const spy3 = jest.fn();
    const disposeSpy = emitter.on('test', spy);
    emitter.on('test', spy2);

    const disposeSpy3 = emitter.once('test', spy3);
    disposeSpy3();

    emitter.emit('test', 'hello');
    expect(spy).toBeCalledWith('hello');
    expect(spy2).toBeCalledWith('hello');

    disposeSpy();
    emitter.emit('test', 'hello');
    expect(spy).toBeCalledTimes(1);
    expect(spy2).toBeCalledTimes(2);
    expect(spy3).toBeCalledTimes(0);
    emitter.dispose();
  });
});
