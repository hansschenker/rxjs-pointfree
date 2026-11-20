import { describe, expect, it, vi } from 'vitest';
import { defer, lastValueFrom, takeUntil, toArray } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { people } from '../src/model.js';
import type { Person } from '../src/model.js';
import { fromPeople, runningDebt, runningDebtWithInitial, totalDebt } from '../src/people.js';

const bob: Person = { name: 'Bob', age: 23, account: { balance: -2 } };
const dan: Person = { name: 'Dan', age: 45, account: { balance: -4 } };
const sourceValues = { a: bob, b: dan };
const scheduler = (): TestScheduler => new TestScheduler((actual, expected) => expect(actual).toEqual(expected));

describe('time, completion, and cancellation', () => {
  it('emits a single final total at completion, even after the last person arrived', () => {
    scheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold<Person>('-a-b---|', sourceValues);
      expectObservable(totalDebt(source)).toBe('-------(t|)', { t: 6 });
      expectSubscriptions(source.subscriptions).toBe('^------!');
    });
  });

  it('emits running totals at qualifying arrivals, with an optional initial value', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const source = cold<Person>('-a-b---|', sourceValues);
      expectObservable(runningDebt(source)).toBe('-x-y---|', { x: 2, y: 6 });
      expectObservable(runningDebtWithInitial(source)).toBe('ix-y---|', { i: 0, x: 2, y: 6 });
    });
  });

  it('waits for empty-source completion before emitting the seed', () => {
    scheduler().run(({ cold, expectObservable }) => {
      expectObservable(totalDebt(cold<Person>('---|'))).toBe('---(z|)', { z: 0 });
    });
  });

  it('does not invent a final total for a source that stays open', () => {
    scheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold<Person>('-a-b------', sourceValues);
      expectObservable(totalDebt(source), '------!').toBe('');
      expectSubscriptions(source.subscriptions).toBe('^-----!');
    });
  });

  it('forwards an error without flushing the accumulated value', () => {
    scheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const failure = new Error('Source failed');
      const source = cold<Person>('-a-b-#', sourceValues, failure);
      expectObservable(totalDebt(source)).toBe('-----#', undefined, failure);
      expectSubscriptions(source.subscriptions).toBe('^----!');
    });
  });

  it('tears down on ordinary unsubscription without emitting a partial total', () => {
    scheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold<Person>('-a-b----|', sourceValues);
      expectObservable(totalDebt(source), '----!').toBe('');
      expectSubscriptions(source.subscriptions).toBe('^---!');
    });
  });

  it('emits a partial total when takeUntil completes the reducer input', () => {
    scheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold<Person>('-a---b---|', sourceValues);
      const stop = cold('---n|');
      expectObservable(totalDebt(source.pipe(takeUntil(stop)))).toBe('---(t|)', { t: 2 });
      expectSubscriptions(source.subscriptions).toBe('^--!');
      expectSubscriptions(stop.subscriptions).toBe('^--!');
    });
  });

  it('cancels the pending result when takeUntil is after the reducer', () => {
    scheduler().run(({ cold, expectObservable, expectSubscriptions }) => {
      const source = cold<Person>('-a---b---|', sourceValues);
      const stop = cold('---n|');
      expectObservable(totalDebt(source).pipe(takeUntil(stop))).toBe('---|');
      expectSubscriptions(source.subscriptions).toBe('^--!');
      expectSubscriptions(stop.subscriptions).toBe('^--!');
    });
  });

  it('keeps execution lazy and reduction state independent for each connection', async () => {
    const starts = vi.fn();
    const source = defer(() => {
      starts();
      return fromPeople(people);
    });
    const result = totalDebt(source);
    expect(starts).not.toHaveBeenCalled();
    expect(await lastValueFrom(result.pipe(toArray()))).toEqual([6]);
    expect(await lastValueFrom(result.pipe(toArray()))).toEqual([6]);
    expect(starts).toHaveBeenCalledTimes(2);
  });
});
