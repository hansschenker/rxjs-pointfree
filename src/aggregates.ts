import {
  filter,
  map,
  pipe,
  reduce,
  scan,
  startWith,
  type MonoTypeOperatorFunction,
} from 'rxjs';
import {
  add,
  and,
  dec,
  inc,
  isNegative,
  max,
  min,
  mul,
  or,
  uncurry2,
} from './values.js';

/** Each seeded reduction emits once, when its input completes. */
export const sum: MonoTypeOperatorFunction<number> = reduce(uncurry2(add), 0);

/** The talk's seed of ten means ten plus the sum, including ten for empty input. */
export const sumFromTen: MonoTypeOperatorFunction<number> = reduce(uncurry2(add), 10);

export const product: MonoTypeOperatorFunction<number> = reduce(uncurry2(mul), 1);

export const anyTrue: MonoTypeOperatorFunction<boolean> = reduce(uncurry2(or), false);
export const allTrue: MonoTypeOperatorFunction<boolean> = reduce(uncurry2(and), true);

// The adapters prevent RxJS's index argument from reaching Math.min/Math.max.
export const minimum: MonoTypeOperatorFunction<number> = reduce(uncurry2(min), Infinity);
export const maximum: MonoTypeOperatorFunction<number> = reduce(uncurry2(max), -Infinity);

/** Emit after each input value; scan does not emit its seed automatically. */
export const runningSum: MonoTypeOperatorFunction<number> = scan(uncurry2(add), 0);

export const runningSumWithInitial: MonoTypeOperatorFunction<number> = pipe(
  runningSum,
  startWith(0),
);

export const findNegatives: MonoTypeOperatorFunction<number> = filter(isNegative);
export const incrementValues: MonoTypeOperatorFunction<number> = map(inc);
export const decrementValues: MonoTypeOperatorFunction<number> = map(dec);
