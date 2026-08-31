export interface EpisodeOption {
  episodeNumber: number;
  title: string;
  generatorUrl: string; // primary URL (V-Cloud prioritized)
  mirrors?: string[];   // all alternative mirrors: [vcloud, vcloud2, hubcloud, gdirect]
}

export interface QualityOption {
  id: string;            // unique identifier (e.g. generatorUrl)
  quality: string;       // resolution tag e.g. "1080p", "720p", "480p", "2160p 4K"
  season?: string;       // e.g. "Season 1", "Season 2"
  label: string;         // full descriptive label e.g. "Season 2 1080p WEB-DL [2GB/E]"
  size?: string;         // e.g. "2GB/E", "11.2GB", "1GB"
  format?: string;       // e.g. "WEB-DL x264", "HEVC 10bit"
  generatorUrl: string;  // primary link to nexdrive / fastdl generator (V-Cloud prioritized)
  mirrors?: string[];    // all alternative generator mirrors
  type: 'movie' | 'episode_list' | 'batch_zip';
  episodes?: EpisodeOption[];
}

export interface MovieSearchResult {
  title: string;
  url: string;
  poster?: string;
  description?: string;
  year?: string;
  source?: 'Vega' | 'Rog';
  isSeries?: boolean;
  qualities?: string[];
}

export interface DirectStream {
  name: string;          // e.g. "Cloudflare R2 Direct S3 Stream", "Server 1 Worker"
  url: string;
  type: 's3' | 'worker' | 'hubcloud' | 'direct';
  speed: string;         // e.g. "Ultra Fast (10 Gbps)", "High Speed CDN"
  recommended?: boolean;
}

export interface PipelineStep {
  id: string;
  label: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  details?: string;
}

export interface PipelineLog {
  id: string;
  timestamp: string;
  stage: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ResolveResponseData {
  movie?: MovieSearchResult;
  isSeries?: boolean;
  seasons?: string[];
  selectedSeason?: string;
  availableQualities?: QualityOption[];
  selectedQualityId?: string;
  selectedQuality?: string;
  selectedQualityLabel?: string;
  episodes?: EpisodeOption[];
  selectedEpisodeNumber?: number;
  downloadMode?: 'episode' | 'batch';
  streams?: DirectStream[];
  fileName?: string;
  fileSize?: string;
}
