# PRD: L_BR / L_SA 10-Team Bo3 League Format

**Document version:** v1.0  
**Target leagues:** L_BR Brazil, L_SA South/Central Latin America  
**League model:** single-venue, 10-team, Spring/Summer split league  
**Regular season match type:** Bo3  
**Playoff match type:** Bo5  
**Primary use:** format handoff for scheduling, simulation, and AI planning systems

---

## 1. Executive Summary

L_BR and L_SA share the same competitive structure. Each league has 10 teams, uses a single venue, and crowns separate Spring and Summer champions.

Each split has a **9-week Bo3 single round-robin regular season** followed by a **3-week, top-6 Bo5 playoff** using the same bracket logic as L_KR.

Because the league uses only one venue and the regular season contains only 45 Bo3 matches per split, the recommended regular-season rhythm is weekend-focused:

> **Saturday: 2 Bo3 matches**  
> **Sunday: 3 Bo3 matches**

This completes one full round per week. Every team plays exactly once per week during the regular season.

---

## 2. Covered Leagues

| League Code | League Name | Shared Format |
|---|---|---|
| L_BR | Brazil | Yes |
| L_SA | South/Central Latin America | Yes |

---

## 3. Global Calendar Fit

The leagues must fit inside the shared 52-week esports calendar.

| Split | Regular Season | Buffer / Tiebreaker | Playoffs | Champion Decided |
|---|---|---|---|---|
| Spring | Week 1-6, Week 9-11 | Week 12 | Week 13-15 | Week 15 Sunday |
| Summer | Week 21-24, Week 27-30, Week 33 | Week 34 | Week 35-37 | Week 37 Sunday |

The calendar intentionally keeps one buffer week before each playoff. This protects the bracket from tiebreakers, postponed matches, production issues, and patch-related schedule adjustments.

---

## 4. Regular Season Format

| Item | Value |
|---|---:|
| Teams | 10 |
| Venue model | Single venue |
| Regular season format | Single round robin |
| Match type | Bo3 |
| Team matches per split | 9 |
| Total matches per split | 45 |
| Regular-season duration | 9 weeks |
| Rounds per split | 9 |
| Matches per round | 5 |
| Team frequency | Each team plays once per round/week |

### 4.1 Weekly Match Distribution

| Day | Matches | Rationale |
|---|---:|---|
| Saturday | 2 Bo3 | Weekend audience slot, lower daily load |
| Sunday | 3 Bo3 | Main weekly matchday |
| Weekly total | 5 Bo3 | One complete 10-team round |

This is the cleanest single-venue pattern. It avoids weekday overuse, keeps every round easy to understand, and gives the league a weekend broadcast identity.

---

## 5. Spring Split Schedule

### 5.1 Spring Regular Season

| Week | Day | Round | Slot | Matches | Notes |
|---:|---|---|---|---:|---|
| Week 1 | Saturday | R1 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 1 | Sunday | R1 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 2 | Saturday | R2 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 2 | Sunday | R2 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 3 | Saturday | R3 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 3 | Sunday | R3 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 4 | Saturday | R4 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 4 | Sunday | R4 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 5 | Saturday | R5 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 5 | Sunday | R5 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 6 | Saturday | R6 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 6 | Sunday | R6 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 9 | Saturday | R7 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 9 | Sunday | R7 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 10 | Saturday | R8 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 10 | Sunday | R8 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 11 | Saturday | R9 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 11 | Sunday | R9 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |

### 5.2 Spring Buffer Week

| Week | Usage |
|---:|---|
| Week 12 | Tiebreakers, postponed matches, playoff media day, bracket confirmation |

### 5.3 Spring Playoffs

| Week | Day | Stage | Match ID | Match | Match Type |
|---:|---|---|---|---|---|
| Week 13 | Thursday | Round 1 | M1 | Seed 3 vs Seed 6 | Bo5 |
| Week 13 | Friday | Round 1 | M2 | Seed 4 vs Seed 5 | Bo5 |
| Week 13 | Saturday | Round 2 | M3 | Seed 1 vs Winner of M1 | Bo5 |
| Week 13 | Sunday | Round 2 | M4 | Seed 2 vs Winner of M2 | Bo5 |
| Week 14 | Saturday | Round 3 - Winners Final | M5 | Winner of M3 vs Winner of M4 | Bo5 |
| Week 14 | Sunday | Round 3 - Lower Match | M6 | Loser of M3 vs Loser of M4 | Bo5 |
| Week 15 | Saturday | Round 4 - Final Qualifier | M7 | Loser of M5 vs Winner of M6 | Bo5 |
| Week 15 | Sunday | Round 5 - Grand Final | M8 | Winner of M5 vs Winner of M7 | Bo5 |

Spring champion is decided on **Week 15 Sunday**.

---

## 6. Summer Split Schedule

### 6.1 Summer Regular Season

| Week | Day | Round | Slot | Matches | Notes |
|---:|---|---|---|---:|---|
| Week 21 | Saturday | R1 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 21 | Sunday | R1 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 22 | Saturday | R2 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 22 | Sunday | R2 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 23 | Saturday | R3 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 23 | Sunday | R3 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 24 | Saturday | R4 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 24 | Sunday | R4 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 27 | Saturday | R5 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 27 | Sunday | R5 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 28 | Saturday | R6 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 28 | Sunday | R6 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 29 | Saturday | R7 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 29 | Sunday | R7 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 30 | Saturday | R8 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 30 | Sunday | R8 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |
| Week 33 | Saturday | R9 | A | 2 Bo3 | 주간 라운드 전반 |
| Week 33 | Sunday | R9 | B | 3 Bo3 | 주간 라운드 후반, 해당 라운드 종료 |

### 6.2 Summer Buffer Week

| Week | Usage |
|---:|---|
| Week 34 | Tiebreakers, postponed matches, playoff media day, bracket confirmation |

### 6.3 Summer Playoffs

| Week | Day | Stage | Match ID | Match | Match Type |
|---:|---|---|---|---|---|
| Week 35 | Thursday | Round 1 | M1 | Seed 3 vs Seed 6 | Bo5 |
| Week 35 | Friday | Round 1 | M2 | Seed 4 vs Seed 5 | Bo5 |
| Week 35 | Saturday | Round 2 | M3 | Seed 1 vs Winner of M1 | Bo5 |
| Week 35 | Sunday | Round 2 | M4 | Seed 2 vs Winner of M2 | Bo5 |
| Week 36 | Saturday | Round 3 - Winners Final | M5 | Winner of M3 vs Winner of M4 | Bo5 |
| Week 36 | Sunday | Round 3 - Lower Match | M6 | Loser of M3 vs Loser of M4 | Bo5 |
| Week 37 | Saturday | Round 4 - Final Qualifier | M7 | Loser of M5 vs Winner of M6 | Bo5 |
| Week 37 | Sunday | Round 5 - Grand Final | M8 | Winner of M5 vs Winner of M7 | Bo5 |

Summer champion is decided on **Week 37 Sunday**.

---

## 7. Playoff Format

The playoff format is identical to the L_KR playoff structure.

| Item | Value |
|---|---:|
| Qualified teams | Top 6 |
| Playoff duration | 3 weeks |
| Match type | Bo5 |
| Matches per day | 1 Bo5 maximum |
| Total playoff matches | 8 Bo5 |
| Bracket reset | None |

### 7.1 Seeding

| Seed | Starting Position |
|---:|---|
| 1st | Round 2 |
| 2nd | Round 2 |
| 3rd | Round 1 |
| 4th | Round 1 |
| 5th | Round 1 |
| 6th | Round 1 |

### 7.2 Bracket

| Match ID | Round | Match |
|---|---|---|
| M1 | Round 1 | 3rd seed vs 6th seed |
| M2 | Round 1 | 4th seed vs 5th seed |
| M3 | Round 2 | 1st seed vs Winner of M1 |
| M4 | Round 2 | 2nd seed vs Winner of M2 |
| M5 | Round 3, Winners Final | Winner of M3 vs Winner of M4 |
| M6 | Round 3, Lower Match | Loser of M3 vs Loser of M4 |
| M7 | Round 4, Final Qualifier | Loser of M5 vs Winner of M6 |
| M8 | Round 5, Grand Final | Winner of M5 vs Winner of M7 |

### 7.3 Fixed Final Weekend Rule

| Round | Required Day |
|---|---|
| Round 4 / Final Qualifier | Saturday |
| Round 5 / Grand Final | Sunday |

This creates a clear closing weekend: the final qualifier on Saturday, then the championship final on Sunday.

---

## 8. Standings and Tiebreakers

Recommended regular-season ranking order:

| Priority | Criterion |
|---:|---|
| 1 | Match win percentage |
| 2 | Match wins |
| 3 | Head-to-head record |
| 4 | Game differential |
| 5 | Shortest average game time in wins, if needed |
| 6 | Bo3 tiebreaker match |

Tiebreakers should preferably be resolved during Week 12 for Spring and Week 34 for Summer.

---

## 9. Match Count Summary

| Segment | Matches per Split |
|---|---:|
| Regular season | 45 Bo3 |
| Playoffs | 8 Bo5 |
| Total per split | 53 matches |

| Segment | Annual Total |
|---|---:|
| Spring regular season | 45 Bo3 |
| Spring playoffs | 8 Bo5 |
| Summer regular season | 45 Bo3 |
| Summer playoffs | 8 Bo5 |
| Total annual matches | 106 matches |

---

## 10. Requirements Compliance

| Requirement | Status |
|---|---|
| 10-team league | Satisfied |
| Applies to L_BR and L_SA | Satisfied |
| Single venue | Satisfied |
| All regular-season matches are Bo3 | Satisfied |
| Spring and Summer champions separately crowned | Satisfied |
| Regular season uses Bo3 single round robin | Satisfied |
| 45 regular-season matches per split | Satisfied |
| Team plays 9 regular-season matches per split | Satisfied |
| Regular season completed in 9 weeks | Satisfied |
| Playoffs last 3 weeks | Satisfied |
| Top 6 teams qualify | Satisfied |
| Playoff format matches L_KR | Satisfied |
| Round 4 on Saturday | Satisfied |
| Grand Final on Sunday | Satisfied |

---

## 11. Final Operating Recommendation

Use the following split pattern for both L_BR and L_SA:

> **9-week regular season** with one Bo3 round per weekend  
> **1-week buffer / tiebreaker window**  
> **3-week top-6 Bo5 playoff** using the L_KR bracket

This keeps the league compact, weekend-friendly, and safe from bracket-timing chaos. The calendar breathes without becoming lazy, a tidy little tournament engine with samba gears and playoff teeth.
