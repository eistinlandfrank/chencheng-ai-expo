const enabledValues = new Set(['1', 'true', 'yes', 'on']);

export function publicPortalShowcaseEnabled() {
  return enabledValues.has(String(process.env.PUBLIC_PORTAL_SHOWCASE ?? '').trim().toLowerCase());
}
