/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Signal as InteropSignal,
  Watcher as InteropWatcher,
  watchSignal as interopWatchSignal,
} from '@amadeus-it-group/tansu/interop';
import {consumerMarkDirty, producerUpdateValueVersion} from './graph';
import {REACTIVE_NODE, ReactiveNode} from './reactive_node';

export function interopSignal<T>(signal: InteropSignal<T>): ReactiveNode {
  const node: InteropSignalNode<T> = Object.create(INTEROP_SIGNAL_NODE);
  node.watcher = signal[interopWatchSignal](() => {
    if (!node.dirty) {
      consumerMarkDirty(node);
    }
  });
  return node;
}

export interface InteropSignalNode<T> extends ReactiveNode {
  computing: boolean;
  started: boolean;
  watcher: InteropWatcher<T>;
}

// Note: Using an IIFE here to ensure that the spread assignment is not considered
// a side-effect, ending up preserving `INTEROP_SIGNAL_NODE` and `REACTIVE_NODE`.
// TODO: remove when https://github.com/evanw/esbuild/issues/3392 is resolved.
const INTEROP_SIGNAL_NODE = /* @__PURE__ */ (() => {
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
        const watcher = node.watcher;
        differentValue = watcher.update();
      } finally {
        node.computing = false;
        if (differentValue) {
          node.version++;
        }
      }
    },

    producerOnAccess(node: InteropSignalNode<unknown>) {
      producerUpdateValueVersion(node);
    },

    producerStartLive(node: InteropSignalNode<unknown>) {
      if (!node.started) {
        node.started = true;
        node.watcher.start();
        node.producerRecomputeValue(node);
      }
    },

    producerStopLive(node: InteropSignalNode<unknown>) {
      node.dirty = true;
      if (node.started) {
        node.started = false;
        node.watcher.stop();
      }
    },
  } satisfies InteropSignalNode<any>;
})();
