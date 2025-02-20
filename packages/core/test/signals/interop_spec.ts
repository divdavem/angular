/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {computed as tansuComputed, writable as tansuSignal} from '@amadeus-it-group/tansu';
import {computed, signal} from '@angular/core';
import {createWatch} from '@angular/core/primitives/signals';

describe('interop', () => {
  it('should work to use tansu signal in angular (not live)', () => {
    const a = tansuSignal(0);
    const c = computed(() => a() * 2);
    expect(c()).toEqual(0);
    a.set(1);
    expect(c()).toEqual(2);
  });

  it('should work to use tansu signal in angular (live)', () => {
    const a = tansuSignal(0);
    const c = computed(() => a() * 2);
    let counter = 0;
    const e = createWatch(
      () => {
        c();
      },
      () => {
        counter++;
      },
      true,
    );
    e.run();
    expect(c()).toEqual(0);
    expect(counter).toEqual(0);
    a.set(1);
    expect(counter).toEqual(1);
    e.run();
    expect(c()).toEqual(2);
    e.destroy();
  });

  it('should work to use angular signal in tansu (not live)', () => {
    const a = signal(0);
    const c = tansuComputed(() => a() * 2);
    expect(c()).toEqual(0);
    a.set(1);
    expect(c()).toEqual(2);
  });
});
