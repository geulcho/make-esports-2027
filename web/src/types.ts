export interface ClubStats {
  MAC: number;
  DRF: number;
  TMF: number;
  LAN: number;
  MEC: number;
}

export interface Club {
  id: string;
  name: string;
  abbr: string;
  colors: { bg: string; text: string };
  elo_rating: number;
  tier: string;
  stats: ClubStats;
  preferred_combos: string[];
  conference_id: string;
  league_id: string;
  division: string | null;
}

export interface LeagueConfig {
  id: string;
  name: string;
  region: string;
  teamCount: number;
  divisions?: string[];  // division IDs if league uses divisions
}

export interface TeamRecord {
  clubId: string;
  divisionId: string | null;
  elo: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  momFor: number;
  momAgainst: number;
}

export interface SetResult {
  momA: number;
  momB: number;
}

export interface MatchResult {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  sets: SetResult[];
  oddsA: number;
  oddsB: number;
  meta: string[];
  eloChangeA: number;
}

export interface PhaseResult {
  phase: number;
  splitNum: number;
  divisionId: string | null;
  matches: MatchResult[];
}

// Per-division sim state (for leagues that have divisions)
export interface DivisionSim {
  divisionId: string;
  standings: TeamRecord[];
  results: PhaseResult[];
}

// Full-league sim state (for cross-division phases like L_NA second half)
export interface FullLeagueSim {
  standings: TeamRecord[];
  results: PhaseResult[];
}

// ─── Bracket types ────────────────────────────────────────────────────────────

export interface BracketMatch {
  id: string;
  stage: string;
  teamA: string | null;
  teamB: string | null;
  result: MatchResult | null;
  winner: string | null;
}

export interface QualifierState {
  matches: BracketMatch[];
  mmRepresentative: string | null;
  completed: boolean;
}

export type PlayoffStage = 'qf' | 'sf' | 'divfinal' | 'grandfinal' | 'playin' | 'upper' | 'lower' | 'finalq';

export interface PlayoffSeries {
  id: string;
  stage: PlayoffStage;
  division: 'WEST' | 'EAST' | 'DRAGON' | 'PHOENIX' | null;
  teamA: string | null;
  teamB: string | null;
  winsA: number;      // earned wins in this series
  winsB: number;
  winsToAdvance: number; // total wins needed (2 for QF/SF/DivF, 3 for GF)
  startWinsA: number; // initial advantage (1 for QF higher seed)
  matches: MatchResult[];
  winner: string | null;
}

export interface PlayoffState {
  series: PlayoffSeries[];
  champion: string | null;
  completed: boolean;
}

// ─── Season history (for COPA seeding) ───────────────────────────────────────

export interface SeasonHistoryEntry {
  season: number;
  leagueId: string;
  finalStandings: TeamRecord[];
  mmRepresentative: string | null;
  champion: string | null;
}

// ─── League sim state ─────────────────────────────────────────────────────────

export interface LeagueSimState {
  leagueId: string;
  standings: TeamRecord[];     // current display standings
  results: PhaseResult[];      // accumulated results (all phases)
  divisionStates?: Record<string, DivisionSim>;  // per-division (first half)
  fullLeagueState?: FullLeagueSim;               // full-league (second half)
  mmQualifier?: QualifierState;                  // MM qualifier bracket
  playoffs?: PlayoffState;                       // current playoffs bracket
  currentPhase: string;        // 'default'|'first_half'|'qualifier'|'second_half'|'playoffs'|'complete'
                               // L_KR: 'spring'|'spring_playoffs'|'summer'|'summer_playoffs'|'complete'
  // Spring-Summer two-split fields (L_KR and similar leagues)
  springStandings?: TeamRecord[];   // archived spring regular season standings
  springResults?: PhaseResult[];    // archived spring results
  springPlayoffs?: PlayoffState;    // archived spring playoff bracket
  springChampion?: string | null;   // spring split champion
  // L_MEAF circuit fields
  meafSplits?: PlayoffState[];      // archived completed split brackets [0]=split1…[4]=split5
  meafMMQual?: PlayoffState;        // MM qualifier bracket
}

// ─── Regional Cup types ───────────────────────────────────────────────────────

export interface CupMatch {
  id: string;
  teamA: string | null;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  oddsA: number;
  oddsB: number;
}

export interface CupRound {
  stage: string;          // 'r1' | 'r64' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'r1s' | 'r2n' | 'r2s' | 'r2'
  label: string;
  weekNum: number;
  matches: CupMatch[];
  matchesPerSlot: number[];
  slotsCompleted: number;
  slotsTotal: number;
  completed: boolean;
}

export interface CupState {
  cupId: string;                            // 'EGT' | 'COPA' | 'APEX'
  currentStage: string;
  rounds: CupRound[];
  directEntrants: Record<string, string[]>; // stage → team ids (from prev-year standings)
  champion: string | null;
  completed: boolean;
}

// ─── National Team types ──────────────────────────────────────────────────────

export interface NationalTeam {
  id: string;
  name: string;
  abbr: string;
  colors: { bg: string; text: string };
  elo_rating: number;
  tier: string;
  stats: ClubStats;
  preferred_combos: string[];
  region: string;   // 'EU' | 'APAC' | 'AMERICA' | 'MEAF'
}

// ─── Intermatch / WE Qualifier types ──────────────────────────────────────────

export interface NatGroupMatch {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  oddsA: number;
  oddsB: number;
  matchday: number;
}

export interface NatGroupRecord {
  nationId: string;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  momFor: number;
  momAgainst: number;
}

export interface NatGroup {
  id: string;            // 'EU_A' | 'EU_B' | ... | 'APAC_A' | 'NA' | 'SA'
  label: string;
  teams: string[];       // nation IDs
  records: NatGroupRecord[];
  matches: NatGroupMatch[];
  matchdaysCompleted: number;
  matchdaysTotal: number;
  completed: boolean;
}

export interface NatBracketMatch {
  id: string;
  stage: string;
  teamA: string | null;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  oddsA: number;
  oddsB: number;
  format: 'Bo3' | 'Bo5';
}

export interface WEQualRegion {
  regionId: string;      // 'EU' | 'APAC' | 'AMERICA'
  groups: NatGroup[];
  playoffMatches: NatBracketMatch[];
  weQualified: string[];
  iqQualified: string[];
  phase: 'pre' | 'group_p1' | 'group_p2' | 'playoff' | 'completed';
}

export interface MEAFQualState {
  firstQual: NatBracketMatch[];
  secondQual: NatBracketMatch[];
  finalQual: NatBracketMatch[];   // double elimination
  weQualified: string | null;
  iqQualified: string | null;
  phase: 'pre' | 'first' | 'second' | 'final' | 'completed';
}

export interface IQMatch {
  id: string;
  teamA: string | null;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  oddsA: number;
  oddsB: number;
}

export interface SideEventState {
  participants: string[];
  playInMatches: NatBracketMatch[];     // TPC only
  mainMatches: NatBracketMatch[];       // QF/SF/Final
  champion: string | null;
  completed: boolean;
}

export interface WEParticipant {
  nationId: string;
  region: string;
  entryPath: 'direct' | 'iq_wildcard';
  pot: 1 | 2 | 3 | 4;
  w33Elo: number;
  qualRecord: { wins: number; losses: number };
  qualDate: string;
}

export interface WEState {
  participants: WEParticipant[];
  groups: NatGroup[];
  thirdPlaceRanking: NatGroupRecord[];
  advancingThirds: string[];
  thirdPlaceKey: string;
  knockoutMatches: NatBracketMatch[];
  champion: string | null;
  phase: 'pre' | 'groups' | 'draw' | 'r16' | 'qf' | 'sf' | 'final' | 'completed' | string;
  finalRankings: Array<{ nationId: string; rank: number; eloChange: number }>;
}

export interface IntermatchState {
  season: number;
  europe: WEQualRegion;
  asiaPacific: WEQualRegion;
  americas: WEQualRegion;
  meaf: MEAFQualState;
  iq: { matches: IQMatch[]; weQualified: string[]; completed: boolean } | null;
  eec: SideEventState | null;
  tpc: SideEventState | null;
  we: WEState | null;
  rankings: Array<{ nationId: string; elo: number }>;
  nationElos: Record<string, number>;
}

// ─── World Tournaments (WT) types ─────────────────────────────────────────────

export interface WTParticipant {
  clubId: string;
  leagueId: string;
  leagueRank: number;         // league coefficient rank (1-16)
  seedInLeague: number;       // 1, 2, 3 within league (or 0 for special)
  seedTag: string;            // '#1' '#2' '#3' '#M' '#E' '#A' '#C'
  seedPool: number;           // 1-4
  elo: number;                // Elo at WT start
  seasonSetsWon: number;
  seasonSetsLost: number;
  cupResult: string;          // e.g. 'MM Champion', 'APEX SF', 'EGT R16', '-'
  preWTElo: number;           // snapshot for Review tab Elo change
}

export interface WTGroupMatch {
  id: string;
  groupId: string;
  teamA: string;
  teamB: string;
  scoreA: number;             // 0 or 1 (Bo1)
  scoreB: number;
  winner: string | null;
  oddsA: number;
  oddsB: number;
  matchday: number;           // 1-12 within group (DRR)
  globalDay: number;          // 1-14 across the 14-day schedule
}

export interface WTGroupRecord {
  clubId: string;
  wins: number;
  losses: number;
  scoreFor: number;           // Bo1 → wins count as score
  scoreAgainst: number;
}

export interface WTGroup {
  id: string;                 // 'A'..'H'
  teams: string[];            // 4 club IDs
  records: WTGroupRecord[];
  matches: WTGroupMatch[];
  matchdaysCompleted: number; // 0-12
  completed: boolean;
}

export interface WTKnockoutMatch {
  id: string;                 // 'R16_1'..'R16_8', 'QF1'..'QF4', 'SF1','SF2','GF'
  stage: 'R16' | 'QF' | 'SF' | 'GF';
  bracketHalf: 'upper' | 'lower' | null;
  teamA: string | null;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  oddsA: number;
  oddsB: number;
}

export interface WTState {
  season: number;
  leagueCoefficients: Array<{ leagueId: string; rank: number; points: number }>;
  participants: WTParticipant[];
  frozenParticipants: WTParticipant[];  // snapshot at init for Participants/Predictions tabs
  groups: WTGroup[];
  knockoutMatches: WTKnockoutMatch[];
  champion: string | null;
  phase: 'pre' | 'groups_first' | 'groups_second' | 'knockout_r16' | 'knockout_qf' | 'knockout_sf' | 'knockout_gf' | 'completed';
}

// ─── Viktor Sandberg Cup (VSC) types ──────────────────────────────────────────

export interface VSCPathMatch {
  id: string;
  stage: 'SF' | 'Final';
  teamA: string | null;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  oddsA: number;
  oddsB: number;
  format: 'Bo3' | 'Bo5';
}

export interface VSCPath {
  id: string;           // 'EMEA_A'..'EMEA_D', 'APAC_A','APAC_B', 'AMER_A','AMER_B'
  region: string;       // 'EMEA' | 'APAC' | 'AMER'
  teams: string[];      // 4 club IDs
  matches: VSCPathMatch[];
  winner: string | null;
  completed: boolean;
}

export interface VSCKnockoutMatch {
  id: string;
  stage: 'R16' | 'QF' | 'SF' | 'GF';
  teamA: string | null;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  oddsA: number;
  oddsB: number;
  qualTag: string;      // '#Path' or '#WT' for each team side
}

export interface VSCParticipant {
  clubId: string;
  leagueId: string;
  source: 'path' | 'wt3rd';
  sourceDetail: string;  // e.g. 'EMEA Path A', 'WT Group C 3rd'
  elo: number;
  preVSCElo: number;
}

export interface VSCState {
  season: number;
  paths: VSCPath[];
  pathParticipants: Array<{ clubId: string; leagueId: string; region: string }>;
  finalParticipants: VSCParticipant[];
  frozenParticipants: VSCParticipant[];
  knockoutMatches: VSCKnockoutMatch[];
  champion: string | null;
  phase: 'pre' | 'paths' | 'paths_done' | 'knockout_r16' | 'knockout_qf' | 'knockout_sf' | 'knockout_gf' | 'completed';
}

// ─── Midseason Mayhem types ───────────────────────────────────────────────────

export type MMFormat = 'Bo1' | 'Bo3' | 'Bo5';

export interface MMMatch {
  id: string;
  teamA: string;
  teamB: string;
  format: MMFormat;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  oddsA: number;
  oddsB: number;
}

export interface MMSubRound {
  key: string;         // 'R1' | 'R2W' | 'R2L' | 'R3A' | 'R3B' | 'R3C' | 'R4A' | 'R4B' | 'R5'
  label: string;       // display label (e.g. '1라운드')
  roundCol: number;    // 1–5, which display column this belongs to
  recordGroup: string; // '0-0' | '1-0' | etc.
  format: MMFormat;
  stakes: 'advancement' | 'elimination' | 'decisive' | 'non-decisive';
  week: number;        // season week number (17 or 18)
  day: string;         // 'Monday' | 'Tuesday' | etc.
  matches: MMMatch[];
  completed: boolean;
}

export interface MMParticipant {
  clubId: string;
  leagueId: string;
  w16Elo: number;
  seedBand: 1 | 2 | 3 | 4;  // 0 = not yet seeded
  swissWins: number;
  swissLosses: number;
  swissGameDiff: number;     // total games won minus lost across Swiss
  qualified: boolean;        // reached 3 wins
  eliminated: boolean;       // reached 3 losses
  priorOpponents: string[];  // clubIds played so far (no-rematch rule)
  qualResult: {              // how they qualified for MM (league final result)
    repScore: number;
    oppScore: number;
    opponent: string | null;
    isSeries: boolean;       // true = series score, false = single-match game score
  } | null;
}

export interface MMKnockoutMatch {
  slot: 'QF1' | 'QF2' | 'QF3' | 'QF4' | 'SF1' | 'SF2' | 'GF';
  side: 'A' | 'B' | null;
  teamA: string | null;
  teamB: string | null;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  oddsA: number;
  oddsB: number;
}

export interface MMState {
  season: number;
  participants: MMParticipant[];
  swissRounds: MMSubRound[];
  knockoutMatches: MMKnockoutMatch[];
  champion: string | null;
  phase: 'pre' | 'swiss' | 'knockout' | 'completed';
}
