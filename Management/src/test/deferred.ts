/**
 * Test-only deferred promise. `Promise.withResolvers` is not in this project's
 * TS lib target, so tests that need to resolve a promise from the outside share
 * this helper instead of each defining their own copy.
 */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
