# PRD — MAKE Esports UI 구조

## 1. 전체 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (w-48)  │  TopBar (h-12)                   │
│                  ├─────────────────────────────────  │
│  Logo            │  PhaseStrip (h-11)                │
│  Nav Links       ├─────────────────────────────────  │
│                  │                                   │
│  Season info     │  <Outlet /> (flex-1, overflow)    │
│  (bottom)        │                                   │
└─────────────────────────────────────────────────────┘
```

모든 페이지는 `Layout` 컴포넌트로 감싸짐. `<Outlet>`에 라우팅된 페이지가 렌더링됨.

---

## 2. 공통 컴포넌트

### Sidebar
- 너비: `w-48` (192px), 고정
- 로고: `MAKE`(tier-s) + `Esports`(slate-300)
- 네비게이션: NavLink 9개 (active 시 border-r-2 tier-s, bg-hover)
- 하단: Season / Split 표시 (정적 텍스트, 추후 동적으로 변경 예정)

| 경로 | 레이블 | 아이콘 |
|------|--------|--------|
| / | Home | Home |
| /players | Players | Users |
| /teams | Teams & Leagues | Globe |
| /intermatch | Intermatch | Flag |
| /ratings | Ratings | TrendingUp |
| /meta | Meta | BarChart2 |
| /tournaments | Tournaments | Trophy |
| /schedule | Schedule | Calendar |
| /history | History | BookOpen |

### TopBar
- 높이: `h-12`
- 좌: 브레드크럼 (동적, 각 페이지에서 setBreadcrumbs로 설정)
- 중앙: 통합 검색 (선수명/팀명/리그명 실시간 드롭다운, max-w-sm)
- 우: 활성 메타 콤보 배지(2개) + 현재 날짜 + 페이즈 표시

### PhaseStrip ← 요구사항 변경 반영
- 높이: `h-11`, 모든 페이지에 항상 표시 (Layout에 배치)
- 좌: 현재 페이즈 번호 + 블록 내 위치(N/4) + 4-dot 진행 표시
- 중앙: 활성 메타 콤보 배지
- 우: Reset 버튼 + `Simulate Phase N` 버튼 (항상 활성, 무제한 진행 가능)

> 기존에는 Home 페이지 전용이었으나 Layout으로 이동해 전역 고정됨.
> Opening Complete 비활성화 제거 — 시즌 흐름 재설계에 따라 무한 진행 가능.

---

## 3. 공유 UI 컴포넌트 (components/ui/)

| 컴포넌트 | 역할 |
|----------|------|
| `TierBadge` | S/A/B/C 등급 뱃지. 색상: S=tier-s, A=tier-a, B=white, C=slate |
| `StatBadge` | 수치값에 등급 색상 적용 (≥80%→S, ≥55%→A, ≥30%→B, else C) |
| `StatBar` | 단일 스탯 바 차트 (레이블 + 진행바 + 수치) |
| `FormBadge` | 폼 수치/10 표시 (등급 색상) |
| `RadarChart` | 팀/선수 스탯 레이더(오각형) 차트 |
| `TabPanel` | 범용 탭 패널 (tabs 배열 + render prop 패턴) |
| `SectionHeader` | 섹션 제목 + 부제목 |
| `PageHeader` | 페이지 제목 + 부제목 + 우측 메타 슬롯 |
| `SeriesScore` | Bo3 결과 표시 (승자 강조 + hover 시 세트별 스코어 툴팁) |

### 색상 시스템 (Tailwind 커스텀)
| 클래스 | 색상 | 용도 |
|--------|------|------|
| tier-s | #00FFCC | S등급, 핵심 액션, 활성 상태 |
| tier-a | #FFD700 | A등급, 팔로우/즐겨찾기 |
| tier-b | #FFFFFF | B등급 |
| tier-c | #666666 | C등급 |
| accent-blue | #4A90E2 | 링크, 보조 액션 |
| status-up | #22c55e | 승리, 양수 득실 |
| status-down | #ef4444 | 패배, 음수 득실 |
| bg-base/panel/card/hover/border | 다크 팔레트 각 계층 | |

---

## 4. 페이지별 구조

### 4.1 Home (/)

3-컬럼 레이아웃 (상단 PhaseStrip 이후):

```
┌──────────────┬──────────────────────┬──────────────┐
│ News (w-64)  │ League Standings     │ Right Panel  │
│              │ (flex-1)             │ (w-72)       │
│ 뉴스 카드    │ TabPanel             │ Results 탭   │
│ 스크롤       │ KR / WEU / SEA / BR  │ Upcoming 탭  │
│              │ W L SD ScD ELO Tier  │              │
└──────────────┴──────────────────────┴──────────────┘
```

**Center — League Standings TabPanel:**
- 탭: KR, WEU, SEA, BR (4개 featured 리그)
- 컬럼: # Team W L SD ScD ELO Tier
- 팀명 클릭 → `/teams/:id`
- "Full Standings →" → `/teams?league=...`

**Right Panel — 두 탭:**
- `Results`: 팔로우 팀/리그 경기 결과 (SeriesScore + hover 세트 툴팁)
- `Upcoming`: 다음 페이즈 예정 경기 + 십진법 배당률
- 팔로우 없을 시 전체 경기 표시 + 안내 문구

---

### 4.2 Players (/players)

- PageHeader + 필터 바 + 정렬 가능 테이블
- 필터: 검색(텍스트), 포지션(TOP/JGL/MID/BOT/SUP), 리그
- 정렬 가능 컬럼: Nickname, Position, Age, KDA, WR%, Form, Tier, LAN, MEC, TMF
- 컬럼: ★ POS Nickname Name Nat Age Tier Form KDA WR% LAN MEC TMF
- 행 클릭 → `/players/:id`
- ★ 팔로우 토글

---

### 4.3 Player Profile (/players/:id)

- 헤더: ← 뒤로, 포지션 색상 뱃지, 닉네임, 풀네임, 국적, 나이, TierBadge, 소속팀
- ★ 팔로우 버튼
- TabPanel: Stats | Career | Matches
  - Stats: RadarChart(좌) + StatBar 목록(우) + FormBadge
  - Career: (준비 중)
  - Matches: (준비 중)

---

### 4.4 Teams & Leagues (/teams)

2-컬럼 레이아웃:

```
┌────────────────┬────────────────────────────────────┐
│ League Sidebar │ League Content                     │
│ (w-52)         │ PageHeader                         │
│                │ TabPanel:                          │
│ APAC           │ Standings / Results / Teams /      │
│  L_KR ★       │ Playoffs / Past Champions          │
│  L_JP ★       │                                    │
│ AMER           │                                    │
│  L_NA ★       │                                    │
│ EMEA           │                                    │
│  L_WEU ★      │                                    │
└────────────────┴────────────────────────────────────┘
```

**Sidebar:** 리그 목록, 권역별 그룹핑, ★ 팔로우, 클릭으로 activeLeague 변경

**Standings 탭:**
- 시즌 레이블 배지
- 컬럼: # ★ Team(컬러닷+약칭+풀네임) MP W L SD ScD
- 타이브레이커: W > SD > ScD
- ELO/Tier/Stats 컬럼 없음 (Teams 탭으로 이동) ← 요구사항 변경 반영

**Results 탭:**
- 페이즈별 그룹핑 + 메타 콤보 배지
- 컬럼: Team A | SeriesScore | Team B | Odds A | Odds B
- SeriesScore: hover 시 세트별 모멘텀 툴팁

**Teams 탭:**
- 4열 그리드 카드
- 카드: 팀 로고(abbr/색상), 팀명, ELO, Tier

**Playoffs 탭:**
- 현재 플레이스홀더

**Past Champions 탭:**
- Year / Season / Champion 테이블

---

### 4.5 Team Profile (/teams/:id)

- ← 리그로 돌아가기 버튼
- 헤더: 팀 로고(abbr+팀색), 팀명, abbr 뱃지, ELO, 리그링크, ★ 팔로우
- Tier 표시 없음 ← 요구사항 변경 반영
- TabPanel: Roster | Team Stats | ELO History
  - Roster: 표(POS Nickname Name Nat Age Tier KDA WR%), 선수 클릭 → /players/:id
  - Team Stats: RadarChart + StatBar × 5 + preferred combos 뱃지
  - ELO History: LineChart (5년치, recharts)

---

### 4.6 Intermatch (/intermatch)

```
┌──────────────┬────────────────────────────────────┐
│ Section Nav  │ 선택된 섹션 내용                    │
│ (좌 사이드)  │                                    │
│              │ StatusDot + EmptyState              │
│ Qualifiers   │ (구현 예정)                         │
│ IQ           │                                    │
│ World Event  │                                    │
└──────────────┴────────────────────────────────────┘
```

- 섹션: EU Qual, APAC Qual, Pan-AM Qual, MEA Qual, IQ, WE Group, WE Knockout
- StatusDot: Live(status-up) / Complete(tier-s) / Pending(tier-a) / Locked(slate)
- 현재 구조만 존재, 시뮬레이션 데이터 미연결

---

### 4.7 Ratings (/ratings)

- TabPanel: Clubs | Nations
- **Clubs 탭:**
  - 지역 필터 드롭다운
  - 정렬: ELO, MAC, DRF, TMF, LAN, MEC (컬럼 클릭)
  - StatCell: 값 범위에 따라 tier-s/tier-a/white/slate 색상
- **Nations 탭:**
  - 지역 필터 (EU / APAC / AMERICA / MEAF)
  - 동일 정렬 구조

---

### 4.8 Meta (/meta)

- 메타 트렌드 카드 6개 (Avg Game Time, Blue/Red WR, FB WR, Kills, Dragon Control)
- 챔피언 테이블: 정렬(Presence / Win Rate / Ban Rate / Pick Rate)
- BarChart (recharts)
- 현재 mock 데이터

---

### 4.9 Tournaments (/tournaments)

- TabPanel: MM | Cup | WT | WE
- 각 탭: StatusDot + 브래킷/결과 구조
- 타입 정의 존재 (MMState, CupState, WTState, WEState)
- 시뮬레이션 데이터 미연결

---

### 4.10 Schedule (/schedule)

- 주차 네비게이터 (←/→)
- 현재 주차: 날짜 범위, 대회 유형, 리그 활동 현황
- seasonCalendar 데이터 기반
- 아이콘: Calendar, Zap, Trophy, Globe, Shield, Star

---

### 4.11 History (/history)

- 검색 바 (선수/팀 검색)
- Worlds 역대 우승 테이블 (Year, Winner, Region, Runner-up)
- Hall of Fame 상위 선수 목록
- Mock 데이터

---

## 5. 데이터 흐름

```
clubs_database.json → clubs.ts (allClubs, leagues, clubById, clubsByLeague)
                                        ↓
                               useStore (Zustand)
                                        ↓
                    simulateNextPhase() → leagueStates 업데이트
                                        ↓
              Home, TeamsLeagues, TeamProfile에서 실시간 반영
```

- **실시간 시뮬 데이터**: Home 순위표, TeamsLeagues Standings/Results
- **정적 데이터**: Ratings, Meta, History, Intermatch (mock/JSON 기반)
- **혼합**: TeamProfile (팀 데이터 실시간 ELO + mock 선수 로스터)

---

## 6. 구현 현황 요약

| 페이지 | 라우트 | 상태 | 실시간 시뮬 데이터 |
|--------|--------|------|-------------------|
| Home | / | ✅ 완료 | ✅ |
| Players | /players | ✅ 완료 | ❌ (mock) |
| Player Profile | /players/:id | ✅ 완료 | ❌ (mock) |
| Teams & Leagues | /teams | ✅ 완료 | ✅ |
| Team Profile | /teams/:id | ✅ 완료 | 부분 (ELO 실시간) |
| Ratings | /ratings | ✅ 완료 | ❌ (static) |
| Meta | /meta | ⏳ 셸 | ❌ (mock) |
| Tournaments | /tournaments | ⏳ 셸 | ❌ |
| Intermatch | /intermatch | ⏳ 셸 | ❌ |
| Schedule | /schedule | ⏳ 구버전 캘린더 | 부분 |
| History | /history | ⏳ 셸 | ❌ (mock) |
