export function getGoogleRedirectUri(request) {
  const configuredUri = String(process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || '').trim();

  if (process.env.NODE_ENV !== 'production' && configuredUri) {
    return configuredUri;
  }

  const requestUrl = new URL(request.url);
  return new URL('/api/auth/callback', requestUrl.origin).toString();
}
