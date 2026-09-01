/**
 * Central Resolver Gateway
 * 
 * Modular architecture:
 * - HTTP & Proxy Layer: @/lib/http/client
 * - Search Relevance & Matching: @/lib/search/matcher
 * - Movie Portal Providers (Vega & Rog): @/lib/providers
 * - Movie Quality & Episode Parsers: @/lib/parsers
 * - Direct Stream Extractors & Multi-Stage Decoders: @/lib/extractors
 */

// HTTP
export * from './http/client';

// Search & Matching
export * from './search/matcher';

// Providers (Vega, Rog, and future sources)
export * from './providers';

// Parsers (Qualities & Episodes)
export * from './parsers/qualities';
export * from './parsers/episodes';

// Extractors (Direct Streams & Multi-Stage Crawler)
export * from './extractors/streams';
export * from './extractors/direct-resolver';
