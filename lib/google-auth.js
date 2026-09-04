export function getGoogleRedirectUri(request) {
  const configuredUri = String(process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || '').trim();

  if (process.env.NODE_ENV !== 'production' && configuredUri) {
    return configuredUri;
  }

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const publicOrigin = forwardedHost
    ? `${forwardedProto.split(',')[0].trim()}://${forwardedHost.split(',')[0].trim()}`
    : requestUrl.origin;

  return new URL('/api/auth/callback', publicOrigin).toString();
}
