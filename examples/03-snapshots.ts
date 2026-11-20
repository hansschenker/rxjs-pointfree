import { from, pipe, toArray } from 'rxjs';
import type { Person } from '../src/model.js';
import { people, repaidPeople, totalDebtPerSnapshot } from '../src/index.js';

const snapshots: readonly (readonly Person[])[] = [people, repaidPeople, []];
const collectTotals = pipe(totalDebtPerSnapshot, toArray());

console.log('03 — Recompute each complete snapshot');
collectTotals(from(snapshots)).subscribe(console.log); // [6, 4, 0]

// Each emission is one array. concatMap gives that snapshot a fresh reduction.
// Summing all snapshots into one accumulator would double-count old debt.
