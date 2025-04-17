/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import {
  consumerAfterComputation,
  consumerBeforeComputation,
  producerAccessed,
  producerUpdateValueVersion,
  REACTIVE_NODE,
  ReactiveNode,
  Version,
} from './graph';
import {Watcher as InteropWatcher} from './interop_lib';

class Watcher implements InteropWatcher {
  private _started = false;
  private _watchNode: InteropWatchNode;
  private _upToDate = false;
  private _version: Version = -1 as Version;

  constructor(
    private readonly _node: ReactiveNode,
    private readonly _notify: () => void,
  ) {
    const watchNode: InteropWatchNode = Object.create(INTEROP_WATCH_NODE);
    watchNode.watcher = this;
    this._watchNode = watchNode;
  }

  private _markDirty(): void {
    if (this._upToDate) {
      this._upToDate = false;
      const notify = this._notify;
      notify();
    }
  }

  private _run(): void {
    const watchNode = this._watchNode;
    const prevConsumer = consumerBeforeComputation(watchNode);
    try {
      if (this._started) {
        const node = this._node;
        producerUpdateValueVersion(node);
        producerAccessed(node);
      }
    } finally {
      consumerAfterComputation(watchNode, prevConsumer);
    }
  }

  isStarted(): boolean {
    return this._started;
  }

  isUpToDate(): boolean {
    return this._upToDate;
  }

  update(): boolean {
    if (!this._upToDate) {
      if (this._started) {
        this._run();
        this._watchNode.dirty = false;
        this._upToDate = true;
      } else {
        producerUpdateValueVersion(this._node);
      }
      const changed = this._version !== this._node.version;
      this._version = this._node.version;
      return changed;
    }
    return false;
  }

  start(): void {
    if (!this._started) {
      this._started = true;
      this._run();
    }
  }

  stop(): void {
    if (this._started) {
      this._started = false;
      this._upToDate = false;
      this._run();
    }
  }
}

interface InteropWatchNode extends ReactiveNode {
  watcher: Watcher;
}

// Note: Using an IIFE here to ensure that the spread assignment is not considered
// a side-effect, ending up preserving `INTEROP_SIGNAL_NODE` and `REACTIVE_NODE`.
// TODO: remove when https://github.com/evanw/esbuild/issues/3392 is resolved.
const INTEROP_WATCH_NODE: InteropWatchNode = /* @__PURE__ */ (() => {
  return {
    ...REACTIVE_NODE,
    kind: 'interop_watch',
    consumerIsAlwaysLive: true,
    watcher: null!,
    consumerMarkedDirty(this: InteropWatchNode) {
      this.watcher['_markDirty']();
    },
  };
})();

function interopWatch<T>(this: ReactiveNode, notify: () => void): InteropWatcher {
  return new Watcher(this, notify);
}
