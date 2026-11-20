# Point-free JavaScript becomes point-free RxJS

The task in Damjan Vujnovic’s *Pointless or Pointfree* notes is concrete: given people with ages and account balances, calculate how much the adults with overdrawn accounts owe. The example answer is **6**: Bob owes 2 and Dan owes 4. Ali is under 18; Car and Eve have positive balances.

RxJS lets us prepare that same calculation before choosing its source. People flow in, predicates decide which people continue, projections extract their debt amounts, and an accumulator remembers the total. The final total appears when the input completes.

This tutorial translates the **user-supplied notes**, rather than claiming to reproduce every slide or spoken example in the recording. [Source notes and corrections](source-notes.md) document the mapping. The [original talk](https://www.youtube.com/watch?v=HSTweR77nug) is by Damjan Vujnovic; these RxJS adaptations are new work.

## 1. Intuition: prepare the behavior, then connect the source

Point-free composition gives a name to a transformation without naming the value it will eventually receive. An ordinary wrapper names its input merely to pass it onward. A prepared transformation can stand on its own.

At the value level, `getAge` receives a person and returns an age. At the stream level, `getAges` receives a description of people flowing over time and returns a description of their ages flowing over time. These are different functions with related responsibilities.

| Level | Input | Output | Example |
| --- | --- | --- | --- |
| Value | One `Person` | One `number` | `getAge` |
| Stream | `Observable<Person>` | `Observable<number>` | `getAges = map(getAge)` |
| Collection boundary | `readonly Person[]` | `Observable<Person>` | `fromPeople` |

RxJS’s operators provide the stream machinery. Our small value functions supply the business rules. This leaves the calculation reusable with a finite array, a timed source, or a stream from another part of an application. Their completion behavior must still be chosen deliberately.

Point-free here describes the **composition layer**. The implementation of a primitive such as `pick`, `add`, or an HTTP request must still name the inputs it uses. Hiding those implementation functions would make the program harder to inspect without improving its behavior.

## 2. Build the value vocabulary

### Property selection and currying

The notes first introduce specialized functions such as `getAge`, then discover the reusable factory `pick`. Choose the property first; supply the object later. In this repository, `pick('age')` extracts the property’s **value**. It does not construct an object containing selected properties, as some libraries’ similarly named helpers do.

The same order prepares arithmetic and comparisons. `add(1)` prepares incrementing; `add(-1)` prepares decrementing. `lt(0)` prepares the test “is this value below zero?”

```ts
import { add, lt, pick } from '../src/values.js';

const getName = pick('name');
const getAge = pick('age');
const getAccount = pick('account');
const getBalance = pick('balance');

const inc = add(1);
const dec = add(-1);
const isNegative = lt(0);
```

Read a curried call in two stages: `lt(limit)(value)`. The implementation is `value < limit`. Reversing the two configured arguments with `flip(lt)` gives `gt`; therefore `gt(0)` selects **positive** values. The initial debt sketch in the notes needs `lt(0)`.

### Composition follows the order of data

Damjan’s `compose(f4, f3, f2, f1)` applies `f1` first. RxJS’s imported `pipe(f1, f2, f3, f4)` writes that execution order from left to right. Both combine unary functions; only their written order differs. The repository retains `compose2(outer, inner)` to show this relationship explicitly. [RxJS 7.8.2 `pipe` source](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/util/pipe.ts)

A person becomes an account, then a balance. A person becomes an age, then an adult/not-adult decision. These are ordinary synchronous value calculations, even though their composition helper comes from RxJS.

```ts
import { pipe } from 'rxjs';
import { gte, lt } from '../src/values.js';
import { getAccount, getAge, getBalance } from '../src/people.js';

const getAccountBalance = pipe(getAccount, getBalance);
const isAdult = pipe(getAge, gte(18));
const isInDebt = pipe(getAccountBalance, lt(0));
```

The notes express adulthood as “not less than 18.” That agrees with `>= 18` for ordinary ages, but differs for `NaN`: `!(NaN < 18)` is true, whereas `NaN >= 18` is false. The translation preserves the original task’s `>=` rule.

There is also a distinction between `f4(f3(f2(f1(x))))` and `f4(f3)(f2)(f1)(x)`. The first passes intermediate **results** along a pipeline. The second passes **functions as arguments** to successive returned functions. Removing the final wrapper in the second case gives `f4(f3)(f2)(f1)`; it does not turn that expression into a pipeline.

## 3. Lift the vocabulary into streams

For each arriving person, `map(getName)` emits a name. For each arriving number, `filter(isNegative)` either forwards it or drops it. Neither operation waits for the source to complete. These operators introduce no delay or sharing: emissions follow the source’s notifications through the pipeline. [RxJS 7.8.2 `map`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/map.ts) · [RxJS 7.8.2 `filter`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/filter.ts)

```ts
import { filter, map } from 'rxjs';
import { getAge, getName } from '../src/people.js';
import { dec, inc, isNegative } from '../src/values.js';

const getNames = map(getName);
const getAges = map(getAge);
const findNegatives = filter(isNegative);
const incrementValues = map(inc);
const decrementValues = map(dec);
```

Each definition prepares an operator function. It does not subscribe. Applying it to a source constructs the resulting dataflow; a subscription connects an observer to that dataflow. For the finite `from(people)` source used here, each subscription traverses the array independently. No `share` or `shareReplay` is installed. [RxJS 7.8.2 array source implementation](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/observable/innerFrom.ts)

## 4. Accumulation needs an ending

An array has a known end. A stream may continue indefinitely. `reduce` remembers each new accumulated value but emits the final result only when its source completes normally. This timing rule is part of the translation, not an incidental implementation detail. [RxJS 7.8.2 `reduce`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/reduce.ts)

The notes use curried operations such as `add(accumulator)(value)`. RxJS calls its accumulator with separate arguments, including an index. `uncurry2` adapts the two-argument contract and prevents that index from reaching the arithmetic operation.

```ts
import { reduce } from 'rxjs';
import { add, mul, uncurry2 } from '../src/values.js';

const sum = reduce(uncurry2(add), 0);
const sumFromTen = reduce(uncurry2(add), 10);
const product = reduce(uncurry2(mul), 1);
```

| Prepared operator | Initial value | Result for an empty, completing source |
| --- | --- | --- |
| `sum` | `0` | `0` |
| `sumFromTen` | `10` | `10` |
| `product` | `1` | `1` |
| `anyTrue` | `false` | `false` |
| `allTrue` | `true` | `true` |
| `minimum` | `Infinity` | `Infinity` |
| `maximum` | `-Infinity` | `-Infinity` |

The seed of 10 in the notes is retained under the explicit name `sumFromTen`: it means ten plus the sum. The other seeds are useful identities for these particular operations over their intended domains. An arbitrary function need not have an identity. JavaScript number arithmetic also has floating-point limits; these examples do not establish exact arithmetic laws for every possible number.

### When the total should remain visible

Use `scan` when every qualifying amount should update the visible total. `scan` emits after each input value; its seed initializes memory but does not automatically appear as an output. Add `startWith(0)` when the display should begin at zero. [RxJS 7.8.2 accumulation implementation](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/scanInternals.ts) · [RxJS 7.8.2 `startWith`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/startWith.ts)

```ts
import { pipe, scan, startWith } from 'rxjs';
import { add, uncurry2 } from '../src/values.js';

const runningSum = scan(uncurry2(add), 0);
const runningSumWithInitial = pipe(runningSum, startWith(0));
```

## 5. Specification: the complete debt calculation

The rules are small: accept adults, accept negative balances, extract each balance, turn it into a positive amount owed, and sum those amounts. All domain decisions are visible in the supplied functions. RxJS connects those decisions in arrival order.

```ts
import { filter, from, map, pipe, reduce } from 'rxjs';
import { people } from '../src/model.js';
import {
  getAccountBalance,
  isAdult,
  isInDebt,
} from '../src/people.js';
import { add, negate, uncurry2 } from '../src/values.js';

const calcIndebtedAdultsTotalDebt = pipe(
  filter(isAdult),
  filter(isInDebt),
  map(getAccountBalance),
  map(negate),
  reduce(uncurry2(add), 0),
);

calcIndebtedAdultsTotalDebt(from(people)).subscribe(console.log);
// 6, then completion
```

The subscription is the explicit output boundary. The preceding definition is reusable, point-free composition. The repository exports the calculation as `totalDebt`, with `calcIndebtedAdultsTotalDebt` as a descriptive alias, and exposes the intermediate transformations for inspection.

| Person arriving | Adult? | In debt? | Amount entering the sum |
| --- | --- | --- | --- |
| Ali, 12, balance −1 | No | Yes | — |
| Bob, 23, balance −2 | Yes | Yes | 2 |
| Car, 34, balance 30 | Yes | No | — |
| Dan, 45, balance −4 | Yes | Yes | 4 |
| Eve, 56, balance 50 | Yes | No | — |

For this input, `debtAmounts` emits `2, 4`; `runningDebt` emits `2, 6`; `runningDebtWithInitial` emits `0, 2, 6`; `totalDebt` emits `6` at completion. Adding rejected people changes none of those accumulated amounts.

### Individual people and whole snapshots are different inputs

`Observable<Person>` carries one person per notification. `Observable<readonly Person[]>` carries a whole snapshot per notification. Reducing all people across all snapshots would accumulate multiple versions of the same population.

`totalDebtPerSnapshot` starts a fresh finite calculation for each snapshot. Its `concatMap` policy queues snapshots if an inner calculation is still active. With `fromPeople`, each inner traversal currently completes synchronously. [RxJS 7.8.2 `concatMap`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/concatMap.ts)

```ts
import { concatMap, pipe } from 'rxjs';
import { fromPeople, totalDebt } from '../src/people.js';

const totalDebtFromPeople = pipe(fromPeople, totalDebt);
const totalDebtPerSnapshot = concatMap(totalDebtFromPeople);
```

The original population produces `6`; the next snapshot, where Bob has repaid his debt, produces `4`; an empty snapshot produces `0`. The outputs are `6, 4, 0`, with fresh state for every snapshot. If the calculation later becomes asynchronous, choose its flattening policy deliberately: `mergeMap` allows overlap, `switchMap` keeps only the latest inner calculation, `concatMap` queues, and `exhaustMap` ignores arrivals while busy.

## 6. Completion, errors, and cancellation

For a never-ending source, a final reduction has no final answer yet. A source error forwards the error without publishing its partial sum. Unsubscribing disconnects the calculation and also publishes no partial sum. Each new subscription owns fresh accumulator state. These behaviors follow the reduction’s completion handler and per-subscription state. [RxJS 7.8.2 `scanInternals`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/scanInternals.ts)

The position of a stop signal determines whether it ends the input or cancels the pending result:

| Composition | When `stop$` emits |
| --- | --- |
| `pipe(takeUntil(stop$), totalDebt)` | Completes the reducer’s input; the reducer emits the total seen so far. |
| `pipe(totalDebt, takeUntil(stop$))` | Completes the downstream observer and unsubscribes upstream; no partial total is emitted. |

The signal must emit a value; merely completing `stop$` does not trigger `takeUntil`. A signal error remains an error. A notifier that emits synchronously can also stop the connection before the original source is subscribed. [RxJS 7.8.2 `takeUntil`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/takeUntil.ts)

### Sharing a remembered state is an additional choice

To let several observers share one running calculation and give a late observer its latest value, create one shared result and reuse that result:

```ts
import { pipe, shareReplay } from 'rxjs';
import { runningDebtWithInitial } from '../src/people.js';

const shareRunningDebt = pipe(
  runningDebtWithInitial,
  shareReplay({ bufferSize: 1, refCount: true }),
);

// Given a source of one-time person contributions:
const sharedDebt$ = shareRunningDebt(people$);
```

Each separate call to `shareRunningDebt` creates a separate shared result. Within one result, the first observer connects the upstream calculation. If the source is still active when the last observer leaves, `refCount: true` disconnects it and resets the shared state; a later connection starts a new accumulation. A completed result retains its last value and completion for later observers in RxJS 7.8.2, while errors reset the shared result. For a live source, reconnecting cannot recover contributions missed while disconnected. [RxJS 7.8.2 `shareReplay`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/shareReplay.ts)

## 7. Preparing an effect: authentication

The notes use a configured authentication object to motivate currying. The replacement prepares an endpoint first, then accepts credentials. `loginAt(endpoint)(credentials)` returns a **lazy request description**: subscribing starts the request; unsubscribing aborts a pending fetch through `fromFetch`. A selector keeps response-body consumption inside the managed request lifecycle. This does not promise to reverse work a server has already performed. [RxJS 7.8.2 `fromFetch`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/observable/dom/fetch.ts)

```ts
import { exhaustMap } from 'rxjs';
import { loginAt } from '../src/auth.js';

const login = loginAt('/api/login');
const submitLogin = exhaustMap(login);
```

Here `exhaustMap` ignores repeated credential submissions while a request is active. `switchMap(login)` instead replaces an active subscription; `concatMap(login)` queues submissions; `mergeMap(login)` allows overlapping requests. There is no automatic request sharing. The runnable demonstration uses a fake request, so reading or running the demo does not send credentials to a real endpoint.

## 8. Verification: remove only wrappers that add nothing

The notes’ rule `x => f(x)` becoming `f` is useful when calling conventions agree. It is unsafe to apply mechanically to every callback.

RxJS `map` passes both a value and its index. Giving it `parseInt` directly allows the index to become the radix. Likewise, `reduce` supplies an index, which variadic `Math.min` and `Math.max` would treat as another number. Use explicit adapters. [RxJS 7.8.2 `map`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/map.ts) · [RxJS 7.8.2 `reduce`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/reduce.ts)

```ts
import { map, reduce } from 'rxjs';
import { min, unary, uncurry2 } from '../src/values.js';

const parseValues = map(unary(parseInt));
const minimum = reduce(uncurry2(min), Infinity);
```

The same issue appears at the collection boundary. RxJS 7.8.2 `from` accepts an optional scheduler as its second argument; a flattening projection receives an index as its second argument. A TypeScript unary annotation alone does not remove that runtime argument. `fromPeople` therefore uses `unary(from)` with explicit types, so it can also be passed safely as a projection. [RxJS 7.8.2 `from`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/observable/from.ts)

The React `useMount` example is a conceptual alias example only; this project has no React dependency. Its original callback wrapper discards the supplied function’s return value. Passing that function directly can preserve a returned cleanup function instead. The outer wrapper also discards a return value. An alias is equivalent only when these return, cleanup, argument, and receiver contracts agree.

A useful verification set checks more than the example answer: the age-18 boundary, negative versus zero balances, `NaN` age rejection, empty-source seeds, running totals, fresh subscription state, independent snapshots, errors, cancellation, and callback-index hazards. Each check answers a behavior question. The result is a readable composition whose names explain the business calculation and whose operators make the stream’s lifetime explicit.
