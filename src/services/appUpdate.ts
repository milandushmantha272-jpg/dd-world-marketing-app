export type InstalledAppVersion = { name: string; code: number };

export type AppUpdateInfo = {
  available: boolean;
  latestVersion: string;
  latestCode: number;
  downloadUrl: string;
  releaseNotes?: string;
  mandatory?: boolean;
};

type ReleaseMetadata = {
  tag_name?: unknown;
  body?: unknown;
  html_url?: unknown;
  assets?: Array<{ browser_download_url?: unknown; name?: unknown }>;
};

export const STABLE_DOWNLOAD_URL =
  'https://github.com/milandushmantha272-jpg/dd-world-marketing-app/releases/latest';

export const APP_VERSION = '1.1.0';
export const APP_VERSION_CODE = 2;

const RELEASE_API_URL =
  'https://api.github.com/repos/milandushmantha272-jpg/dd-world-marketing-app/releases/latest';

export const getInstalledAppVersion = (): InstalledAppVersion => ({
  name: APP_VERSION,
  code: APP_VERSION_CODE,
});

export const compareVersionCodes = (installedCode: number, latestCode: number): boolean =>
  Number.isSafeInteger(installedCode) &&
  Number.isSafeInteger(latestCode) &&
  latestCode > installedCode;

const parseReleaseTag = (tag: unknown): { version: string; code: number } | null => {
  if (typeof tag !== 'string') return null;

  // Release tags must carry the Android versionCode explicitly:
  // v<version>-build<versionCode>, e.g. v1.1.1-build3.
  const match = tag.match(/^v?(\d+\.\d+\.\d+)-build(\d+)$/i);
  if (!match) return null;

  const code = Number(match[2]);
  if (!Number.isSafeInteger(code) || code < 1) return null;

  return { version: match[1], code };
};

const parseMinimumVersionCode = (body: unknown): number | null => {
  if (typeof body !== 'string') return null;
  const match = body.match(/^minimum_version_code\s*:\s*(\d+)\s*$/im);
  if (!match) return null;

  const code = Number(match[1]);
  return Number.isSafeInteger(code) && code >= 1 ? code : null;
};

export const parseReleaseMetadata = (
  metadata: ReleaseMetadata,
  installedCode: number,
): AppUpdateInfo | null => {
  const parsed = parseReleaseTag(metadata.tag_name);
  if (!parsed || !compareVersionCodes(installedCode, parsed.code)) return null;

  const downloadUrl =
    typeof metadata.html_url === 'string' && metadata.html_url
      ? metadata.html_url
      : STABLE_DOWNLOAD_URL;
  const releaseNotes = typeof metadata.body === 'string' ? metadata.body.trim() : '';
  const minimumVersionCode = parseMinimumVersionCode(metadata.body);

  return {
    available: true,
    latestVersion: parsed.version,
    latestCode: parsed.code,
    downloadUrl,
    releaseNotes: releaseNotes || undefined,
    mandatory: minimumVersionCode !== null && installedCode < minimumVersionCode,
  };
};

export const checkForAppUpdate = async (): Promise<AppUpdateInfo | null> => {
  const installed = getInstalledAppVersion();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(RELEASE_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const metadata = (await response.json()) as ReleaseMetadata;
    return parseReleaseMetadata(metadata, installed.code);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
};
