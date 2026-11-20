import { pipe } from 'rxjs';

export type Unary<A, B> = (value: A) => B;
export type CurriedBinary<A, B, R> = (first: A) => Unary<B, R>;

/** Extract one property value, matching the talk's scalar use of `pick`. */
export const pick =
  <K extends PropertyKey>(key: K) =>
  <T extends Record<K, unknown>>(value: T): T[K] =>
    value[key];

export const add: CurriedBinary<number, number, number> =
  (first) => (second) => first + second;

export const mul: CurriedBinary<number, number, number> =
  (first) => (second) => first * second;

/** Configure the upper limit first; supply the value last. */
export const lt: CurriedBinary<number, number, boolean> =
  (limit) => (value) => value < limit;

/** Preserve JavaScript's >= behavior, including a false result for NaN. */
export const gte: CurriedBinary<number, number, boolean> =
  (limit) => (value) => value >= limit;

export const flip = <A, B, R>(
  operation: CurriedBinary<A, B, R>,
): CurriedBinary<B, A, R> =>
  (second) => (first) => operation(first)(second);

export const gt = flip(lt);

export const not: Unary<boolean, boolean> = (value) => !value;
export const negate: Unary<number, number> = (value) => -value;

export const and: CurriedBinary<boolean, boolean, boolean> =
  (first) => (second) => first && second;

export const or: CurriedBinary<boolean, boolean, boolean> =
  (first) => (second) => first || second;

export const min: CurriedBinary<number, number, number> =
  (first) => (second) => Math.min(first, second);

export const max: CurriedBinary<number, number, number> =
  (first) => (second) => Math.max(first, second);

/** Forward only the value, so an operator's index cannot become an argument. */
export const unary = <A, B>(operation: Unary<A, B>): Unary<A, B> =>
  (value) => operation(value);

/** Adapt a curried operation to RxJS's accumulator calling convention. */
export const uncurry2 = <A, B, R>(
  operation: CurriedBinary<A, B, R>,
): ((first: A, second: B) => R) =>
  (first, second) => operation(first)(second);

/** Right-to-left two-function composition, implemented with RxJS's pipe. */
export const compose2 = <A, B, C>(
  outer: Unary<B, C>,
  inner: Unary<A, B>,
): Unary<A, C> => pipe(inner, outer);

export const inc = add(1);
export const dec = add(-1);
export const isNegative = lt(0);
