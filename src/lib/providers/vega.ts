import { MovieSearchResult } from '@/types';
import { fetchWithHeaders, BROWSER_USER_AGENT } from '@/lib/http/client';
import { evaluateMovieRelevance } from '@/lib/search/matcher';
import { MovieProvider } from './types';

export const VEGA_CANDIDATE_MIRRORS = [
  'https://new2.vegamovies.futbol',
  'https://vegamovies.is',
  'https://1vegamovies.nl',
  'https://1vegamovies.me',
  'https://1vegamovies.cc'
];

export async function resolveVegaMirror(): Promise<string> {
  for (const mirror of VEGA_CANDIDATE_MIRRORS) {
    try {
      const testUrl = `${mirror}/ts-search.php?q=a&page=1`;
      const res = await fetch(testUrl, {
        headers: {
          'User-Agent': BROWSER_USER_AGENT,
          'Accept': 'application/json, text/plain, */*',
          'Referer': `${mirror}/search.html`
        },
        cache: 'no-store'
      });
      if (res.ok) return mirror;
    } catch {}
  }
  return VEGA_CANDIDATE_MIRRORS[0];
}

export async function searchVega(activeDomain: string, query: string): Promise<MovieSearchResult[]> {
  const cleanQuery = query.trim();
  const rawResults: MovieSearchResult[] = [];

  // Try Typesense search endpoint first
  try {
    const tsUrl = `${activeDomain}/ts-search.php?q=${encodeURIComponent(cleanQuery)}&page=1`;
    const jsonStr = await fetchWithHeaders(tsUrl, `${activeDomain}/search.html?q=${encodeURIComponent(cleanQuery)}`, 'application/json, text/plain, */*');
    const data = JSON.parse(jsonStr);

    if (data && Array.isArray(data.hits) && data.hits.length > 0) {
      for (const hit of data.hits) {
        const doc = hit.document || {};
        if (doc.permalink) {
          const rawTitle = doc.post_title || '';
          const cleanTitle = rawTitle.replace(/^Download\s+/i, '').trim();
          const permalink = doc.permalink.startsWith('http') ? doc.permalink : `${activeDomain}${doc.permalink.startsWith('/') ? '' : '/'}${doc.permalink}`;
          const poster = doc.post_thumbnail;
          const isSeries = /\b(Season\s*\d+|S\d+|Complete Series|Web Series|Episodes?)\b/i.test(rawTitle);

          rawResults.push({
            title: cleanTitle,
            url: permalink,
            poster: poster?.startsWith('http') ? poster : (poster ? `${activeDomain}${poster}` : undefined),
            year: cleanTitle.match(/\b(19\d\d|20\d\d)\b/)?.[1],
            source: 'Vega',
            isSeries
          });
        }
      }
    }
  } catch {}

  // Fallback to HTML scraping
  if (rawResults.length === 0) {
    const searchUrls = [
      `${activeDomain}/search.html?q=${encodeURIComponent(cleanQuery)}`,
      `${activeDomain}/?s=${encodeURIComponent(cleanQuery)}`
    ];

    let html = '';
    for (const url of searchUrls) {
      try {
        html = await fetchWithHeaders(url, activeDomain);
        if (html.length > 500) break;
      } catch {}
    }

    if (html) {
      const anchorRegex = /<a\b[^>]*href=["'](https?:\/\/[^"']*\/download-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let anchorMatch;
      const seenUrls = new Set<string>();

      while ((anchorMatch = anchorRegex.exec(html)) !== null) {
        const url = anchorMatch[1];
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);

        const rawText = anchorMatch[2].replace(/<[^>]+>/g, '').trim();
        if (rawText.length > 5) {
          const isSeries = /\b(Season\s*\d+|S\d+|Complete Series|Web Series|Episodes?)\b/i.test(rawText);
          rawResults.push({
            title: rawText.replace(/^Download\s+/i, ''),
            url,
            year: rawText.match(/\b(19\d\d|20\d\d)\b/)?.[1],
            source: 'Vega',
            isSeries
          });
        }
      }
    }
  }

  const filteredResults: MovieSearchResult[] = [];
  for (const item of rawResults) {
    const { isRelevant } = evaluateMovieRelevance(cleanQuery, item.title);
    if (isRelevant) {
      filteredResults.push(item);
    }
  }

  return filteredResults;
}

export const VegaProvider: MovieProvider = {
  name: 'Vega',
  candidateMirrors: VEGA_CANDIDATE_MIRRORS,
  resolveActiveMirror: resolveVegaMirror,
  search: searchVega
};
