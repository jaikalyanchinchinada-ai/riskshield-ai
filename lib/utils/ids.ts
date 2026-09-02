// ============================================================================
// RiskShield AI — Reference ID Generator
// ----------------------------------------------------------------------------
// Produces the human-friendly IDs used throughout the UI (TXN-100045,
// CASE-3021, etc), separate from the internal cuid() primary keys Prisma
// manages. Keeping these separate means the "pretty" ID scheme can change
// without ever touching a foreign key relationship.
// ============================================================================

let counter = Math.floor(Math.random() * 900) + 100;

export function nextRef(prefix: string, start = 100000): string {
  counter += 1;
  return `${prefix}-${start + counter}`;
}

export function shortId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
