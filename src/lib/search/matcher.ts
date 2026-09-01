export const STOPWORDS = new Set([
  'the', 'a', 'an', 'movie', 'full', 'download', 'in', 'of', 'and', 'all',
  'org', 'part', 'official', 'series', 'season', 'hindi', 'english', 'dual', 'audio'
]);

export const ACRONYMS: Record<string, string[]> = {
  kgf: ['k g f', 'k.g.f', 'kgf'],
  rrr: ['r r r', 'r.r.r', 'rrr'],
  ddlj: ['dilwale dulhania le jayenge', 'ddlj'],
  yjhd: ['yeh jawaani hai deewani', 'yjhd'],
  got: ['game of thrones', 'got'],
  lotr: ['lord of the rings', 'lotr'],
  k3g: ['kabhi khushi kabhie gham', 'k3g'],
  mcu: ['marvel', 'avengers', 'mcu'],
  ff: ['fast and furious', 'fast furious', 'fast & furious']
};

export function areTokensEquivalent(qTok: string, tTok: string, allowPrefix = true): boolean {
  if (qTok === tTok) return true;

  if (tTok === `${qTok}s` || qTok === `${tTok}s` || tTok === `${qTok}es` || qTok === `${tTok}es`) return true;

  const qNorm = qTok.replace(/([aeiou])\1+/g, '$1');
  const tNorm = tTok.replace(/([aeiou])\1+/g, '$1');
  if (qNorm === tNorm && qNorm.length >= 3) return true;

  if (allowPrefix && qTok.length >= 3) {
    if (tTok.startsWith(qTok) || tNorm.startsWith(qNorm)) {
      if (qTok === 'stree' && tTok.startsWith('street')) return false;
      return true;
    }
  }

  if (qTok.length >= 4 && (qTok.includes(tTok) || tTok.includes(qTok))) {
    return true;
  }

  return false;
}

export function cleanMovieTitle(rawTitle: string): string {
  let t = rawTitle;
  t = t.replace(/^download\s+/i, '');
  t = t.replace(/\{[^}]+\}/g, ' ');
  t = t.replace(/\[[^\]]+\]/g, ' ');
  t = t.replace(/\((?:19\d\d|20\d\d)\)/g, ' ');
  t = t.replace(/\b(?:480p|720p|1080p|2160p|4k|uhd|bluray|web-dl|webrip|hdrip|dual audio|hindi dubbed|full movie|season \d+)\b.*/i, ' ');
  t = t.replace(/[-–:|].*/, ' ');
  t = t.replace(/[^a-zA-Z0-9\s]/g, ' ');
  return t.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function evaluateMovieRelevance(query: string, rawTitle: string): { isRelevant: boolean; score: number } {
  const qRaw = query.trim().toLowerCase();

  for (const [acr, aliases] of Object.entries(ACRONYMS)) {
    if (qRaw.startsWith(acr)) {
      for (const alias of aliases) {
        if (rawTitle.toLowerCase().includes(alias)) {
          return { isRelevant: true, score: 1000 };
        }
      }
    }
  }

  const qClean = query.replace(/[^a-zA-Z0-9\s]/g, ' ').toLowerCase();
  const qAllTokens = qClean.split(/\s+/).filter(Boolean);
  const qTokens = qAllTokens.filter(t => !STOPWORDS.has(t));
  const activeQTokens = qTokens.length > 0 ? qTokens : qAllTokens;

  if (activeQTokens.length === 0) {
    return { isRelevant: true, score: 100 };
  }

  const tClean = cleanMovieTitle(rawTitle);
  const tFullClean = rawTitle.replace(/[^a-zA-Z0-9\s]/g, ' ').toLowerCase();
  const tTokens = tClean.split(/\s+/).filter(Boolean);
  const tFullTokens = tFullClean.split(/\s+/).filter(Boolean);

  if (tTokens.length === 0 && tFullTokens.length === 0) {
    return { isRelevant: false, score: 0 };
  }

  let matchedCount = 0;
  for (const qTok of activeQTokens) {
    let matched = false;
    for (const tTok of tFullTokens) {
      if (areTokensEquivalent(qTok, tTok, true)) {
        matched = true;
        break;
      }
    }
    if (matched) matchedCount++;
  }

  if (matchedCount < activeQTokens.length) {
    return { isRelevant: false, score: 0 };
  }

  let score = 0;
  if (tClean === qClean) {
    score += 1000;
  } else if (tClean.startsWith(qClean) || tTokens.some(t => t.startsWith(qClean))) {
    score += 700;
  } else if (tFullClean.includes(qClean)) {
    score += 400;
  } else {
    score += 150;
  }

  if (activeQTokens.some(tok => /^\d+$/.test(tok))) {
    score += 250;
  }

  if (activeQTokens.some(q => q.startsWith('aveng')) && !activeQTokens.includes('grimm') && tFullTokens.includes('grimm')) {
    score -= 500;
  }

  return { isRelevant: true, score };
}
