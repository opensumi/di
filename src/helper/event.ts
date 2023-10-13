export class EventEmitter<T> {
  private _listeners: Map<T, Function[]> = new Map();

  on(event: T, listener: Function) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)!.push(listener);

    return () => this.off(event, listener);
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
    const remove: () => void = this.on(event, (...args: any[]) => {
      remove();
      listener.apply(this, args);
    });

    return remove;
  }

  emit(event: T, ...args: any[]) {
    if (!this._listeners.has(event)) {
      return;
    }
    [...this._listeners.get(event)!].forEach((listener) => listener.apply(this, args));
  }

  dispose() {
    this._listeners.clear();
  }
}
