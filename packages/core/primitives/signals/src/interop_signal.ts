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
  watcher: InteropWatcher<T>;
}

// Note: Using an IIFE here to ensure that the spread assignment is not considered
// a side-effect, ending up preserving `INTEROP_SIGNAL_NODE` and `REACTIVE_NODE`.
// TODO: remove when https://github.com/evanw/esbuild/issues/3392 is resolved.
const INTEROP_SIGNAL_NODE = /* @__PURE__ */ (() => {
  return {
    ...REACTIVE_NODE,
    dirty: true,
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

    producerOnNoLongerLive(node: InteropSignalNode<unknown>) {
      node.dirty = true;
      node.watcher.suspend();
    },
  } satisfies InteropSignalNode<any>;
})();
