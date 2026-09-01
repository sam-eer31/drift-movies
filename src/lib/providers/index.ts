import { MovieSearchResult } from '@/types';
import { evaluateMovieRelevance } from '@/lib/search/matcher';
import { MovieProvider } from './types';
import { VegaProvider, resolveVegaMirror } from './vega';
import { RogProvider, resolveRogMirror } from './rog';

export * from './types';
export * from './vega';
export * from './rog';

export const REGISTERED_PROVIDERS: MovieProvider[] = [
  VegaProvider,
  RogProvider
];

export async function resolveAllMirrors(onLog?: (msg: string) => void): Promise<{ vega: string; rog: string }> {
  onLog?.('Pinging directory gateways for Vega & Rog portals in parallel...');
  const [vega, rog] = await Promise.all([resolveVegaMirror(), resolveRogMirror()]);
  onLog?.(`Active mirrors resolved: Vega (${vega.replace('https://', '')}) & Rog (${rog.replace('https://', '')})`);
  return { vega, rog };
}

export async function searchAllPortals(
  mirrors: { vega: string; rog: string },
  query: string,
  onLog?: (msg: string) => void
): Promise<MovieSearchResult[]> {
  const cleanQuery = query.trim();
  onLog?.(`Launching parallel search for "${cleanQuery}" on Vega (${mirrors.vega.replace('https://', '')}) and Rog (${mirrors.rog.replace('https://', '')})...`);

  const [vegaRes, rogRes] = await Promise.allSettled([
    VegaProvider.search(mirrors.vega, cleanQuery),
    RogProvider.search(mirrors.rog, cleanQuery)
  ]);

  const vegaHits = vegaRes.status === 'fulfilled' ? vegaRes.value : [];
  const rogHits = rogRes.status === 'fulfilled' ? rogRes.value : [];

  onLog?.(`Verified relevant matches: Vega found ${vegaHits.length} match(es), Rog found ${rogHits.length} match(es)`);

  const combined: MovieSearchResult[] = [];
  const seenTitles = new Set<string>();

  const addUnique = (item: MovieSearchResult) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      combined.push(item);
    }
  };

  for (const item of [...vegaHits, ...rogHits]) {
    addUnique(item);
  }

  combined.sort((a, b) => {
    const scoreA = evaluateMovieRelevance(cleanQuery, a.title).score;
    const scoreB = evaluateMovieRelevance(cleanQuery, b.title).score;
    return scoreB - scoreA;
  });

  onLog?.(`Cleaned & ranked total: ${combined.length} verified match(es)`);
  return combined;
}
