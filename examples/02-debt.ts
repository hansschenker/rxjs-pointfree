import assert from 'node:assert/strict';
import { filter, from, map, pipe, reduce, toArray } from 'rxjs';
import {
  add, debtAmounts, getAccountBalance, getNames, indebtedAdults,
  isAdult, isInDebt, negate, runningDebt, runningDebtWithInitial, uncurry2,
} from '../src/index.js';
import type { Person } from '../src/model.js';

// The same problem and the same five people as in Damjan's supplied samples:
// find the total amount owed by adults whose account balance is below zero.
const people: readonly Person[] = [
  { name: 'Ali', age: 12, account: { balance: -1 } },
  { name: 'Bob', age: 23, account: { balance: -2 } },
  { name: 'Car', age: 34, account: { balance: 30 } },
  { name: 'Dan', age: 45, account: { balance: -4 } },
  { name: 'Eve', age: 56, account: { balance: 50 } },
];

// Configure the calculation first. No people$ argument is named here.
const calcIndebtedAdultsTotalDebt = pipe(
  filter(isAdult),             // age >= 18
  filter(isInDebt),            // balance < 0
  map(getAccountBalance),      // -2, -4
  map(negate),                 //  2,  4
  reduce(uncurry2(add), 0),    // 6 when the finite input completes
);

const getDebtorNames = pipe(indebtedAdults, getNames, toArray());
const collectDebtAmounts = pipe(debtAmounts, toArray());

console.log('02 — The debt problem from the video');
getDebtorNames(from(people)).subscribe(console.log); // ['Bob', 'Dan']
collectDebtAmounts(from(people)).subscribe(console.log); // [2, 4]
calcIndebtedAdultsTotalDebt(from(people)).subscribe((total) => {
  assert.equal(total, 6);
  console.log('Total amount owed:', total); // 6
});
runningDebt(from(people)).pipe(toArray()).subscribe(console.log); // [2, 6]
runningDebtWithInitial(from(people)).pipe(toArray()).subscribe(console.log); // [0, 2, 6]

// This source is finite and synchronous. No timer or scheduler was added.
// Every subscription starts its own iteration and accumulation.
