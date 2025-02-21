import {computed, effect, signal} from '@angular/core';
import {createWatch, ReactiveNode, SIGNAL, defaultEquals} from '@angular/core/primitives/signals';
import {writable as tansuSignal, computed as tansuComputed} from '@amadeus-it-group/tansu';

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
        console.log(`c = ${c()}`);
      },
      () => {
        counter++;
      },
      true,
    );
    e.run();
    expect(c()).toEqual(0);
    expect(counter).toEqual(0);
    console.log('a.set(1)');
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
