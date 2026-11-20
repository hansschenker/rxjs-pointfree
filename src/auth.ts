import { from, map, pipe, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import type { Unary } from './values.js';

export type Credentials = Readonly<{ username: string; password: string }>;
export type LoginResponse = Readonly<{ token: string }>;

const encodeCredentials: Unary<Credentials, string> = JSON.stringify;

const validateLoginResponse = (body: unknown): LoginResponse => {
  if (typeof body !== 'object' || body === null || !('token' in body) || typeof body.token !== 'string') {
    throw new Error('Expected a login response containing a string token.');
  }
  return { token: body.token };
};

const readLoginResponse = (response: Response): Observable<LoginResponse> =>
  response.ok
    ? from(response.json() as Promise<unknown>).pipe(map(validateLoginResponse))
    : throwError(() => new Error(`Login request failed: HTTP ${response.status}.`));

const postLoginJson = (endpoint: string): Unary<string, Observable<LoginResponse>> =>
  (body) => fromFetch<LoginResponse>(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    // Keeping body consumption inside the selector retains cancellation coverage.
    selector: readLoginResponse,
  });

/** Configure the endpoint, then supply credentials, then subscribe to request. */
export const loginAt = (endpoint: string): Unary<Credentials, Observable<LoginResponse>> => pipe(
  encodeCredentials,
  postLoginJson(endpoint),
);

// The caller chooses an explicit policy, e.g. exhaustMap(loginAt(endpoint)).
// Construction is pure; fromFetch starts a fresh request on each subscription.
