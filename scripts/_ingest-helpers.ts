/**
 * Shared validation for ingest script manifest entries.
 * Kept as a thin module so all three ingest scripts (hdri/pbr/terrain) can
 * enforce the same rules from one place.
 */

/**
 * Reject any entry.id that could escape the output root via path traversal.
 * Valid ids are slug-like: lowercase letters, digits, hyphens, underscores.
 * Segments like "..", absolute paths, or Windows separators are all rejected.
 *
 * Throws with a descriptive message so the operator sees exactly which id
 * is malformed before any filesystem work begins.
 */
export function validateEntryId(id: string): void {
  if (!id || typeof id !== 'string') {
    throw new Error(
      `Entry id must be a non-empty string, got: ${JSON.stringify(id)}`,
    );
  }
  // Reject path separators and traversal sequences outright.
  if (id.includes('/') || id.includes('\\') || id.includes('..')) {
    throw new Error(
      `Entry id "${id}" contains path separators or traversal sequences. ` +
        'Use a slug-like id (letters, digits, hyphens, underscores).',
    );
  }
  // Enforce slug format: only [a-z0-9_-] allowed.
  if (!/^[a-z0-9_-]+$/.test(id)) {
    throw new Error(
      `Entry id "${id}" contains characters outside [a-z0-9_-]. ` +
        'Use lowercase letters, digits, hyphens, or underscores only.',
    );
  }
}
