# 북미 리그 진행 방식 PRD / North America League Format PRD

**Document purpose:** Transfer the league format, schedule constraints, and operational rules to another AI or production team without relying on prior conversation context.  
**League type:** 24-team franchised esports league with home markets.  
**Divisions:** West Division, 12 teams; East Division, 12 teams.  
**Document version:** v1.0  
**Authoritative title:** 북미 리그 진행 방식 PRD

---

## 1. Executive Summary

This PRD defines a 24-team North American regional esports league that must fit into a 52-week global calendar. The league uses two divisions of 12 teams each. All regular-season matches are Bo5. The season has a first-half regional phase, a mid-season MM qualification tournament, a second-half integrated regular season, and a final playoff.

The regional league may only operate during these windows:

| Window | Weeks | Length | Role |
|---|---:|---:|---|
| Regional Window 1 | Week 1-6 | 6 weeks | First-half regular season, rounds 1-12 |
| Regional Window 2 | Week 9-15 | 7 weeks | First-half regular season rounds 13-22 plus MM qualifier |
| Regional Window 3 | Week 21-24 | 4 weeks | Second-half regular season rounds 1-9 |
| Regional Window 4 | Week 27-30 | 4 weeks | Second-half regular season rounds 10-18 |
| Regional Window 5 | Week 33-37 | 5 weeks | Second-half regular season rounds 19-23 plus final playoffs |

Total regional league time: **26 weeks**.

Core season structure:

| Phase | Duration | Output |
|---|---:|---|
| First-half regular season | 11 weeks | Division standings and MM qualifier seeds |
| MM qualifier | 2 weeks | 1 team qualifies to MM |
| Second-half regular season | 10 weeks | Final cumulative division standings |
| Final playoffs | 3 weeks | Season champion determined by Week 37 Sunday |

---

## 2. Key Assumptions and Definitions

### 2.1 Match Unit

Unless otherwise stated, **one match means one Bo5 match**.

### 2.2 Playoff Series Unit

For playoff series described as best-of-N, each “game” in that series is itself one Bo5 match.

Examples:

| Term | Meaning |
|---|---|
| Bo5 match | A standard best-of-5 map/game match |
| 3-match best-of-2-wins series | Up to 3 Bo5 matches; first team to win 2 Bo5 matches wins the series |
| 5-match best-of-3-wins final | Up to 5 Bo5 matches; first team to win 3 Bo5 matches wins the championship series |

### 2.3 Home Market Constraint

All 24 teams have home markets. Multiple matches may be hosted simultaneously in different home markets.

### 2.4 Weekend Exposure Principle

Regular-season weeks should include at least one Saturday or Sunday matchday whenever possible. This PRD uses **Thursday/Sunday** as the default regular-season rhythm and **Thursday/Saturday/Sunday** for 3-round weeks.

---

## 3. Global Calendar Constraints

### 3.1 Fixed Regional Windows

The league must complete all regular-season, qualifier, and playoff activity within the following windows:

| Period | Weeks | Available for regional league? | Notes |
|---|---:|---|---|
| Week 1-6 | 6 weeks | Yes | First-half regular season starts |
| Week 7-8 | 2 weeks | No | International Match, IM 1 |
| Week 9-15 | 7 weeks | Yes | First-half regular season ends; MM qualifier completed |
| Week 16-20 | 5 weeks | No | MM block, including rest before and after MM |
| Week 21-24 | 4 weeks | Yes | Second-half regular season starts |
| Week 25-26 | 2 weeks | No | International Match, IM 2 |
| Week 27-30 | 4 weeks | Yes | Second-half regular season continues |
| Week 31-32 | 2 weeks | No | International Match, IM 3 |
| Week 33-37 | 5 weeks | Yes | Second-half regular season ends; final playoffs completed |

### 3.2 Cup Tournament Restrictions

A cup tournament occurs on Tuesday of the listed weeks. During these weeks, regional league matches may not be scheduled on Monday, Tuesday, or Wednesday.

| Cup Week | Forbidden regional league days | Allowed regional league days |
|---:|---|---|
| Week 5 | Monday, Tuesday, Wednesday | Thursday, Friday, Saturday, Sunday |
| Week 9 | Monday, Tuesday, Wednesday | Thursday, Friday, Saturday, Sunday |
| Week 11 | Monday, Tuesday, Wednesday | Thursday, Friday, Saturday, Sunday |
| Week 22 | Monday, Tuesday, Wednesday | Thursday, Friday, Saturday, Sunday |
| Week 24 | Monday, Tuesday, Wednesday | Thursday, Friday, Saturday, Sunday |
| Week 28 | Monday, Tuesday, Wednesday | Thursday, Friday, Saturday, Sunday |
| Week 30 | Monday, Tuesday, Wednesday | Thursday, Friday, Saturday, Sunday |

The proposed schedule avoids conflicts by using Thursday/Sunday in all cup weeks.

---

## 4. League Structure

| Attribute | Value |
|---|---:|
| Total teams | 24 |
| Divisions | 2 |
| West Division | 12 teams |
| East Division | 12 teams |
| Team home markets | Yes, every team has one |
| Simultaneous matches | Allowed |
| Standard match format | Bo5 |

---

## 5. First-Half Regular Season

### 5.1 Format

The first half is division-only. Each team plays only teams in its own division.

| Attribute | Value |
|---|---:|
| Format | Intra-division double round robin |
| Teams per division | 12 |
| Matches per team | 22 |
| Matches per division | 132 |
| Total matches across both divisions | 264 |
| Duration | 11 weeks |
| Rounds | 22 |
| Matches per round | 12 total, 6 West + 6 East |
| Default matchdays | Thursday and Sunday |

Each team plays 2 matches per week during the first-half regular season.

### 5.2 First-Half Regular Season Schedule

| Week | Day | Round | Match Count | Notes |
|---:|---|---:|---:|---|
| Week 1 | Thursday | R1 | 12 | 6 West + 6 East |
| Week 1 | Sunday | R2 | 12 | Weekend slot |
| Week 2 | Thursday | R3 | 12 | 6 West + 6 East |
| Week 2 | Sunday | R4 | 12 | Weekend slot |
| Week 3 | Thursday | R5 | 12 | 6 West + 6 East |
| Week 3 | Sunday | R6 | 12 | Weekend slot |
| Week 4 | Thursday | R7 | 12 | 6 West + 6 East |
| Week 4 | Sunday | R8 | 12 | Weekend slot |
| Week 5 | Thursday | R9 | 12 | Cup week; Mon/Tue/Wed unavailable |
| Week 5 | Sunday | R10 | 12 | Cup week; weekend slot |
| Week 6 | Thursday | R11 | 12 | First intra-division cycle ends |
| Week 6 | Sunday | R12 | 12 | Return cycle starts |
| Week 9 | Thursday | R13 | 12 | Cup week; Mon/Tue/Wed unavailable |
| Week 9 | Sunday | R14 | 12 | Cup week; weekend slot |
| Week 10 | Thursday | R15 | 12 | 6 West + 6 East |
| Week 10 | Sunday | R16 | 12 | Weekend slot |
| Week 11 | Thursday | R17 | 12 | Cup week; Mon/Tue/Wed unavailable |
| Week 11 | Sunday | R18 | 12 | Cup week; weekend slot |
| Week 12 | Thursday | R19 | 12 | 6 West + 6 East |
| Week 12 | Sunday | R20 | 12 | Weekend slot |
| Week 13 | Thursday | R21 | 12 | Final stretch |
| Week 13 | Saturday | R22 | 12 | First-half regular season ends |
| Week 13 | Sunday | Tiebreaker reserve | As needed | MM qualifier seeding and cutline |

### 5.3 First-Half Output

By the end of Week 13, the league must have:

1. Final first-half standings for West and East divisions.
2. Top 4 teams in each division identified.
3. MM qualifier bracket seeded.
4. Any necessary tiebreakers completed by Week 13 Sunday.

---

## 6. MM Qualifier

### 6.1 Purpose

The MM qualifier determines the single team from this league that will advance to MM.

### 6.2 Qualification

| Division | Qualifying teams |
|---|---:|
| West | Top 4 by first-half standings |
| East | Top 4 by first-half standings |
| Total | 8 teams |

### 6.3 Match Format

All MM qualifier matches are **single Bo5 matches**. Each qualifier match must be held on a different calendar day.

### 6.4 Bracket Structure

| Stage | Matchup | Format |
|---|---|---|
| West Semifinal A | West #1 vs West #4 | Single Bo5 |
| West Semifinal B | West #2 vs West #3 | Single Bo5 |
| East Semifinal A | East #1 vs East #4 | Single Bo5 |
| East Semifinal B | East #2 vs East #3 | Single Bo5 |
| West Final | West semifinal winners | Single Bo5 |
| East Final | East semifinal winners | Single Bo5 |
| Final MM Qualification Match | West winner vs East winner | Single Bo5 |

Total matches: **7**.

### 6.5 Venue Rules

| Stage | Venue rule |
|---|---|
| Division semifinals | Higher seed hosts |
| Division finals | Higher seed hosts |
| Final MM Qualification Match | Team with better first-half record hosts |

If cross-division hosting requires a tiebreaker, use the following order: match win rate, match differential, game/map differential, head-to-head if applicable, then league office decision or tiebreaker.

### 6.6 MM Qualifier Schedule

| Week | Day | Match | Match Count | Venue |
|---:|---|---|---:|---|
| Week 14 | Thursday | West Semifinal A: W1 vs W4 | 1 | W1 home |
| Week 14 | Friday | East Semifinal A: E1 vs E4 | 1 | E1 home |
| Week 14 | Saturday | West Semifinal B: W2 vs W3 | 1 | W2 home |
| Week 14 | Sunday | East Semifinal B: E2 vs E3 | 1 | E2 home |
| Week 15 | Thursday | West Division Final | 1 | Higher seed home |
| Week 15 | Friday | East Division Final | 1 | Higher seed home |
| Week 15 | Sunday | Final MM Qualification Match | 1 | Better first-half record home |

By Week 15 Sunday, the MM representative must be determined.

---

## 7. Second-Half Regular Season

### 7.1 Format

The second half is an integrated 24-team single round robin. All 24 teams play each other once.

Important: First-half records are retained. Final playoff qualification uses cumulative season standings, while playoff cutlines are still evaluated by division.

| Attribute | Value |
|---|---:|
| Format | 24-team single round robin |
| Teams | 24 |
| Matches per team | 23 |
| Total matches | 276 |
| Duration | 10 weeks |
| Rounds | 23 |
| Matches per round | 12 |
| Standings basis | Cumulative first-half + second-half record |
| Playoff qualification | Top 8 in each division |

### 7.2 Weekly Rhythm

| Week type | Matchdays | Rounds | Notes |
|---|---|---:|---|
| Standard week | Thursday, Sunday | 2 | Default rhythm |
| 3-round week | Thursday, Saturday, Sunday | 3 | Used after long breaks |
| Cup week | Thursday, Sunday | 2 | Mon/Tue/Wed unavailable |
| Final regular-season week | Thursday, Saturday | 2 | Sunday reserved for tiebreakers |

### 7.3 Second-Half Regular Season Schedule

| Week | Day | Round | Match Count | Notes |
|---:|---|---:|---:|---|
| Week 21 | Thursday | R1 | 12 | Second-half opening |
| Week 21 | Saturday | R2 | 12 | 3-round week |
| Week 21 | Sunday | R3 | 12 | Weekend slot |
| Week 22 | Thursday | R4 | 12 | Cup week; Mon/Tue/Wed unavailable |
| Week 22 | Sunday | R5 | 12 | Cup week; weekend slot |
| Week 23 | Thursday | R6 | 12 | Standard week |
| Week 23 | Sunday | R7 | 12 | Weekend slot |
| Week 24 | Thursday | R8 | 12 | Cup week; Mon/Tue/Wed unavailable |
| Week 24 | Sunday | R9 | 12 | Cup week; weekend slot |
| Week 27 | Thursday | R10 | 12 | Restart after IM 2 |
| Week 27 | Saturday | R11 | 12 | 3-round week |
| Week 27 | Sunday | R12 | 12 | Weekend slot |
| Week 28 | Thursday | R13 | 12 | Cup week; Mon/Tue/Wed unavailable |
| Week 28 | Sunday | R14 | 12 | Cup week; weekend slot |
| Week 29 | Thursday | R15 | 12 | Standard week |
| Week 29 | Sunday | R16 | 12 | Weekend slot |
| Week 30 | Thursday | R17 | 12 | Cup week; Mon/Tue/Wed unavailable |
| Week 30 | Sunday | R18 | 12 | Cup week; weekend slot |
| Week 33 | Thursday | R19 | 12 | Restart after IM 3 |
| Week 33 | Saturday | R20 | 12 | 3-round week |
| Week 33 | Sunday | R21 | 12 | Weekend slot |
| Week 34 | Thursday | R22 | 12 | Final stretch |
| Week 34 | Saturday | R23 | 12 | Second-half regular season ends |
| Week 34 | Sunday | Tiebreaker reserve | As needed | Playoff seeds and cutline |

### 7.4 Second-Half Output

By the end of Week 34, the league must have:

1. Cumulative standings finalized.
2. Top 8 teams in each division identified.
3. Playoff bracket seeded.
4. Tiebreakers completed by Week 34 Sunday if needed.

---

## 8. Final Playoffs

### 8.1 Qualification

After the second-half regular season, the top 8 teams in each division qualify for the final playoffs.

| Division | Playoff teams |
|---|---:|
| West | Top 8 |
| East | Top 8 |
| Total | 16 teams |

### 8.2 Bracket Structure

The playoff has four stages:

1. Division Quarterfinals
2. Division Semifinals
3. Division Finals
4. Grand Final

### 8.3 Division Quarterfinals

Each division uses the following matchups:

| Matchup | Series format | Advantage |
|---|---|---|
| #1 vs #8 | 3-match best-of-2-wins | #1 starts with 1 win |
| #2 vs #7 | 3-match best-of-2-wins | #2 starts with 1 win |
| #3 vs #6 | 3-match best-of-2-wins | #3 starts with 1 win |
| #4 vs #5 | 3-match best-of-2-wins | #4 starts with 1 win |

Because the higher seed starts with a 1-0 series lead, the actual number of Bo5 matches per quarterfinal series is 1 or 2.

Outcome logic:

| First Bo5 result | Series state | Next step |
|---|---|---|
| Higher seed wins | Higher seed wins series 2-0 | Higher seed advances |
| Lower seed wins | Series tied 1-1 | A second Bo5 is played |
| Second Bo5 result | Winner reaches 2 wins | Winner advances |

### 8.4 Division Semifinals

Recommended fixed bracket:

| Semifinal | Matchup | Series format |
|---|---|---|
| Semifinal A | Winner of #1/#8 vs winner of #4/#5 | 3-match best-of-2-wins |
| Semifinal B | Winner of #2/#7 vs winner of #3/#6 | 3-match best-of-2-wins |

### 8.5 Division Finals

| Division | Matchup | Series format |
|---|---|---|
| West Final | West semifinal winners | 3-match best-of-2-wins |
| East Final | East semifinal winners | 3-match best-of-2-wins |

### 8.6 Grand Final

| Matchup | Series format |
|---|---|
| West champion vs East champion | 5-match best-of-3-wins |

The Grand Final may require between 3 and 5 Bo5 matches.

---

## 9. Playoff Venue Rules

### 9.1 Non-Final Playoff Rounds

All Division Quarterfinal, Division Semifinal, and Division Final matches are hosted in the higher seed's home market. Consecutive matchdays are acceptable because the series is hosted in the same local market.

| Round | Venue rule |
|---|---|
| Division Quarterfinals | Higher seed hosts all matches in that series |
| Division Semifinals | Higher seed hosts all matches in that series |
| Division Finals | Higher seed hosts all matches in that series |

### 9.2 Grand Final Venue Format

The Grand Final uses a 2-2-1 home format.

| Grand Final Match | Venue |
|---|---|
| Match 1 | Home-advantage team home market |
| Match 2 | Home-advantage team home market |
| Match 3 | Opposing team home market |
| Match 4, if needed | Opposing team home market |
| Match 5, if needed | Home-advantage team home market |

This satisfies the requirement that Grand Final Matches 1, 2, and 5 are in one region, while Matches 3 and 4 are in the other finalist's region.

### 9.3 Grand Final Home Advantage

Grand Final home advantage is determined in this order:

1. Higher cumulative regular-season match win rate.
2. Higher cumulative regular-season match differential.
3. Higher cumulative regular-season map/game differential.
4. Head-to-head result, if applicable.
5. Higher playoff seed.
6. League office tiebreaker or designated neutral rule.

---

## 10. Playoff Match Volume

| Stage | Number of series | Series format | Actual Bo5 matches |
|---|---:|---|---:|
| Division Quarterfinals | 8 | 3-match best-of-2-wins with 1-win advantage | 8-16 |
| Division Semifinals | 4 | 3-match best-of-2-wins | 8-12 |
| Division Finals | 2 | 3-match best-of-2-wins | 4-6 |
| Grand Final | 1 | 5-match best-of-3-wins | 3-5 |
| Total | 15 | Mixed | 23-39 |

---

## 11. Playoff Schedule

### 11.1 Week 35: Division Quarterfinals and Semifinals

| Week | Day | Stage | Match Count | Venue |
|---:|---|---|---:|---|
| Week 35 | Monday | Division Quarterfinals, Match 1 | 8 | Higher seed home |
| Week 35 | Tuesday | Division Quarterfinals, Match 2 if needed | Up to 8 | Higher seed home |
| Week 35 | Wednesday | Travel / bracket processing | 0 | No matches |
| Week 35 | Thursday | Division Semifinals, Match 1 | 4 | Higher seed home |
| Week 35 | Friday | Division Semifinals, Match 2 | 4 | Higher seed home |
| Week 35 | Saturday | Division Semifinals, Match 3 if needed | Up to 4 | Higher seed home |
| Week 35 | Sunday | Rest / media / operations buffer | 0 | No matches |

### 11.2 Week 36: Division Finals

| Week | Day | Stage | Match Count | Venue |
|---:|---|---|---:|---|
| Week 36 | Tuesday | West/East Division Finals, Match 1 | 2 | Higher seed home |
| Week 36 | Wednesday | West/East Division Finals, Match 2 | 2 | Higher seed home |
| Week 36 | Friday | West/East Division Finals, Match 3 if needed | Up to 2 | Higher seed home |
| Week 36 | Saturday | Grand Final travel / media | 0 | No matches |
| Week 36 | Sunday | Grand Final media day | 0 | No matches |

### 11.3 Week 37: Grand Final

| Week | Day | Stage | Match Count | Venue |
|---:|---|---|---:|---|
| Week 37 | Monday | Grand Final Match 1 | 1 | Home-advantage team home |
| Week 37 | Tuesday | Grand Final Match 2 | 1 | Home-advantage team home |
| Week 37 | Wednesday | Travel day | 0 | No matches |
| Week 37 | Thursday | Grand Final Match 3 | 1 | Opposing team home |
| Week 37 | Friday | Grand Final Match 4 if needed | Up to 1 | Opposing team home |
| Week 37 | Saturday | Travel day | 0 | No matches |
| Week 37 | Sunday | Grand Final Match 5 if needed | Up to 1 | Home-advantage team home |

The season champion must be determined no later than Week 37 Sunday.

---

## 12. Ranking and Tiebreaker Rules

### 12.1 Standard Ranking Order

Use the following ranking order for first-half standings, cumulative regular-season standings, MM qualification, and playoff seeding.

| Priority | Criterion |
|---:|---|
| 1 | Match win rate |
| 2 | Match wins |
| 3 | Head-to-head record |
| 4 | Match differential |
| 5 | Map/game differential |
| 6 | Division record where applicable |
| 7 | Bo5 tiebreaker match |

### 12.2 Tiebreaker Reserve Days

| Phase | Reserve day | Purpose |
|---|---|---|
| First half | Week 13 Sunday | MM qualifier cutline and seeding |
| Second half | Week 34 Sunday | Final playoff cutline and seeding |

If more than two teams are tied, the league office may use a mini-bracket, ladder bracket, or other pre-announced competitive tiebreaker.

---

## 13. Home and Away Rules for Regular Season

### 13.1 First Half

In the first-half division-only double round robin, each pair of teams in the same division plays twice. The intended home/away split is:

| Matchup type | Home/away rule |
|---|---|
| Same opponent, two matches | Each team hosts once |

### 13.2 Second Half

In the second-half 24-team single round robin, each pair of teams plays once. Since each team has 23 second-half matches, exact equal home/away distribution is impossible for that half alone.

For the full regular season, each team plays 45 matches:

| Phase | Matches per team |
|---|---:|
| First half | 22 |
| Second half | 23 |
| Full regular season | 45 |

Because 45 is odd, teams should finish with either 22 or 23 home matches across the full regular season.

---

## 14. Broadcast and Operations Guidance

Because 12 matches occur per regular-season round, full centralized broadcast coverage is impractical unless multiple streams are used.

Recommended broadcast structure:

| Layer | Recommendation |
|---|---|
| Main broadcast | 2-3 featured matches per round |
| Local broadcasts | Team/home-market streams for all matches |
| Highlights | All matches receive highlight packages |
| Weekend flagship | Sunday or Saturday prime match selected as marquee game |
| Playoff broadcast | All playoff matches should be covered, with simultaneous feeds when needed |
| Grand Final | Standalone broadcast, no simultaneous matches |

---

## 15. Total Match Count

| Phase | Match count |
|---|---:|
| First-half regular season | 264 |
| MM qualifier | 7 |
| Second-half regular season | 276 |
| Final playoffs | 23-39 |
| Total | 570-586 |

---

## 16. Full Season Calendar Summary

| Week | Activity | Primary days |
|---:|---|---|
| Week 1 | First-half regular season R1-R2 | Thu/Sun |
| Week 2 | First-half regular season R3-R4 | Thu/Sun |
| Week 3 | First-half regular season R5-R6 | Thu/Sun |
| Week 4 | First-half regular season R7-R8 | Thu/Sun |
| Week 5 | First-half regular season R9-R10 | Thu/Sun, cup week |
| Week 6 | First-half regular season R11-R12 | Thu/Sun |
| Week 7-8 | IM 1 | No regional league |
| Week 9 | First-half regular season R13-R14 | Thu/Sun, cup week |
| Week 10 | First-half regular season R15-R16 | Thu/Sun |
| Week 11 | First-half regular season R17-R18 | Thu/Sun, cup week |
| Week 12 | First-half regular season R19-R20 | Thu/Sun |
| Week 13 | First-half regular season R21-R22 | Thu/Sat, Sun reserve |
| Week 14 | MM qualifier division semifinals | Thu/Fri/Sat/Sun |
| Week 15 | MM qualifier division finals and final qualifier | Thu/Fri/Sun |
| Week 16-20 | MM block | No regional league |
| Week 21 | Second-half regular season R1-R3 | Thu/Sat/Sun |
| Week 22 | Second-half regular season R4-R5 | Thu/Sun, cup week |
| Week 23 | Second-half regular season R6-R7 | Thu/Sun |
| Week 24 | Second-half regular season R8-R9 | Thu/Sun, cup week |
| Week 25-26 | IM 2 | No regional league |
| Week 27 | Second-half regular season R10-R12 | Thu/Sat/Sun |
| Week 28 | Second-half regular season R13-R14 | Thu/Sun, cup week |
| Week 29 | Second-half regular season R15-R16 | Thu/Sun |
| Week 30 | Second-half regular season R17-R18 | Thu/Sun, cup week |
| Week 31-32 | IM 3 | No regional league |
| Week 33 | Second-half regular season R19-R21 | Thu/Sat/Sun |
| Week 34 | Second-half regular season R22-R23 | Thu/Sat, Sun reserve |
| Week 35 | Division Quarterfinals and Semifinals | Mon/Tue/Thu/Fri/Sat |
| Week 36 | Division Finals | Tue/Wed/Fri |
| Week 37 | Grand Final | Mon/Tue/Thu/Fri/Sun |

---

## 17. Requirements Checklist

| Requirement | Status |
|---|---|
| 24-team league | Satisfied |
| West/East divisions of 12 teams each | Satisfied |
| All regular-season matches are Bo5 | Satisfied |
| First half is intra-division double round robin | Satisfied |
| First half gives each team 22 matches | Satisfied |
| First-half regular season takes 11 weeks | Satisfied |
| Top 4 per division enter MM qualifier | Satisfied |
| MM qualifier uses single Bo5 matches | Satisfied |
| Every MM qualifier match is held on a different day | Satisfied |
| Exactly 1 team qualifies to MM | Satisfied |
| Second half is 24-team single round robin | Satisfied |
| Second half gives each team 23 matches | Satisfied |
| Second-half regular season takes 10 weeks | Satisfied |
| First-half records are retained | Satisfied |
| Top 8 per division qualify for final playoffs | Satisfied |
| Final playoffs take 3 weeks | Satisfied |
| Quarterfinals give higher seeds 1-win advantage | Satisfied |
| Semifinals and division finals are 3-match best-of-2-wins | Satisfied |
| Grand Final is 5-match best-of-3-wins | Satisfied |
| Regular-season weeks include weekend matchdays | Satisfied |
| Cup weeks avoid Monday/Tuesday/Wednesday | Satisfied |
| Playoffs are hosted by higher seeds | Satisfied |
| Grand Final uses separate 1/2/5 and 3/4 host regions | Satisfied |
| Season champion is decided by Week 37 Sunday | Satisfied |

---

## 18. Final Recommended Configuration

The recommended operating model is:

- First half: 11 weeks of regular season plus 2 weeks of MM qualifier.
- Second half: 10 weeks of regular season plus 3 weeks of final playoffs.
- Regular-season default days: Thursday and Sunday.
- 3-round regular-season weeks: Thursday, Saturday, Sunday.
- Playoffs: hosted at higher seed home markets.
- Grand Final: 2-2-1 home format.
- Total season match volume: 570 to 586 Bo5 matches.
- Champion determined no later than Week 37 Sunday.

This format emphasizes regional home-market identity, weekend viewership, playoff home advantage, and a high-stakes two-city Grand Final structure.
