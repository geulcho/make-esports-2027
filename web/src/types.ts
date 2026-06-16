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
