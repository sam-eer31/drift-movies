import { NextRequest } from 'next/server';
import {
  resolveAllMirrors,
  searchAllPortals,
  getMovieQualities,
  extractEpisodesFromGenerator,
  resolveDirectStreams
} from '@/lib/resolver';
import { DirectStream } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const movieUrl = searchParams.get('movieUrl') || '';
  const generatorUrl = searchParams.get('generatorUrl') || '';
  const qualityLabel = searchParams.get('qualityLabel') || '';
  const isBatchParam = searchParams.get('isBatch') === 'true';
  const episodeUrl = searchParams.get('episodeUrl') || '';
  const episodeNumber = searchParams.get('episodeNumber') ? parseInt(searchParams.get('episodeNumber')!) : undefined;

  if (!query && !movieUrl && !generatorUrl && !episodeUrl) {
    return new Response(JSON.stringify({ error: 'Missing query or movieUrl' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventType: string, data: Record<string, any>) => {
        const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const sendLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', stage = 'Pipeline') => {
        sendEvent('log', {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          stage,
          message,
          type
        });
      };

      try {
        // Mode A: Episode Switch (resolving a specific episode's S3 stream with V-Cloud priority)
        if (episodeUrl) {
          sendEvent('step', { id: 'generator', status: 'running', label: `Resolving Episode ${episodeNumber || ''}` });
          sendLog(`Resolving Episode ${episodeNumber || ''} (checking V-Cloud & alternate mirrors)...`, 'info', 'Episode Extractor');

          let { streams, fileName, error } = await resolveDirectStreams(episodeUrl, (msg) => {
            sendLog(msg, 'info', 'Token Extractor');
          });

          if (!streams || streams.length === 0) {
            const errMsg = error ? `Extraction failed: ${error}` : 'Direct stream extraction failed or timed out. Please try a different package or try again.';
            sendLog(errMsg, 'error', 'Token Extractor');
            sendEvent('error', { message: errMsg });
            controller.close();
            return;
          }

          sendEvent('step', { id: 'generator', status: 'completed', label: `Episode ${episodeNumber || ''} Resolved` });
          sendEvent('episode_stream_resolved', {
            episodeUrl,
            episodeNumber,
            streams,
            fileName: fileName || `Episode_${episodeNumber || '1'}.mkv`
          });
          controller.close();
          return;
        }

        // Mode B: Package Switch (resolving a new quality package or batch zip with V-Cloud priority)
        if (generatorUrl) {
          sendEvent('step', { id: 'generator', status: 'running', label: 'Resolving Package Stream' });
          sendLog(`Switching package to ${qualityLabel || generatorUrl} (checking V-Cloud & mirrors)...`, 'info', 'Stream Switcher');

          const isBatch = isBatchParam || /batch|zip|complete/i.test(qualityLabel);
          let episodesList: any[] = [];
          let targetStreamUrls: string[] = [generatorUrl];

          if (!isBatch) {
            try {
              const eps = await extractEpisodesFromGenerator(generatorUrl, (msg) => {
                sendLog(msg, 'info', 'Episode Parser');
              });
              if (eps.length > 0) {
                episodesList = eps;
                targetStreamUrls = eps[0].mirrors && eps[0].mirrors.length > 0 ? eps[0].mirrors : [eps[0].generatorUrl];
                sendLog(`Loaded ${eps.length} episodes with V-Cloud prioritized for Episode 1`, 'info', 'Episode Parser');
              }
            } catch {}
          }

          let { streams, fileName, error } = await resolveDirectStreams(targetStreamUrls, (msg) => {
            sendLog(msg, 'info', 'Token Extractor');
          });

          if (!streams || streams.length === 0) {
            const errMsg = error ? `Extraction failed: ${error}` : 'Direct stream extraction failed or timed out. Please try a different package or try again.';
            sendLog(errMsg, 'error', 'Token Extractor');
            sendEvent('error', { message: errMsg });
            controller.close();
            return;
          }

          sendEvent('step', { id: 'generator', status: 'completed', label: 'Stream Resolved' });
          sendEvent('quality_stream_resolved', {
            generatorUrl,
            streams,
            fileName,
            qualityLabel,
            isBatch,
            episodes: episodesList.length > 0 ? episodesList : undefined,
            selectedEpisodeNumber: episodesList.length > 0 ? 1 : undefined
          });
          controller.close();
          return;
        }

        // Mode C: Full Pipeline (Search query or Movie/Series URL)
        sendEvent('step', { id: 'gateway', status: 'running', label: 'Resolving Gateways (Vega + Rog)' });
        sendLog(`Starting multi-portal pipeline for "${query || movieUrl}"`, 'info', 'Init');

        const mirrors = await resolveAllMirrors((msg) => {
          sendLog(msg, 'info', 'Gateway Discovery');
        });
        sendEvent('step', {
          id: 'gateway',
          status: 'completed',
          label: `Mirrors: Vega & Rog Active`
        });

        let targetMovieUrl = movieUrl;
        let targetMovieTitle = query;
        let moviePoster: string | undefined;
        let movieSource: 'Vega' | 'Rog' | undefined;

        // Step 2: Search catalog if no direct movieUrl
        if (!targetMovieUrl) {
          sendEvent('step', { id: 'search', status: 'running', label: 'Parallel Catalog Search' });
          const searchHits = await searchAllPortals(mirrors, query, (msg) => {
            sendLog(msg, 'info', 'Multi-Search');
          });

          if (searchHits.length === 0) {
            sendLog(`No movies or series found matching "${query}"`, 'error', 'Multi-Search');
            sendEvent('error', { message: `No movies or series found matching "${query}".` });
            controller.close();
            return;
          }

          const primaryMatch = searchHits[0];
          targetMovieUrl = primaryMatch.url;
          targetMovieTitle = primaryMatch.title;
          moviePoster = primaryMatch.poster;
          movieSource = primaryMatch.source;

          sendEvent('search_results', {
            results: searchHits,
            selected: primaryMatch
          });

          sendEvent('step', {
            id: 'search',
            status: 'completed',
            label: `Matched [${primaryMatch.source || 'Portal'}]: ${primaryMatch.title.slice(0, 26)}...`
          });
        }

        // Step 3: Extract all available qualities, seasons & episodes (V-Cloud prioritized)
        sendEvent('step', { id: 'quality', status: 'running', label: 'Extracting Seasons & Quality Packages' });
        const { qualities, isSeries, seasons } = await getMovieQualities(targetMovieUrl, (msg) => {
          sendLog(msg, 'info', 'Quality Parser');
        });

        if (qualities.length === 0) {
          sendLog(`No quality packages identified on details page`, 'error', 'Quality Parser');
          sendEvent('error', { message: 'No download links found on the page.' });
          controller.close();
          return;
        }

        sendEvent('qualities', { qualities, isSeries, seasons });

        sendEvent('step', {
          id: 'quality',
          status: 'completed',
          label: isSeries
            ? `Identified Series: ${seasons.length || 1} Season(s), ${qualities.length} Packages`
            : `Available: ${qualities.length} Quality Packages`
        });

        // Step 4: Set up default package and fetch episodes if needed (DO NOT EXTRACT STREAM YET)
        sendEvent('step', { id: 'stream', status: 'completed', label: 'Ready: Select Package & Extract' });
        sendLog(`Media details fetched! Ready to extract direct stream.`, 'success', 'Finished');

        let activeQuality = qualities[0];
        let episodes: any[] = [];
        let resolvedFileName = `${targetMovieTitle}.mkv`;

        if (isSeries && activeQuality.type === 'episode_list') {
          episodes = await extractEpisodesFromGenerator(activeQuality.generatorUrl, (msg) => {
            sendLog(msg, 'info', 'Episode Parser');
          });
        }

        sendEvent('complete', {
          movie: {
            title: targetMovieTitle,
            url: targetMovieUrl,
            poster: moviePoster,
            source: movieSource,
            isSeries
          },
          isSeries,
          seasons,
          selectedSeason: activeQuality.season || seasons[0] || 'Season 1',
          availableQualities: qualities,
          selectedQualityId: activeQuality.id,
          selectedQuality: activeQuality.quality,
          selectedQualityLabel: activeQuality.label,
          episodes: episodes.length > 0 ? episodes : undefined,
          selectedEpisodeNumber: episodes.length > 0 ? 1 : undefined,
          downloadMode: activeQuality.type === 'batch_zip' ? 'batch' : 'episode',
          fileSize: activeQuality.size,
          fileName: resolvedFileName,
          streams: []
        });

        controller.close();
      } catch (err: any) {
        sendLog(`Error in pipeline: ${err.message || err}`, 'error', 'Error');
        sendEvent('error', { message: err.message || 'An error occurred while resolving.' });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}
