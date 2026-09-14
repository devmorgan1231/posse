import assert from "node:assert/strict";

type Ctor = new (...args: never[]) => unknown;

export function expect(actual: unknown) {
  return {
    toBe: (v: unknown) => assert.equal(actual, v),
    toEqual: (v: unknown) => assert.deepEqual(actual, v),
    toBeNull: () => assert.equal(actual, null),
    toHaveLength: (n: number) => assert.equal((actual as { length: number }).length, n),
    toThrow: (E: Ctor) => assert.throws(actual as () => unknown, E as never),
    toMatchObject: (o: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(o)) assert.deepEqual((actual as Record<string, unknown>)[k], v);
    },
    rejects: {
      toBeInstanceOf: (E: Ctor) => assert.rejects(actual as Promise<unknown>, E as never),
    },
  };
}
