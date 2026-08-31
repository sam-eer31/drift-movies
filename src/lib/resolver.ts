import { MovieSearchResult, QualityOption, EpisodeOption, DirectStream, ResolveResponseData } from '@/types';

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const VEGA_CANDIDATE_MIRRORS = [
  'https://new2.vegamovies.futbol',
  'https://vegamovies.is',
  'https://1vegamovies.nl',
  'https://1vegamovies.me',
  'https://1vegamovies.cc'
];

const ROG_CANDIDATE_MIRRORS = [
  'https://new2.rogmovies.click',
  'https://rogmovies.click',
  'https://1rogmovies.click',
  'https://rogmovies.vip'
];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'movie', 'full', 'download', 'in', 'of', 'and', 'all',
  'org', 'part', 'official', 'series', 'season', 'hindi', 'english', 'dual', 'audio'
]);

const ACRONYMS: Record<string, string[]> = {
  kgf: ['k g f', 'k.g.f', 'kgf'],
  rrr: ['r r r', 'r.r.r', 'rrr'],
  ddlj: ['dilwale dulhania le jayenge', 'ddlj'],
  yjhd: ['yeh jawaani hai deewani', 'yjhd'],
  got: ['game of thrones', 'got'],
  lotr: ['lord of the rings', 'lotr'],
  k3g: ['kabhi khushi kabhie gham', 'k3g'],
  mcu: ['marvel', 'avengers', 'mcu'],
  ff: ['fast and furious', 'fast furious', 'fast & furious']
};

export async function fetchWithHeaders(
  url: string,
  referer?: string,
  accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  useZenRows = false,
  zenRowsOptions = { jsRender: true, antibot: true },
  maxRetries = 2
): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_USER_AGENT,
    'Accept': accept,
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': referer ? 'cross-site' : 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  if (referer) {
    headers['Referer'] = referer;
  }

  const zenrowsApiKey = process.env.ZENROWS_API_KEY;
  let targetUrl = url;

  if (useZenRows && zenrowsApiKey && zenrowsApiKey.trim() !== '') {
    // Route through ZenRows API with full anti-bot bypass for the extraction phase
    targetUrl = `https://api.zenrows.com/v1/?apikey=${zenrowsApiKey.trim()}&url=${encodeURIComponent(url)}&premium_proxy=true`;
    if (zenRowsOptions.jsRender) targetUrl += '&js_render=true';
    if (zenRowsOptions.antibot) targetUrl += '&antibot=true';
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(targetUrl, {
        headers,
        redirect: 'follow',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} (${response.statusText}) on ${url.split('?')[0]}`);
      }

      return await response.text();
    } catch (err: any) {
      if (attempt >= maxRetries) {
        throw err;
      }
      attempt++;
      // Wait 1-2 seconds before retrying to let ZenRows rotate the IP
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error('Unreachable');
}

/**
 * 1a. Dynamically resolve Vega mirror
 */
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

/**
 * 1b. Dynamically resolve Rog mirror
 */
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

/**
 * 1c. Dynamically resolve both Vega and Rog active mirrors in parallel
 */
export async function resolveAllMirrors(onLog?: (msg: string) => void): Promise<{ vega: string; rog: string }> {
  onLog?.('Pinging directory gateways for Vega & Rog portals in parallel...');
  const [vega, rog] = await Promise.all([resolveVegaMirror(), resolveRogMirror()]);
  onLog?.(`Active mirrors resolved: Vega (${vega.replace('https://', '')}) & Rog (${rog.replace('https://', '')})`);
  return { vega, rog };
}

/**
 * Strict Relevance & Partial/Prefix Matching Algorithm
 */
function areTokensEquivalent(qTok: string, tTok: string, allowPrefix = true): boolean {
  if (qTok === tTok) return true;

  if (tTok === `${qTok}s` || qTok === `${tTok}s` || tTok === `${qTok}es` || qTok === `${tTok}es`) return true;

  const qNorm = qTok.replace(/([aeiou])\1+/g, '$1');
  const tNorm = tTok.replace(/([aeiou])\1+/g, '$1');
  if (qNorm === tNorm && qNorm.length >= 3) return true;

  if (allowPrefix && qTok.length >= 3) {
    if (tTok.startsWith(qTok) || tNorm.startsWith(qNorm)) {
      if (qTok === 'stree' && tTok.startsWith('street')) return false;
      return true;
    }
  }

  if (qTok.length >= 4 && (qTok.includes(tTok) || tTok.includes(qTok))) {
    return true;
  }

  return false;
}

function cleanMovieTitle(rawTitle: string): string {
  let t = rawTitle;
  t = t.replace(/^download\s+/i, '');
  t = t.replace(/\{[^}]+\}/g, ' ');
  t = t.replace(/\[[^\]]+\]/g, ' ');
  t = t.replace(/\((?:19\d\d|20\d\d)\)/g, ' ');
  t = t.replace(/\b(?:480p|720p|1080p|2160p|4k|uhd|bluray|web-dl|webrip|hdrip|dual audio|hindi dubbed|full movie|season \d+)\b.*/i, ' ');
  t = t.replace(/[-–:|].*/, ' ');
  t = t.replace(/[^a-zA-Z0-9\s]/g, ' ');
  return t.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function evaluateMovieRelevance(query: string, rawTitle: string): { isRelevant: boolean; score: number } {
  const qRaw = query.trim().toLowerCase();

  for (const [acr, aliases] of Object.entries(ACRONYMS)) {
    if (qRaw.startsWith(acr)) {
      for (const alias of aliases) {
        if (rawTitle.toLowerCase().includes(alias)) {
          return { isRelevant: true, score: 1000 };
        }
      }
    }
  }

  const qClean = query.replace(/[^a-zA-Z0-9\s]/g, ' ').toLowerCase();
  const qAllTokens = qClean.split(/\s+/).filter(Boolean);
  const qTokens = qAllTokens.filter(t => !STOPWORDS.has(t));
  const activeQTokens = qTokens.length > 0 ? qTokens : qAllTokens;

  if (activeQTokens.length === 0) {
    return { isRelevant: true, score: 100 };
  }

  const tClean = cleanMovieTitle(rawTitle);
  const tFullClean = rawTitle.replace(/[^a-zA-Z0-9\s]/g, ' ').toLowerCase();
  const tTokens = tClean.split(/\s+/).filter(Boolean);
  const tFullTokens = tFullClean.split(/\s+/).filter(Boolean);

  if (tTokens.length === 0 && tFullTokens.length === 0) {
    return { isRelevant: false, score: 0 };
  }

  let matchedCount = 0;
  for (const qTok of activeQTokens) {
    let matched = false;
    for (const tTok of tFullTokens) {
      if (areTokensEquivalent(qTok, tTok, true)) {
        matched = true;
        break;
      }
    }
    if (matched) matchedCount++;
  }

  if (matchedCount < activeQTokens.length) {
    return { isRelevant: false, score: 0 };
  }

  let score = 0;
  if (tClean === qClean) {
    score += 1000;
  } else if (tClean.startsWith(qClean) || tTokens.some(t => t.startsWith(qClean))) {
    score += 700;
  } else if (tFullClean.includes(qClean)) {
    score += 400;
  } else {
    score += 150;
  }

  if (activeQTokens.some(tok => /^\d+$/.test(tok))) {
    score += 250;
  }

  if (activeQTokens.some(q => q.startsWith('aveng')) && !activeQTokens.includes('grimm') && tFullTokens.includes('grimm')) {
    score -= 500;
  }

  return { isRelevant: true, score };
}

/**
 * 2a. Search single portal
 */
async function searchSinglePortal(activeDomain: string, query: string, source: 'Vega' | 'Rog'): Promise<MovieSearchResult[]> {
  const cleanQuery = query.trim();
  const rawResults: MovieSearchResult[] = [];

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
            source,
            isSeries
          });
        }
      }
    }
  } catch {}

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
            source,
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

/**
 * 2b. Search both Vega and Rog portals in parallel
 */
export async function searchAllPortals(
  mirrors: { vega: string; rog: string },
  query: string,
  onLog?: (msg: string) => void
): Promise<MovieSearchResult[]> {
  const cleanQuery = query.trim();
  onLog?.(`Launching parallel search for "${cleanQuery}" on Vega (${mirrors.vega.replace('https://', '')}) and Rog (${mirrors.rog.replace('https://', '')})...`);

  const [vegaRes, rogRes] = await Promise.allSettled([
    searchSinglePortal(mirrors.vega, cleanQuery, 'Vega'),
    searchSinglePortal(mirrors.rog, cleanQuery, 'Rog')
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

/**
 * Priority Ranker for Mirrors: V-Cloud is #1, then HubCloud, then G-Direct/FastDL
 */
function getMirrorPriority(btnTextOrUrl: string): number {
  const t = btnTextOrUrl.toLowerCase();
  if (t.includes('vcloud') || t.includes('v-cloud')) return 1;
  if (t.includes('hubcloud')) return 2;
  if (t.includes('fastdl') || t.includes('g-direct')) return 3;
  if (t.includes('nexdrive')) return 4;
  return 5;
}

/**
 * 3a. Extract Episode list from a Web Series generator page (Prioritizing V-Cloud with Multi-Mirror Array)
 */
export async function extractEpisodesFromGenerator(
  generatorUrl: string,
  onLog?: (msg: string) => void
): Promise<EpisodeOption[]> {
  onLog?.(`Extracting episode list from generator (${generatorUrl})...`);
  const html = await fetchWithHeaders(generatorUrl);

  const episodes: EpisodeOption[] = [];

  // Match explicit episode headings: e.g. <h4... -:Episodes: 1:- </h4> or -:Episode: 01:-
  const epPattern = /<(?:h[2-6]|p|div)\b[^>]*>(?:<[^>]+>)*\s*[-:—–\s]*\b(?:Episodes?|Ep)\b\s*:?\s*0?(\d+)\s*[-:—–\s]*(?:<[^>]+>)*\s*<\/(?:h[2-6]|p|div)>/gi;
  const matches = Array.from(html.matchAll(epPattern));

  if (matches.length > 0) {
    for (let idx = 0; idx < matches.length; idx++) {
      const epNum = parseInt(matches[idx][1]);
      const startPos = (matches[idx].index ?? 0) + matches[idx][0].length;
      const endPos = idx + 1 < matches.length ? (matches[idx + 1].index ?? html.length) : html.length;
      const sectionHtml = html.slice(startPos, endPos);

      // Extract all candidate links in this episode block
      const candidateLinks = Array.from(sectionHtml.matchAll(/href=["'](https?:\/\/(?:vcloud|hubcloud|fastdl|nexdrive)[^"']+)["']/gi)).map(m => m[1]);

      if (candidateLinks.length > 0) {
        // Sort mirrors: V-Cloud first, then HubCloud, then FastDL
        const sortedMirrors = Array.from(new Set(candidateLinks)).sort((a, b) => getMirrorPriority(a) - getMirrorPriority(b));

        episodes.push({
          episodeNumber: epNum,
          title: `Episode ${epNum}`,
          generatorUrl: sortedMirrors[0],
          mirrors: sortedMirrors
        });
      }
    }
  }

  // Fallback: If no explicit numbered headings matched, extract all links sequentially
  if (episodes.length === 0) {
    const allLinks = Array.from(html.matchAll(/href=["'](https?:\/\/(?:vcloud|hubcloud|fastdl)[^"']+)["']/gi)).map(m => m[1]);
    const sorted = Array.from(new Set(allLinks)).sort((a, b) => getMirrorPriority(a) - getMirrorPriority(b));

    for (let idx = 0; idx < sorted.length; idx++) {
      episodes.push({
        episodeNumber: idx + 1,
        title: `Episode ${idx + 1}`,
        generatorUrl: sorted[idx],
        mirrors: [sorted[idx]]
      });
    }
  }

  onLog?.(`Identified ${episodes.length} episode(s) (V-Cloud prioritized)`);
  return episodes;
}

/**
 * 3b. Extract all available qualities, seasons, and episode packages (Prioritizing V-Cloud mirrors across dual buttons)
 */
export async function getMovieQualities(
  movieUrl: string,
  onLog?: (msg: string) => void
): Promise<{ qualities: QualityOption[]; isSeries: boolean; seasons: string[] }> {
  onLog?.(`Fetching all available quality packages & seasons from details page...`);
  const html = await fetchWithHeaders(movieUrl);

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
  const mainTitle = titleMatch ? titleMatch[1] : '';
  const isSeriesInTitle = /\b(Season\s*\d+|S\d+|Complete Series|Web Series|Episodes?)\b/i.test(mainTitle);
  const isPerEpisodeSize = /\b\d+(?:\.\d+)?\s*(?:MB|GB)\/E\]/i.test(html);
  const isBatchPresent = /batch\/zip|batch\s*zip/i.test(html);

  const isSeries = isSeriesInTitle || isPerEpisodeSize || isBatchPresent;

  const rawPackages: Array<{
    key: string;
    generatorUrl: string;
    btnText: string;
    cleanHeading: string;
    season: string;
    quality: string;
    size?: string;
    format: string;
    isEpisodePackage: boolean;
  }> = [];

  const seasonsSet = new Set<string>();

  const linkMatches = Array.from(html.matchAll(/<a\b[^>]*href=["'](https?:\/\/(?:nexdrive|fastdl|vcloud|hubcloud)[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));

  for (let idx = 0; idx < linkMatches.length; idx++) {
    const m = linkMatches[idx];
    const generatorUrl = m[1];
    const btnText = m[2].replace(/<[^>]+>/g, ' ').trim();

    // Look back up to 1200 characters to find the enclosing heading for this group of buttons
    const lookback = html.slice(Math.max(0, (m.index ?? 0) - 1200), m.index);
    const headingMatches = Array.from(lookback.matchAll(/<(?:h[2-6]|strong)\b[^>]*>([\s\S]*?)<\/(?:h[2-6]|strong)>/gi));
    const targetHeading = headingMatches.length > 0 ? headingMatches[headingMatches.length - 1][1] : lookback;

    let clean = targetHeading.replace(/<[^>]+>/g, ' ').replace(/\{[^}]+\}/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();

    // Season Detection
    let season = 'Season 1';
    const seasonMatch = clean.match(/\b(?:Season|S)\s*0?(\d+)\b/i) ||
                        lookback.match(/\b(?:Season|S)\s*0?(\d+)\b/i);
    if (seasonMatch) {
      season = `Season ${seasonMatch[1]}`;
    }
    if (isSeries) {
      seasonsSet.add(season);
    }

    // Resolution Detection
    let quality = '720p';
    if (/2160p|4k|uhd/i.test(clean)) {
      quality = '2160p 4K';
    } else if (/1080p/i.test(clean)) {
      quality = '1080p';
    } else if (/720p/i.test(clean)) {
      quality = '720p';
    } else if (/480p/i.test(clean)) {
      quality = '480p';
    }

    // Size Detection
    const sizeMatch = clean.match(/\[(\d+(?:\.\d+)?\s*(?:MB|GB)(?:\/E)?)\]/i) ||
                      btnText.match(/\[(\d+(?:\.\d+)?\s*(?:MB|GB)(?:\/E)?)\]/i) ||
                      clean.match(/(\d+(?:\.\d+)?\s*(?:MB|GB))/i);
    const size = sizeMatch ? sizeMatch[1] : undefined;

    // Format Detection
    const formatMatches = Array.from(clean.matchAll(/\b(BluRay|WEB-DL|HDRip|WEBRip|HEVC|HRVC|x264|x265|60fps|60FPS|10bit|HDR|BDRip|Remux)\b/gi)).map(f => f[1]);
    const format = Array.from(new Set(formatMatches)).join(' ');

    const isPerEp = (size && size.toUpperCase().includes('/E')) || clean.toUpperCase().includes('/E') || /episode/i.test(btnText);
    const isExplicitBatch = /batch|zip|complete/i.test(btnText) || /full season/i.test(clean);
    const isEpisodePackage = isSeries ? (isPerEp && !isExplicitBatch) : false;

    // Group buttons that share the same Season, Quality and Size under the same package key!
    const groupKey = isSeries
      ? (isEpisodePackage ? `${season}_${quality}_${size || 'ep'}` : `${season}_${quality}_${size || 'batch'}`)
      : `${quality}_${size || 'single'}`;

    rawPackages.push({
      key: groupKey,
      generatorUrl,
      btnText,
      cleanHeading: clean,
      season,
      quality,
      size,
      format,
      isEpisodePackage
    });
  }

  // Group multiple buttons (e.g. V-Cloud vs G-Direct) under the same package and strictly prioritize V-Cloud
  const packageMap = new Map<string, {
    quality: string;
    season?: string;
    size?: string;
    format: string;
    type: QualityOption['type'];
    mirrors: Array<{ btnText: string; url: string }>;
  }>();

  for (const item of rawPackages) {
    if (!packageMap.has(item.key)) {
      packageMap.set(item.key, {
        quality: item.quality,
        season: item.season,
        size: item.size,
        format: item.format,
        type: isSeries ? (item.isEpisodePackage ? 'episode_list' : 'batch_zip') : 'movie',
        mirrors: [{ btnText: item.btnText, url: item.generatorUrl }]
      });
    } else {
      const existing = packageMap.get(item.key)!;
      if (!existing.mirrors.some(m => m.url === item.generatorUrl)) {
        existing.mirrors.push({ btnText: item.btnText, url: item.generatorUrl });
      }
      if (!existing.size && item.size) existing.size = item.size;
    }
  }

  const qualityOptions: QualityOption[] = [];

  for (const [key, pkg] of packageMap.entries()) {
    // Sort mirrors for this package: V-Cloud is Rank 1, then HubCloud, then G-Direct/FastDL
    pkg.mirrors.sort((a, b) => getMirrorPriority(a.btnText || a.url) - getMirrorPriority(b.btnText || b.url));
    const sortedMirrorUrls = pkg.mirrors.map(m => m.url);

    let label = '';
    if (!isSeries) {
      label = `${pkg.quality}`;
      if (pkg.format) label += ` ${pkg.format}`;
      if (pkg.size) label += ` [${pkg.size}]`;
    } else if (pkg.type === 'episode_list') {
      label = `${pkg.season} • ${pkg.quality}`;
      if (pkg.format) label += ` ${pkg.format}`;
      if (pkg.size) label += ` [${pkg.size}]`;
    } else {
      label = `${pkg.season} • ${pkg.quality} Full Season Zip`;
      if (pkg.size) label += ` [${pkg.size}]`;
    }

    qualityOptions.push({
      id: sortedMirrorUrls[0],
      quality: pkg.quality,
      season: pkg.season,
      label,
      size: pkg.size,
      format: pkg.format,
      generatorUrl: sortedMirrorUrls[0],
      mirrors: sortedMirrorUrls,
      type: pkg.type
    });
  }

  // Sort by Season desc -> Resolution desc -> Size
  const resOrder: Record<string, number> = { '2160p 4K': 4, '1080p': 3, '720p': 2, '480p': 1 };
  qualityOptions.sort((a, b) => {
    const sA = parseInt(a.season?.replace(/\D/g, '') || '1');
    const sB = parseInt(b.season?.replace(/\D/g, '') || '1');
    if (sB !== sA) return sB - sA;

    const diff = (resOrder[b.quality] || 0) - (resOrder[a.quality] || 0);
    if (diff !== 0) return diff;
    return (parseFloat(b.size || '0') || 0) - (parseFloat(a.size || '0') || 0);
  });

  const seasons = Array.from(seasonsSet).sort((a, b) => {
    return parseInt(b.replace(/\D/g, '')) - parseInt(a.replace(/\D/g, ''));
  });

  onLog?.(`Found ${qualityOptions.length} packages across ${seasons.length || 1} season(s) (Series: ${isSeries ? 'Yes' : 'No'})`);
  return { qualities: qualityOptions, isSeries, seasons };
}

/**
 * 4. Resolve generator page / candidate mirrors -> Recursive Multi-Stage Token Decoder -> Direct S3 / Worker Streams
 *
 * KEY INSIGHT: vcloud.fit and hubcloud pages do NOT have Cloudflare challenges.
 * A plain HTTP fetch returns the full HTML containing atob(atob('...')) encoded redirect URLs.
 * Using ZenRows with js_render on these pages BREAKS extraction because ZenRows executes the
 * JavaScript (window.location = url), follows the redirect, and returns a nearly-empty page.
 * ZenRows should ONLY be used for nexdrive/fastdl generator pages that have actual Cloudflare protection.
 */
export async function resolveDirectStreams(
  generatorUrlOrCandidates: string | string[],
  onLog?: (msg: string) => void
): Promise<{ streams: DirectStream[]; fileName?: string; fileSize?: string }> {
  const candidateList = Array.isArray(generatorUrlOrCandidates)
    ? generatorUrlOrCandidates
    : [generatorUrlOrCandidates];

  // Prioritize V-Cloud candidate first
  candidateList.sort((a, b) => getMirrorPriority(a) - getMirrorPriority(b));

  for (const candidate of candidateList) {
    try {
      onLog?.(`Connecting to link mirror: ${candidate.split('?')[0]}...`);
      let currentUrl = candidate;
      let currentReferer = candidate;

      // nexdrive/fastdl generator pages need ZenRows (Cloudflare protected)
      if (candidate.includes('nexdrive') || candidate.includes('fastdl')) {
        const genHtml = await fetchWithHeaders(candidate, undefined, undefined, true);

        if (genHtml.includes('File is Deleted') || genHtml.includes('UnAvailable') || genHtml.includes('Something went wrong')) {
          onLog?.(`Mirror ${candidate} indicates file unavailable, testing next mirror...`);
          continue;
        }

        // Find all direct servers on generator page, prioritizing V-Cloud
        const serverLinks = Array.from(genHtml.matchAll(/href=["'](https?:\/\/(?:vcloud|hubcloud|fastdl)[^"']+)["']/gi)).map(m => m[1]);
        serverLinks.sort((a, b) => getMirrorPriority(a) - getMirrorPriority(b));

        if (serverLinks.length > 0) {
          currentUrl = serverLinks[0];
          currentReferer = candidate;
          onLog?.(`Selected primary server (${currentUrl.includes('vcloud') ? 'V-Cloud Resumable' : 'Cloud Server'})`);
        }
      }

      // Recursive multi-step token decoding loop (handles up to 4 redirect interstitials)
      let depth = 0;
      const maxDepth = 4;
      let streams: DirectStream[] = [];
      let resolvedFileName = 'Media.Download.mkv';

      while (depth < maxDepth) {
        depth++;
        onLog?.(`[Stage ${depth}] Decoding session token on ${currentUrl.split('?')[0]}...`);

        // CRITICAL FIX: vcloud.fit and hubcloud pages NEED ZenRows to bypass datacenter IP bans,
        // BUT they must NOT use js_render, otherwise ZenRows executes the JS redirect and destroys the data.
        const isCloudPage = /vcloud|hubcloud/i.test(currentUrl);
        const pageHtml = await fetchWithHeaders(currentUrl, currentReferer, undefined, true, {
          jsRender: !isCloudPage,
          antibot: !isCloudPage
        });

        if (pageHtml.includes('File is Deleted') || pageHtml.includes('UnAvailable') || pageHtml.includes('Something went wrong')) {
          onLog?.(`Server returned deleted file, checking alternate mirror...`);
          break;
        }

        // Check file title on this page
        const titleMatch = pageHtml.match(/<title>([^<]+)<\/title>/i) ||
                           pageHtml.match(/<h\d[^>]*>([^<]+\.(?:mkv|mp4|zip|rar|avi))<\/h\d>/i);
        if (titleMatch) {
          const raw = titleMatch[1].replace(/Download\s*|Vegamovies|Rogmovies|Official/gi, '').trim();
          if (raw.length > 3 && !raw.toLowerCase().includes('wait') && !raw.toLowerCase().includes('loading')) {
            resolvedFileName = raw.includes('.') ? raw : `${raw}.mkv`;
          }
        }

        // 1. Extract Cloudflare R2 S3 Direct Link (FSLv2 Server)
        const r2Match = pageHtml.match(/href=["'](https?:\/\/[a-zA-Z0-9.-]+\.r2\.cloudflarestorage\.com\/[^"']+)["']/i) ||
                        pageHtml.match(/href=["'](https?:\/\/[^"']*X-Amz-Signature=[^"']+)["']/i);

        if (r2Match) {
          streams.push({
            name: 'Cloudflare R2 Direct S3 Stream (FSLv2)',
            url: r2Match[1].replace(/&amp;/g, '&'),
            type: 's3',
            speed: 'Ultra Fast (10 Gbps)',
            recommended: true
          });
          onLog?.(`Extracted FSLv2 Cloudflare R2 direct stream URL (Signed S3)`);
        }

        // 2. Extract Cloudflare Worker Stream (Server 1)
        const workerMatch = pageHtml.match(/href=["'](https?:\/\/[a-zA-Z0-9.-]+\.workers\.dev\/[^"']+)["']/i);
        if (workerMatch) {
          streams.push({
            name: 'Cloudflare CDN Worker (Server 1)',
            url: workerMatch[1].replace(/&amp;/g, '&'),
            type: 'worker',
            speed: 'High Speed CDN',
            recommended: streams.length === 0
          });
          onLog?.(`Extracted Server 1 Cloudflare Worker reverse-proxy stream`);
        }

        // 3. Fallback: Extract other direct download buttons
        const anyDlMatch = pageHtml.match(/href=["'](https?:\/\/(?:hubcloud|vcloud|stream)[^"']*\.(?:mkv|mp4|zip|rar)[^"']*)["']/i);
        if (anyDlMatch && !streams.some(s => s.url === anyDlMatch[1])) {
          streams.push({
            name: 'Direct Media Stream',
            url: anyDlMatch[1].replace(/&amp;/g, '&'),
            type: 'direct',
            speed: 'Direct Fast Link'
          });
        }

        if (streams.length > 0) {
          onLog?.(`Resolved ${streams.length} direct stream mirror(s) successfully!`);
          return { streams, fileName: resolvedFileName };
        }

        // --- No streams found yet, look for redirect patterns to follow ---

        // Pattern A: atob(atob('base64')) — double-encoded redirect (most common on vcloud.fit)
        const atobDoubleMatch = pageHtml.match(/atob\(\s*atob\(\s*['"]([A-Za-z0-9+/=]+)['"]\s*\)\s*\)/i);
        if (atobDoubleMatch && atobDoubleMatch[1]) {
          try {
            const firstDecode = Buffer.from(atobDoubleMatch[1], 'base64').toString('utf-8');
            const secondDecode = Buffer.from(firstDecode, 'base64').toString('utf-8');
            if (secondDecode.startsWith('http') && secondDecode !== currentUrl) {
              onLog?.(`Decoded double-base64 redirect, following to next stage...`);
              currentReferer = currentUrl;
              currentUrl = secondDecode;
              continue;
            }
          } catch {}
        }

        // Pattern B: var url = atob('base64') — single-encoded redirect
        const atobSingleMatch = pageHtml.match(/(?:var\s+\w+\s*=\s*)?atob\(\s*['"]([A-Za-z0-9+/=]+)['"]\s*\)/i);
        if (atobSingleMatch && atobSingleMatch[1]) {
          try {
            const decoded = Buffer.from(atobSingleMatch[1], 'base64').toString('utf-8');
            if (decoded.startsWith('http') && decoded !== currentUrl) {
              onLog?.(`Decoded single-base64 redirect, following to next stage...`);
              currentReferer = currentUrl;
              currentUrl = decoded;
              continue;
            }
          } catch {}
        }

        // Pattern C: Direct token redirect in URL params
        const directToken = pageHtml.match(/[?&]token=([A-Za-z0-9+/=_-]+)/i);
        if (directToken) {
          const nextTokenUrl = `${currentUrl.split('?')[0]}?token=${directToken[1]}`;
          if (nextTokenUrl !== currentUrl) {
            currentReferer = currentUrl;
            currentUrl = nextTokenUrl;
            continue;
          }
        }

        // Pattern D: Meta refresh redirect
        const metaRefresh = pageHtml.match(/<meta\s+http-equiv=["']refresh["']\s+content=["']\d+;\s*url=(https?:\/\/[^"']+)["']/i);
        if (metaRefresh && metaRefresh[1] !== currentUrl) {
          onLog?.(`Following meta-refresh redirect...`);
          currentReferer = currentUrl;
          currentUrl = metaRefresh[1];
          continue;
        }

        // If no streams and no redirect found on this stage, stop and probe next candidate
        onLog?.(`No streams or redirects found at stage ${depth}, trying next candidate...`);
        break;
      }
    } catch (err: any) {
      onLog?.(`Mirror ${candidate.split('?')[0]} probe failed: ${err.message || err}, checking alternate candidate...`);
    }
  }

  return { streams: [], fileName: 'Media.Download.mkv' };
}

