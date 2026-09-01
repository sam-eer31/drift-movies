import { DirectStream } from '@/types';

/**
 * Extract all direct stream download links from an HTML page.
 * Supports Cloudflare R2 (both r2.dev and r2.cloudflarestorage.com),
 * PixelDrain, Gofile, HubCloud GPDL, and Cloudflare Workers.
 */
export function extractStreamsFromHtml(
  pageHtml: string,
  onLog?: (msg: string) => void
): DirectStream[] {
  const streams: DirectStream[] = [];

  // 1. Extract Cloudflare R2 Direct Link (FSL Server) — matches both r2.dev and r2.cloudflarestorage.com
  const r2Match = pageHtml.match(/href=["'](https?:\/\/[a-zA-Z0-9.-]+\.r2\.dev\/[^"']+)["']/i) ||
                  pageHtml.match(/href=["'](https?:\/\/[a-zA-Z0-9.-]+\.r2\.cloudflarestorage\.com\/[^"']+)["']/i) ||
                  pageHtml.match(/href=["'](https?:\/\/[^"']*X-Amz-Signature=[^"']+)["']/i);

  if (r2Match) {
    streams.push({
      name: 'Cloudflare R2 Direct Stream (FSL Server)',
      url: r2Match[1].replace(/&amp;/g, '&'),
      type: 's3',
      speed: 'Ultra Fast (10 Gbps)',
      recommended: true
    });
    onLog?.(`Extracted FSL Cloudflare R2 direct stream URL`);
  }

  // 2. Extract PixelDrain Server
  const pixelMatch = pageHtml.match(/href=["'](https?:\/\/pixeldrain\.dev\/u\/[^"']+)["']/i) ||
                     pageHtml.match(/href=["'](https?:\/\/pixeldrain\.com\/u\/[^"']+)["']/i);
  if (pixelMatch) {
    streams.push({
      name: 'PixelDrain Server',
      url: pixelMatch[1].replace(/&amp;/g, '&'),
      type: 'direct',
      speed: 'High Speed CDN',
      recommended: streams.length === 0
    });
    onLog?.(`Extracted PixelDrain stream URL`);
  }

  // 3. Extract Gofile Server
  const gofileMatch = pageHtml.match(/href=["'](https?:\/\/gofile\.io\/d\/[^"']+)["']/i);
  if (gofileMatch) {
    streams.push({
      name: 'Gofile Server',
      url: gofileMatch[1].replace(/&amp;/g, '&'),
      type: 'direct',
      speed: 'Fast Server',
      recommended: streams.length === 0
    });
    onLog?.(`Extracted Gofile stream URL`);
  }

  // 4. Extract HubCloud GPDL 10Gbps Server
  const gpdlMatch = pageHtml.match(/href=["'](https?:\/\/gpdl[0-9]*\.hubcloud\.[a-z]+\/[^"']+)["']/i);
  if (gpdlMatch) {
    streams.push({
      name: 'HubCloud 10Gbps Server',
      url: gpdlMatch[1].replace(/&amp;/g, '&'),
      type: 'hubcloud',
      speed: '10 Gbps (No Resume)',
      recommended: streams.length === 0
    });
    onLog?.(`Extracted HubCloud GPDL 10Gbps stream URL`);
  }

  // 5. Extract Cloudflare Worker Stream (Server 1)
  const workerMatch = pageHtml.match(/(?:href=["']|var url\s*=\s*['"])(https?:\/\/[a-zA-Z0-9.-]+\.workers\.dev\/[^"']+)["']/i);
  if (workerMatch) {
    streams.push({
      name: 'Cloudflare CDN Worker (Server 1)',
      url: workerMatch[1].replace(/&amp;/g, '&'),
      type: 'worker',
      speed: 'High Speed CDN',
      recommended: streams.length === 0
    });
    onLog?.(`Extracted Cloudflare Worker reverse-proxy stream`);
  }

  // 6. Fallback: Extract other direct download buttons (media file extensions in URL)
  const anyDlMatch = pageHtml.match(/href=["'](https?:\/\/(?:hubcloud|vcloud|stream)[^"']*\.(?:mkv|mp4|zip|rar)[^"']*)["']/i);
  if (anyDlMatch && !streams.some(s => s.url === anyDlMatch[1])) {
    streams.push({
      name: 'Direct Media Stream',
      url: anyDlMatch[1].replace(/&amp;/g, '&'),
      type: 'direct',
      speed: 'Direct Fast Link'
    });
  }

  return streams;
}
