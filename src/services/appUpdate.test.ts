import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersionCodes, getInstalledAppVersion } from './appUpdate.ts';

test('installed version is behind a higher release code', () => {
  assert.equal(compareVersionCodes(2, 3), true);
});

test('equal or malformed release codes do not trigger an update', () => {
  assert.equal(compareVersionCodes(2, 2), false);
  assert.equal(compareVersionCodes(Number.NaN, 3), false);
  assert.equal(compareVersionCodes(2, Number.NaN), false);
});

test('installed version metadata is stable and numeric', () => {
  const version = getInstalledAppVersion();
  assert.equal(version.name, '1.1.0');
  assert.equal(version.code, 2);
});
