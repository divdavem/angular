/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

export type Version = number & {__brand: 'Version'};

export const REACTIVE_NODE: ReactiveNode = {
  version: 0 as Version,
  lastCleanEpoch: 0 as Version,
  dirty: false,
  producerNode: undefined,
  producerLastReadVersion: undefined,
  producerIndexOfThis: undefined,
  nextProducerIndex: 0,
  hasInteropSignalDep: false,
  liveConsumerNode: undefined,
  liveConsumerIndexOfThis: undefined,
  consumerAllowSignalWrites: false,
  consumerIsAlwaysLive: false,
  kind: 'unknown',
  producerMustRecompute: () => false,
  producerRecomputeValue: () => {},
  consumerMarkedDirty: () => {},
  consumerOnSignalRead: () => {},
  producerOnAccess: () => {},
  producerStartLive: () => {},
  producerStopLive: () => {},
};

/**
 * A producer and/or consumer which participates in the reactive graph.
 *
 * Producer `ReactiveNode`s which are accessed when a consumer `ReactiveNode` is the
 * `activeConsumer` are tracked as dependencies of that consumer.
 *
 * Certain consumers are also tracked as "live" consumers and create edges in the other direction,
 * from producer to consumer. These edges are used to propagate change notifications when a
 * producer's value is updated.
 *
 * A `ReactiveNode` may be both a producer and consumer.
 */
export interface ReactiveNode {
  /**
   * Version of the value that this node produces.
   *
   * This is incremented whenever a new value is produced by this node which is not equal to the
   * previous value (by whatever definition of equality is in use).
   */
  version: Version;

  /**
   * Epoch at which this node is verified to be clean.
   *
   * This allows skipping of some polling operations in the case where no signals have been set
   * since this node was last read.
   */
  lastCleanEpoch: Version;

  /**
   * Whether this node (in its consumer capacity) is dirty.
   *
   * Only live consumers become dirty, when receiving a change notification from a dependency
   * producer.
   */
  dirty: boolean;

  /**
   * Producers which are dependencies of this consumer.
   *
   * Uses the same indices as the `producerLastReadVersion` and `producerIndexOfThis` arrays.
   */
  producerNode: ReactiveNode[] | undefined;

  /**
   * `Version` of the value last read by a given producer.
   *
   * Uses the same indices as the `producerNode` and `producerIndexOfThis` arrays.
   */
  producerLastReadVersion: Version[] | undefined;

  /**
   * Index of `this` (consumer) in each producer's `liveConsumers` array.
   *
   * This value is only meaningful if this node is live (`liveConsumers.length > 0`). Otherwise
   * these indices are stale.
   *
   * Uses the same indices as the `producerNode` and `producerLastReadVersion` arrays.
   */
  producerIndexOfThis: number[] | undefined;

  /**
   * Index into the producer arrays that the next dependency of this node as a consumer will use.
   *
   * This index is zeroed before this node as a consumer begins executing. When a producer is read,
   * it gets inserted into the producers arrays at this index. There may be an existing dependency
   * in this location which may or may not match the incoming producer, depending on whether the
   * same producers were read in the same order as the last computation.
   */
  nextProducerIndex: number;

  /**
   * Whether this consumer has any interop signals as dependencies.
   */
  hasInteropSignalDep: boolean;

  /**
   * Array of consumers of this producer that are "live" (they require push notifications).
   *
   * `liveConsumerNode.length` is effectively our reference count for this node.
   */
  liveConsumerNode: ReactiveNode[] | undefined;

  /**
   * Index of `this` (producer) in each consumer's `producerNode` array.
   *
   * Uses the same indices as the `liveConsumerNode` array.
   */
  liveConsumerIndexOfThis: number[] | undefined;

  /**
   * Whether writes to signals are allowed when this consumer is the `activeConsumer`.
   *
   * This is used to enforce guardrails such as preventing writes to writable signals in the
   * computation function of computed signals, which is supposed to be pure.
   */
  consumerAllowSignalWrites: boolean;

  readonly consumerIsAlwaysLive: boolean;

  /**
   * Tracks whether producers need to recompute their value independently of the reactive graph (for
   * example, if no initial value has been computed).
   */
  producerMustRecompute(node: unknown): boolean;
  producerRecomputeValue(node: unknown): void;
  consumerMarkedDirty(node: unknown): void;

  /**
   * Called when a signal is read within this consumer.
   */
  consumerOnSignalRead(node: unknown): void;

  producerOnAccess(node: unknown): void;
  producerStartLive(node: unknown): void;
  producerStopLive(node: unknown): void;

  /**
   * A debug name for the reactive node. Used in Angular DevTools to identify the node.
   */
  debugName?: string;

  /**
   * Kind of node. Example: 'signal', 'computed', 'input', 'effect'.
   *
   * ReactiveNode has this as 'unknown' by default, but derived node types should override this to
   * make available the kind of signal that particular instance of a ReactiveNode represents.
   *
   * Used in Angular DevTools to identify the kind of signal.
   */
  kind: string;
}
