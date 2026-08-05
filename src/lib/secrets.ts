// Secret rotation support: NEXTAUTH_SECRET may hold a comma-separated list.
// The first value signs new tokens; every value is accepted for verification,
// so a new secret can be deployed alongside the old one during rotation.
export function getNextAuthSecrets(): string[] {
  return (process.env.NEXTAUTH_SECRET || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
