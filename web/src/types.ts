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

export interface LeagueSimState {
  leagueId: string;
  // For non-division leagues: populated directly
  // For division leagues: derived from divisionStates
  standings: TeamRecord[];
  results: PhaseResult[];
  // Division leagues only
  divisionStates?: Record<string, DivisionSim>;
}
