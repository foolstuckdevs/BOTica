export function needsRefresh(tokenExp?: number) {
  if (!tokenExp) return true;
  const now = Date.now() / 1000;
  const threshold = 5 * 60; // 5 minutes to expiry
  return tokenExp - now < threshold;
}
