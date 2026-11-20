import { concatMap, filter, from, map, pipe } from 'rxjs';
import type { MonoTypeOperatorFunction, Observable, OperatorFunction } from 'rxjs';
import { runningSum, runningSumWithInitial, sum } from './aggregates.js';
import type { Account, Person } from './model.js';
import { gte, isNegative, negate, pick, unary } from './values.js';
import type { Unary } from './values.js';

// Pure value functions: the business rules do not depend on RxJS notifications.
export const getName: Unary<Person, string> = pick('name');
export const getAge: Unary<Person, number> = pick('age');
export const getAccount: Unary<Person, Account> = pick('account');
export const getBalance: Unary<Account, number> = pick('balance');
export const getAccountBalance = pipe(getAccount, getBalance);
export const isAdult = pipe(getAge, gte(18));
export const isInDebt = pipe(getAccountBalance, isNegative);

// Lift the same functions into streams. The source argument stays unmentioned.
export const getNames: OperatorFunction<Person, string> = map(getName);
export const getAges: OperatorFunction<Person, number> = map(getAge);
export const getAccountBalances: OperatorFunction<Person, number> = map(getAccountBalance);

export const indebtedAdults: MonoTypeOperatorFunction<Person> = pipe(
  filter(isAdult),
  filter(isInDebt),
);

export const debtAmounts: OperatorFunction<Person, number> = pipe(
  indebtedAdults,
  map(getAccountBalance),
  map(negate),
);

/** One positive total when the source completes; empty input produces zero. */
export const totalDebt: OperatorFunction<Person, number> = pipe(debtAmounts, sum);

/** Keep the original sample's name, without adding a redundant wrapper. */
export const calcIndebtedAdultsTotalDebt = totalDebt;

/** Running contributions: Bob produces 2, then Dan produces 6. */
export const runningDebt: OperatorFunction<Person, number> = pipe(debtAmounts, runningSum);

/** Explicit initial state: 0, then 2, then 6. No sharing is implied. */
export const runningDebtWithInitial: OperatorFunction<Person, number> = pipe(
  debtAmounts,
  runningSumWithInitial,
);

/** A finite collection becomes one synchronous item stream per subscription. */
export const fromPeople = unary<readonly Person[], Observable<Person>>(from<readonly Person[]>);
export const totalDebtFromPeople = pipe(fromPeople, totalDebt);

/** Each array is a fresh complete snapshot, so each gets its own reduction. */
export const totalDebtPerSnapshot: OperatorFunction<readonly Person[], number> = concatMap(
  totalDebtFromPeople,
);
