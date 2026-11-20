import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { concatMap, from, lastValueFrom, of, toArray } from 'rxjs';
import type { Observable } from 'rxjs';
import { people } from '../src/model.js';
import type { Person } from '../src/model.js';
import {
  calcIndebtedAdultsTotalDebt,
  debtAmounts,
  fromPeople,
  getAccountBalance,
  getAccountBalances,
  getAges,
  getNames,
  indebtedAdults,
  isAdult,
  isInDebt,
  runningDebt,
  runningDebtWithInitial,
  totalDebt,
  totalDebtFromPeople,
  totalDebtPerSnapshot,
} from '../src/people.js';

const collect = <T>(source: Observable<T>): Promise<T[]> => lastValueFrom(source.pipe(toArray()));

// Deliberately independent of the predicates and reducers under test.
const originalImperativeTotal = (collection: readonly Person[]): number => {
  let total = 0;
  for (const person of collection) {
    if (person.age >= 18 && person.account.balance < 0) {
      total -= person.account.balance;
    }
  }
  return total;
};

const personArbitrary: fc.Arbitrary<Person> = fc.record({
  name: fc.string({ maxLength: 20 }),
  age: fc.integer({ min: 0, max: 120 }),
  account: fc.record({ balance: fc.integer({ min: -1_000_000, max: 1_000_000 }) }),
});

describe('Damjan’s people example', () => {
  it('projects names, ages, and nested balances without changing order', async () => {
    expect(await collect(getNames(fromPeople(people)))).toEqual(['Ali', 'Bob', 'Car', 'Dan', 'Eve']);
    expect(await collect(getAges(fromPeople(people)))).toEqual([12, 23, 34, 45, 56]);
    expect(await collect(getAccountBalances(fromPeople(people)))).toEqual([-1, -2, 30, -4, 50]);
  });

  it('selects Bob and Dan and turns negative balances into positive debt', async () => {
    const adults = await collect(indebtedAdults(fromPeople(people)));
    expect(adults.map(person => person.name)).toEqual(['Bob', 'Dan']);
    expect(await collect(debtAmounts(fromPeople(people)))).toEqual([2, 4]);
    expect(await collect(calcIndebtedAdultsTotalDebt(fromPeople(people)))).toEqual([6]);
  });

  it('exposes running totals separately from the final total', async () => {
    expect(await collect(runningDebt(fromPeople(people)))).toEqual([2, 6]);
    expect(await collect(runningDebtWithInitial(fromPeople(people)))).toEqual([0, 2, 6]);
  });

  it('includes age 18, excludes nonnegative balances, and preserves >= for NaN', async () => {
    const boundaryPeople: readonly Person[] = [
      { name: 'Minor', age: 17, account: { balance: -1 } },
      { name: 'Adult', age: 18, account: { balance: -2 } },
      { name: 'Credit', age: 19, account: { balance: 3 } },
      { name: 'Settled', age: 99, account: { balance: 0 } },
      { name: 'Invalid age', age: Number.NaN, account: { balance: -50 } },
    ];
    expect(await collect(totalDebtFromPeople(boundaryPeople))).toEqual([2]);
    expect(isAdult(boundaryPeople[4]!)).toBe(false);
    expect(isInDebt(boundaryPeople[3]!)).toBe(false);
    expect(getAccountBalance(boundaryPeople[1]!)).toBe(-2);
  });

  it('returns zero for an empty collection or one with no qualifying person', async () => {
    expect(await collect(totalDebtFromPeople([]))).toEqual([0]);
    expect(await collect(totalDebtFromPeople([
      { name: 'Minor', age: 17, account: { balance: -5 } },
      { name: 'Credit', age: 40, account: { balance: 5 } },
    ]))).toEqual([0]);
  });

  it('agrees with the original imperative algorithm for generated collections', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(personArbitrary, { maxLength: 80 }), async collection => {
        expect(await collect(totalDebt(fromPeople(collection)))).toEqual([originalImperativeTotal(collection)]);
      }),
      { numRuns: 200, seed: 20261120 },
    );
  });
});

describe('complete collection snapshots', () => {
  it('can use fromPeople as a projection without mistaking an index for a scheduler', async () => {
    const batches = [people.slice(0, 2), people.slice(2)];
    expect(await collect(from(batches).pipe(concatMap(fromPeople)))).toEqual(people);
  });

  it('recomputes each snapshot, including empty and repeated snapshots', async () => {
    const repaid = people.map(person => person.name === 'Bob'
      ? { ...person, account: { balance: 0 } }
      : person);
    const snapshots: readonly (readonly Person[])[] = [people, repaid, [], people];
    expect(await collect(totalDebtPerSnapshot(from(snapshots)))).toEqual([6, 4, 0, 6]);
  });

  it('treats of(people) as one snapshot and an empty outer stream as no snapshots', async () => {
    expect(await collect(totalDebtPerSnapshot(of(people)))).toEqual([6]);
    expect(await collect(totalDebtPerSnapshot(from<readonly (readonly Person[])[]>([])))).toEqual([]);
  });

  it('matches a fresh imperative calculation for every generated snapshot', async () => {
    const snapshotsArbitrary = fc.array(fc.array(personArbitrary, { maxLength: 30 }), { maxLength: 15 });
    await fc.assert(
      fc.asyncProperty(snapshotsArbitrary, async snapshots => {
        expect(await collect(totalDebtPerSnapshot(from(snapshots)))).toEqual(snapshots.map(originalImperativeTotal));
      }),
      { numRuns: 100, seed: 20261121 },
    );
  });
});
