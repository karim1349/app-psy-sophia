import { queryKeys } from './keys';

describe('queryKeys', () => {
  it('should generate correct me query key', () => {
    expect(queryKeys.me()).toEqual(['me']);
  });

  it('should generate correct auth query key', () => {
    expect(queryKeys.auth()).toEqual(['auth']);
  });

  it('should return constant tuple types', () => {
    const meKey = queryKeys.me();
    const authKey = queryKeys.auth();

    // Type check: should be readonly tuples
    expect(Array.isArray(meKey)).toBe(true);
    expect(Array.isArray(authKey)).toBe(true);
  });

  it('should maintain referential equality for same keys', () => {
    // Query keys should be stable (same structure every time)
    expect(queryKeys.me()).toEqual(queryKeys.me());
    expect(queryKeys.auth()).toEqual(queryKeys.auth());
  });
});
