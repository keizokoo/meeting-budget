# 마이라이프 (저장소 이름: meeting-budget)

## 무엇
- 회의비 · 가격 · 쇼핑 · 구독 · 인맥 · 피부 루틴 · 옷 사이즈를 한곳에서 관리하는 PWA "마이라이프".
  (원래 회의비 대시보드로 시작해서 저장소 이름이 meeting-budget)
- 파일: index.html(단일 파일, 약 1MB) · sw.js · manifest.json · mylife.webmanifest · 아이콘.
- 데이터: Google 시트 ↔ Apps Script 웹앱으로 동기화(`syncUp` / `syncDown`, 시트 내용을 합친 뒤 반영).
  시트의 '등록대기' 탭에 적은 항목을 앱이 가져와 반영하는 구조가 있음.
- 서버 코드 Code.gs: **저장소에 없음** → `gas/Code.gs`로 추가 예정.

## 이 앱만의 주의점
- 피부 루틴 변경은 `skincare-routine-guide-sync`, 옷 사이즈는 `clothing-size-check` 스킬과 연결됨 (시트 '등록대기' 경유).
- 회의비 금액 계산을 바꿀 때는 `financial-calc-verification` 스킬 적용.
- manifest 파일이 두 개(manifest.json, mylife.webmanifest) → 어느 쪽을 쓰는지 확인하고 바꿀 것.

## 배포
- 확인 필요: GitHub Pages인지 다른 호스팅인지.

## 작업 규칙 (모든 앱 공통)
- 코드 수정: `solo-app-code-edit` 스킬 절차를 따른다. 새 기능·탭 추가: `solo-app-new-build` 스킬.
- Apps Script·시트·배포 콘솔처럼 사용자가 직접 화면을 조작해야 하면 `gas-nondev-walkthrough` 스타일로 단계별 안내.
- index.html은 단일 파일이고 크다 → 전체를 다시 쓰지 말고 필요한 부분만 수정. 수정 전에 grep으로 관련 코드를 모두 찾을 것.
- 배포할 때마다 sw.js의 `CACHE_NAME` 버전을 올린다 (안 올리면 PWA가 옛 화면을 계속 보여줌).
- localStorage 키 이름(`*_v1` 등)을 바꾸면 기존 사용자 데이터가 사라진 것처럼 보인다 → 바꿀 때는 이전(마이그레이션) 코드 필수.
- 시트 동기화(push/pull) 형식을 바꾸면 Apps Script `Code.gs`도 같이 바꿔야 한다 → 사용자에게 Apps Script 수정·재배포 단계를 따로 안내.
- 작업은 브랜치 → PR → 사용자가 병합. main에 직접 push하지 않는다.
- 변경 후 Playwright로 index.html을 열어 콘솔 오류가 없는지 확인한다.

## 사용자
- 비개발자 1인 운영. 설명은 한국어 존댓말, 결론 먼저, 사용자가 할 일은 번호 매긴 단계로.

## 결정 기록 (채팅에서 확정한 사항을 한 줄씩 추가)
- (비어 있음)
