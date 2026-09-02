const TOKEN_LENGTH = 10;
const TOKEN_PATTERN = /^[0-9A-HJKMNP-TV-Z]{10}$/;

export function readPortalToken(fragment: string): string | null {
  if (!fragment.startsWith('#')) {
    return null;
  }

  const normalized = fragment
    .slice(1)
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replaceAll('O', '0')
    .replace(/[IL]/g, '1');

  if (normalized.length !== TOKEN_LENGTH || !TOKEN_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}
