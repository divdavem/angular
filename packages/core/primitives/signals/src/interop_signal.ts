/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import {
  angularLibrary,
  consumerMarkDirty,
  getAngularActiveConsumer,
  internalProducerAccessed,
  producerUpdateValueVersion,
  REACTIVE_NODE,
  ReactiveNode,
} from './graph';
import {Watcher as InteropWatcher, WatchableSignal} from './interop_lib';

function interopSignal<T>(signal: WatchableSignal): ReactiveNode {
  const node: InteropSignalNode<T> = Object.create(INTEROP_SIGNAL_NODE);
  node.watcher = signal.watchSignal(() => {
    if (!node.dirty) {
      consumerMarkDirty(node);
    }
  });
  return node;
}

interface InteropSignalNode<T> extends ReactiveNode {
  computing: boolean;
  started: boolean;
  watcher: InteropWatcher;
}

// Note: Using an IIFE here to ensure that the spread assignment is not considered
// a side-effect, ending up preserving `INTEROP_SIGNAL_NODE` and `REACTIVE_NODE`.
// TODO: remove when https://github.com/evanw/esbuild/issues/3392 is resolved.
const INTEROP_SIGNAL_NODE: InteropSignalNode<unknown> = /* @__PURE__ */ (() => {
  return {
    ...REACTIVE_NODE,
    dirty: true,
    started: false,
    computing: false,
    kind: 'interop_signal',
    watcher: null!,
    hasInteropSignalDep: true,

    producerMustRecompute(node: InteropSignalNode<unknown>): boolean {
      return node.computing || !node.watcher.isUpToDate();
    },

    producerRecomputeValue(node: InteropSignalNode<unknown>): void {
      if (node.computing) {
        // Our computation somehow led to a cyclic read of itself.
        throw new Error('Detected cycle in computations.');
      }

      node.computing = true;
      let differentValue = true;
      try {
        differentValue = node.watcher.update();
      } finally {
        node.computing = false;
        if (differentValue) {
          node.version++;
        }
      }
    },

    producerOnAccess() {
      producerUpdateValueVersion(this);
    },

    watched() {
      if (!this.started) {
        this.started = true;
        this.watcher.start();
        this.producerRecomputeValue(this);
        this.dirty = false;
      }
    },

    unwatched() {
      if (this.started) {
        this.started = false;
        this.watcher.stop();
      }
    },
  };
})();

const interopSignalMap = new WeakMap<WatchableSignal, ReactiveNode>();

angularLibrary.producerAccessed = (signal: WatchableSignal) => {
  const activeConsumer = getAngularActiveConsumer();
  if (activeConsumer) {
    let producer = interopSignalMap.get(signal);
    if (!producer) {
      producer = interopSignal(signal);
      interopSignalMap.set(signal, producer);
    }
    producer.producerOnAccess?.();
    internalProducerAccessed(producer, activeConsumer);
  }
};
