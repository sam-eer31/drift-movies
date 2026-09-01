export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function fetchWithHeaders(
  url: string,
  referer?: string,
  accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  useZenRows = false,
  zenRowsOptions: { jsRender?: boolean; antibot?: boolean } = { jsRender: true, antibot: true },
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
