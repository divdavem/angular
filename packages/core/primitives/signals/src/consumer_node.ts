/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Consumer as InteropConsumer,
  Signal as InteropSignal,
  watchSignal as interopWatchSignal,
} from '@amadeus-it-group/tansu/interop';
import {internalProducerAccessed} from './graph';
import {interopSignal} from './interop_signal';
import {interopWatch} from './interop_watch';
import {ReactiveNode} from './reactive_node';

const interopSignalMap = new WeakMap<InteropSignal<unknown>, ReactiveNode>();

export const CONSUMER_NODE: InteropConsumer = {
  addProducer<T>(this: ReactiveNode & InteropConsumer, signal: InteropSignal<T>) {
    let producer =
      signal[interopWatchSignal] === interopWatch
        ? (signal as any as ReactiveNode)
        : interopSignalMap.get(signal);
    if (!producer) {
      producer = interopSignal(signal);
      interopSignalMap.set(signal, producer);
    }
    producer.producerOnAccess(producer);
    internalProducerAccessed(producer, this);
  },
};
