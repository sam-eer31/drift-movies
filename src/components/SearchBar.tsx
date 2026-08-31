'use client';

import React, { useState } from 'react';
import { Search, Sparkles, ArrowRight } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const QUICK_SUGGESTIONS = [
  'The Avengers',
  'Avengers: Endgame',
  'Interstellar',
  'Oppenheimer',
  'Deadpool',
  'Spider-Man',
  'Inception'
];

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (name: string) => {
    setQuery(name);
    onSearch(name);
  };

  return (
    <div className="w-full" style={{ maxWidth: '820px', margin: '0 auto' }}>
      <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
        <div className="search-container flex items-center justify-between gap-3">
          <Search size={22} className="text-muted flex-shrink-0" />
          
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

        {/* Quick Suggestions */}
        <div className="flex items-center justify-center flex-wrap gap-2 mt-4">
          <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
            <span style={{ fontSize: '1rem' }}>☆</span>
            <span>Popular:</span>
          </div>

          {QUICK_SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSuggestionClick(item)}
              className="suggestion-pill"
            >
              {item}
            </button>
          ))}
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

        .suggestion-pill {
          background-color: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 500;
          border-radius: var(--radius-full);
          padding: 6px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .suggestion-pill:hover {
          border-color: var(--primary);
          color: var(--primary);
          background-color: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};
