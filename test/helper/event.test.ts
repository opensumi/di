import { EventEmitter } from '../../src/helper/event';

describe('event emitter', () => {
  it('basic usage', () => {
    const emitter = new EventEmitter<string>();
    const spy = jest.fn();
    const spy2 = jest.fn();
    emitter.on('test', spy);
    emitter.on('foo', spy2);
    emitter.emit('test', 'hello');
    expect(spy).toBeCalledWith('hello');
    emitter.off('test', spy);
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
});
