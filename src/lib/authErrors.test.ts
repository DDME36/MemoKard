import { describe, expect, it } from 'vitest';
import { isAuthRejection } from './authErrors';

describe('isAuthRejection', () => {
  it('treats 401/403/404 from auth refresh as a real rejection', () => {
    expect(isAuthRejection({ status: 401 })).toBe(true);
    expect(isAuthRejection({ status: 403 })).toBe(true);
    expect(isAuthRejection({ status: 404 })).toBe(true);
  });

  it('keeps the session when the server simply cannot be reached', () => {
    expect(isAuthRejection({ status: 0 })).toBe(false);
    expect(isAuthRejection(new TypeError('fetch failed'))).toBe(false);
    expect(isAuthRejection({ status: 502 })).toBe(false);
  });
});
