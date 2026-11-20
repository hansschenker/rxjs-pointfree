import assert from 'node:assert/strict';
import { concatMap, delay, exhaustMap, mergeMap, of, pipe, switchMap } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import type { Credentials, LoginResponse, Unary } from '../src/index.js';

type TimedReply = Readonly<{ frame: number; token: string }>;

const makeDemoReply: Unary<Credentials, LoginResponse> = (credentials) => ({
  token: `demo:${credentials.username}`,
});
const replyAfterFourFrames = (reply: LoginResponse) => of(reply).pipe(delay(4));
const fakeLogin = pipe(makeDemoReply, replyAfterFourFrames);

// Purely local simulation: no credentials are sent and no HTTP call is made.
// The source and virtual scheduler supply time; the operators choose a policy.
const scheduler = new TestScheduler(assert.deepEqual);
console.log('04 — One effect function, four explicit policies (virtual time)');
scheduler.run(({ cold, flush }) => {
  const attempts$ = cold<Credentials>('a-b----|', {
    a: { username: 'Ali', password: 'demo' },
    b: { username: 'Bob', password: 'demo' },
  });

  const onlyLatest = pipe(switchMap(fakeLogin));
  const queue = pipe(concatMap(fakeLogin));
  const allowOverlap = pipe(mergeMap(fakeLogin));
  const ignoreWhileBusy = pipe(exhaustMap(fakeLogin));

  const latest: TimedReply[] = [];
  const queued: TimedReply[] = [];
  const overlapping: TimedReply[] = [];
  const accepted: TimedReply[] = [];
  const recordReply = (sink: TimedReply[]) => (reply: LoginResponse) => {
    sink.push({ frame: scheduler.frame, token: reply.token });
  };
  onlyLatest(attempts$).subscribe(recordReply(latest));
  queue(attempts$).subscribe(recordReply(queued));
  allowOverlap(attempts$).subscribe(recordReply(overlapping));
  ignoreWhileBusy(attempts$).subscribe(recordReply(accepted));
  flush();

  assert.deepEqual(latest, [{ frame: 6, token: 'demo:Bob' }]);
  assert.deepEqual(queued, [{ frame: 4, token: 'demo:Ali' }, { frame: 8, token: 'demo:Bob' }]);
  assert.deepEqual(overlapping, [{ frame: 4, token: 'demo:Ali' }, { frame: 6, token: 'demo:Bob' }]);
  assert.deepEqual(accepted, [{ frame: 4, token: 'demo:Ali' }]);
  console.log('switchMap:', latest);
  console.log('concatMap:', queued);
  console.log('mergeMap:', overlapping);
  console.log('exhaustMap:', accepted);
});
