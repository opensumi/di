/**
 * Modified from https://github.com/opensumi/utils/blob/main/packages/events/src/index.ts
 */

export type Handler<T extends any[]> = (...args: T) => void;

export class EventEmitter<Events extends Record<any, any[]>> {
  private _listeners: Map<keyof Events, any[]> = new Map();

  on<Event extends keyof Events>(event: Event, listener: Handler<Events[Event]>) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)!.push(listener);

    return () => this.off(event, listener);
  }

  off<Event extends keyof Events>(event: Event, listener: Handler<Events[Event]>) {
    if (!this._listeners.has(event)) {
      return;
    }
    const listeners = this._listeners.get(event)!;
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  once<Event extends keyof Events>(event: Event, listener: Handler<Events[Event]>) {
    const remove: () => void = this.on(event, (...args: Parameters<Handler<Events[Event]>>) => {
      remove();
      listener.apply(this, args);
    });

    return remove;
  }

  emit<Event extends keyof Events>(event: Event, ...args: Parameters<Handler<Events[Event]>>) {
    if (!this._listeners.has(event)) {
      return;
    }
    [...this._listeners.get(event)!].forEach((listener) => listener.apply(this, args));
  }

  hasListener<Event extends keyof Events>(event: Event) {
    return this._listeners.has(event);
  }

  getListeners<Event extends keyof Events>(event: Event) {
    return this._listeners.get(event) || [];
  }

  dispose() {
    this._listeners.clear();
  }
}
