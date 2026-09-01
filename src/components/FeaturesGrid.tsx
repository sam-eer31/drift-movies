import React from 'react';
import { Tv, Shield, Zap } from 'lucide-react';

export const FeaturesGrid: React.FC = () => {
  return (
    <section className="features-grid">
      <div className="panel p-6 feature-card">
        <div className="feature-icon bg-primary-subtle text-primary">
          <Tv size={22} />
        </div>
        <h4 className="feature-title">
          Full Web Series & Episodes
        </h4>
        <p className="feature-desc">
          Browse seasons, download individual episodes in 1 click, or grab full season batch zip archives.
        </p>
      </div>

      <div className="panel p-6 feature-card">
        <div className="feature-icon bg-success-subtle text-success">
          <Shield size={22} />
        </div>
        <h4 className="feature-title">
          100% Ad & Popunder Free
        </h4>
        <p className="feature-desc">
          Extracts the underlying signed Cloudflare R2 S3 stream directly, skipping all ad redirects and fake download buttons.
        </p>
      </div>

      <div className="panel p-6 feature-card">
        <div className="feature-icon bg-warning-subtle text-warning">
          <Zap size={22} />
        </div>
        <h4 className="feature-title">
          Multi-Portal Parallel Search
        </h4>
        <p className="feature-desc">
          Queries VegaMovies & RogMovies concurrently to find any Hollywood, Bollywood, or regional series.
        </p>
      </div>
    </section>
  );
};
