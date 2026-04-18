/** Dev-only live-fire playtest checklist helpers. No-ops in production. */

export interface LiveFireRating {
  movement: number;
  worldInhabited: number;
  combatSatisfying: number;
  thermalState: 'cold' | 'warm' | 'hot' | 'throttling';
  framehitches: string[];
  gutFeel: number;
  freeNotes: string;
  device: string;
}

export interface LiveFireSession {
  date: string;
  device: string;
  ratings: LiveFireRating;
  visualIssues: string[];
}

function padTwo(n: number): string {
  return n.toString().padStart(2, '0');
}

function isoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`;
}

function buildMarkdown(session: LiveFireSession): string {
  const r = session.ratings;
  return [
    `# Live-Fire Playtest — ${session.date} — ${session.device}`,
    '',
    '## Ratings',
    `- Movement responsive vs laggy: **${r.movement}/10**`,
    `- World feels inhabited vs empty: **${r.worldInhabited}/10**`,
    `- Combat hits feel satisfying vs weightless: **${r.combatSatisfying}/10**`,
    `- Overall gut feel — want to keep playing: **${r.gutFeel}/10**`,
    '',
    '## Thermal & Performance',
    `- Thermal state after 10min: **${r.thermalState}**`,
    r.framehitches.length > 0
      ? `- Frame hitches:\n${r.framehitches.map((h) => `  - ${h}`).join('\n')}`
      : '- Frame hitches: none noted',
    '',
    '## Visual Issues',
    session.visualIssues.length > 0
      ? session.visualIssues.map((v) => `- ${v}`).join('\n')
      : '- None noted',
    '',
    '## Free-form Notes',
    r.freeNotes || '(none)',
    '',
  ].join('\n');
}

/**
 * Format a live-fire session as a markdown doc and trigger a browser download.
 * No-ops in production.
 */
export function downloadLiveFireReport(session: LiveFireSession): void {
  if (!import.meta.env.DEV) return;

  const slug = `live-fire-${session.date}-${session.device
    .toLowerCase()
    .replace(/\s+/g, '-')}`;
  const md = buildMarkdown(session);

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Build a blank LiveFireSession pre-filled with today's date.
 */
export function createBlankSession(device: string): LiveFireSession {
  return {
    date: isoDate(),
    device,
    ratings: {
      movement: 0,
      worldInhabited: 0,
      combatSatisfying: 0,
      thermalState: 'cold',
      framehitches: [],
      gutFeel: 0,
      freeNotes: '',
      device,
    },
    visualIssues: [],
  };
}
