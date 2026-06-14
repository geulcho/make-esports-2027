# Global Esports Season Pipeline PRD
**Version:** v1.0  
**Purpose:** Top-level orchestration document for AI agents. This file explains how all regional leagues, regional cups, club international events, Intermatch windows, WE qualifiers, WT, WE, and offseason fit into one 52-week season.

> Use this file as the season map. Use the linked component PRDs as the detailed rulebooks. This is the compass; the component files are the treasure-room keys.

## 1. Global Calendar Constants
| Item | Value |
|---|---|
| year_length_weeks | 52 |
| regional_league_windows | W1-W6, W9-W15, W21-W24, W27-W30, W33-W37 |
| intermatch_windows | W7-W8, W25-W26, W31-W32 |
| cup_blackout_weeks_for_regional_leagues | 5, 9, 11, 22, 24, 28, 30 |
| cup_blackout_days | Monday, Tuesday, Wednesday |
| mm_window | W17-W19 |
| mm_arrival_seed_window | W16 |
| mm_return_rest_window | W20 |
| wt_window | W39-W43 |
| wt_prep_window | W38 |
| we_window | W45-W48 |
| we_prep_window | W44 |
| offseason_window | W49-W52 |

## 2. Global Conflict Rules
1. During cup blackout weeks W5, W9, W11, W22, W24, W28, and W30, regional league matches cannot be scheduled on Monday, Tuesday, or Wednesday.
2. Intermatch windows W7-W8, W25-W26, and W31-W32 are national-team windows; regular regional league matches should not be scheduled there.
3. MM uses W17-W19, with W16 reserved for arrival/seeding/draw and W20 reserved for recovery and return logistics.
4. WT uses W39-W43 and is the top-priority club event after regional seasons conclude.
5. WE uses W45-W48 and is the top-priority national-team event after WT.
6. If a league-specific PRD has a more detailed day-level schedule, that document overrides the high-level weekly entry in this master pipeline, as long as the global blackout windows are preserved.

## 3. Data Locks and Draw Snapshots
| Week | Lock | Used for |
|---:|---|---|
| W6 | National-team ranking snapshot | Intermatch / WE qualifier group draws |
| W15 | Spring champions and MM qualifiers finalized | MM participant list |
| W16 | Club Elo snapshot | MM seeding into four 4-team seed pools |
| W30 | National-team ranking snapshot | IQ draw and same-region avoidance |
| W30 | APEX / COPA / EGT champions finalized | WT special slots |
| W32 | WE final field finalized | WE participants after IQ |
| W33 | National-team rating snapshot | WE main-event seeding into four 6-team pots |
| W37 | Summer champions and final regional standings finalized | WT regional slots and league coefficient entries |
| W38 | WT field, slot inheritance, and draw validation | WT group draw |

## 4. Component Documents

### 4.1 Regional Leagues
| ID | Name | Markdown | JSON |
|---|---|---|---|
| L_NA | North America 24-team League | `north_america_league_format_prd.md` | `north_america_league_format_prd_spec.json` |
| L_CN | China / Dragon-Phoenix 16-team League | `china_league_format_prd.md` | `china_league_format_prd_spec.json` |
| L_KR | Korea 12-team League | `korea_league_format_prd.md` | `korea_league_format_prd_spec.json` |
| L_NEU_L_WEU | North Europe / West Europe 12-team Bo1 Leagues | `l_neu_l_weu_league_format_prd.md` | `l_neu_l_weu_league_format_prd_spec.json` |
| L_SEA | Southeast Asia 12-team Bo3 League | `l_sea_league_format_prd.md` | `l_sea_league_format_prd_spec.json` |
| L_DE_L_EEU_L_SEU_L_RU | DACH / Eastern Europe / Southern Europe / Russia 10-team Bo1 Leagues | `l_de_l_eeu_l_seu_l_ru_league_format_prd.md` | `l_de_l_eeu_l_seu_l_ru_league_format_prd_spec.json` |
| L_BR_L_SA | Brazil / LATAM 10-team Bo3 Leagues | `l_br_l_sa_league_format_prd.md` | `l_br_l_sa_league_format_prd_spec.json` |
| L_TW_L_JP | Taiwan-Hong Kong / Japan 8-team Bo3 Leagues | `l_tw_l_jp_league_format_prd.md` | `l_tw_l_jp_league_format_prd_spec.json` |
| L_TR | Turkey 8-team Bo1 League | `l_tr_league_format_prd.md` | `l_tr_league_format_prd_spec.json` |
| L_MEAF | Middle East & Africa 8-team Split Tournament League | `l_meaf_league_format_prd.md` | `l_meaf_league_format_prd_spec.json` |

### 4.2 Regional Cups
| ID | Name | Markdown | JSON |
|---|---|---|---|
| REGIONAL_CUPS | COPA / APEX / EGT Regional Cups | `regional_cups_egt_copa_apex_prd.md` | `regional_cups_egt_copa_apex_spec.json` |

### 4.3 International and National-Team Events
| ID | Name | Markdown | JSON |
|---|---|---|---|
| MM | Midseason Mayhem | `midseason_mayhem_prd.md` | `midseason_mayhem_prd_spec.json` |
| INTERMATCH_WE_QUALIFIERS | Intermatch / WE Qualifiers / IQ / EEC / TPC | `intermatch_we_qualifiers_prd.md` | `intermatch_we_qualifiers_prd_spec.json` |
| WT | World Tournaments | `world_tournaments_prd.md` | `world_tournaments_prd_spec.json` |
| WE | World Event | `world_event_prd.md` | `world_event_prd_spec.json` |

## 5. Regional League Timeline Summary
| League Group | Spring | Summer / Season Finish |
|---|---|---|
| L_NA | regular: W1-W6, W9-W13; mm_qualifier: W14-W15 | regular: W21-W24, W27-W30, W33-W34; playoffs: W35-W37 |
| L_CN | regular: W1-W6, W9-W13; mm_qualifier: W14-W15 | regular: W21-W24, W27-W30, W33-W34; playoffs: W35-W37 |
| L_KR | regular: W1-W6, W9-W13; playoffs: W14-W15 | regular: W21-W24, W27-W30, W33-W35; playoffs: W36-W37 |
| L_NEU_L_WEU | regular: W1-W6, W9-W12; playoffs: W13-W15 | regular: W21-W24, W27-W30, W33-W34; playoffs: W35-W37 |
| L_SEA | regular: W1-W6, W9-W10; playoffs: W11-W13 | regular: W21-W24, W27-W30; playoffs: W33-W35 |
| L_DE_L_EEU_L_SEU_L_RU | regular: W1-W6, W9-W11; buffer: W12; playoffs: W13-W15 | regular: W21-W24, W27-W30, W33; buffer: W34; playoffs: W35-W37 |
| L_BR_L_SA | regular: W1-W6, W9-W11; buffer: W12; playoffs: W13-W15 | regular: W21-W24, W27-W30, W33; buffer: W34; playoffs: W35-W37 |
| L_TW_L_JP | regular: W1-W6, W9; playoffs: W10-W11; early_break: W12-W15 | regular: W21-W23, W27-W30; buffer: W24; playoffs: W33-W34; early_break: W35-W37 |
| L_TR | regular: W1-W6, W9; playoffs: W10-W12; early_break: W13-W15 | regular: W21-W24, W28-W30; buffer: W27; playoffs: W33-W35; early_break: W36-W37 |
| L_MEAF | Single annual point structure | split_1: W1-W3; split_2: W4-W6; split_3: W9-W11; mm_qualifier: W12; split_4: W21-W23; split_5: W27-W29; final_playoffs: W33-W34 |

## 6. International Timeline Summary
| Event | Windows |
|---|---|
| REGIONAL_CUPS | weeks: W5: Round 1; W9: Round 2 / Round of 64; W11: Round of 32; W22: Round of 16; W24: Quarterfinals; W28: Semifinals; W30: Finals |
| INTERMATCH_WE_QUALIFIERS | W7-W8: WE qualifier group phase part 1 and MEAF early qualifiers; W25-W26: WE qualifier completion and regional playoff/final qualifiers; W31-W32: IQ plus EEC/TPC/friendlies |
| MM | W16: Arrival and seeding; W17-W19: Main event; W20: Recovery |
| WT | W38: Preparation and draw; W39-W43: Main event ending W43 Sunday |
| WE | W44: Preparation; W45-W48: Main event; W49-W52: Offseason |

## 7. Week-by-Week Master Pipeline
| Week | Regional League Activity | Regional Cups | National-Team Activity | International Event Activity | Locks / Notes |
|---:|---|---|---|---|---|
| W1 | Spring regular season begins for most regional leagues<br>L_MEAF Split 1 | None | None | None | First week of the annual regional calendar. |
| W2 | Spring regular season<br>L_MEAF Split 1 | None | None | None | None |
| W3 | Spring regular season<br>L_MEAF Split 1 concludes | None | None | None | None |
| W4 | Spring regular season<br>L_MEAF Split 2 begins | None | None | None | None |
| W5 | Spring regular season<br>L_MEAF Split 2 | COPA Round 1<br>APEX Round 1<br>EGT Round 1 | None | None | Monday-Wednesday are reserved for cups; regional leagues use later-week slots. |
| W6 | Spring regular season<br>L_MEAF Split 2 concludes | None | None | None | Week 6 national-team ranking snapshot for WE qualifier draws |
| W7 | None | None | Intermatch 1<br>Europe/APAC/Americas WE qualifier MD1-MD3 split sessions<br>Middle East & Africa WE qualifier Round 1 | None | No regional league matches. |
| W8 | None | None | Intermatch 1<br>Europe/APAC/Americas WE qualifier MD4-MD5 split sessions<br>Middle East & Africa WE qualifier Round 2 | None | No regional league matches. |
| W9 | Spring regional leagues resume<br>L_MEAF Split 3 begins<br>L_TW/L_JP and L_TR resume final regular-week or playoff windows depending on league | COPA Round 2<br>APEX Round 2<br>EGT Round of 64 | None | None | Cup Monday-Wednesday blackout applies. |
| W10 | Spring regular season / early playoffs depending on league<br>L_MEAF Split 3<br>L_TW/L_JP playoffs<br>L_TR playoffs | None | None | None | None |
| W11 | Spring regular season / playoffs depending on league<br>L_MEAF Split 3 concludes<br>L_TW/L_JP spring finals | COPA Round of 32<br>APEX Round of 32<br>EGT Round of 32 | None | None | Cup Monday-Wednesday blackout applies. |
| W12 | Spring buffer or playoffs for selected leagues<br>L_TR spring final window<br>L_MEAF MM qualifier | None | None | None | Several smaller leagues are already complete or using buffer windows. |
| W13 | Large leagues spring regular-season finale<br>L_NEU/L_WEU spring playoffs<br>L_SEA spring playoffs<br>L_DE/L_EEU/L_SEU/L_RU spring playoffs<br>L_BR/L_SA spring playoffs | None | None | None | Many regional leagues either conclude spring or lock playoff seeds. |
| W14 | L_NA and L_CN MM qualifiers<br>L_KR spring playoffs<br>European 12-team and 10-team league spring playoffs<br>Brazil/LATAM spring playoffs | None | None | None | Spring title races and MM qualification peak. |
| W15 | Spring champions and MM entrants finalized across applicable leagues | None | None | None | MM participant list locked<br>Deadline for spring winners and MM qualification results. |
| W16 | None | None | None | MM arrival / seeding / draw / media / rest | Week 16 Club Elo snapshot for MM seeding |
| W17 | None | None | None | MM Swiss Stage R1-R4 | No regional league matches. |
| W18 | None | None | None | MM Swiss R5<br>MM quarterfinals | No regional league matches. |
| W19 | None | None | None | MM semifinals<br>MM grand final | MM champion determined. |
| W20 | None | None | None | MM return / rest / patch adaptation | Transition week before summer regional leagues. |
| W21 | Summer regional season begins<br>L_MEAF Split 4 begins | None | None | None | None |
| W22 | Summer regular season<br>L_MEAF Split 4 | COPA Round of 16<br>APEX Round of 16<br>EGT Round of 16 | None | None | Cup Monday-Wednesday blackout applies. |
| W23 | Summer regular season<br>L_MEAF Split 4 concludes | None | None | None | None |
| W24 | Summer regular season or buffer depending on league | COPA quarterfinals<br>APEX quarterfinals<br>EGT quarterfinals | None | None | L_TW/L_JP and L_MEAF have lighter or empty windows; cup Monday-Wednesday blackout applies. |
| W25 | None | None | Intermatch 2<br>WE qualifier phase 2 begins<br>Europe/APAC/Americas remaining group matches<br>MEAF final qualifier begins | None | No regional league matches. |
| W26 | None | None | Intermatch 2<br>WE qualifier phase 2 concludes<br>Regional playoffs for Europe/APAC/Americas WE qualifiers<br>MEAF final qualifier concludes | None | WE direct qualifiers and IQ participants locked |
| W27 | Summer regional season resumes<br>L_MEAF Split 5 begins<br>L_TR buffer week | None | None | None | Regional leagues resume after Intermatch 2. |
| W28 | Summer regular season<br>L_MEAF Split 5 | COPA semifinals<br>APEX semifinals<br>EGT semifinals | None | None | Cup Monday-Wednesday blackout applies. |
| W29 | Summer regular season<br>L_MEAF Split 5 concludes | None | None | None | None |
| W30 | Summer regular season<br>L_MEAF post-split buffer | APEX grand final<br>COPA grand final<br>EGT grand final | None | None | Week 30 national-team ranking snapshot for IQ draw<br>APEX/COPA/EGT champions locked for WT special slots<br>Cup finals are distributed across Monday-Wednesday. |
| W31 | None | None | Intermatch 3<br>IQ begins<br>EEC begins<br>TPC begins<br>Optional national-team friendlies | None | No regional league matches. |
| W32 | None | None | Intermatch 3<br>IQ concludes<br>EEC concludes<br>TPC concludes<br>Optional national-team friendlies | None | WE 24-team field locked |
| W33 | Summer final regional block<br>Early summer playoffs for selected leagues<br>L_MEAF final playoffs begin | None | None | None | Week 33 national-team ratings for WE seeding |
| W34 | Summer final regional block / playoffs<br>L_TW/L_JP summer finals<br>L_MEAF final playoffs conclude<br>Buffer week for several 10-team leagues | None | None | None | None |
| W35 | Summer playoffs for major and mid-size leagues<br>L_SEA and L_TR summer finals<br>L_TW/L_JP and L_MEAF already complete | None | None | None | Some leagues have optional tiebreakers or early playoff starts depending on detailed PRDs. |
| W36 | Summer playoffs continue for major and mid-size leagues<br>L_KR playoffs begin/final phase depending on bracket | None | None | None | Several smaller leagues are already complete. |
| W37 | Final regional playoff week<br>Summer champions and final WT regional slots locked | None | None | None | Regional standings and WT league-slot inheritance inputs locked |
| W38 | None | None | None | WT prep / draw / travel / media week | WT field and group draw validated |
| W39 | None | None | None | WT group stage Week 1 | None |
| W40 | None | None | None | WT group stage Week 2 | None |
| W41 | None | None | None | WT Round of 16 | None |
| W42 | None | None | None | WT quarterfinals | None |
| W43 | None | None | None | WT semifinals<br>WT grand final | WT champion determined on Sunday. |
| W44 | None | None | None | WT recovery<br>WE prep / travel / media week | None |
| W45 | None | None | WE main event group stage begins | WE group stage | None |
| W46 | None | None | WE group stage concludes<br>WE Round of 16 begins/concludes depending on final event schedule | WE group stage / Round of 16 | None |
| W47 | None | None | WE quarterfinals | WE quarterfinals | None |
| W48 | None | None | WE semifinals<br>WE grand final | WE semifinals and final | Best national team of the year determined. |
| W49 | None | None | None | Offseason begins | Roster moves, player rest, preseason content, rules review. |
| W50 | None | None | None | Offseason | None |
| W51 | None | None | None | Offseason | None |
| W52 | None | None | None | Offseason / next season preparation | None |

## 8. AI Consumption Order
1. Read this master pipeline first to identify the week, event lane, and active competitions.
2. Open the relevant league or event PRD for exact match format, bracket rules, daily schedule, venue assumptions, and match-count limits.
3. Validate conflicts against the global blackout windows and Intermatch/MM/WT/WE blocks.
4. For slot inheritance and tournament seeding, use the data locks listed above.
5. If a detailed component PRD conflicts with this master document, preserve the global windows here and update the component PRD or master map deliberately.

## 9. Critical Handoffs
| Handoff | Timing | Output | Consumer |
|---|---|---|---|
| Spring regional finish | W15 | MM participant list | MM W16 seeding and W17 start |
| MM finish | W19 | MM champion | WT special slot |
| Regional cup finals | W30 | APEX/COPA/EGT champions | WT special slots |
| WE qualifier completion | W32 | WE 24-team field | WE W33 seeding snapshot and W45 event |
| Summer regional finish | W37 | WT league representatives and final standings | WT W38 draw |
| WT finish | W43 | Club world champion | Offseason and year-end storylines |
| WE finish | W48 | National-team world champion | Offseason and next-year ranking context |
