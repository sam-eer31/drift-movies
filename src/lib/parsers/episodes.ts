import { EpisodeOption } from '@/types';
import { fetchWithHeaders } from '@/lib/http/client';
import { getMirrorPriority } from './qualities';

/**
 * Extract Episode list from a Web Series generator page (Prioritizing V-Cloud with Multi-Mirror Array)
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
