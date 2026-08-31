# Drift — Zero-Ad Movie & TV Series Downloader

Drift is a Next.js web application that searches and extracts direct signed Cloudflare R2 S3 video streams from media portals (VegaMovies & RogMovies) with zero ads, zero popunders, and zero redirects.

## Features

- **Multi-Portal Parallel Search**: Queries multiple sources simultaneously with ranking.
- **Movies & Web Series Support**:
  - Full season & episode navigation.
  - Multi-resolution episode downloads (`4K`, `1080p`, `720p`, `480p`).
  - Full Season Batch Zip archive downloads.
- **V-Cloud Direct S3 Prioritization**: Automatically prioritizes high-speed, direct resumable streams.
- **Real-Time Live Streaming Console**: SSE-powered pipeline logs and terminal steps.
- **100% Ad-Free**: Decodes session tokens client/server side, skipping all interstitial countdowns and shortlinks.

## Getting Started

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Deploying on Vercel

1. Push this repository to your GitHub account (`sam-eer31/free_movie_downloader`).
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** > **"Project"**.
3. Import your `free_movie_downloader` repository.
4. Keep the default settings (Framework: **Next.js**, Root Directory: `./`).
5. Click **"Deploy"**.
