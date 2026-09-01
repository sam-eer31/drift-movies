import { DirectStream } from '@/types';
import { fetchWithHeaders } from '@/lib/http/client';
import { getMirrorPriority } from '@/lib/parsers/qualities';
import { extractStreamsFromHtml } from './streams';

/**
 * Resolve generator page / candidate mirrors -> Recursive Multi-Stage Token Decoder -> Direct S3 / Worker Streams
 */
export async function resolveDirectStreams(
  generatorUrlOrCandidates: string | string[],
  onLog?: (msg: string) => void
): Promise<{ streams: DirectStream[]; fileName?: string; fileSize?: string; error?: string }> {
  const candidateList = Array.isArray(generatorUrlOrCandidates)
    ? generatorUrlOrCandidates
    : [generatorUrlOrCandidates];

  // Prioritize V-Cloud candidate first
  candidateList.sort((a, b) => getMirrorPriority(a) - getMirrorPriority(b));

  let lastError = '';
  for (const candidate of candidateList) {
    let candidateAttempt = 0;
    const maxCandidateAttempts = 2;

    while (candidateAttempt < maxCandidateAttempts) {
      candidateAttempt++;
      try {
        onLog?.(`Connecting to link mirror: ${candidate.split('?')[0]}${candidateAttempt > 1 ? ` (Retry ${candidateAttempt})` : ''}...`);
        let currentUrl = candidate;
        let currentReferer = candidate;

        // nexdrive/fastdl generator pages need ZenRows (Cloudflare protected)
        if (candidate.includes('nexdrive') || candidate.includes('fastdl')) {
          const genHtml = await fetchWithHeaders(candidate, undefined, undefined, true);

          if (genHtml.includes('File is Deleted') || genHtml.includes('UnAvailable') || genHtml.includes('Something went wrong')) {
            onLog?.(`Mirror ${candidate} indicates file unavailable, testing next mirror...`);
            break;
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

          // CRITICAL FIX: vcloud.fit and hubcloud pages NEED ZenRows to bypass Vercel datacenter IP bans.
          // BUT they must NOT use js_render or antibot: true, otherwise ZenRows headless browser strips/navigates away
          // from the inline JavaScript/atob data.
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

          // Extract streams using dedicated stream extractors
          streams = extractStreamsFromHtml(pageHtml, onLog);

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
                await new Promise(r => setTimeout(r, 1500)); // Delay to avoid anti-bot
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
                await new Promise(r => setTimeout(r, 1500)); // Delay to avoid anti-bot
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
        lastError = err.message || err;
        if (candidateAttempt < maxCandidateAttempts) {
          onLog?.(`Transient proxy issue encountered: ${lastError}. Retrying with fresh session token...`);
          await new Promise(r => setTimeout(r, 1000));
        } else {
          onLog?.(`Mirror ${candidate.split('?')[0]} probe failed: ${lastError}, checking alternate candidate...`);
        }
      }
    }
  }

  return { streams: [], fileName: 'Media.Download.mkv', error: lastError };
}
