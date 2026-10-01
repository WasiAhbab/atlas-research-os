export function safeAuthDestination(value?: string | null, allowRecovery = false): string {
  if (allowRecovery && value === '/auth?mode=update') return value;
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/workspace';
  try {
    const url = new URL(value, 'https://atlas.invalid');
    return url.origin === 'https://atlas.invalid' && url.pathname === '/workspace'
      ? url.pathname + url.search : '/workspace';
  } catch { return '/workspace'; }
}

export function authCallbackUrl(origin: string, destination: string): string {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('next', safeAuthDestination(destination, true));
  return url.toString();
}
