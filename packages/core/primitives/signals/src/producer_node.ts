/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Signal as InteropSignal,
  watchSignal as interopWatchSignal,
} from '@amadeus-it-group/tansu/interop';
import {interopWatch} from './interop_watch';

export const PRODUCER_NODE: InteropSignal<any> = {
  [interopWatchSignal]: interopWatch,
};
