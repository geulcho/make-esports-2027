import json

INPUT_CLUBS_JSON = 'clubs_database.json'
OUTPUT_LEAGUE_JSON = 'league_coefficients.json'

def calculate_league_coefficients():
    # 1. 클럽 데이터베이스 불러오기
    try:
        with open(INPUT_CLUBS_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ 오류: '{INPUT_CLUBS_JSON}' 파일을 찾을 수 없습니다.")
        return

    # 2. 리그별로 팀들의 Elo 레이팅 분류하기
    leagues_data = {}
    
    for club in data.get('clubs', []):
        league_id = club.get('league_id')
        elo = club.get('elo_rating', 1200)
        
        if not league_id: # 리그 ID가 없는 팀은 패스
            continue
            
        if league_id not in leagues_data:
            leagues_data[league_id] = []
            
        leagues_data[league_id].append(elo)

    # 3. 리그별 계수 점수 계산
    results = []
    
    for league_id, elos in leagues_data.items():
        team_count = len(elos)
        if team_count == 0:
            continue
            
        # Elo 레이팅을 내림차순(높은 순)으로 정렬
        elos.sort(reverse=True)
        
        # 공식 1: 리그 전체의 ELO 레이팅 평균
        average_elo = sum(elos) / team_count
        
        # 공식 2: 상위 4팀의 ELO 합계
        # (만약 팀이 4개 미만인 특수 상황이라도 있는 만큼만 합산하도록 안전하게 [:4] 슬라이싱 처리)
        top4_elo_sum = sum(elos[:4])
        
        # 최종 계수 점수 (소수점 2자리 반올림)
        coefficient_points = round(average_elo + top4_elo_sum, 2)
        
        results.append({
            "league_id": league_id,
            "team_count": team_count,
            "average_elo": round(average_elo, 2),
            "top4_elo_sum": top4_elo_sum,
            "coefficient_points": coefficient_points
        })

    # 4. 계수 점수를 기준으로 내림차순 정렬하여 순위(Rank) 부여
    results.sort(key=lambda x: x['coefficient_points'], reverse=True)
    
    for rank, league_info in enumerate(results, start=1):
        league_info['rank'] = rank

    # 5. 최종 JSON 출력
    output_data = {
        "season": 2026, # 필요시 현재 연도로 유동적 변경 가능
        "leagues": results
    }

    with open(OUTPUT_LEAGUE_JSON, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    print(f"🏆 리그 계수 계산 완료! 총 {len(results)}개 리그의 랭킹이 '{OUTPUT_LEAGUE_JSON}'에 저장되었습니다.")
    print("--- Top 3 리그 ---")
    for i in range(min(3, len(results))):
        print(f"{i+1}위: {results[i]['league_id']} ({results[i]['coefficient_points']}점)")

if __name__ == "__main__":
    calculate_league_coefficients()