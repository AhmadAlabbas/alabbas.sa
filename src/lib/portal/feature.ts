export function portalEnabled(): boolean {
  return process.env.PORTAL_ENABLED === "true";
}
