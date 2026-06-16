import { addDays } from './calendar';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchSlot {
  weekNum: number;  // 1-52, within-season
  dow: number;      // 0=Mon … 6=Sun
}

export type PhaseScope = 'division' | 'full_league' | 'bracket';
export type PhaseType  = 'drr' | 'srr' | 'qualifier' | 'playoffs';

export interface PhaseDef {
  id: string;
  label: string;
  type: PhaseType;
  scope: PhaseScope;
  slots: MatchSlot[];  // one slot = one round; length = total rounds in phase
}

export interface LeagueScheduleDef {
  leagueId: string;
  phases: PhaseDef[];
}

// ─── L_NA explicit schedule ───────────────────────────────────────────────────
// First Half: intra-division Double Round Robin, Thu/Sun default
// Cup weeks (5, 9, 11): still Thu/Sun (cup blocks Mon/Tue/Wed, not Thu/Sun)
// W13: Thu R21 + Sat R22 (Sat instead of Sun for tiebreaker buffer)

const L_NA_FIRST_HALF_SLOTS: MatchSlot[] = [
  { weekNum: 1,  dow: 3 }, // R1  W1 Thu
  { weekNum: 1,  dow: 6 }, // R2  W1 Sun
  { weekNum: 2,  dow: 3 }, // R3  W2 Thu
  { weekNum: 2,  dow: 6 }, // R4  W2 Sun
  { weekNum: 3,  dow: 3 }, // R5  W3 Thu
  { weekNum: 3,  dow: 6 }, // R6  W3 Sun
  { weekNum: 4,  dow: 3 }, // R7  W4 Thu
  { weekNum: 4,  dow: 6 }, // R8  W4 Sun
  { weekNum: 5,  dow: 3 }, // R9  W5 Thu (cup week — Thu/Sun OK)
  { weekNum: 5,  dow: 6 }, // R10 W5 Sun
  { weekNum: 6,  dow: 3 }, // R11 W6 Thu
  { weekNum: 6,  dow: 6 }, // R12 W6 Sun
  // W7-8: IM1 — no L_NA matches
  { weekNum: 9,  dow: 3 }, // R13 W9 Thu (cup week)
  { weekNum: 9,  dow: 6 }, // R14 W9 Sun
  { weekNum: 10, dow: 3 }, // R15 W10 Thu
  { weekNum: 10, dow: 6 }, // R16 W10 Sun
  { weekNum: 11, dow: 3 }, // R17 W11 Thu (cup week)
  { weekNum: 11, dow: 6 }, // R18 W11 Sun
  { weekNum: 12, dow: 3 }, // R19 W12 Thu
  { weekNum: 12, dow: 6 }, // R20 W12 Sun
  { weekNum: 13, dow: 3 }, // R21 W13 Thu
  { weekNum: 13, dow: 5 }, // R22 W13 Sat (Sun reserved for tiebreakers)
];

// Second Half: 24-team integrated SRR, Thu/Sun default + Thu/Sat/Sun for 3-round weeks
// W14-15: MM qualifier | W16-20: MM block | W25-26: IM2 | W31-32: IM3

const L_NA_SECOND_HALF_SLOTS: MatchSlot[] = [
  { weekNum: 21, dow: 3 }, // R1  W21 Thu  (3-round week)
  { weekNum: 21, dow: 5 }, // R2  W21 Sat
  { weekNum: 21, dow: 6 }, // R3  W21 Sun
  { weekNum: 22, dow: 3 }, // R4  W22 Thu  (cup week)
  { weekNum: 22, dow: 6 }, // R5  W22 Sun
  { weekNum: 23, dow: 3 }, // R6  W23 Thu
  { weekNum: 23, dow: 6 }, // R7  W23 Sun
  { weekNum: 24, dow: 3 }, // R8  W24 Thu  (cup week)
  { weekNum: 24, dow: 6 }, // R9  W24 Sun
  // W25-26: IM2
  { weekNum: 27, dow: 3 }, // R10 W27 Thu  (3-round week)
  { weekNum: 27, dow: 5 }, // R11 W27 Sat
  { weekNum: 27, dow: 6 }, // R12 W27 Sun
  { weekNum: 28, dow: 3 }, // R13 W28 Thu  (cup week)
  { weekNum: 28, dow: 6 }, // R14 W28 Sun
  { weekNum: 29, dow: 3 }, // R15 W29 Thu
  { weekNum: 29, dow: 6 }, // R16 W29 Sun
  { weekNum: 30, dow: 3 }, // R17 W30 Thu  (cup week)
  { weekNum: 30, dow: 6 }, // R18 W30 Sun
  // W31-32: IM3
  { weekNum: 33, dow: 3 }, // R19 W33 Thu  (3-round week)
  { weekNum: 33, dow: 5 }, // R20 W33 Sat
  { weekNum: 33, dow: 6 }, // R21 W33 Sun
  { weekNum: 34, dow: 3 }, // R22 W34 Thu
  { weekNum: 34, dow: 5 }, // R23 W34 Sat  (Sun reserved for tiebreakers)
];

// MM Qualifier: 7 single-match slots (W14-15)
const L_NA_QUALIFIER_SLOTS: MatchSlot[] = [
  { weekNum: 14, dow: 3 }, // Thu – W-SF-A
  { weekNum: 14, dow: 4 }, // Fri – E-SF-A
  { weekNum: 14, dow: 5 }, // Sat – W-SF-B
  { weekNum: 14, dow: 6 }, // Sun – E-SF-B
  { weekNum: 15, dow: 3 }, // Thu – W-Final
  { weekNum: 15, dow: 4 }, // Fri – E-Final
  { weekNum: 15, dow: 6 }, // Sun – Grand Final
];

// Playoffs: 13 "round slots" across W35–W37
// Conditional slots (where series may already be decided) are still emitted;
// the bracket simulator skips any decided series on that slot.
const L_NA_PLAYOFF_SLOTS: MatchSlot[] = [
  { weekNum: 35, dow: 0 }, // Mon – QF M1 (guaranteed)
  { weekNum: 35, dow: 1 }, // Tue – QF M2 (conditional)
  { weekNum: 35, dow: 3 }, // Thu – SF M1
  { weekNum: 35, dow: 4 }, // Fri – SF M2
  { weekNum: 35, dow: 5 }, // Sat – SF M3 (conditional)
  { weekNum: 36, dow: 1 }, // Tue – DivFinal M1
  { weekNum: 36, dow: 2 }, // Wed – DivFinal M2
  { weekNum: 36, dow: 4 }, // Fri – DivFinal M3 (conditional)
  { weekNum: 37, dow: 0 }, // Mon – GF M1
  { weekNum: 37, dow: 1 }, // Tue – GF M2
  { weekNum: 37, dow: 3 }, // Thu – GF M3
  { weekNum: 37, dow: 4 }, // Fri – GF M4 (conditional)
  { weekNum: 37, dow: 6 }, // Sun – GF M5 (conditional)
];

// ─── L_CN explicit schedule ───────────────────────────────────────────────────
// First half (W1-6, W9-13): Thu/Fri = 1 round, Sat/Sun = 1 round → 22 rounds total
// Round "completes" when the second day of the pair passes (Fri or Sun).

const L_CN_FIRST_HALF_SLOTS: MatchSlot[] = [
  { weekNum: 1,  dow: 4 }, // R1  W1  Fri (Thu/Fri pair)
  { weekNum: 1,  dow: 6 }, // R2  W1  Sun (Sat/Sun pair)
  { weekNum: 2,  dow: 4 }, // R3  W2  Fri
  { weekNum: 2,  dow: 6 }, // R4  W2  Sun
  { weekNum: 3,  dow: 4 }, // R5  W3  Fri
  { weekNum: 3,  dow: 6 }, // R6  W3  Sun
  { weekNum: 4,  dow: 4 }, // R7  W4  Fri
  { weekNum: 4,  dow: 6 }, // R8  W4  Sun
  { weekNum: 5,  dow: 4 }, // R9  W5  Fri (cup week — Thu/Fri OK)
  { weekNum: 5,  dow: 6 }, // R10 W5  Sun
  { weekNum: 6,  dow: 4 }, // R11 W6  Fri
  { weekNum: 6,  dow: 6 }, // R12 W6  Sun
  // W7-8: IM1
  { weekNum: 9,  dow: 4 }, // R13 W9  Fri (cup week)
  { weekNum: 9,  dow: 6 }, // R14 W9  Sun
  { weekNum: 10, dow: 4 }, // R15 W10 Fri
  { weekNum: 10, dow: 6 }, // R16 W10 Sun
  { weekNum: 11, dow: 4 }, // R17 W11 Fri (cup week)
  { weekNum: 11, dow: 6 }, // R18 W11 Sun
  { weekNum: 12, dow: 4 }, // R19 W12 Fri
  { weekNum: 12, dow: 6 }, // R20 W12 Sun
  { weekNum: 13, dow: 4 }, // R21 W13 Fri
  { weekNum: 13, dow: 6 }, // R22 W13 Sun
];

// MM Qualifier: 7 slots (W14-15), same bracket structure as L_NA
const L_CN_QUALIFIER_SLOTS: MatchSlot[] = [
  { weekNum: 14, dow: 3 }, // Thu – D-SF-A
  { weekNum: 14, dow: 4 }, // Fri – P-SF-A
  { weekNum: 14, dow: 5 }, // Sat – D-SF-B
  { weekNum: 14, dow: 6 }, // Sun – P-SF-B
  { weekNum: 15, dow: 3 }, // Thu – Dragon Final
  { weekNum: 15, dow: 4 }, // Fri – Phoenix Final
  { weekNum: 15, dow: 6 }, // Sun – Grand Qualifier
];

// Second half (W21-24, W27-30, W33-34): same format as first half
// W21 and W27 are 3-round weeks (extra Tue/Wed pair → round completes Wed dow=2)
const L_CN_SECOND_HALF_SLOTS: MatchSlot[] = [
  { weekNum: 21, dow: 2 }, // R1  W21 Wed (Tue/Wed extra pair)
  { weekNum: 21, dow: 4 }, // R2  W21 Fri
  { weekNum: 21, dow: 6 }, // R3  W21 Sun
  { weekNum: 22, dow: 4 }, // R4  W22 Fri (cup week)
  { weekNum: 22, dow: 6 }, // R5  W22 Sun
  { weekNum: 23, dow: 4 }, // R6  W23 Fri
  { weekNum: 23, dow: 6 }, // R7  W23 Sun
  { weekNum: 24, dow: 4 }, // R8  W24 Fri (cup week)
  { weekNum: 24, dow: 6 }, // R9  W24 Sun
  // W25-26: IM2
  { weekNum: 27, dow: 2 }, // R10 W27 Wed (Tue/Wed extra pair)
  { weekNum: 27, dow: 4 }, // R11 W27 Fri
  { weekNum: 27, dow: 6 }, // R12 W27 Sun
  { weekNum: 28, dow: 4 }, // R13 W28 Fri (cup week)
  { weekNum: 28, dow: 6 }, // R14 W28 Sun
  { weekNum: 29, dow: 4 }, // R15 W29 Fri
  { weekNum: 29, dow: 6 }, // R16 W29 Sun
  { weekNum: 30, dow: 4 }, // R17 W30 Fri (cup week)
  { weekNum: 30, dow: 6 }, // R18 W30 Sun
  // W31-32: IM3
  { weekNum: 33, dow: 4 }, // R19 W33 Fri
  { weekNum: 33, dow: 6 }, // R20 W33 Sun
  { weekNum: 34, dow: 4 }, // R21 W34 Fri
  { weekNum: 34, dow: 6 }, // R22 W34 Sun (Mon reserved for tiebreakers)
];

// Playoffs: 12 slots W35-37
// Play-In → DivSF (Bo3) → DivFinal (Bo3) → Grand Final (Bo5)
const L_CN_PLAYOFF_SLOTS: MatchSlot[] = [
  { weekNum: 35, dow: 1 }, // Tue – Play-In (D4vD5, P4vP5)
  { weekNum: 35, dow: 3 }, // Thu – DivSF G1
  { weekNum: 35, dow: 4 }, // Fri – DivSF G2
  { weekNum: 35, dow: 6 }, // Sun – DivSF G3 (conditional)
  { weekNum: 36, dow: 1 }, // Tue – DivFinal G1
  { weekNum: 36, dow: 3 }, // Thu – DivFinal G2
  { weekNum: 36, dow: 5 }, // Sat – DivFinal G3 (conditional)
  { weekNum: 37, dow: 0 }, // Mon – GF G1
  { weekNum: 37, dow: 1 }, // Tue – GF G2
  { weekNum: 37, dow: 3 }, // Thu – GF G3
  { weekNum: 37, dow: 4 }, // Fri – GF G4 (conditional)
  { weekNum: 37, dow: 6 }, // Sun – GF G5 (conditional)
];

// ─── L_KR explicit schedule ───────────────────────────────────────────────────
// Spring regular (W1-6, W9-13): 59 daily slots, 132 total matches, Bo3
// Summer regular (W21-24, W27-30, W33-35): 58 daily slots, 132 total matches, Bo3
// Each slot = one calendar day; rounds array has variable match counts per slot.
// Playoffs (W14-15 spring, W36-37 summer): 8 Bo5 matches, 1 per day.

// Spring regular: daily slots
const L_KR_SPRING_SLOTS: MatchSlot[] = [
  // W1 normal_13: Tue(2),Wed(2),Thu(2),Fri(1),Sat(3),Sun(3)
  { weekNum: 1,  dow: 1 }, { weekNum: 1,  dow: 2 }, { weekNum: 1,  dow: 3 },
  { weekNum: 1,  dow: 4 }, { weekNum: 1,  dow: 5 }, { weekNum: 1,  dow: 6 },
  // W2 normal_13
  { weekNum: 2,  dow: 1 }, { weekNum: 2,  dow: 2 }, { weekNum: 2,  dow: 3 },
  { weekNum: 2,  dow: 4 }, { weekNum: 2,  dow: 5 }, { weekNum: 2,  dow: 6 },
  // W3 normal_13
  { weekNum: 3,  dow: 1 }, { weekNum: 3,  dow: 2 }, { weekNum: 3,  dow: 3 },
  { weekNum: 3,  dow: 4 }, { weekNum: 3,  dow: 5 }, { weekNum: 3,  dow: 6 },
  // W4 normal_13
  { weekNum: 4,  dow: 1 }, { weekNum: 4,  dow: 2 }, { weekNum: 4,  dow: 3 },
  { weekNum: 4,  dow: 4 }, { weekNum: 4,  dow: 5 }, { weekNum: 4,  dow: 6 },
  // W5 cup_10: Thu(2),Fri(2),Sat(3),Sun(3)
  { weekNum: 5,  dow: 3 }, { weekNum: 5,  dow: 4 }, { weekNum: 5,  dow: 5 }, { weekNum: 5,  dow: 6 },
  // W6 normal_13
  { weekNum: 6,  dow: 1 }, { weekNum: 6,  dow: 2 }, { weekNum: 6,  dow: 3 },
  { weekNum: 6,  dow: 4 }, { weekNum: 6,  dow: 5 }, { weekNum: 6,  dow: 6 },
  // W9 cup_10
  { weekNum: 9,  dow: 3 }, { weekNum: 9,  dow: 4 }, { weekNum: 9,  dow: 5 }, { weekNum: 9,  dow: 6 },
  // W10 normal_13
  { weekNum: 10, dow: 1 }, { weekNum: 10, dow: 2 }, { weekNum: 10, dow: 3 },
  { weekNum: 10, dow: 4 }, { weekNum: 10, dow: 5 }, { weekNum: 10, dow: 6 },
  // W11 cup_10
  { weekNum: 11, dow: 3 }, { weekNum: 11, dow: 4 }, { weekNum: 11, dow: 5 }, { weekNum: 11, dow: 6 },
  // W12 normal_12: Wed(2),Thu(2),Fri(2),Sat(3),Sun(3)
  { weekNum: 12, dow: 2 }, { weekNum: 12, dow: 3 }, { weekNum: 12, dow: 4 },
  { weekNum: 12, dow: 5 }, { weekNum: 12, dow: 6 },
  // W13 final_12: Mon(2),Tue(2),Wed(2),Thu(2),Fri(2),Sat(2)  Sun=tiebreaker reserve
  { weekNum: 13, dow: 0 }, { weekNum: 13, dow: 1 }, { weekNum: 13, dow: 2 },
  { weekNum: 13, dow: 3 }, { weekNum: 13, dow: 4 }, { weekNum: 13, dow: 5 },
];

// Spring playoffs: 8 Bo5 matches, 1 per day (W14-15)
const L_KR_SPRING_PO_SLOTS: MatchSlot[] = [
  { weekNum: 14, dow: 1 }, // Tue  M1: 3rd vs 6th
  { weekNum: 14, dow: 2 }, // Wed  M2: 4th vs 5th
  { weekNum: 14, dow: 5 }, // Sat  M3: 1st vs M1W
  { weekNum: 14, dow: 6 }, // Sun  M4: 2nd vs M2W
  { weekNum: 15, dow: 1 }, // Tue  M5: M3W vs M4W  (Upper Final)
  { weekNum: 15, dow: 2 }, // Wed  M6: M3L vs M4L  (Lower Match)
  { weekNum: 15, dow: 5 }, // Sat  M7: M5L vs M6W  (Final Qualifier)
  { weekNum: 15, dow: 6 }, // Sun  M8: M5W vs M7W  (Grand Final)
];

// Summer regular (W21-24, W27-30, W33-35): 58 daily slots
const L_KR_SUMMER_SLOTS: MatchSlot[] = [
  // W21 normal_14: Tue(2),Wed(2),Thu(2),Fri(2),Sat(3),Sun(3)
  { weekNum: 21, dow: 1 }, { weekNum: 21, dow: 2 }, { weekNum: 21, dow: 3 },
  { weekNum: 21, dow: 4 }, { weekNum: 21, dow: 5 }, { weekNum: 21, dow: 6 },
  // W22 cup_10
  { weekNum: 22, dow: 3 }, { weekNum: 22, dow: 4 }, { weekNum: 22, dow: 5 }, { weekNum: 22, dow: 6 },
  // W23 normal_13
  { weekNum: 23, dow: 1 }, { weekNum: 23, dow: 2 }, { weekNum: 23, dow: 3 },
  { weekNum: 23, dow: 4 }, { weekNum: 23, dow: 5 }, { weekNum: 23, dow: 6 },
  // W24 cup_10
  { weekNum: 24, dow: 3 }, { weekNum: 24, dow: 4 }, { weekNum: 24, dow: 5 }, { weekNum: 24, dow: 6 },
  // W27 normal_14
  { weekNum: 27, dow: 1 }, { weekNum: 27, dow: 2 }, { weekNum: 27, dow: 3 },
  { weekNum: 27, dow: 4 }, { weekNum: 27, dow: 5 }, { weekNum: 27, dow: 6 },
  // W28 cup_10
  { weekNum: 28, dow: 3 }, { weekNum: 28, dow: 4 }, { weekNum: 28, dow: 5 }, { weekNum: 28, dow: 6 },
  // W29 normal_13
  { weekNum: 29, dow: 1 }, { weekNum: 29, dow: 2 }, { weekNum: 29, dow: 3 },
  { weekNum: 29, dow: 4 }, { weekNum: 29, dow: 5 }, { weekNum: 29, dow: 6 },
  // W30 cup_10
  { weekNum: 30, dow: 3 }, { weekNum: 30, dow: 4 }, { weekNum: 30, dow: 5 }, { weekNum: 30, dow: 6 },
  // W33 normal_13
  { weekNum: 33, dow: 1 }, { weekNum: 33, dow: 2 }, { weekNum: 33, dow: 3 },
  { weekNum: 33, dow: 4 }, { weekNum: 33, dow: 5 }, { weekNum: 33, dow: 6 },
  // W34 normal_13
  { weekNum: 34, dow: 1 }, { weekNum: 34, dow: 2 }, { weekNum: 34, dow: 3 },
  { weekNum: 34, dow: 4 }, { weekNum: 34, dow: 5 }, { weekNum: 34, dow: 6 },
  // W35 final_12: Mon(2),Tue(2),Wed(2),Thu(2),Fri(2),Sat(2)
  { weekNum: 35, dow: 0 }, { weekNum: 35, dow: 1 }, { weekNum: 35, dow: 2 },
  { weekNum: 35, dow: 3 }, { weekNum: 35, dow: 4 }, { weekNum: 35, dow: 5 },
];

// Summer playoffs: 8 Bo5 matches (W36-37)
const L_KR_SUMMER_PO_SLOTS: MatchSlot[] = [
  { weekNum: 36, dow: 1 }, // Tue  M1
  { weekNum: 36, dow: 2 }, // Wed  M2
  { weekNum: 36, dow: 5 }, // Sat  M3
  { weekNum: 36, dow: 6 }, // Sun  M4
  { weekNum: 37, dow: 1 }, // Tue  M5 Upper Final
  { weekNum: 37, dow: 2 }, // Wed  M6 Lower Match
  { weekNum: 37, dow: 5 }, // Sat  M7 Final Qualifier
  { weekNum: 37, dow: 6 }, // Sun  M8 Grand Final
];

// ─── L_NEU / L_WEU explicit schedule ─────────────────────────────────────────
// 12 teams, Bo1 double round-robin (22 rounds/split), Fri/Sat/Sun (first & last week), Sat/Sun otherwise.
// Spring regular: W1-12, playoffs: W13-15. Summer regular: W21-34, playoffs: W35-37.

const L_NEU_SPRING_SLOTS: MatchSlot[] = [
  { weekNum: 1,  dow: 4 }, { weekNum: 1,  dow: 5 }, { weekNum: 1,  dow: 6 }, // W1  Fri/Sat/Sun (3)
  { weekNum: 2,  dow: 5 }, { weekNum: 2,  dow: 6 },                           // W2  Sat/Sun (2)
  { weekNum: 3,  dow: 5 }, { weekNum: 3,  dow: 6 },                           // W3  Sat/Sun (2)
  { weekNum: 4,  dow: 5 }, { weekNum: 4,  dow: 6 },                           // W4  Sat/Sun (2)
  { weekNum: 5,  dow: 5 }, { weekNum: 5,  dow: 6 },                           // W5  Sat/Sun (2)
  { weekNum: 6,  dow: 5 }, { weekNum: 6,  dow: 6 },                           // W6  Sat/Sun (2)
  // W7-8: IM1
  { weekNum: 9,  dow: 5 }, { weekNum: 9,  dow: 6 },                           // W9  Sat/Sun (2)
  { weekNum: 10, dow: 5 }, { weekNum: 10, dow: 6 },                           // W10 Sat/Sun (2)
  { weekNum: 11, dow: 5 }, { weekNum: 11, dow: 6 },                           // W11 Sat/Sun (2)
  { weekNum: 12, dow: 4 }, { weekNum: 12, dow: 5 }, { weekNum: 12, dow: 6 }, // W12 Fri/Sat/Sun (3)
];

// Spring playoffs: 12 slots — W13 (UBR1 ×2 Bo3), W14 (UBR2+LB rounds Bo5), W15 (LBF+GF)
const L_NEU_SPRING_PO_SLOTS: MatchSlot[] = [
  { weekNum: 13, dow: 3 }, // Slot 0  W13 Thu  UBR1: ub1+ub2 (2×Bo3)
  { weekNum: 13, dow: 4 }, // Slot 1  W13 Fri  UBR1: ub3+ub4 (2×Bo3)
  { weekNum: 13, dow: 5 }, // Slot 2  W13 Sat  UBR2: ub5 Bo5
  { weekNum: 13, dow: 6 }, // Slot 3  W13 Sun  UBR2: ub6 Bo5
  { weekNum: 14, dow: 1 }, // Slot 4  W14 Tue  LBR1: lb1 Bo5
  { weekNum: 14, dow: 2 }, // Slot 5  W14 Wed  LBR1: lb2 Bo5
  { weekNum: 14, dow: 3 }, // Slot 6  W14 Thu  LBR2: lb3 Bo5
  { weekNum: 14, dow: 4 }, // Slot 7  W14 Fri  LBR2: lb4 Bo5
  { weekNum: 14, dow: 5 }, // Slot 8  W14 Sat  UBF: ubf Bo5
  { weekNum: 14, dow: 6 }, // Slot 9  W14 Sun  LB Semi: lb5 Bo5
  { weekNum: 15, dow: 5 }, // Slot 10 W15 Sat  LBF: lbf Bo5
  { weekNum: 15, dow: 6 }, // Slot 11 W15 Sun  GF: gf Bo5
];

const L_NEU_SUMMER_SLOTS: MatchSlot[] = [
  { weekNum: 21, dow: 4 }, { weekNum: 21, dow: 5 }, { weekNum: 21, dow: 6 }, // W21 Fri/Sat/Sun (3)
  { weekNum: 22, dow: 5 }, { weekNum: 22, dow: 6 },                           // W22 Sat/Sun (2)
  { weekNum: 23, dow: 5 }, { weekNum: 23, dow: 6 },                           // W23 Sat/Sun (2)
  { weekNum: 24, dow: 5 }, { weekNum: 24, dow: 6 },                           // W24 Sat/Sun (2)
  // W25-26: IM2
  { weekNum: 27, dow: 5 }, { weekNum: 27, dow: 6 },                           // W27 Sat/Sun (2)
  { weekNum: 28, dow: 5 }, { weekNum: 28, dow: 6 },                           // W28 Sat/Sun (2)
  { weekNum: 29, dow: 5 }, { weekNum: 29, dow: 6 },                           // W29 Sat/Sun (2)
  { weekNum: 30, dow: 5 }, { weekNum: 30, dow: 6 },                           // W30 Sat/Sun (2)
  // W31-32: IM3
  { weekNum: 33, dow: 5 }, { weekNum: 33, dow: 6 },                           // W33 Sat/Sun (2)
  { weekNum: 34, dow: 4 }, { weekNum: 34, dow: 5 }, { weekNum: 34, dow: 6 }, // W34 Fri/Sat/Sun (3)
];

// Summer playoffs: 12 slots — W35 (UBR1), W36 (UBR2+LB), W37 (LBF+GF)
const L_NEU_SUMMER_PO_SLOTS: MatchSlot[] = [
  { weekNum: 35, dow: 3 }, // Slot 0  W35 Thu  ub1+ub2
  { weekNum: 35, dow: 4 }, // Slot 1  W35 Fri  ub3+ub4
  { weekNum: 35, dow: 5 }, // Slot 2  W35 Sat  ub5
  { weekNum: 35, dow: 6 }, // Slot 3  W35 Sun  ub6
  { weekNum: 36, dow: 1 }, // Slot 4  W36 Tue  lb1
  { weekNum: 36, dow: 2 }, // Slot 5  W36 Wed  lb2
  { weekNum: 36, dow: 3 }, // Slot 6  W36 Thu  lb3
  { weekNum: 36, dow: 4 }, // Slot 7  W36 Fri  lb4
  { weekNum: 36, dow: 5 }, // Slot 8  W36 Sat  ubf
  { weekNum: 36, dow: 6 }, // Slot 9  W36 Sun  lb5
  { weekNum: 37, dow: 5 }, // Slot 10 W37 Sat  lbf
  { weekNum: 37, dow: 6 }, // Slot 11 W37 Sun  gf
];

// ─── L_DE / L_EEU / L_SEU / L_RU explicit schedule ──────────────────────────
// 10 teams, Bo1 DRR, Sat+Sun only, 5 Bo1/day, 18 matchdays = 9 weeks/split.
// Spring reg: W1-6 + W9-11. Summer reg: W21-24 + W27-30 + W33.
// Playoffs: 6 teams, all Bo5, 8 series across 3 weeks (1 per day).

const L_DE_SPRING_SLOTS: MatchSlot[] = [
  { weekNum: 1,  dow: 5 }, { weekNum: 1,  dow: 6 }, // W1  R1-R2
  { weekNum: 2,  dow: 5 }, { weekNum: 2,  dow: 6 }, // W2  R3-R4
  { weekNum: 3,  dow: 5 }, { weekNum: 3,  dow: 6 }, // W3  R5-R6
  { weekNum: 4,  dow: 5 }, { weekNum: 4,  dow: 6 }, // W4  R7-R8
  { weekNum: 5,  dow: 5 }, { weekNum: 5,  dow: 6 }, // W5  R9-R10
  { weekNum: 6,  dow: 5 }, { weekNum: 6,  dow: 6 }, // W6  R11-R12
  { weekNum: 9,  dow: 5 }, { weekNum: 9,  dow: 6 }, // W9  R13-R14
  { weekNum: 10, dow: 5 }, { weekNum: 10, dow: 6 }, // W10 R15-R16
  { weekNum: 11, dow: 5 }, { weekNum: 11, dow: 6 }, // W11 R17-R18
];

const L_DE_SPRING_PO_SLOTS: MatchSlot[] = [
  { weekNum: 13, dow: 5 }, // W13 Sat  U1
  { weekNum: 13, dow: 6 }, // W13 Sun  U2
  { weekNum: 14, dow: 5 }, // W14 Sat  L1
  { weekNum: 14, dow: 6 }, // W14 Sun  L2
  { weekNum: 15, dow: 2 }, // W15 Wed  U3/UBF
  { weekNum: 15, dow: 4 }, // W15 Fri  L3
  { weekNum: 15, dow: 5 }, // W15 Sat  L4/LBF
  { weekNum: 15, dow: 6 }, // W15 Sun  GF
];

const L_DE_SUMMER_SLOTS: MatchSlot[] = [
  { weekNum: 21, dow: 5 }, { weekNum: 21, dow: 6 }, // W21 R1-R2
  { weekNum: 22, dow: 5 }, { weekNum: 22, dow: 6 }, // W22 R3-R4
  { weekNum: 23, dow: 5 }, { weekNum: 23, dow: 6 }, // W23 R5-R6
  { weekNum: 24, dow: 5 }, { weekNum: 24, dow: 6 }, // W24 R7-R8
  { weekNum: 27, dow: 5 }, { weekNum: 27, dow: 6 }, // W27 R9-R10
  { weekNum: 28, dow: 5 }, { weekNum: 28, dow: 6 }, // W28 R11-R12
  { weekNum: 29, dow: 5 }, { weekNum: 29, dow: 6 }, // W29 R13-R14
  { weekNum: 30, dow: 5 }, { weekNum: 30, dow: 6 }, // W30 R15-R16
  { weekNum: 33, dow: 5 }, { weekNum: 33, dow: 6 }, // W33 R17-R18
];

const L_DE_SUMMER_PO_SLOTS: MatchSlot[] = [
  { weekNum: 35, dow: 5 }, // W35 Sat  U1
  { weekNum: 35, dow: 6 }, // W35 Sun  U2
  { weekNum: 36, dow: 5 }, // W36 Sat  L1
  { weekNum: 36, dow: 6 }, // W36 Sun  L2
  { weekNum: 37, dow: 2 }, // W37 Wed  U3/UBF
  { weekNum: 37, dow: 4 }, // W37 Fri  L3
  { weekNum: 37, dow: 5 }, // W37 Sat  L4/LBF
  { weekNum: 37, dow: 6 }, // W37 Sun  GF
];

// ─── Registry ─────────────────────────────────────────────────────────────────

export const LEAGUE_SCHEDULE_DEFS: Record<string, LeagueScheduleDef> = {
  L_KR: {
    leagueId: 'L_KR',
    phases: [
      { id: 'spring',          label: 'Spring Regular',  type: 'drr',      scope: 'full_league', slots: L_KR_SPRING_SLOTS    },
      { id: 'spring_playoffs', label: 'Spring Playoffs', type: 'playoffs',  scope: 'bracket',     slots: L_KR_SPRING_PO_SLOTS },
      { id: 'summer',          label: 'Summer Regular',  type: 'drr',       scope: 'full_league', slots: L_KR_SUMMER_SLOTS    },
      { id: 'summer_playoffs', label: 'Summer Playoffs', type: 'playoffs',  scope: 'bracket',     slots: L_KR_SUMMER_PO_SLOTS },
    ],
  },
  L_CN: {
    leagueId: 'L_CN',
    phases: [
      {
        id: 'first_half',
        label: 'First Half',
        type: 'drr',
        scope: 'full_league',
        slots: L_CN_FIRST_HALF_SLOTS,
      },
      {
        id: 'qualifier',
        label: 'MM Qualifier',
        type: 'qualifier',
        scope: 'bracket',
        slots: L_CN_QUALIFIER_SLOTS,
      },
      {
        id: 'second_half',
        label: 'Second Half',
        type: 'drr',
        scope: 'full_league',
        slots: L_CN_SECOND_HALF_SLOTS,
      },
      {
        id: 'playoffs',
        label: 'Playoffs',
        type: 'playoffs',
        scope: 'bracket',
        slots: L_CN_PLAYOFF_SLOTS,
      },
    ],
  },
  L_NEU: {
    leagueId: 'L_NEU',
    phases: [
      { id: 'spring',          label: 'Spring Regular',  type: 'drr',     scope: 'full_league', slots: L_NEU_SPRING_SLOTS    },
      { id: 'spring_playoffs', label: 'Spring Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_NEU_SPRING_PO_SLOTS },
      { id: 'summer',          label: 'Summer Regular',  type: 'drr',     scope: 'full_league', slots: L_NEU_SUMMER_SLOTS    },
      { id: 'summer_playoffs', label: 'Summer Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_NEU_SUMMER_PO_SLOTS },
    ],
  },
  L_WEU: {
    leagueId: 'L_WEU',
    phases: [
      { id: 'spring',          label: 'Spring Regular',  type: 'drr',     scope: 'full_league', slots: L_NEU_SPRING_SLOTS    },
      { id: 'spring_playoffs', label: 'Spring Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_NEU_SPRING_PO_SLOTS },
      { id: 'summer',          label: 'Summer Regular',  type: 'drr',     scope: 'full_league', slots: L_NEU_SUMMER_SLOTS    },
      { id: 'summer_playoffs', label: 'Summer Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_NEU_SUMMER_PO_SLOTS },
    ],
  },
  L_DE: {
    leagueId: 'L_DE',
    phases: [
      { id: 'spring',          label: 'Spring Regular',  type: 'drr',     scope: 'full_league', slots: L_DE_SPRING_SLOTS    },
      { id: 'spring_playoffs', label: 'Spring Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_DE_SPRING_PO_SLOTS },
      { id: 'summer',          label: 'Summer Regular',  type: 'drr',     scope: 'full_league', slots: L_DE_SUMMER_SLOTS    },
      { id: 'summer_playoffs', label: 'Summer Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_DE_SUMMER_PO_SLOTS },
    ],
  },
  L_EEU: {
    leagueId: 'L_EEU',
    phases: [
      { id: 'spring',          label: 'Spring Regular',  type: 'drr',     scope: 'full_league', slots: L_DE_SPRING_SLOTS    },
      { id: 'spring_playoffs', label: 'Spring Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_DE_SPRING_PO_SLOTS },
      { id: 'summer',          label: 'Summer Regular',  type: 'drr',     scope: 'full_league', slots: L_DE_SUMMER_SLOTS    },
      { id: 'summer_playoffs', label: 'Summer Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_DE_SUMMER_PO_SLOTS },
    ],
  },
  L_SEU: {
    leagueId: 'L_SEU',
    phases: [
      { id: 'spring',          label: 'Spring Regular',  type: 'drr',     scope: 'full_league', slots: L_DE_SPRING_SLOTS    },
      { id: 'spring_playoffs', label: 'Spring Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_DE_SPRING_PO_SLOTS },
      { id: 'summer',          label: 'Summer Regular',  type: 'drr',     scope: 'full_league', slots: L_DE_SUMMER_SLOTS    },
      { id: 'summer_playoffs', label: 'Summer Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_DE_SUMMER_PO_SLOTS },
    ],
  },
  L_RU: {
    leagueId: 'L_RU',
    phases: [
      { id: 'spring',          label: 'Spring Regular',  type: 'drr',     scope: 'full_league', slots: L_DE_SPRING_SLOTS    },
      { id: 'spring_playoffs', label: 'Spring Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_DE_SPRING_PO_SLOTS },
      { id: 'summer',          label: 'Summer Regular',  type: 'drr',     scope: 'full_league', slots: L_DE_SUMMER_SLOTS    },
      { id: 'summer_playoffs', label: 'Summer Playoffs', type: 'playoffs', scope: 'bracket',     slots: L_DE_SUMMER_PO_SLOTS },
    ],
  },
  L_NA: {
    leagueId: 'L_NA',
    phases: [
      {
        id: 'first_half',
        label: 'First Half – DRR',
        type: 'drr',
        scope: 'division',
        slots: L_NA_FIRST_HALF_SLOTS,
      },
      {
        id: 'qualifier',
        label: 'MM Qualifier',
        type: 'qualifier',
        scope: 'bracket',
        slots: L_NA_QUALIFIER_SLOTS,
      },
      {
        id: 'second_half',
        label: 'Second Half – SRR',
        type: 'srr',
        scope: 'full_league',
        slots: L_NA_SECOND_HALF_SLOTS,
      },
      {
        id: 'playoffs',
        label: 'Playoffs',
        type: 'playoffs',
        scope: 'bracket',
        slots: L_NA_PLAYOFF_SLOTS,
      },
    ],
  },
};

export function getLeagueScheduleDef(leagueId: string): LeagueScheduleDef | undefined {
  return LEAGUE_SCHEDULE_DEFS[leagueId];
}

// ─── Slot → calendar date ─────────────────────────────────────────────────────

/** Absolute date of a MatchSlot given the Monday that started the current season */
export function slotDate(seasonStartMonday: string, slot: MatchSlot): string {
  return addDays(seasonStartMonday, (slot.weekNum - 1) * 7 + slot.dow);
}

/** How many rounds (slots) should be complete by `targetDate` */
export function targetRoundsFromSlots(
  slots: MatchSlot[],
  seasonStartMonday: string,
  targetDate: string,
): number {
  let count = 0;
  for (const slot of slots) {
    if (slotDate(seasonStartMonday, slot) <= targetDate) count++;
    else break; // slots are in ascending date order
  }
  return count;
}
