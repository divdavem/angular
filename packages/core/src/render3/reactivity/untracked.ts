/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {runWithConsumer} from '@amadeus-it-group/tansu/interop';

/**
 * Execute an arbitrary function in a non-reactive (non-tracking) context. The executed function
 * can, optionally, return a value.
 */
export function untracked<T>(nonReactiveReadsFn: () => T): T {
  return runWithConsumer(nonReactiveReadsFn, null);
}
