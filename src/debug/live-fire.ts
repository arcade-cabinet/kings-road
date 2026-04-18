/**
 * Live-fire checklist helpers — DEV only.
 *
 * Formats a live-fire session into a markdown document and triggers a
 * browser download. Mobile: download then AirDrop to Mac.
 */

export interface LiveFireEntry {
  label: string;
  result: 'pass' | 'fail' | 'skip';
  note?: string;
  timestamp?: string;
}

export interface LiveFireSession {
  device: string;
  biome: string;
  tester: string;
  entries: LiveFireEntry[];
}

function formatEntry(e: LiveFireEntry): string {
  const icon =
    e.result === 'pass' ? '[x]' : e.result === 'fail' ? '[ ]' : '[-]';
  const ts = e.timestamp ? ` _(${e.timestamp})_` : '';
  const note = e.note ? `\n  > ${e.note}` : '';
  return `- ${icon} ${e.label}${ts}${note}`;
}

/** Render session to markdown string. */
export function formatLiveFire(session: LiveFireSession): string {
  if (!import.meta.env.DEV) return '';

  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Live-Fire Checklist — ${session.biome} — ${session.device}`,
    '',
    `**Date:** ${date}  `,
    `**Tester:** ${session.tester}  `,
    `**Device:** ${session.device}`,
    '',
    '## Checklist',
    '',
    ...session.entries.map(formatEntry),
    '',
    '## Summary',
    '',
    `- Passed: ${session.entries.filter((e) => e.result === 'pass').length}`,
    `- Failed: ${session.entries.filter((e) => e.result === 'fail').length}`,
    `- Skipped: ${session.entries.filter((e) => e.result === 'skip').length}`,
  ];
  return lines.join('\n');
}

/** Trigger a browser download of the markdown doc. */
export function downloadLiveFire(session: LiveFireSession): void {
  if (!import.meta.env.DEV) return;

  const date = new Date().toISOString().slice(0, 10);
  const slug = session.device.toLowerCase().replace(/\s+/g, '-');
  const filename = `live-fire-${date}-${slug}.md`;
  const content = formatLiveFire(session);

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
