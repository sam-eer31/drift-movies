'use client';

import React, { useState } from 'react';
import { Search, Sparkles, ArrowRight } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}



export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };



  return (
    <div className="w-full" style={{ maxWidth: '820px', margin: '0 auto' }}>
      <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
        <div className="search-container flex items-center justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="Logo" style={{ width: '22px', height: '22px', objectFit: 'contain', opacity: 0.8 }} className="flex-shrink-0" />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any movie title (e.g. Avengers, Interstellar, Dune)..."
            disabled={isLoading}
            autoFocus
            className="input-field"
          />

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="btn-primary flex-shrink-0 search-btn-icon"
            aria-label="Search"
          >
            {isLoading ? (
              <span className="pulse-dot" style={{ backgroundColor: '#111318' }}></span>
            ) : (
              <Search size={18} />
            )}
          </button>
        </div>


      </form>

      <style jsx>{`
        .flex-shrink-0 { flex-shrink: 0; }
        
        .search-btn-icon {
          width: 40px;
          height: 40px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
        }


      `}</style>
    </div>
  );
};
