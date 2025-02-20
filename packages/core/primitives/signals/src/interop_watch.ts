import {Signal as InteropSignal, Watcher as InteropWatcher} from '@amadeus-it-group/tansu/interop';
import {isInNotificationPhase, producerAccessed, producerUpdateValueVersion} from './graph';
import {ERRORED, ReactiveNode, Version} from './reactive_node';
import {createWatch, Watch} from './watch';

class Watcher<T> implements InteropWatcher<T> {
  private _watch: Watch | null = null;
  private _upToDate = false;
  private _version: Version = -1 as Version;

  constructor(
    private readonly _node: ReactiveNode & InteropSignal<T> & {value: T; error?: any},
    private readonly _notify: () => void,
  ) {
    this._markDirty = this._markDirty.bind(this);
    this._watchFn = this._watchFn.bind(this);
  }

  private _watchFn(): void {
    const node = this._node;
    producerUpdateValueVersion(node);
    producerAccessed(node);
  }

  private _markDirty(): void {
    if (this._upToDate) {
      this._upToDate = false;
      const notify = this._notify;
      notify();
    }
  }

  isUpToDate(): boolean {
    return this._upToDate;
  }

  update(): boolean {
    let watch = this._watch;
    if (!watch) {
      watch = createWatch(this._watchFn, this._markDirty, true);
      this._watch = watch;
    }
    watch.run();
    const changed = this._version !== this._node.version;
    this._version = this._node.version;
    this._upToDate = true;
    return changed;
  }

  get(): T {
    if (isInNotificationPhase()) {
      throw new Error('Cannot access signal value during notification phase');
    }
    if (!this._upToDate) {
      throw new Error('Watcher not up to date');
    }
    const node = this._node;
    if (node.value === ERRORED) {
      throw node.error;
    }
    return node.value;
  }

  suspend(): void {
    this._upToDate = false;
    const watch = this._watch;
    if (watch) {
      this._watch = null;
      watch.destroy();
    }
  }
}

export function interopWatch<T>(
  this: ReactiveNode & InteropSignal<T> & {value: T; error?: any},
  notify: () => void,
): InteropWatcher<T> {
  return new Watcher(this, notify);
}
