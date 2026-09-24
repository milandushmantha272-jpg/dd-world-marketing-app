import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareVersionCodes,
  getInstalledAppVersion,
  parseReleaseMetadata,
} from './appUpdate.ts';

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

test('release metadata uses explicit Android versionCode instead of semantic version math', () => {
  const info = parseReleaseMetadata({
    tag_name: 'v1.1.1-build3',
    body: 'Bug fixes',
    html_url: 'https://github.com/milandushmantha272-jpg/dd-world-marketing-app/releases/tag/v1.1.1-build3',
  }, 2);

  assert.deepEqual(info, {
    available: true,
    latestVersion: '1.1.1',
    latestCode: 3,
    downloadUrl: 'https://github.com/milandushmantha272-jpg/dd-world-marketing-app/releases/tag/v1.1.1-build3',
    releaseNotes: 'Bug fixes',
    mandatory: false,
  });
});

test('mandatory minimum versionCode is honored', () => {
  const info = parseReleaseMetadata({
    tag_name: 'v1.2.0-build5',
    body: 'minimum_version_code: 4\nSecurity update',
    html_url: 'https://example.com/release',
  }, 2);

  assert.equal(info?.latestCode, 5);
  assert.equal(info?.mandatory, true);
});

test('malformed release metadata is ignored', () => {
  assert.equal(parseReleaseMetadata({ tag_name: 'v1.2.0' }, 2), null);
  assert.equal(parseReleaseMetadata({ tag_name: 'release-buildX' }, 2), null);
});
