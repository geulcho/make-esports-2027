# L_SEA League Format PRD

**Document version:** v1.2  
**Applies to:** L_SEA  
**League name:** Southeast Asia League  
**League type:** 12-team single-venue Bo3 league  
**Season structure:** Spring split + Summer split  
**Champion cadence:** Two champions per year, one in Spring and one in Summer

---

## 1. Purpose

This PRD defines the competition format for the Southeast Asia League (**L_SEA**).

L_SEA uses a compact 8-week regular season while keeping the schedule as audience-friendly as possible:

- 12 teams
- One centralized arena
- No concurrent matches
- All regular-season matches are **Bo3**
- Spring and Summer are separate splits
- Each split has an **8-week regular season**
- Each split has a **3-week playoff**
- The playoff format is identical to **L_NEU / L_WEU**
- Regular-season matches are scheduled primarily on **Friday, Saturday, and Sunday**
- Thursday is allowed as an overflow or emergency slot, but the base 8-week plan does not require it

---

## 2. Global Calendar Fit

| Split | Regular Season | Playoffs | Planned Champion Date | Global Deadline |
|---|---:|---:|---:|---:|
| Spring | Week 1~6, Week 9~10 | Week 11~13 | Week 13 Sunday | Week 15 Sunday |
| Summer | Week 21~24, Week 27~30 | Week 33~35 | Week 35 Sunday | Week 37 Sunday |

The schedule respects the cup-week constraint: in **Week 5, 9, 11, 22, 24, 28, and 30**, regional league matches cannot be held on Monday, Tuesday, or Wednesday.

Because L_SEA finishes early, **Week 14~15** in Spring and **Week 36~37** in Summer remain open for rest, content, local events, broadcast specials, travel buffers, or other league-specific uses.

---

## 3. League Structure

| Item | Specification |
|---|---:|
| Teams | 12 |
| Venue model | Single centralized arena |
| Concurrent matches | No |
| Season structure | Spring / Summer double split |
| Regular-season match format | Bo3 |
| Regular-season duration | 8 weeks per split |
| Playoff duration | 3 weeks per split |
| Playoff entrants | Top 8 teams |
| Playoff format | Double elimination |
| Upper Bracket Round 1 | Bo3 |
| All other playoff matches | Bo5 |
| Grand Final bracket reset | No, by default |

---

## 4. Regular Season Format

Each split uses a **12-team single round robin**.

| Calculation | Result |
|---|---:|
| Teams | 12 |
| Opponents per team | 11 |
| Matches per team | 11 |
| Total regular-season matches | 12 x 11 / 2 = 66 |
| Match sessions | 22 |
| Matches per session | 3 Bo3 |
| Match format | Bo3 |

The pairing generator must ensure that each team plays every other team exactly once. The broadcast schedule groups the 66 matches into **22 sessions of 3 Bo3 matches**.

---

## 5. Weekend-First Scheduling Policy

The base plan uses **all Saturday and Sunday dates** in the 8-week regular-season window, then adds Friday sessions to finish within 8 weeks.

| Metric | Per Split |
|---|---:|
| Total regular-season matches | 66 Bo3 |
| Total match sessions | 22 sessions |
| Saturday/Sunday sessions | 16 sessions |
| Saturday/Sunday matches | 48 Bo3 |
| Friday sessions | 6 sessions |
| Friday matches | 18 Bo3 |
| Thursday sessions in base plan | 0 |
| Weekend share of regular-season matches | 72.7% |
| Friday + weekend share | 100% |

This avoids an 11-week weekend-only schedule while still keeping every regular-season match on a high-audience day.

**Thursday policy:** Thursday is approved as an overflow, makeup, or emergency rescheduling slot. It is not needed in the base regular-season calendar because Friday/Saturday/Sunday already complete all 66 matches in 8 weeks.

---

## 6. Spring Regular Season Schedule

**Spring regular season:** Week 1~6 and Week 9~10  
**Total:** 8 weeks, 22 sessions, 66 Bo3 matches

| Week | Day | Session | Matches | Format | Notes |
|---|---|---|---|---|---|
| Week 1 | Friday | RS1 | 3 | Bo3 | Opening regular-season week. Friday compression slot. |
| Week 1 | Saturday | RS2 | 3 | Bo3 | Opening regular-season week. Weekend priority slot. |
| Week 1 | Sunday | RS3 | 3 | Bo3 | Opening regular-season week. Weekend priority slot. |
| Week 2 | Friday | RS4 | 3 | Bo3 | Standard Friday-to-Sunday week. Friday compression slot. |
| Week 2 | Saturday | RS5 | 3 | Bo3 | Standard Friday-to-Sunday week. Weekend priority slot. |
| Week 2 | Sunday | RS6 | 3 | Bo3 | Standard Friday-to-Sunday week. Weekend priority slot. |
| Week 3 | Friday | RS7 | 3 | Bo3 | Standard Friday-to-Sunday week. Friday compression slot. |
| Week 3 | Saturday | RS8 | 3 | Bo3 | Standard Friday-to-Sunday week. Weekend priority slot. |
| Week 3 | Sunday | RS9 | 3 | Bo3 | Standard Friday-to-Sunday week. Weekend priority slot. |
| Week 4 | Friday | RS10 | 3 | Bo3 | Standard Friday-to-Sunday week. Friday compression slot. |
| Week 4 | Saturday | RS11 | 3 | Bo3 | Standard Friday-to-Sunday week. Weekend priority slot. |
| Week 4 | Sunday | RS12 | 3 | Bo3 | Standard Friday-to-Sunday week. Weekend priority slot. |
| Week 5 | Saturday | RS13 | 3 | Bo3 | Cup week; no regional matches on Mon/Tue/Wed. Weekend-only regular-season week. Weekend priority slot. |
| Week 5 | Sunday | RS14 | 3 | Bo3 | Cup week; no regional matches on Mon/Tue/Wed. Weekend-only regular-season week. Weekend priority slot. |
| Week 6 | Friday | RS15 | 3 | Bo3 | Final pre-IM regular-season week. Friday compression slot. |
| Week 6 | Saturday | RS16 | 3 | Bo3 | Final pre-IM regular-season week. Weekend priority slot. |
| Week 6 | Sunday | RS17 | 3 | Bo3 | Final pre-IM regular-season week. Weekend priority slot. |
| Week 9 | Saturday | RS18 | 3 | Bo3 | Cup week after IM; no regional matches on Mon/Tue/Wed. Weekend-only regular-season week. Weekend priority slot. |
| Week 9 | Sunday | RS19 | 3 | Bo3 | Cup week after IM; no regional matches on Mon/Tue/Wed. Weekend-only regular-season week. Weekend priority slot. |
| Week 10 | Friday | RS20 | 3 | Bo3 | Final regular-season week. Friday compression slot. |
| Week 10 | Saturday | RS21 | 3 | Bo3 | Final regular-season week. Weekend priority slot. |
| Week 10 | Sunday | RS22 | 3 | Bo3 | Final regular-season week. Weekend priority slot. |

---

## 7. Playoff Format

The top 8 teams from the regular season qualify.

The playoff format is identical to L_NEU / L_WEU:

| ID | Stage | Matchup | Format |
|---|---|---|---|
| UB1 | Upper Bracket Round 1 | Seed 1 vs Seed 8 | Bo3 |
| UB2 | Upper Bracket Round 1 | Seed 4 vs Seed 5 | Bo3 |
| UB3 | Upper Bracket Round 1 | Seed 2 vs Seed 7 | Bo3 |
| UB4 | Upper Bracket Round 1 | Seed 3 vs Seed 6 | Bo3 |
| UB5 | Upper Bracket Semifinal | Winner UB1 vs Winner UB2 | Bo5 |
| UB6 | Upper Bracket Semifinal | Winner UB3 vs Winner UB4 | Bo5 |
| LB1 | Lower Bracket Round 1 | Loser UB1 vs Loser UB2 | Bo5 |
| LB2 | Lower Bracket Round 1 | Loser UB3 vs Loser UB4 | Bo5 |
| LB3 | Lower Bracket Round 2 | Winner LB1 vs Loser UB6 | Bo5 |
| LB4 | Lower Bracket Round 2 | Winner LB2 vs Loser UB5 | Bo5 |
| UBF | Upper Bracket Final | Winner UB5 vs Winner UB6 | Bo5 |
| LB5 | Lower Bracket Round 3 | Winner LB3 vs Winner LB4 | Bo5 |
| LBF | Lower Bracket Final | Winner LB5 vs Loser UBF | Bo5 |
| GF | Grand Final | Winner UBF vs Winner LBF | Bo5 |

**Default rule:** no bracket reset in the Grand Final.

### Playoff Match Count

| Match Type | Count | Daily Limit |
|---|---:|---:|
| Bo3 | 4 matches | Up to 2 per day |
| Bo5 | 10 matches | 1 per day |
| Total | 14 matches | - |

---

## 8. Spring Playoff Schedule

**Spring playoff:** Week 11~13  
**Spring champion decided:** Week 13 Sunday

| Week | Day | Stage | Match | Format | Notes |
|---|---|---|---|---|---|
| Week 11 | Thursday | Upper Bracket Round 1 | UB1: Seed 1 vs Seed 8 + UB2: Seed 4 vs Seed 5 | 2 Bo3 | Cup week; regional matches resume on Thursday. Two Bo3 matches may be played in one day. |
| Week 11 | Friday | Upper Bracket Round 1 | UB3: Seed 2 vs Seed 7 + UB4: Seed 3 vs Seed 6 | 2 Bo3 | Two Bo3 matches may be played in one day. |
| Week 11 | Saturday | Upper Bracket Semifinal | UB5: Winner UB1 vs Winner UB2 | 1 Bo5 | Weekend premium slot. One Bo5 per day. |
| Week 11 | Sunday | Upper Bracket Semifinal | UB6: Winner UB3 vs Winner UB4 | 1 Bo5 | Weekend premium slot. One Bo5 per day. |
| Week 12 | Tuesday | Lower Bracket Round 1 | LB1: Loser UB1 vs Loser UB2 | 1 Bo5 | One Bo5 per day. |
| Week 12 | Wednesday | Lower Bracket Round 1 | LB2: Loser UB3 vs Loser UB4 | 1 Bo5 | One Bo5 per day. |
| Week 12 | Thursday | Lower Bracket Round 2 | LB3: Winner LB1 vs Loser UB6 | 1 Bo5 | One Bo5 per day. |
| Week 12 | Friday | Lower Bracket Round 2 | LB4: Winner LB2 vs Loser UB5 | 1 Bo5 | One Bo5 per day. |
| Week 12 | Saturday | Upper Bracket Final | UBF: Winner UB5 vs Winner UB6 | 1 Bo5 | Weekend premium slot. |
| Week 12 | Sunday | Lower Bracket Round 3 | LB5: Winner LB3 vs Winner LB4 | 1 Bo5 | Weekend premium slot. |
| Week 13 | Saturday | Lower Bracket Final | LBF: Winner LB5 vs Loser UBF | 1 Bo5 | Final weekend. |
| Week 13 | Sunday | Grand Final | GF: Winner UBF vs Winner LBF | 1 Bo5 | Spring champion decided. No bracket reset by default. |

---

## 9. Summer Regular Season Schedule

**Summer regular season:** Week 21~24 and Week 27~30  
**Total:** 8 weeks, 22 sessions, 66 Bo3 matches

| Week | Day | Session | Matches | Format | Notes |
|---|---|---|---|---|---|
| Week 21 | Friday | RS1 | 3 | Bo3 | Opening regular-season week. Friday compression slot. |
| Week 21 | Saturday | RS2 | 3 | Bo3 | Opening regular-season week. Weekend priority slot. |
| Week 21 | Sunday | RS3 | 3 | Bo3 | Opening regular-season week. Weekend priority slot. |
| Week 22 | Friday | RS4 | 3 | Bo3 | Cup week; no regional matches on Mon/Tue/Wed. Friday is allowed and used. Friday compression slot. |
| Week 22 | Saturday | RS5 | 3 | Bo3 | Cup week; no regional matches on Mon/Tue/Wed. Friday is allowed and used. Weekend priority slot. |
| Week 22 | Sunday | RS6 | 3 | Bo3 | Cup week; no regional matches on Mon/Tue/Wed. Friday is allowed and used. Weekend priority slot. |
| Week 23 | Friday | RS7 | 3 | Bo3 | Standard Friday-to-Sunday week. Friday compression slot. |
| Week 23 | Saturday | RS8 | 3 | Bo3 | Standard Friday-to-Sunday week. Weekend priority slot. |
| Week 23 | Sunday | RS9 | 3 | Bo3 | Standard Friday-to-Sunday week. Weekend priority slot. |
| Week 24 | Saturday | RS10 | 3 | Bo3 | Cup week; no regional matches on Mon/Tue/Wed. Weekend-only regular-season week. Weekend priority slot. |
| Week 24 | Sunday | RS11 | 3 | Bo3 | Cup week; no regional matches on Mon/Tue/Wed. Weekend-only regular-season week. Weekend priority slot. |
| Week 27 | Friday | RS12 | 3 | Bo3 | Post-IM regular-season restart. Friday compression slot. |
| Week 27 | Saturday | RS13 | 3 | Bo3 | Post-IM regular-season restart. Weekend priority slot. |
| Week 27 | Sunday | RS14 | 3 | Bo3 | Post-IM regular-season restart. Weekend priority slot. |
| Week 28 | Saturday | RS15 | 3 | Bo3 | Cup week; no regional matches on Mon/Tue/Wed. Weekend-only regular-season week. Weekend priority slot. |
| Week 28 | Sunday | RS16 | 3 | Bo3 | Cup week; no regional matches on Mon/Tue/Wed. Weekend-only regular-season week. Weekend priority slot. |
| Week 29 | Friday | RS17 | 3 | Bo3 | Standard Friday-to-Sunday week. Friday compression slot. |
| Week 29 | Saturday | RS18 | 3 | Bo3 | Standard Friday-to-Sunday week. Weekend priority slot. |
| Week 29 | Sunday | RS19 | 3 | Bo3 | Standard Friday-to-Sunday week. Weekend priority slot. |
| Week 30 | Friday | RS20 | 3 | Bo3 | Cup week final regular-season week; Friday is allowed and used. Friday compression slot. |
| Week 30 | Saturday | RS21 | 3 | Bo3 | Cup week final regular-season week; Friday is allowed and used. Weekend priority slot. |
| Week 30 | Sunday | RS22 | 3 | Bo3 | Cup week final regular-season week; Friday is allowed and used. Weekend priority slot. |

---

## 10. Summer Playoff Schedule

**Summer playoff:** Week 33~35  
**Summer champion decided:** Week 35 Sunday

| Week | Day | Stage | Match | Format | Notes |
|---|---|---|---|---|---|
| Week 33 | Thursday | Upper Bracket Round 1 | UB1: Seed 1 vs Seed 8 + UB2: Seed 4 vs Seed 5 | 2 Bo3 | Playoffs begin after IM 3. Two Bo3 matches may be played in one day. |
| Week 33 | Friday | Upper Bracket Round 1 | UB3: Seed 2 vs Seed 7 + UB4: Seed 3 vs Seed 6 | 2 Bo3 | Two Bo3 matches may be played in one day. |
| Week 33 | Saturday | Upper Bracket Semifinal | UB5: Winner UB1 vs Winner UB2 | 1 Bo5 | Weekend premium slot. One Bo5 per day. |
| Week 33 | Sunday | Upper Bracket Semifinal | UB6: Winner UB3 vs Winner UB4 | 1 Bo5 | Weekend premium slot. One Bo5 per day. |
| Week 34 | Tuesday | Lower Bracket Round 1 | LB1: Loser UB1 vs Loser UB2 | 1 Bo5 | One Bo5 per day. |
| Week 34 | Wednesday | Lower Bracket Round 1 | LB2: Loser UB3 vs Loser UB4 | 1 Bo5 | One Bo5 per day. |
| Week 34 | Thursday | Lower Bracket Round 2 | LB3: Winner LB1 vs Loser UB6 | 1 Bo5 | One Bo5 per day. |
| Week 34 | Friday | Lower Bracket Round 2 | LB4: Winner LB2 vs Loser UB5 | 1 Bo5 | One Bo5 per day. |
| Week 34 | Saturday | Upper Bracket Final | UBF: Winner UB5 vs Winner UB6 | 1 Bo5 | Weekend premium slot. |
| Week 34 | Sunday | Lower Bracket Round 3 | LB5: Winner LB3 vs Winner LB4 | 1 Bo5 | Weekend premium slot. |
| Week 35 | Saturday | Lower Bracket Final | LBF: Winner LB5 vs Loser UBF | 1 Bo5 | Final weekend. |
| Week 35 | Sunday | Grand Final | GF: Winner UBF vs Winner LBF | 1 Bo5 | Summer champion decided. No bracket reset by default. |

---

## 11. Match Count Summary

### Per Split

| Segment | Match Objects |
|---|---:|
| Regular season | 66 Bo3 |
| Playoff Bo3 matches | 4 |
| Playoff Bo5 matches | 10 |
| Total per split | 80 |

### Annual

| Segment | Match Objects |
|---|---:|
| Spring regular season | 66 |
| Spring playoff | 14 |
| Summer regular season | 66 |
| Summer playoff | 14 |
| Annual total | 160 |

---

## 12. Operational Notes

- L_SEA is intentionally shorter than L_NEU / L_WEU.
- Spring ends in **Week 13**, leaving **Week 14~15** open.
- Summer ends in **Week 35**, leaving **Week 36~37** open.
- All regular-season Saturdays and Sundays are used.
- Six Friday sessions per split are added so the regular season ends in exactly 8 weeks.
- Thursday is allowed but reserved for overflow, makeup, broadcast emergencies, or special scheduling needs.
- Cup-week restrictions are respected because no L_SEA regional match is scheduled on Monday, Tuesday, or Wednesday during cup weeks.
- The 3-week playoff structure keeps the same bracket logic as L_NEU / L_WEU, making cross-league format comprehension easier for other systems or AIs.

---

## 13. Requirement Coverage

| Requirement | Status |
|---|---|
| 12-team L_SEA league | Satisfied |
| Single centralized arena | Satisfied |
| All regular-season matches Bo3 | Satisfied |
| Spring and Summer champions separately decided | Satisfied |
| Regular season is Bo3 single round robin | Satisfied |
| 66 regular-season matches per split | Satisfied |
| 11 matches per team per split | Satisfied |
| Regular season lasts 8 weeks | Satisfied |
| Weekend-first regular-season scheduling | Satisfied |
| Friday regular-season scheduling allowed and used | Satisfied |
| Thursday allowed as overflow | Satisfied |
| Top 8 teams qualify for playoffs | Satisfied |
| Playoffs last 3 weeks | Satisfied |
| Playoff format identical to L_NEU / L_WEU | Satisfied |
| Upper Bracket Round 1 is Bo3 | Satisfied |
| All other playoff matches are Bo5 | Satisfied |
| Bo3 playoff daily limit: 2 matches | Satisfied |
| Bo5 playoff daily limit: 1 match | Satisfied |
| Early league finish allowed | Satisfied |
