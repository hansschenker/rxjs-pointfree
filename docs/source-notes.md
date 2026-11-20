# Source notes, sample coverage, and corrections

## Provenance

The source supplied for this work is **`point-free-damjan-vujonic-ndc-conf.txt`**, a set of notes containing JavaScript examples from Damjan Vujnovic’s [*Pointless or Pointfree*](https://www.youtube.com/watch?v=HSTweR77nug), published by NDC Conferences on 28 June 2019. The attachment is preserved verbatim in [original-notes.txt](original-notes.txt). The supplied filename spells the surname differently; the speaker’s name is retained correctly in this documentation.

The attachment is **not represented as a complete, verbatim video transcript**. It contains incomplete braces, transcription errors, repeated intermediate versions, schematic functions without bodies, and an unfinished `f5` fragment. The conversion covers every distinct meaningful example or transformation in those notes, consolidating repeated steps. It does not invent missing slides or claim that a newly supplied implementation was shown by the speaker.

The walkthrough and RxJS examples are adaptations created for this repository by **ChatGPT, GPT-6 Astra Pro**, in collaboration with Hans Schenker. Credit for the original presentation and its teaching examples belongs to Damjan Vujnovic. RxJS behavior is checked against the **7.8.2** implementation, independently of the talk’s historical JavaScript notation.

## Original-to-RxJS coverage

| Sample or teaching step in the supplied notes | Translation and location |
| --- | --- |
| Long-form and arrow-function `getNames` using array `map` | `getNames = map(getName)` in `src/people.ts`; emits one name for each arriving person. |
| Opening `filter(compose(gt(0), pick('balance'), pick('account')))` | `isInDebt` and `indebtedAdults`; uses `lt(0)` to match an overdrawn account. |
| Five-person array: Ali, Bob, Car, Dan, Eve | Typed `Account`, `Person`, and `people` fixture in `src/model.ts`. |
| Imperative loop calculating adult debt | Same selection and arithmetic expressed by `totalDebt`; no imperative loop is needed in the application composition. |
| Array `filter` → `filter` → `map` → `reduce` solution | `calcIndebtedAdultsTotalDebt`, an alias for `totalDebt`, in `src/people.ts`. |
| Specialized `getAge`, `FP.getAge`, and forwarding wrappers | Scalar `getAge`; wrappers are removed where they only forward the agreed arguments and result. |
| Polynomial `f`, then `g = x => f(x)`, then `g = f` | `polynomial`, `polynomialAlias`, and `map(polynomialAlias)` in `examples/01-basics.ts`; inputs `[0, 1, 2]` produce `[1, 6, 15]`. The walkthrough explains safe aliasing. |
| `useMount` wrappers becoming `useEffectOnce` | Conceptual function-alias discussion only; no React dependency or invented Observable equivalent. Return and cleanup caveats are explicit. |
| Repeated `getAge` / `getBalance` object examples | `getAge`, `getBalance`, and `getAccount` in `src/people.ts`; each responsibility has a named function. |
| `FP.pick` written with a function body, then arrows | Typed curried scalar `pick` in `src/values.ts`. |
| `pick('name')` applied to a sample object | `getName` at the scalar level; `getNames` at the stream level. |
| Configure authentication endpoint, then call login | Class-free `loginAt(endpoint)(credentials)` in `src/auth.ts`; lazy `fromFetch`, with cancellation through unsubscription. |
| `add`, `inc`, and `dec` | Value helpers in `src/values.ts`; lifted as `incrementValues` and `decrementValues` in `src/aggregates.ts`. |
| `lt`, `isNegative`, `flip`, and derived `gt` | Typed curried helpers in `src/values.ts`; comparator argument order is preserved and explained. |
| Array `getAges` and function-first `FP.map` | `getAges = map(getAge)`; RxJS’s pipeable `map` already accepts its projection before its source. |
| Second `getAges` using `pick('name')` | Corrected to `getNames`. |
| Successive `findNegatives` / `FP.filter` examples | `findNegatives = filter(isNegative)` in `src/aggregates.ts`. |
| Array sum and curried `FP.reduce` adapter | `sum = reduce(uncurry2(add), 0)`; RxJS’s accumulator convention is adapted explicitly. |
| `FP.reduce(FP.add, 10)` | `sumFromTen`, preserving the seed rather than silently changing its result. |
| Product, Boolean any/all, minimum, maximum | `product`, `anyTrue`, `allTrue`, `minimum`, `maximum`, each with its explicit seed. |
| Direct, staged, and nested account-balance access | `getAccountBalance = pipe(getAccount, getBalance)`. |
| Anonymous two-function composition and `compose2` | Typed `compose2(outer, inner)` in `src/values.ts`, implemented using `pipe(inner, outer)`. |
| Four-stage `f5`, nesting, and `compose(...fns)` via `reduceRight` | Left-to-right `pipe(f1, f2, f3, f4)` explained in the walkthrough. `f1`–`f4` are schematic in the notes; no missing bodies are attributed to the speaker. |
| Warning contrasting nested composition with chained curried calls | The walkthrough preserves the distinction: `f4(f3)(f2)(f1)` passes functions as values; it is not `pipe(f1, f2, f3, f4)`. |
| `isAdult` using `not`, `lt(18)`, and `pick('age')` | Uses `pipe(getAge, gte(18))` to preserve the task’s `>= 18` behavior, including `NaN`. The source formulation remains discussed. |
| Final `isInDebt` composition | `pipe(getAccountBalance, lt(0))`; reusable as the predicate of an RxJS filter. |

The running accumulations, snapshot processing, explicit stop-signal placement, request policies, typed helpers, and automated behavior checks are **additions for the RxJS translation**. They explain consequences that an array-only example does not have to address.

## Corrections that affect meaning

1. **Debt sign:** with `lt(limit)(value) = value < limit`, `gt = flip(lt)` means `gt(0)` accepts positive balances. Debt requires `lt(0)`.
2. **Decrement:** `add(-1)(value)` is `value - 1`. The comment suggesting `1 - value` is incorrect.
3. **Seed of ten:** reducing addition from 10 produces ten plus the sum, including 10 for an empty input. Ordinary `sum` uses 0; `sumFromTen` preserves the other example.
4. **Transcription:** `1t` is read as `lt`; inconsistent `initialvalue` is normalized; the incomplete `compose2` assignment is reconstructed as unary composition. Broken delimiters are repaired where the intended expression is clear.
5. **Names:** the duplicate `getAges` that selects `name` becomes `getNames`.
6. **Identity values:** certain operations have useful identities on suitable domains. It is not true that every function has a neutral element. Floating-point addition also cannot be assumed exactly associative for arbitrary JavaScript numbers.
7. **Adult predicate:** `not(lt(18)(age))` and `age >= 18` differ when `age` is `NaN`. The implementation keeps the original task’s direct comparison.
8. **Callback forwarding:** removing a wrapper can change forwarded arguments, receiver binding, return values, or cleanup handling. `map(parseInt)`, `reduce(Math.min)`, and the `useMount` sequence expose different versions of this hazard. A unary type annotation also does not strip extra arguments at runtime: `fromPeople` uses a real unary adapter so a flattening operator’s index cannot become `from`’s optional scheduler.
9. **Authentication:** the supplied fetch sketch lacks a complete request configuration and error contract. The new helper supplies a concrete request boundary; those details are adaptation choices, not a verbatim restoration of the speaker’s code.
10. **Completion versus cancellation:** an Observable reduction waits for normal completion. An error or unsubscription does not publish a partial aggregate. Completing the input before the reducer differs from cancelling after it.

## Primary implementation references

All links below identify the **RxJS 7.8.2 tag**, so future API changes do not silently change the basis of this explanation.

| Question | Primary source |
| --- | --- |
| How does imported `pipe` compose unary functions? | [`src/internal/util/pipe.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/util/pipe.ts) |
| When does an Observable connect its producer? | [`src/internal/Observable.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/Observable.ts) |
| How does an array become individual notifications? | [`src/internal/observable/innerFrom.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/observable/innerFrom.ts) |
| Why must a `from` projection reject the callback index? | [`src/internal/observable/from.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/observable/from.ts) |
| What arguments reach a projection? | [`src/internal/operators/map.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/map.ts) |
| How does a predicate control forwarding? | [`src/internal/operators/filter.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/filter.ts) |
| What is the reduction’s seed and output contract? | [`src/internal/operators/reduce.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/reduce.ts) |
| When does a running accumulation emit? | [`src/internal/operators/scan.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/scan.ts) |
| Where do accumulator state and completion behavior live? | [`src/internal/operators/scanInternals.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/scanInternals.ts) |
| How is an initial visible value added? | [`src/internal/operators/startWith.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/startWith.ts) |
| What does a stop-signal emission do? | [`src/internal/operators/takeUntil.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/takeUntil.ts) |
| How are inner subscriptions queued? | [`src/internal/operators/concatMap.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/concatMap.ts) |
| How does latest-only cancellation work? | [`src/internal/operators/switchMap.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/switchMap.ts) |
| How is overlap allowed? | [`src/internal/operators/mergeMap.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/mergeMap.ts) |
| How are arrivals ignored while an inner subscription is active? | [`src/internal/operators/exhaustMap.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/exhaustMap.ts) |
| How are fetch startup, body selection, and abort connected? | [`src/internal/observable/dom/fetch.ts`](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/observable/dom/fetch.ts) |

The documentation uses `pipe` for unary function composition and pipeable operators for stream transformation. It does not introduce a separate `flow` implementation, add a framework, or change RxJS’s subscription protocol.
