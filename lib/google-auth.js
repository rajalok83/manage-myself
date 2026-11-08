import { AUTH_CONFIG, IS_PRODUCTION } from '@/lib/config';

export function getPublicOrigin(request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  return forwardedHost
    ? `${forwardedProto.split(',')[0].trim()}://${forwardedHost.split(',')[0].trim()}`
    : requestUrl.origin;
}

export function getGoogleRedirectUri(request) {
  const configuredUri = String(AUTH_CONFIG.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || '').trim();

  if (!IS_PRODUCTION && configuredUri) {
    return configuredUri;
  }

  return new URL('/api/auth/callback', getPublicOrigin(request)).toString();
}
