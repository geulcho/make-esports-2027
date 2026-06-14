# L_TW / L_JP League Format PRD

**Document version:** v1.0  
**Target leagues:** 대만홍콩 `L_TW`, 일본 `L_JP`  
**League size:** 8 teams  
**Venue model:** single venue  
**Season model:** Spring / Summer split system  
**Regular season match type:** Bo3  
**Playoff match type:** Bo5  
**Champions per year:** 2 per league, Spring champion and Summer champion

---

## 1. Purpose

This PRD defines the shared competition format for the 8-team Taiwan-Hong Kong league `L_TW` and Japan league `L_JP`.

Both leagues use a compact regional format. The goal is to complete each split quickly, keep the majority of matches on weekends, and allow these leagues to finish earlier than larger leagues in the global calendar.

---

## 2. Core League Structure

| Item | Rule |
|---|---:|
| Teams | 8 |
| Venue | Single league venue |
| Splits | Spring / Summer |
| Regular season format | Double round robin |
| Regular season match type | Bo3 |
| Playoff teams | Top 5 |
| Playoff format | Stepladder tournament |
| Playoff match type | Bo5 |
| Playoff duration | 2 weeks |
| Simultaneous matches | Not allowed |

---

## 3. Regular Season Format

Each split uses an 8-team Bo3 double round robin.

| Item | Value |
|---|---:|
| Teams | 8 |
| Matches per team | 14 |
| Total matches per split | 56 |
| Total rounds | 14 |
| Matches per round | 4 |
| Duration | 7 weeks |
| Matches per week | 8 |

Calculation:

```text
8 teams choose 2 = 28 pairings
Double round robin = 28 × 2 = 56 matches
Each team plays 14 matches
```

---

## 4. Regular Season Weekly Distribution

To avoid overloading a single-venue broadcast day while still prioritizing weekend viewership, the default weekly distribution is:

| Day | Matches | Type |
|---|---:|---|
| Friday | 2 matches | Bo3 |
| Saturday | 3 matches | Bo3 |
| Sunday | 3 matches | Bo3 |
| Total | **8 matches** |  |

Operational rules:

- Every team should play exactly two regular-season matches per week.
- A team should not be assigned more than one match on the same day.
- 75% of weekly matches are played on Saturday/Sunday.
- Round labels may be split across multiple days. The league office should generate the actual fixture list while preserving weekly totals and rest rules.

---

## 5. Spring Split Calendar

Spring uses Week 1-6 and Week 9 for the regular season, then Week 10-11 for playoffs.

| Calendar week | Stage | Days | Matches |
|---:|---|---|---:|
| Week 1 | Regular Season Week 1 | Fri/Sat/Sun | 8 Bo3 |
| Week 2 | Regular Season Week 2 | Fri/Sat/Sun | 8 Bo3 |
| Week 3 | Regular Season Week 3 | Fri/Sat/Sun | 8 Bo3 |
| Week 4 | Regular Season Week 4 | Fri/Sat/Sun | 8 Bo3 |
| Week 5 | Regular Season Week 5 | Fri/Sat/Sun | 8 Bo3 |
| Week 6 | Regular Season Week 6 | Fri/Sat/Sun | 8 Bo3 |
| Week 7-8 | IM break | No regional league | 0 |
| Week 9 | Regular Season Week 7 | Fri/Sat/Sun | 8 Bo3 |
| Week 10 | Playoff Round 1-2 | Sat/Sun | 2 Bo5 |
| Week 11 | Playoff Round 3-Final | Sat/Sun | 2 Bo5 |

Spring champion is planned to be decided on **Week 11 Sunday**. The global deadline is Week 15, so this league intentionally finishes early.

### Spring Regular Season Detail

| Season week | Calendar week | Friday | Saturday | Sunday | Total |
|---:|---:|---:|---:|---:|---:|
| 1 | Week 1 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 2 | Week 2 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 3 | Week 3 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 4 | Week 4 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 5 | Week 5 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 6 | Week 6 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 7 | Week 9 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
|  | Total | **14** | **21** | **21** | **56** |

---

## 6. Summer Split Calendar

Summer uses Week 21-23 and Week 27-30 for the regular season, then Week 33-34 for playoffs.

Week 24 is reserved as a buffer/rest/media week. Week 25-26 and Week 31-32 are IM blocks.

| Calendar week | Stage | Days | Matches |
|---:|---|---|---:|
| Week 21 | Regular Season Week 1 | Fri/Sat/Sun | 8 Bo3 |
| Week 22 | Regular Season Week 2 | Fri/Sat/Sun | 8 Bo3 |
| Week 23 | Regular Season Week 3 | Fri/Sat/Sun | 8 Bo3 |
| Week 24 | Buffer / rest / media | No default matches | 0 |
| Week 25-26 | IM break | No regional league | 0 |
| Week 27 | Regular Season Week 4 | Fri/Sat/Sun | 8 Bo3 |
| Week 28 | Regular Season Week 5 | Fri/Sat/Sun | 8 Bo3 |
| Week 29 | Regular Season Week 6 | Fri/Sat/Sun | 8 Bo3 |
| Week 30 | Regular Season Week 7 | Fri/Sat/Sun | 8 Bo3 |
| Week 31-32 | IM break | No regional league | 0 |
| Week 33 | Playoff Round 1-2 | Sat/Sun | 2 Bo5 |
| Week 34 | Playoff Round 3-Final | Sat/Sun | 2 Bo5 |

Summer champion is planned to be decided on **Week 34 Sunday**. The global deadline is Week 37, so this league intentionally finishes early.

### Summer Regular Season Detail

| Season week | Calendar week | Friday | Saturday | Sunday | Total |
|---:|---:|---:|---:|---:|---:|
| 1 | Week 21 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 2 | Week 22 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 3 | Week 23 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 4 | Week 27 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 5 | Week 28 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 6 | Week 29 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
| 7 | Week 30 | 2 Bo3 | 3 Bo3 | 3 Bo3 | 8 |
|  | Total | **14** | **21** | **21** | **56** |

---

## 7. Cup Week Constraints

The global cup-week rule bans regional league matches on Monday, Tuesday, and Wednesday of the following weeks:

```text
Week 5, Week 9, Week 11, Week 22, Week 24, Week 28, Week 30
```

This format has no conflict with the cup-week rule because regular season matches are played on Friday/Saturday/Sunday and playoffs are played on Saturday/Sunday.

---

## 8. Playoff Format

Top 5 teams qualify for playoffs.

The playoff uses a 5-team stepladder tournament.

| Round | Day | Match | Type |
|---:|---|---|---|
| Round 1 | Saturday | Seed 4 vs Seed 5 | Bo5 |
| Round 2 | Sunday | Seed 3 vs Round 1 Winner | Bo5 |
| Round 3 | Saturday | Seed 2 vs Round 2 Winner | Bo5 |
| Round 4 / Final | Sunday | Seed 1 vs Round 3 Winner | Bo5 |

There is no bracket reset. The Round 4 winner is the split champion.

---

## 9. Spring Playoff Schedule

| Calendar week | Day | Round | Match | Type |
|---:|---|---|---|---|
| Week 10 | Saturday | Round 1 | Seed 4 vs Seed 5 | Bo5 |
| Week 10 | Sunday | Round 2 | Seed 3 vs Round 1 Winner | Bo5 |
| Week 11 | Saturday | Round 3 | Seed 2 vs Round 2 Winner | Bo5 |
| Week 11 | Sunday | Final | Seed 1 vs Round 3 Winner | Bo5 |

---

## 10. Summer Playoff Schedule

| Calendar week | Day | Round | Match | Type |
|---:|---|---|---|---|
| Week 33 | Saturday | Round 1 | Seed 4 vs Seed 5 | Bo5 |
| Week 33 | Sunday | Round 2 | Seed 3 vs Round 1 Winner | Bo5 |
| Week 34 | Saturday | Round 3 | Seed 2 vs Round 2 Winner | Bo5 |
| Week 34 | Sunday | Final | Seed 1 vs Round 3 Winner | Bo5 |

---

## 11. Standings and Tiebreakers

Recommended ranking order:

1. Match win percentage
2. Match wins
3. Head-to-head record
4. Game differential
5. Game wins
6. Tiebreaker match if required for playoff qualification or championship seeding

Recommended tiebreaker slot:

- Friday before playoff Round 1 if required.
- Tiebreaker match type: Bo3 unless the league office specifies otherwise.

---

## 12. Match Count Summary

### Per split, per league

| Stage | Matches |
|---|---:|
| Regular season | 56 |
| Playoffs | 4 |
| Total | **60** |

### Annual total, per league

| Stage | Matches |
|---|---:|
| Spring | 60 |
| Summer | 60 |
| Annual total | **120** |

For both `L_TW` and `L_JP` combined, the annual total is **240 matches**.

---

## 13. Final Operating Summary

| Item | Final setting |
|---|---|
| Teams | 8 |
| Splits | Spring / Summer |
| Regular season | Bo3 double round robin |
| Regular season length | 7 weeks |
| Regular season weekly pattern | Friday 2, Saturday 3, Sunday 3 |
| Playoff teams | Top 5 |
| Playoff format | 5-team stepladder |
| Playoff length | 2 weeks |
| Playoff match type | Bo5 |
| Spring champion | Week 11 Sunday |
| Summer champion | Week 34 Sunday |

This is a compact, weekend-heavy format. It gives the top seed a large reward, keeps the single-venue workload under control, and lets smaller 8-team leagues finish before the larger regional leagues reach their final weekends.
