import type { Club, MatchResult, SetResult } from '../types';

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const META_EXPONENT: Record<string, number> = {
  A: 2.5, B: 2.75, C: 3, D: 3.25, E: 3.5, F: 3.75, G: 4,
};

function metaExponent(meta: string[]): number {
  if (meta.length === 0) return 2;
  const sum = meta.reduce((s, m) => s + (META_EXPONENT[m] ?? 2), 0);
  return sum / meta.length;
}

function powerWin(pA: number, pB: number, exp: number): boolean {
  const pAn = Math.pow(pA, exp);
  const pBn = Math.pow(pB, exp);
  return Math.random() < pAn / (pAn + pBn);
}

function simulateSet(clubA: Club, clubB: Club, meta: string[]): SetResult {
  const exp = metaExponent(meta);

  const metaHit = (c: Club) =>
    c.preferred_combos.some(co => meta.includes(co));

  const effDRF = (c: Club) =>
    clamp(c.stats.DRF + (metaHit(c) ? 10 : -5), 20, 100);

  let baseA = effDRF(clubA) * 1.5 + rand(1, 5);
  let baseB = effDRF(clubB) * 1.5 + rand(1, 5);
  let momA = 0, momB = 0;

  // Phase 1: Early (LAN + MEC)
  const macWinner = clubA.stats.MAC > clubB.stats.MAC ? 'A' : 'B';
  const earlyFights = (macWinner === 'A' && baseA > baseB) ||
    (macWinner === 'B' && baseB > baseA) ? 2 : 1;

  for (let i = 0; i < earlyFights; i++) {
    const pwA = baseA + clubA.stats.LAN + clubA.stats.MEC + rand(1, 50);
    const pwB = baseB + clubB.stats.LAN + clubB.stats.MEC + rand(1, 50);
    const reward = rand(2, 3);
    if (powerWin(pwA, pwB, exp)) { momA += reward; baseA += reward; }
    else { momB += reward; baseB += reward; }
  }

  // Phase 2: Mid (TMF + MEC)
  const midFights = rand(2, 4);
  for (let i = 0; i < midFights; i++) {
    if (Math.abs(momA - momB) >= 10) break;
    const pwA = baseA + clubA.stats.TMF + clubA.stats.MEC + rand(1, 50);
    const pwB = baseB + clubB.stats.TMF + clubB.stats.MEC + rand(1, 50);
    const reward = rand(1, 2);
    if (powerWin(pwA, pwB, exp)) { momA += reward; baseA += reward; }
    else { momB += reward; baseB += reward; }
  }

  // Phase 3: Late (MAC + MEC)
  const lateFights = rand(2, 3);
  for (let i = 0; i < lateFights; i++) {
    const diff = Math.abs(momA - momB);
    if (diff >= 7 || momA >= 15 || momB >= 15) break;
    const pwA = baseA + clubA.stats.MAC + clubA.stats.MEC + rand(1, 50);
    const pwB = baseB + clubB.stats.MAC + clubB.stats.MEC + rand(1, 50);
    const reward = rand(1, 2);
    if (powerWin(pwA, pwB, exp)) { momA += reward; baseA += reward; }
    else { momB += reward; baseB += reward; }
  }

  return { momA, momB };
}

export function simulateMatch(
  clubA: Club,
  clubB: Club,
  meta: string[],
  winsNeeded = 2,
  kMultiplier = 1,
): MatchResult {
  const pA = 1 / (1 + Math.pow(10, (clubB.elo_rating - clubA.elo_rating) / 400));
  const pB = 1 - pA;
  const oddsA = Math.max(1.01, 0.95 / pA);
  const oddsB = Math.max(1.01, 0.95 / pB);

  let scoreA = 0, scoreB = 0;
  const sets: SetResult[] = [];

  while (scoreA < winsNeeded && scoreB < winsNeeded) {
    const s = simulateSet(clubA, clubB, meta);
    sets.push(s);
    if (s.momA > s.momB) scoreA++;
    else scoreB++;
  }

  const result = scoreA > scoreB ? 1 : 0;
  const K = 32 * kMultiplier;
  const eloChange = Math.round(K * (result - pA));

  return {
    teamA: clubA.id,
    teamB: clubB.id,
    scoreA,
    scoreB,
    sets,
    oddsA: Math.round(oddsA * 100) / 100,
    oddsB: Math.round(oddsB * 100) / 100,
    meta,
    eloChangeA: eloChange,
  };
}
