# RxJS Pointfree

**Damjan Vujnovic's _Pointless or Pointfree_ samples, translated into reusable RxJS 7.8.2 pipelines.**

Project direction: **Hans Schenker**. Main implementation contributor and AI co-author: **ChatGPT GPT-6 Astra Pro (OpenAI)**.

Define the behavior first. Supply a stream later. Subscribe when that dataflow should run.

The starting material is the [Pointless or Pointfree talk](https://www.youtube.com/watch?v=HSTweR77nug) and the [sample notes supplied for this project](docs/original-notes.txt). This repository develops those samples into executable TypeScript, a detailed teaching guide, behavioral tests, and ordinary JavaScript output. See the [source mapping and corrections](docs/source-notes.md) for what was translated.

## Start here

Use Node.js 22 or newer:

```sh
git clone https://github.com/hansschenker/rxjs-pointfree.git
cd rxjs-pointfree
npm ci
npm run examples
npm run check
```

`npm run check` checks strict types, runs the tests, and builds ESM JavaScript plus declarations in `dist/`. RxJS is pinned to **7.8.2**. The repository contains no authored JavaScript classes or enums; the underlying RxJS package is unchanged.

## The main example: total debt is 6

People flow through the pipeline one at a time. The business functions identify adults and overdrawn accounts, extract balances, and turn negative balances into positive amounts owed. The operators select, transform, and accumulate those values.

| Person | Age | Balance | Contribution |
|---|---:|---:|---:|
| Ali | 12 | -1 | 0: under 18 |
| Bob | 23 | -2 | 2 |
| Car | 34 | 30 | 0: account in credit |
| Dan | 45 | -4 | 4 |
| Eve | 56 | 50 | 0: account in credit |

**[Open the focused people-array example](examples/02-debt.ts)**: the original five-person array and the complete RxJS point-free calculation appear together in one runnable file. Run it with `npm run example:debt`.

The final total becomes available when the finite source completes. Here is the expanded pipeline; [src/people.ts](src/people.ts) also factors it into reusable stages:

```ts
import { filter, from, map, pipe, reduce } from 'rxjs';
import {
  add, getAccountBalance, isAdult, isInDebt,
  negate, people, uncurry2,
} from './dist/index.js';

const calcIndebtedAdultsTotalDebt = pipe(
  filter(isAdult),
  filter(isInDebt),
  map(getAccountBalance),
  map(negate),
  reduce(uncurry2(add), 0),
);

calcIndebtedAdultsTotalDebt(from(people)).subscribe(console.log);
// 6
```

There is no `people$ => ...` wrapper in the definition. RxJS's imported `pipe` already creates a function waiting for its source:

```text
totalDebt :: Observable<Person> -> Observable<number>
```

The same operator can be applied using `totalDebt(source$)` or `source$.pipe(totalDebt)`. Neither form subscribes.

## Two levels of composition

Ordinary functions describe the domain. Operators apply those functions to values moving through a stream. Imported `pipe` composes either kind of unary function from left to right:

```ts
const getAccountBalance = pipe(getAccount, getBalance);
const isAdult = pipe(getAge, gte(18));
const isInDebt = pipe(getAccountBalance, isNegative);

const getAges = map(getAge);
const getNames = map(getName);
const findNegatives = filter(isNegative);
```

Primitive helpers can name their inputs. Point-free definitions compose those helpers without naming the value or source being transformed. The guide explains why argument wrappers sometimes remain necessary in JavaScript.

## Final totals, running totals, and new snapshots

| Export | Input interpretation | Output for the example |
|---|---|---|
| `totalDebt` / `calcIndebtedAdultsTotalDebt` | People arriving individually | `6`, on completion |
| `runningDebt` | People contributing once to a running total | `2`, then `6` |
| `runningDebtWithInitial` | Same contributions, with explicit initial state | `0`, `2`, `6` |
| `totalDebtFromPeople` | One finite array | `6`, on completion |
| `totalDebtPerSnapshot` | Complete replacement arrays | `6`, `4`, `0` for the three demo snapshots |

`from(people)` emits individual people. `of(people)` emits the array as one value. A replacement snapshot must receive a fresh reduction; adding every replacement array to a permanent accumulator would count earlier debt again.

### Execution policy is explicit

- **Time:** the basic sources are synchronous finite arrays. The effects demo uses a virtual scheduler. Pure composition introduces no scheduling.
- **Completion:** seeded `reduce` emits once on completion, including its seed for empty input. `scan` emits after each accepted value; it does not automatically emit its seed.
- **Cancellation:** error or unsubscription does not flush a final reduction. A `takeUntil` before `reduce` completes the reducer's input and can emit a partial total; after the reducer it cancels the pending result.
- **Sharing:** none of the examples adds sharing implicitly. Reusing an operator reuses its behavior; each subscription owns its accumulation state. A caller can explicitly compose `shareReplay({ bufferSize: 1, refCount: true })` when a shared latest state is wanted, with the lifetime described in the guide.

## Run the sample progression

| Command | Samples |
|---|---|
| `npm run example:basics` | Properties, currying, `flip`, composition, map/filter, and all seven seeded reductions |
| `npm run example:debt` | Debtor names, individual amounts, final total, and running totals |
| `npm run example:snapshots` | Recompute each complete list, producing `[6, 4, 0]` |
| `npm run example:effects` | A local login simulation with `switchMap`, `concatMap`, `mergeMap`, and `exhaustMap` |

[src/auth.ts](src/auth.ts) translates endpoint-first login into `loginAt(endpoint)(credentials)`, returning a lazy Observable. It checks HTTP status and the response shape, and keeps response-body reading inside `fromFetch`'s selector so cancellation covers that stage. The runnable demo uses a fake response source; it sends no HTTP requests.

## Verification

The tests check the sample result against an independent imperative calculation, then repeat that comparison over generated inputs. Virtual-time tests check notification timing, completion, errors, cancellation, and independent subscription state. Mocked HTTP tests check lazy execution, fresh requests, abort signals, and failure propagation.

The callback-arity tests also catch three easy mistakes: `map(parseInt)` receives an unintended radix, `reduce(Math.min)` receives an unintended third number, and an unwrapped `from` used as a flattening projection can receive an unintended scheduler. The `unary` and `uncurry2` adapters preserve the intended calling contracts.

## Read and explore

- [Walkthrough: intuition, specification, verification](docs/walkthrough.md)
- [Mapping every distinct sample and correcting transcription errors](docs/source-notes.md)
- [Value functions and combinators](src/values.ts)
- [Reusable aggregations](src/aggregates.ts)
- [People and debt pipelines](src/people.ts)
- [Contributors](CONTRIBUTORS.md) and [source attribution](NOTICE.md)

The translated implementation is MIT licensed. The supplied source notes retain their original attribution; see [NOTICE.md](NOTICE.md).
