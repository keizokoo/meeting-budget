# 마이라이프 (저장소 이름: meeting-budget)

## 무엇
- 단일파일 PWA "마이라이프"(구 생활대시보드 ← 회의비 대시보드, 그래서 저장소 이름이 meeting-budget). 백엔드 없음.
- 파일: index.html(약 1MB) · sw.js · mylife.webmanifest(사용 중) · manifest.json · 아이콘.
- 화면 구조(B안 확정): 🏠 오늘 / 💰 돈(회의비·구독/보험·내 차·연봉·연차) / 🛍 소비(소비[전자·패션·골프]·가격) / 🙂 나(인맥·의료비·도수치료·피부·가이드). 메뉴 `.modebtn[data-mode]` 13개. **보이는 기능은 설정에서 사용자가 선택**.
- 디자인: 회의비 "에디토리얼 볼드형" — 오렌지 컬러블록, Unbounded(제목·숫자)/Manrope(본문), 다크모드 필수. 다른 기능도 같은 주황 계열.
- 데이터: Google 시트 ↔ Apps Script 웹앱으로 동기화(`syncUp` / `syncDown`, 시트 내용을 합친 뒤 반영).
  시트의 '등록대기' 탭에 적은 항목을 앱이 가져와 반영하는 구조가 있음.
- 서버 코드: `gas/Code.gs` (2026-11-15 서버 현재본에서 가져옴).

## 코드 구조
- `<script>` 3개: head 스타일 / script1 = 회의비 IIFE / script2 = 나머지 모듈. **script2 함수는 전역이 아님** → 테스트는 화면 클릭 또는 localStorage 시드.
- 동기화: 레코드 `id` + `u`(타임스탬프) + `del`(tombstone) 병합(`Shop.mergeById`). 회의비는 `MergeM`이 레코드 전체 필드를 해시 → 새 필드도 자동 동기화. 백업에는 **전 기능 데이터** 포함.
- 서버(Apps Script): RAW_JSON 40,000자 청크, `RAW_HISTORY` 12개(앱의 `restoreHistory`로 복원).
- localStorage 키: 회의비 `meeting_budget_app_v1`, 소비 `shopping_history_app_v1`, 가격 `price_check_app_v2`, 치수표 `size_chart_v1`, 인맥 `people_v1`, 피부 `skin_care_v1`, 도수 `manual_care_v1`, 구독 `subscriptions_v1`, 골프 `golf_history_v1`, 가이드 `guide_v1`, 연봉 `salary_hist_v1`, 알림 `reminders_v1`, 설정 `opts_v1`, 의료비 `medical_exp_v1`, 나의 방향 `dir_cfg_v1`(기기별).
- 데이터 정정·초기 등록은 **앱 시작 시 1회 마이그레이션**(마커 키)으로. 사용 중: … `mig_ag_v1`, `mig_ah_v1` → **다음은 `migrateAI` / `mig_ai_v1`** (호출부는 파일 끝 `migrateAE(); … migrateAH();`). 새로 만들기 전에 grep으로 최신 번호 확인.
- `let` 상태변수는 그 변수를 쓰는 함수 바로 위에 선언(초기 호출 시 TDZ 오류).
- 오늘 화면 카드: `<!--c:키-->` 마커 + `TD_CARDS`. 백업 표시 문구는 `bkView()` 한 곳에서 계산.
- 빌드마다 `APP_BUILD_VERSION`(`'빌드 (짧은 설명)'` 한 줄)과 `APP_RECENT`(**최근 3개만**, 맨 앞에 추가하고 4번째부터 삭제) 갱신. 사용자는 앱 맨 아래 "앱 버전" 줄로 반영 확인.
- 옛 빌드 기기가 저장하면 새 필드가 지워질 수 있음(예: 치수 `name/base/shId`, 옷 `szId/fit`, 인맥 `vg/more`) → 새 필드 추가 시 사용자에게 "모든 기기 새로고침" 안내.

## 계산·데이터 규칙 (확정)
- 쇼핑 수익 = (판매금 − 위약금) − 실구매금액. 실구매금액이 있으면 표시가보다 우선.
- 가격 체크 단가는 **1ml당**(표의 "10ml당" 표기도 실제 1ml당).
- 회의비 월 예산 기본 55만원(앱에서 수정), 카드구분 기본 MG/원더/토스, 예산 경고 80%/90%. 지출 `sb:true` = 상신완료(없으면 미상신).
- 의료비: 실비 공제 5,000원은 **실비 신청 1건(병원+그 병원 약국)마다 1회**. 회사 지급예정일은 신청일 11~25일→다음 달 10일, 26일~다음 달 10일→25일, 주말·공휴일이면 앞 평일(`Med.dueFor`, 서버 `medDueFor_`와 일치해야 함). 실부담 = 총 결제 − 회사 − 실비.
- 인맥: 같은 날 묶인 기록(`vg`)은 한 번의 만남으로 집계(`Life.visits`). 만남 방식은 커피/점심식사/저녁식사 3가지. "오늘" 대신 "예약".
- 연봉 표: 연봉 + 상승률 + 업무성과급 + OPI + OPI률.
- 공휴일 표(`HOL`, `LV_HOL`, 서버 `medPayAdj_`)는 2027년까지 → **2027년 말 전에 갱신**.
- 모든 금액은 천단위 쉼표.

## Apps Script 함정 (재발 방지)
- `doPost`는 `e.postData.contents`를 JSON 파싱(`e.parameter` 아님). 응답은 `ContentService.createTextOutput(...).setMimeType(JSON)`.
- 앱에서 fetch 시 `Content-Type: text/plain;charset=utf-8`(CORS preflight 회피). 배포 접근 "Anyone".

## 검증 루틴
- 스크립트 3개 추출 → `node --check`. Playwright(Google Fonts 요청 차단)로 localStorage 시드(`__seeded` 마커) 후 `.modebtn[data-mode]` 13개 순서대로 클릭, JS 오류 0. 새 UI는 360/412px 가로 넘침 점검.
- 앱에 시드 샘플 옷이 있으므로 특정 항목은 텍스트로 찾을 것. 접힌 `<details>`는 `open=true` 후 조작.
- 금액 계산을 건드리면 `financial-calc-verification`(손계산 대조).

## 이 앱만의 주의점
- 피부 루틴 변경은 `skincare-routine-guide-sync`, 옷 사이즈는 `clothing-size-check` 스킬과 연결됨 (시트 '등록대기' 경유).
- 회의비 금액 계산을 바꿀 때는 `financial-calc-verification` 스킬 적용.
- manifest 파일이 두 개 → 실제 사용은 `mylife.webmanifest`. 바꿀 때 index.html의 `<link rel="manifest">`로 재확인.
- 개선 제안은 사용자 부담을 **덜어 주는 방향** 우선(입력·점검 압박을 늘리지 않기). 새 기능은 질문(최대 3) → 3가지 방안·시연 → 컨펌 → 구현.

## 배포
- GitHub Pages(main). 서버는 `gas/Code.gs` → Claude 배포기 자동 반영.

## 작업 규칙 (모든 앱 공통)
- 코드 수정: `solo-app-code-edit` 스킬 절차를 따른다. 새 기능·탭 추가: `solo-app-new-build` 스킬.
- Apps Script·시트·배포 콘솔처럼 사용자가 직접 화면을 조작해야 하면 `gas-nondev-walkthrough` 스타일로 단계별 안내.
- index.html은 단일 파일이고 크다 → 전체를 다시 쓰지 말고 필요한 부분만 수정. 수정 전에 grep으로 관련 코드를 모두 찾을 것.
- 배포할 때마다 sw.js의 `CACHE_NAME` 버전을 올린다 (안 올리면 PWA가 옛 화면을 계속 보여줌).
- localStorage 키 이름(`*_v1` 등)을 바꾸면 기존 사용자 데이터가 사라진 것처럼 보인다 → 바꿀 때는 이전(마이그레이션) 코드 필수.
- 서버 코드는 저장소 `gas/Code.gs`가 원본. main에 병합되면 "Claude 배포기"(moneytrail 저장소 `tools/gas-deployer/`)가 5분 안에 Apps Script에 자동 배포한다(웹앱 URL 유지, 백업·롤백 있음). 사용자에게 붙여넣기를 시키지 않는다.
- 시트 동기화 형식을 바꾸면 index.html과 `gas/Code.gs`를 **같은 PR**에서 함께 바꾼다.
- `gas/Code.gs`에 토큰·키·비밀번호를 절대 쓰지 않는다(공개 저장소). 비밀값은 `PropertiesService.getScriptProperties()`로 읽는다.
- 작업은 브랜치 → PR → 사용자가 병합. main에 직접 push하지 않는다.
- 변경 후 Playwright로 index.html을 열어 콘솔 오류가 없는지 확인한다.

## 사용자
- 비개발자 1인 운영. 설명은 한국어 존댓말, 결론 먼저, 사용자가 할 일은 번호 매긴 단계로.

## 결정 기록 (채팅에서 확정한 사항을 한 줄씩 추가)
- 2026-11-15: 개발은 Claude Code로 이전. 예전 채팅 문서의 "다운로드 파일로 전달 / Code.gs FULL본 요청·붙여넣기 / 사용자가 GitHub에 업로드" 규칙은 **더 이상 적용하지 않는다** → 브랜치·PR로 전달, 병합 후 자동 배포.
- 2026-11-09: 패션↔치수표 연동 1안, 회의비 상신 구분, 앱 변경이력 3개 요약, 치수표 품목명·⭐내 기준·⚖비교(빌드 11-09-a~c).
- 미결(사용자 확인 대기): 11-09-c 실기기 확인, 가이드 강조 문장 선택, 회의비 CSV 상신 열·미상신 알림(보류), 의료비 연말 요약 등 후보는 Drive "마이라이프 컨텍스트 v13" 7장.
