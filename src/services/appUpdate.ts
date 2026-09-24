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
  minimum_version_code?: unknown;
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

const parseVersionCode = (tag: unknown): number | null => {
  if (typeof tag !== 'string') return null;
  const match = tag.match(/(?:v|release-)?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2] || 0);
  const patch = Number(match[3] || 0);
  if (![major, minor, patch].every(Number.isSafeInteger)) return null;
  return major * 1_000_000 + minor * 1_000 + patch;
};

const toLatestCode = (metadata: ReleaseMetadata): number | null => {
  const numericAsset = metadata.assets?.find((asset) =>
    typeof asset.name === 'string' && /version[-_]?code/i.test(asset.name),
  );
  if (numericAsset && typeof numericAsset.name === 'string') {
    const match = numericAsset.name.match(/(\d+)/);
    if (match) return Number(match[1]);
  }
  return parseVersionCode(metadata.tag_name);
};

export const compareVersionCodes = (installedCode: number, latestCode: number): boolean =>
  Number.isSafeInteger(installedCode) &&
  Number.isSafeInteger(latestCode) &&
  latestCode > installedCode;

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
    const latestCode = toLatestCode(metadata);
    if (latestCode === null || !compareVersionCodes(installed.code, latestCode)) return null;

    const latestVersion =
      typeof metadata.tag_name === 'string' ? metadata.tag_name.replace(/^v/i, '') : 'New version';
    const releaseNotes = typeof metadata.body === 'string' ? metadata.body.trim() : undefined;
    const downloadUrl =
      typeof metadata.html_url === 'string' && metadata.html_url
        ? metadata.html_url
        : STABLE_DOWNLOAD_URL;

    const minimumVersionCode =
      typeof metadata.minimum_version_code === 'number' && Number.isSafeInteger(metadata.minimum_version_code)
        ? metadata.minimum_version_code
        : null;

    return {
      available: true,
      latestVersion,
      latestCode,
      downloadUrl,
      releaseNotes: releaseNotes || undefined,
      mandatory: minimumVersionCode !== null && installed.code < minimumVersionCode,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
};
