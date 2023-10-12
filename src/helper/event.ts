export class EventEmitter<T> {
  private _listeners: Map<T, Function[]> = new Map();

  on(event: T, listener: Function) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)!.push(listener);
  }

  off(event: T, listener: Function) {
    if (!this._listeners.has(event)) {
      return;
    }
    const listeners = this._listeners.get(event)!;
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  once(event: T, listener: Function) {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  emit(event: T, ...args: any[]) {
    if (!this._listeners.has(event)) {
      return;
    }
    this._listeners.get(event)!.forEach((listener) => listener(...args));
  }

  dispose() {
    this._listeners.clear();
  }
}
