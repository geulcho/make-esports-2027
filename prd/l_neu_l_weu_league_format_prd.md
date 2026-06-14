# L_NEU / L_WEU League Format PRD

**Document version:** v1.0  
**Applies to:** L_NEU, L_WEU  
**League type:** 12-team single-venue Bo1 league  
**Season structure:** Spring split + Summer split  
**Champion cadence:** Two champions per year, one in Spring and one in Summer

---

## 1. Purpose

This PRD defines the yearly competition format for the North Europe League (**L_NEU**) and West Europe League (**L_WEU**).

Both leagues use the same structure:

- 12 teams
- One centralized arena
- All regular-season matches are **Bo1**
- Spring and Summer are separate splits
- Each split has a regular season and a playoff
- The regular season lasts **10 weeks**
- The playoff lasts **3 weeks**
- The champion must be decided by the end of **Week 15** for Spring and **Week 37** for Summer

---

## 2. Global Calendar Fit

| Split | Regular Season | Playoffs | Champion Deadline |
|---|---:|---:|---|
| Spring | Week 1~6, Week 9~12 | Week 13~15 | Week 15 Sunday |
| Summer | Week 21~24, Week 27~30, Week 33~34 | Week 35~37 | Week 37 Sunday |

The schedule respects the cup-week constraint: in Week 5, 9, 11, 22, 24, 28, and 30, regional league matches cannot be held on Monday, Tuesday, or Wednesday.

Because this league plays regular-season matches only on Friday, Saturday, and Sunday, the cup-week restriction is naturally avoided.

---

## 3. League Structure

| Item | Specification |
|---|---:|
| Teams | 12 |
| Venue model | Single centralized arena |
| Regular-season match format | Bo1 |
| Regular-season duration | 10 weeks per split |
| Playoff duration | 3 weeks per split |
| Playoff entrants | Top 8 teams |
| Playoff format | Double elimination |
| Upper Bracket Round 1 | Bo3 |
| All other playoff matches | Bo5 |

---

## 4. Regular Season Format

The regular season contains **22 matchdays**.

Each matchday has:

- 6 Bo1 matches
- Each of the 12 teams plays exactly once

Therefore, each team plays 22 Bo1 matches, and each split has 132 regular-season matches.

| Calculation | Result |
|---|---:|
| Matchdays | 22 |
| Matches per matchday | 6 |
| Total matches | 22 × 6 = 132 |
| Team matches | 22 |
| Effective format | 12-team double round robin |

The user-facing rule is:

- First regular-season week: Friday, Saturday, Sunday
- Final regular-season week: Friday, Saturday, Sunday
- All other regular-season weeks: Saturday, Sunday
- Every regular-season matchday: 6 Bo1 matches

---

## 5. Spring Regular Season Schedule

**Spring regular season:** Week 1~6 and Week 9~12  
**Total:** 10 weeks, 22 matchdays, 132 Bo1 matches

| Week | Day | Matchday | Matches | Notes |
|---|---|---|---|---|
| Week 1 | Friday | MD1 | 6 | Opening regular-season week; first week uses Fri/Sat/Sun |
| Week 1 | Saturday | MD2 | 6 | Opening weekend |
| Week 1 | Sunday | MD3 | 6 | Opening weekend |
| Week 2 | Saturday | MD4 | 6 | Standard regular-season week |
| Week 2 | Sunday | MD5 | 6 | Standard regular-season week |
| Week 3 | Saturday | MD6 | 6 | Standard regular-season week |
| Week 3 | Sunday | MD7 | 6 | Standard regular-season week |
| Week 4 | Saturday | MD8 | 6 | Standard regular-season week |
| Week 4 | Sunday | MD9 | 6 | Standard regular-season week |
| Week 5 | Saturday | MD10 | 6 | Cup week; regional matches only on weekend |
| Week 5 | Sunday | MD11 | 6 | Cup week; regional matches only on weekend |
| Week 6 | Saturday | MD12 | 6 | Standard regular-season week |
| Week 6 | Sunday | MD13 | 6 | Standard regular-season week |
| Week 9 | Saturday | MD14 | 6 | Cup week; regional matches only on weekend |
| Week 9 | Sunday | MD15 | 6 | Cup week; regional matches only on weekend |
| Week 10 | Saturday | MD16 | 6 | Standard regular-season week |
| Week 10 | Sunday | MD17 | 6 | Standard regular-season week |
| Week 11 | Saturday | MD18 | 6 | Cup week; regional matches only on weekend |
| Week 11 | Sunday | MD19 | 6 | Cup week; regional matches only on weekend |
| Week 12 | Friday | MD20 | 6 | Final regular-season week; uses Fri/Sat/Sun |
| Week 12 | Saturday | MD21 | 6 | Final regular-season weekend |
| Week 12 | Sunday | MD22 | 6 | Regular season ends |

---

## 6. Spring Playoff Format

The top 8 teams from the Spring regular season qualify.

### 6.1 Bracket

| Stage | Matchup | Match Format |
|---|---|---|
| Upper Bracket Round 1 | Seed 1 vs Seed 8 | Bo3 |
| Upper Bracket Round 1 | Seed 4 vs Seed 5 | Bo3 |
| Upper Bracket Round 1 | Seed 2 vs Seed 7 | Bo3 |
| Upper Bracket Round 1 | Seed 3 vs Seed 6 | Bo3 |
| Upper Bracket Semifinals | UB R1 winners | Bo5 |
| Lower Bracket Round 1 | UB R1 losers | Bo5 |
| Lower Bracket Round 2 | LB R1 winners vs UB Semifinal losers | Bo5 |
| Upper Bracket Final | UB Semifinal winners | Bo5 |
| Lower Bracket Round 3 | LB R2 winners | Bo5 |
| Lower Bracket Final | LB R3 winner vs UB Final loser | Bo5 |
| Grand Final | UB Final winner vs Lower Bracket Final winner | Bo5 |

**Default rule:** no bracket reset in the Grand Final.

### 6.2 Playoff Match Count

| Match Type | Count | Daily Limit |
|---|---:|---:|
| Bo3 | 4 matches | Up to 2 per day |
| Bo5 | 10 matches | 1 per day |
| Total | 14 matches | - |

---

## 7. Spring Playoff Schedule

| Week | Day | Stage | Match | Format | Notes |
|---|---|---|---|---|---|
| Week 13 | Thursday | Upper Bracket Round 1 | UB1: Seed 1 vs Seed 8 + UB2: Seed 4 vs Seed 5 | 2 Bo3 | Only upper bracket Round 1 is Bo3; two Bo3 matches may be played in one day. |
| Week 13 | Friday | Upper Bracket Round 1 | UB3: Seed 2 vs Seed 7 + UB4: Seed 3 vs Seed 6 | 2 Bo3 | Only upper bracket Round 1 is Bo3; two Bo3 matches may be played in one day. |
| Week 13 | Saturday | Upper Bracket Semifinal | UB5: Winner UB1 vs Winner UB2 | 1 Bo5 | One Bo5 per day. |
| Week 13 | Sunday | Upper Bracket Semifinal | UB6: Winner UB3 vs Winner UB4 | 1 Bo5 | One Bo5 per day. |
| Week 14 | Tuesday | Lower Bracket Round 1 | LB1: Loser UB1 vs Loser UB2 | 1 Bo5 | One Bo5 per day. |
| Week 14 | Wednesday | Lower Bracket Round 1 | LB2: Loser UB3 vs Loser UB4 | 1 Bo5 | One Bo5 per day. |
| Week 14 | Thursday | Lower Bracket Round 2 | LB3: Winner LB1 vs Loser UB6 | 1 Bo5 | One Bo5 per day. |
| Week 14 | Friday | Lower Bracket Round 2 | LB4: Winner LB2 vs Loser UB5 | 1 Bo5 | One Bo5 per day. |
| Week 14 | Saturday | Upper Bracket Final | UBF: Winner UB5 vs Winner UB6 | 1 Bo5 | One Bo5 per day. |
| Week 14 | Sunday | Lower Bracket Round 3 | LB5: Winner LB3 vs Winner LB4 | 1 Bo5 | One Bo5 per day. |
| Week 15 | Saturday | Lower Bracket Final | LBF: Winner LB5 vs Loser UBF | 1 Bo5 | One Bo5 per day. |
| Week 15 | Sunday | Grand Final | GF: Winner UBF vs Winner LBF | 1 Bo5 | No bracket reset by default; Spring champion is decided. |

---

## 8. Summer Regular Season Schedule

**Summer regular season:** Week 21~24, Week 27~30, Week 33~34  
**Total:** 10 weeks, 22 matchdays, 132 Bo1 matches

| Week | Day | Matchday | Matches | Notes |
|---|---|---|---|---|
| Week 21 | Friday | MD1 | 6 | Opening regular-season week; first week uses Fri/Sat/Sun |
| Week 21 | Saturday | MD2 | 6 | Opening weekend |
| Week 21 | Sunday | MD3 | 6 | Opening weekend |
| Week 22 | Saturday | MD4 | 6 | Cup week; regional matches only on weekend |
| Week 22 | Sunday | MD5 | 6 | Cup week; regional matches only on weekend |
| Week 23 | Saturday | MD6 | 6 | Standard regular-season week |
| Week 23 | Sunday | MD7 | 6 | Standard regular-season week |
| Week 24 | Saturday | MD8 | 6 | Cup week; regional matches only on weekend |
| Week 24 | Sunday | MD9 | 6 | Cup week; regional matches only on weekend |
| Week 27 | Saturday | MD10 | 6 | Standard regular-season week after IM |
| Week 27 | Sunday | MD11 | 6 | Standard regular-season week after IM |
| Week 28 | Saturday | MD12 | 6 | Cup week; regional matches only on weekend |
| Week 28 | Sunday | MD13 | 6 | Cup week; regional matches only on weekend |
| Week 29 | Saturday | MD14 | 6 | Standard regular-season week |
| Week 29 | Sunday | MD15 | 6 | Standard regular-season week |
| Week 30 | Saturday | MD16 | 6 | Cup week; regional matches only on weekend |
| Week 30 | Sunday | MD17 | 6 | Cup week; regional matches only on weekend |
| Week 33 | Saturday | MD18 | 6 | Standard regular-season week after IM |
| Week 33 | Sunday | MD19 | 6 | Standard regular-season week after IM |
| Week 34 | Friday | MD20 | 6 | Final regular-season week; uses Fri/Sat/Sun |
| Week 34 | Saturday | MD21 | 6 | Final regular-season weekend |
| Week 34 | Sunday | MD22 | 6 | Regular season ends |

---

## 9. Summer Playoff Schedule

The Summer playoff uses the same format as Spring.

| Week | Day | Stage | Match | Format | Notes |
|---|---|---|---|---|---|
| Week 35 | Thursday | Upper Bracket Round 1 | UB1: Seed 1 vs Seed 8 + UB2: Seed 4 vs Seed 5 | 2 Bo3 | Only upper bracket Round 1 is Bo3; two Bo3 matches may be played in one day. |
| Week 35 | Friday | Upper Bracket Round 1 | UB3: Seed 2 vs Seed 7 + UB4: Seed 3 vs Seed 6 | 2 Bo3 | Only upper bracket Round 1 is Bo3; two Bo3 matches may be played in one day. |
| Week 35 | Saturday | Upper Bracket Semifinal | UB5: Winner UB1 vs Winner UB2 | 1 Bo5 | One Bo5 per day. |
| Week 35 | Sunday | Upper Bracket Semifinal | UB6: Winner UB3 vs Winner UB4 | 1 Bo5 | One Bo5 per day. |
| Week 36 | Tuesday | Lower Bracket Round 1 | LB1: Loser UB1 vs Loser UB2 | 1 Bo5 | One Bo5 per day. |
| Week 36 | Wednesday | Lower Bracket Round 1 | LB2: Loser UB3 vs Loser UB4 | 1 Bo5 | One Bo5 per day. |
| Week 36 | Thursday | Lower Bracket Round 2 | LB3: Winner LB1 vs Loser UB6 | 1 Bo5 | One Bo5 per day. |
| Week 36 | Friday | Lower Bracket Round 2 | LB4: Winner LB2 vs Loser UB5 | 1 Bo5 | One Bo5 per day. |
| Week 36 | Saturday | Upper Bracket Final | UBF: Winner UB5 vs Winner UB6 | 1 Bo5 | One Bo5 per day. |
| Week 36 | Sunday | Lower Bracket Round 3 | LB5: Winner LB3 vs Winner LB4 | 1 Bo5 | One Bo5 per day. |
| Week 37 | Saturday | Lower Bracket Final | LBF: Winner LB5 vs Loser UBF | 1 Bo5 | One Bo5 per day. |
| Week 37 | Sunday | Grand Final | GF: Winner UBF vs Winner LBF | 1 Bo5 | No bracket reset by default; Summer champion is decided. |

---

## 10. Split-Level Match Count

| Section | Match Count |
|---|---:|
| Regular season | 132 Bo1 |
| Playoffs | 4 Bo3 + 10 Bo5 |
| Total scheduled match objects | 146 |

---

## 11. Yearly Match Count Per League

| Section | Match Count |
|---|---:|
| Spring regular season | 132 Bo1 |
| Spring playoffs | 4 Bo3 + 10 Bo5 |
| Summer regular season | 132 Bo1 |
| Summer playoffs | 4 Bo3 + 10 Bo5 |

---

## 12. Operating Notes

1. The regular season is single-venue and non-concurrent.
2. Six Bo1 matches per regular-season matchday are permitted.
3. The regular season naturally produces a 12-team double round robin.
4. Playoffs are single-venue and non-concurrent.
5. Upper Bracket Round 1 is the only Bo3 round.
6. Bo3 playoff days may host two matches.
7. Bo5 playoff days may host only one match.
8. Spring champion is decided on Week 15 Sunday.
9. Summer champion is decided on Week 37 Sunday.

---

## 13. Final Recommendation

Use this exact structure for both **L_NEU** and **L_WEU**:

> **10-week Bo1 double round-robin regular season + 3-week top-8 double-elimination playoff**

This format fits perfectly into the global regional windows, avoids cup-week conflicts, and keeps the playoff final on a Sunday for both splits.
