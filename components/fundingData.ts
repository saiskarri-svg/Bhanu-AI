// Funding routes for school rooftop solar, national and by state.
// Researched from official and news sources; every item keeps its source.
// Amounts are rough guides. Regenerate rather than hand-editing large parts.

export interface FundingItem {
  name: string;
  what: string;
  who?: string;
  amount?: string;
  status?: 'current' | 'past' | 'unclear';
  url?: string;
  source?: string;
  publisher?: string;
}

export interface StateFunding {
  agency?: { name: string; url?: string };
  schemes: FundingItem[];
  netMetering?: { text: string; url?: string; source?: string };
}

export const FUNDING_CHECKED = 'October 2026';

export const FUNDING_NATIONAL: FundingItem[] = [];

export const FUNDING_STATES: Record<string, StateFunding> = {};
