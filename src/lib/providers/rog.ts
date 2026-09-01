import { MovieSearchResult } from '@/types';
import { fetchWithHeaders, BROWSER_USER_AGENT } from '@/lib/http/client';
import { evaluateMovieRelevance } from '@/lib/search/matcher';
import { MovieProvider } from './types';

export const ROG_CANDIDATE_MIRRORS = [
  'https://new2.rogmovies.click',
  'https://rogmovies.click',
  'https://1rogmovies.click',
  'https://rogmovies.vip'
];

export async function resolveRogMirror(): Promise<string> {
  for (const mirror of ROG_CANDIDATE_MIRRORS) {
    try {
      const testUrl = `${mirror}/ts-search.php?q=a&page=1`;
      const res = await fetch(testUrl, {
        headers: {
          'User-Agent': BROWSER_USER_AGENT,
          'Accept': 'application/json, text/plain, */*',
          'Referer': `${mirror}/`
        },
        cache: 'no-store'
      });
      if (res.ok) return mirror;
    } catch {}
  }
  return ROG_CANDIDATE_MIRRORS[0];
}

export async function searchRog(activeDomain: string, query: string): Promise<MovieSearchResult[]> {
  const cleanQuery = query.trim();
  const rawResults: MovieSearchResult[] = [];

  const parseHits = (jsonStr: string) => {
    try {
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
              source: 'Rog',
              isSeries
            });
          }
        }
      }
    } catch {}
  };

  const tsUrl = `${activeDomain}/ts-search.php?q=${encodeURIComponent(cleanQuery)}&page=1`;
  const referer = `${activeDomain}/search.html?q=${encodeURIComponent(cleanQuery)}`;

  // 1. Try Typesense endpoint: Direct first (0 credits)
  try {
    const jsonStr = await fetchWithHeaders(tsUrl, referer, 'application/json, text/plain, */*', false);
    parseHits(jsonStr);
  } catch {}

  // If direct fetch fails (e.g. Cloudflare datacenter IP block on Vercel), fallback to ZenRows
  if (rawResults.length === 0) {
    try {
      const jsonStr = await fetchWithHeaders(tsUrl, referer, 'application/json, text/plain, */*', true, { jsRender: false, antibot: false });
      parseHits(jsonStr);
    } catch {}
  }

  // 2. Fallback to HTML scraping if Typesense returned no hits
  if (rawResults.length === 0) {
    const searchUrls = [
      `${activeDomain}/search.html?q=${encodeURIComponent(cleanQuery)}`,
      `${activeDomain}/?s=${encodeURIComponent(cleanQuery)}`
    ];

    let html = '';
    // Direct attempt
    for (const url of searchUrls) {
      try {
        html = await fetchWithHeaders(url, activeDomain, undefined, false);
        if (html.length > 500) break;
      } catch {}
    }

    // ZenRows fallback attempt
    if (!html || html.length < 500) {
      for (const url of searchUrls) {
        try {
          html = await fetchWithHeaders(url, activeDomain, undefined, true, { jsRender: false, antibot: false });
          if (html.length > 500) break;
        } catch {}
      }
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
            source: 'Rog',
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

export const RogProvider: MovieProvider = {
  name: 'Rog',
  candidateMirrors: ROG_CANDIDATE_MIRRORS,
  resolveActiveMirror: resolveRogMirror,
  search: searchRog
};
