import { describe, expect, it } from 'vitest';
import { EMPTY, from, lastValueFrom, map, reduce, toArray } from 'rxjs';
import type { MonoTypeOperatorFunction, Observable } from 'rxjs';
import {
  allTrue,
  anyTrue,
  decrementValues,
  findNegatives,
  incrementValues,
  maximum,
  minimum,
  product,
  runningSum,
  runningSumWithInitial,
  sum,
  sumFromTen,
} from '../src/aggregates.js';
import { add, compose2, dec, flip, gt, gte, inc, lt, unary, uncurry2 } from '../src/values.js';

const collect = <T>(source: Observable<T>): Promise<T[]> => lastValueFrom(source.pipe(toArray()));

describe('the curried building blocks', () => {
  it('puts configuration first and preserves the direction of comparisons', () => {
    expect(inc(5)).toBe(6);
    expect(dec(5)).toBe(4);
    expect(lt(5)(4)).toBe(true);
    expect(gt(5)(6)).toBe(true);
    expect(gt(5)(5)).toBe(false);
    expect(gte(5)(5)).toBe(true);
    expect(gte(18)(Number.NaN)).toBe(false);
    expect(flip(lt)(5)(6)).toBe(true);
  });

  it('composes right-to-left with compose2 and adapts curried addition for a reducer', () => {
    const double = (value: number): number => value * 2;
    expect(compose2(double, inc)(3)).toBe(8);
    expect(compose2(inc, double)(3)).toBe(7);
    expect(uncurry2(add)(3, 4)).toBe(7);
  });
});

describe('point-free reductions', () => {
  const numberCases: readonly [string, MonoTypeOperatorFunction<number>, number, number][] = [
    ['sum', sum, 0, 9],
    ['sumFromTen', sumFromTen, 10, 19],
    ['product', product, 1, 24],
    ['minimum', minimum, Infinity, 2],
    ['maximum', maximum, -Infinity, 4],
  ];

  it.each(numberCases)('%s uses its intended seed and result', async (_name, operator, seed, result) => {
    expect(await collect(operator(EMPTY))).toEqual([seed]);
    expect(await collect(operator(from([2, 3, 4])))).toEqual([result]);
  });

  it('uses false for empty disjunction and true for empty conjunction', async () => {
    expect(await collect(anyTrue(EMPTY))).toEqual([false]);
    expect(await collect(allTrue(EMPTY))).toEqual([true]);
    expect(await collect(anyTrue(from([false, true, false])))).toEqual([true]);
    expect(await collect(allTrue(from([true, false, true])))).toEqual([false]);
    expect(await collect(allTrue(from([true, true])))).toEqual([true]);
  });

  it('distinguishes a scan seed from an explicitly emitted initial value', async () => {
    expect(await collect(runningSum(EMPTY))).toEqual([]);
    expect(await collect(runningSumWithInitial(EMPTY))).toEqual([0]);
    expect(await collect(runningSum(from([2, 4])))).toEqual([2, 6]);
    expect(await collect(runningSumWithInitial(from([2, 4])))).toEqual([0, 2, 6]);
  });

  it('lifts the increment, decrement, and negative-value examples', async () => {
    expect(await collect(incrementValues(from([0, 1, 2])))).toEqual([1, 2, 3]);
    expect(await collect(decrementValues(from([0, 1, 2])))).toEqual([-1, 0, 1]);
    expect(await collect(findNegatives(from([-2, 0, 3, -1])))).toEqual([-2, -1]);
  });
});

describe('callback arity and safe eta reduction', () => {
  it('prevents map from passing its index as the parseInt radix', async () => {
    const strings = from(['10', '10', '10']);
    expect(await collect(strings.pipe(map(parseInt)))).toEqual([10, Number.NaN, 2]);
    expect(await collect(strings.pipe(map(unary(parseInt))))).toEqual([10, 10, 10]);
  });

  it('keeps the emission index out of minimum and maximum reductions', async () => {
    expect(await collect(from([5, 7]).pipe(reduce(Math.min, Infinity)))).toEqual([0]);
    expect(await collect(minimum(from([5, 7])))).toEqual([5]);
    expect(await collect(from([-5, -7]).pipe(reduce(Math.max, -Infinity)))).toEqual([1]);
    expect(await collect(maximum(from([-5, -7])))).toEqual([-5]);
  });
});
