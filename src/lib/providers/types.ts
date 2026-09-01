import { MovieSearchResult } from '@/types';

export interface MovieProvider {
  name: 'Vega' | 'Rog';
  candidateMirrors: string[];
  resolveActiveMirror(): Promise<string>;
  search(activeDomain: string, query: string): Promise<MovieSearchResult[]>;
}
