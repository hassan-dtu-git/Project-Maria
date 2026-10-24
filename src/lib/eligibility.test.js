import assert from 'node:assert/strict';
import test from 'node:test';
import { canUseAdultSocialFeatures } from './eligibility.js';

test('fails closed when there is no signed-in user', () => {
  assert.equal(canUseAdultSocialFeatures(null, true, true), false);
});

test('fails closed until the trusted eligibility check has completed', () => {
  assert.equal(canUseAdultSocialFeatures({ id: 'user-1' }, false, true), false);
});

test('fails closed when adult eligibility has not been verified', () => {
  assert.equal(canUseAdultSocialFeatures({ id: 'user-1' }, true, false), false);
});

test('allows social features only with an authenticated user and explicit verified status', () => {
  assert.equal(canUseAdultSocialFeatures({ id: 'user-1' }, true, true), true);
});

test('does not trust editable user metadata to grant adult access', () => {
  const user = {
    id: 'user-1',
    user_metadata: { is_adult_verified: true, age: 99, date_of_birth: '1900-01-01' }
  };
  assert.equal(canUseAdultSocialFeatures(user, true, false), false);
});

test('requires explicit boolean verification flags', () => {
  const user = { id: 'user-1' };
  assert.equal(canUseAdultSocialFeatures(user, 1, 1), false);
  assert.equal(canUseAdultSocialFeatures(user, true, 1), false);
});
