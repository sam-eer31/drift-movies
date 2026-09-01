import { QualityOption } from '@/types';
import { fetchWithHeaders } from '@/lib/http/client';

/**
 * Priority Ranker for Mirrors: V-Cloud is #1, then HubCloud, then G-Direct/FastDL
 */
export function getMirrorPriority(btnTextOrUrl: string): number {
  const t = btnTextOrUrl.toLowerCase();
  if (t.includes('vcloud') || t.includes('v-cloud')) return 1;
  if (t.includes('hubcloud')) return 2;
  if (t.includes('fastdl') || t.includes('g-direct')) return 3;
  if (t.includes('nexdrive')) return 4;
  return 5;
}

/**
 * Extract all available qualities, seasons, and episode packages (Prioritizing V-Cloud mirrors across dual buttons)
 */
export async function getMovieQualities(
  movieUrl: string,
  onLog?: (msg: string) => void
): Promise<{ qualities: QualityOption[]; isSeries: boolean; seasons: string[] }> {
  onLog?.(`Fetching all available quality packages & seasons from details page...`);
  let html = '';
  try {
    html = await fetchWithHeaders(movieUrl, undefined, undefined, false);
    if (!html || html.length < 500) throw new Error('Short response');
  } catch {
    // If direct fetch fails (e.g. Cloudflare datacenter IP block on Vercel), fallback to ZenRows
    html = await fetchWithHeaders(movieUrl, undefined, undefined, true, { jsRender: false, antibot: false });
  }

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

    let cleanWithBraces = targetHeading.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
    const sizeMatch = cleanWithBraces.match(/\[(\d+(?:\.\d+)?\s*(?:MB|GB)(?:\/E)?)\]/i) ||
                      btnText.match(/\[(\d+(?:\.\d+)?\s*(?:MB|GB)(?:\/E)?)\]/i) ||
                      cleanWithBraces.match(/(\d+(?:\.\d+)?\s*(?:MB|GB))/i);
    const size = sizeMatch ? sizeMatch[1] : undefined;

    // Format Detection (Dynamic Tag Extraction)
    let format = '';
    let stringWithoutSize = cleanWithBraces;
    if (sizeMatch && sizeMatch[0]) {
      stringWithoutSize = stringWithoutSize.replace(sizeMatch[0], '').trim();
    }

    let resMatch = stringWithoutSize.match(/\b(2160p|4k|uhd|1080p|720p|480p)\b/i);
    if (resMatch) {
      const beforeRes = stringWithoutSize.slice(0, resMatch.index);
      const afterRes = stringWithoutSize.slice((resMatch.index || 0) + resMatch[0].length);
      
      let videoFormat = afterRes.replace(/[\{\}\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
      
      const tags: string[] = [];
      const tagRegex = /(?:\[([^\]]+)\]|\{([^}]+)\}|\((?!\d{4}\))([^)]+)\))/g;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(beforeRes)) !== null) {
        const tagContent = tagMatch[1] || tagMatch[2] || tagMatch[3];
        if (tagContent) tags.push(tagContent.trim());
      }
      
      const allTags = [...tags, videoFormat].filter(Boolean);
      format = allTags.join(' • ');
    } else {
      const formatMatches = Array.from(cleanWithBraces.matchAll(/\b(BluRay|WEB-DL|HDRip|WEBRip|HEVC|HRVC|x264|x265|60fps|60FPS|10bit|HDR|BDRip|Remux|iMAX)\b/gi)).map(f => f[1]);
      format = Array.from(new Set(formatMatches)).join(' ');
    }

    const isPerEp = (size && size.toUpperCase().includes('/E')) || clean.toUpperCase().includes('/E') || /episode/i.test(btnText);
    const isExplicitBatch = /batch|zip|complete/i.test(btnText) || /full season/i.test(clean);
    const isEpisodePackage = isSeries ? (isPerEp && !isExplicitBatch) : false;

    // Group buttons that share the same Season, Quality, Format and Size under the same package key
    const groupKey = isSeries
      ? (isEpisodePackage ? `${season}_${quality}_${format}_${size || 'ep'}` : `${season}_${quality}_${format}_${size || 'batch'}`)
      : `${quality}_${format}_${size || 'single'}`;

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
