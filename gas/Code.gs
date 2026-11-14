/**
 * 마이라이프(회의비 · 가격 · 쇼핑 · 구독 · 인맥 · 의료비) - Google Sheets 백업용 Apps Script (v26)
 *
 * 앱의 [지금 백업] / [시트에서 불러오기] 버튼(그리고 자동 백업)이 호출하는 서버 역할을 합니다.
 *
 * v2 변경점
 *  1) 한 칸 5만 자 한도 해결: 전체 JSON을 4만 자씩 나눠 RAW_JSON 시트 A열 위에서부터 저장합니다.
 *     (이전 방식 = A1 한 칸에 통째로 저장된 시트도 그대로 읽을 수 있습니다)
 *  2) 사람이 보기 좋은 표 자동 생성: 예산현황 / 지출내역 / 가격체크_구매이력 / 쇼핑이력 / 골프장 / 골프_요금기록 / 구독결제 / 인맥_사람 / 인맥_모임 / 인맥_이력 / 도수치료 / 연봉이력 / 가이드
 *  3) 동시에 두 기기가 저장해도 섞이지 않도록 잠금(LockService) 사용
 *  4) 읽기 쉬운 표 정리에 문제가 생겨도 원본(RAW_JSON) 저장은 먼저 끝내고, 경고만 돌려줍니다.
 *
 * v26 변경점 (2026-11-14) — 앱 2026-11-14-a와 짝
 *  1) 저장 응답에 rev(앱이 보낸 저장 번호)·codeVersion·serverMs 추가 → 앱이 시트를 다시 읽지 않고 응답만으로 저장을 확인(동기화 시간 단축).
 *  2) ?action=ver → 서버 버전만 가볍게 돌려줌(앱의 '서버 연결 점검'·설정 화면 표시용).
 *  저장 방식·시트 구조·기존 응답 필드는 그대로.
 *
 * v25 변경점 (2026-10-28)
 *  1) 가격체크_구매이력 표: 증정이 '1개당'이 아니라 '전체 용량'으로 바뀜(앱 2026-10-28 빌드). 단가 = (결제금−적립금) ÷ (용량×개수 + 증정).
 *  2) 회사 의료비 입금 예정일 캘린더 알림: 청구마다 일정을 만들던 것을 '입금 예정일마다 일정 1개(건수·합계)'로 묶음. 같은 날 여러 건이어도 알림이 한 번만 옵니다.
 *
 * v24 변경점 (2026-10-19) — 오늘 화면 '할 일 · 일정'을 구글 캘린더 중심으로 일원화
 *  1) 앱의 날짜 있는 할 일(알림·정기결제·소비 혜택·카드 기한 등)을 백업할 때 캘린더 일정(당일 08:00 + 전날 18:00 알림)으로 복사합니다. 맵 시트: 할일_캘린더맵
 *  2) ?action=cals  → 내 캘린더 목록, ?action=agenda&cals=ID,ID&days=7 → 선택한 캘린더의 앞으로 N일 일정(앱이 만든 일정은 제외해 중복 방지)
 *  ※ 캘린더 권한이 새로 필요하면 편집기에서 authorizeCalendar를 한 번 실행하고 '새 버전 배포'를 해 주세요(주소는 그대로).
 *
 * v4 변경점 (2026-10-18)
 *  1) 덮어쓰기 대비 이력 보관: 저장 직전 이전 버전을 RAW_HISTORY 시트에 보관합니다(30분 간격 + 데이터가 확 줄어든 경우는 즉시, 최근 12개 유지).
 *     → 앱·기기 문제로 데이터가 비정상적으로 덮어써져도 RAW_HISTORY에서 되살릴 수 있습니다.
 *  2) 가격체크_구매이력 표에 구매처·사이즈 열, 쇼핑이력 표에 적립금 열 추가
 *
 * v5 변경점 (2026-10-18)
 *  1) 가격체크_구매이력 표 맨 끝에 '개수' 열 추가
 *  2) 쇼핑이력 표 맨 끝에 '혜택1완료'·'혜택2완료' 열 추가(받음 완료 = '완료')
 *
 * v6 변경점 (2026-10-18)
 *  1) 쇼핑이력 표 맨 끝에 '정가' 열 추가(정가 대비 절감률은 앱에서 계산·표시)
 *  2) 옷 사진은 용량이 커서 보기 좋은 표에는 넣지 않고, 원본 백업(RAW_JSON)에만 함께 저장됩니다.
 *
 * v7 변경점 (2026-10-18)
 *  1) 피부관리 탭 지원: '피부관리'(패키지별 결제금·총횟수·사용·남은 횟수·1회당 금액) / '피부관리_시술기록' 표 자동 생성
 *
 * v8 변경점 (2026-10-18)
 *  1) 패션 '내 치수표' 지원: '치수표' 표(옷 종류·브랜드(비우면 공통)·사이즈·실측 10항목·메모) 자동 생성
 *
 * v11 변경점 (2026-10-18)
 *  1) 인맥 '예약' 지원: 인맥_이력 표에 시간·상태(예약/완료)·장소 열 추가, 인맥_사람 표는 '목표 주기'·'자주 하는 방식' 열을 빼고 '다음 예약' 열 추가
 *  2) 구글캘린더 동기화(선택): 앱 설정에서 켜면 백업할 때 '예약'을 캘린더 "마이라이프 예약"에 만들고, 날짜 변경·삭제도 반영합니다.
 *     (캘린더 권한이 필요하니 authorizeCalendar 함수를 한 번 실행해 승인하세요. 실패해도 백업 자체에는 영향이 없고 경고만 돌려줍니다.)
 *  3) 연봉이력 표에 '성과급율(%)'·'총연봉(성과급 포함)' 열 추가
 *
 * v12 변경점 (2026-10-18)
 *  1) 캘린더 일정 제목 = 모임명(모임이 없으면 사람 이름). 일정은 내 기본 캘린더에 만듭니다(CAL_NAME에 이름을 적으면 그 캘린더 사용).
 *  2) 양방향: 캘린더에서 앱이 만든 일정의 날짜·시간·장소를 바꾸면, 다음에 앱이 동기화(백업/불러오기)할 때 앱의 예약에도 반영됩니다.
 *  3) 연봉이력 표에 OPI·OPI률 열 추가, 총연봉 = 연봉 + 업무성과급 + OPI
 *
 * v13 변경점 (2026-10-18)
 *  1) 쇼핑이력 표 맨 끝에 '브랜드'·'메모'·'중고보상 업체/금액/가능일' 열 추가
 *  2) 치수표에 '소매통'·'소맷부리' 열 추가(너입티셔츠 등 티셔츠 상세 치수)
 *  3) '알림' 표 추가(앱의 🔔 알림 목록: 제목·날짜·미리 알림·상태·메모)
 *
 * v14 변경점 (2026-10-18)
 *  1) 설정에서 추가한 분류 지원: 쇼핑이력에 직접 추가한 소비 분류도 표에 포함, 가이드 표에는 직접 추가한 분류 이름 표시
 *  2) 치수표에 '목둘레' 열 추가, 상의 열 이름을 도해와 같은 이름(어깨너비·가슴둘레·옷길이·소매길이·밑단둘레·소매통너비·소맷부리너비)으로 표시
 *
 * v15 변경점 (2026-10-18)
 *  1) 쇼핑이력 표 맨 끝에 '사이즈' 열 추가(패션 품목의 사이즈)
 *
 * v16 변경점 (2026-10-18)
 *  1) '등록대기' 시트 지원: 이 탭에 적어 둔 소비(패션 등) 기록을 앱이 열릴 때 자동으로 가져가 합칩니다(앱 파일을 다시 올릴 필요 없음).
 *     열: A 종류(shop) · B id · C 요약(사람용) · D 내용(JSON) · E 등록일. 같은 id는 앱에서 더 최근에 고친 쪽이 우선이라 안전합니다.
 *
 * v17 변경점 (2026-10-18)
 *  1) 구독결제 표 맨 끝에 '변경 예정 카드'·'변경 기한' 열 추가(구독·보험의 카드 변경 알림 대기 건)
 *
 * v18 변경점 (2026-10-18)
 *  1) 피부관리 '사용'에 '이전에 받은 횟수(날짜 모름)'를 포함하고, 표 맨 끝에 '이전 사용(날짜 모름)' 열 추가
 *
 * v20 변경점 (2026-10-19)
 *  1) 가이드 표: 분류별로 묶고(골프 → 피부 → 직접 추가한 분류 → 기타) 앱에서 정한 순서대로 정렬 (시트 표 보기 좋게 — 앱 동작과는 무관)
 *
 * v19 변경점 (2026-10-18)
 *  1) 피부관리: 횟수 제한 없는 관리(보톡스 등)는 시술별 가격을 합산해 결제금·1회당 금액을 계산하고, 시술기록 표 맨 끝에 '금액' 열 추가
 *
 * v21 변경점 (2026-10-19)
 *  1) 앱의 [이전 버전에서 복원] 지원: doGet에 action=hist(보관된 이전 버전 목록) / action=hist&i=행번호(그 버전의 데이터) 추가.
 *     (읽기 전용입니다. 시트 데이터는 바뀌지 않고, 앱이 받아 와서 현재 데이터와 합칩니다.)
 *
 * v23 변경점 (2026-10-19)
 *  - 회사 지급예정일이 주말·공휴일이면 앞 평일로 당김(medDueFor_). 앱 Med.dueFor와 동일.
 *  - 앱에서 "입금 예정일 캘린더 알림"을 켜면 회사 의료비 입금 예정일 09:00에 일정+팝업 알림 생성(syncMedCalendar_, 시트 '의료비_캘린더맵').
 *
 * v22 변경점 (2026-10-19)
 *  1) 의료비 지원: 앱의 '의료비' 탭 데이터를 읽기 쉬운 표 2개로 자동 생성합니다.
 *     - '의료비'(진료 건마다: 회사·실비 신청/입금 상태, 결제카드, 종결 여부, 실부담)
 *     - '의료비_청구'(회사·실비 신청/입금 묶음: 신청일·예상·입금일·입금액)
 *     (원본 백업 RAW_JSON에는 의료비 데이터가 자동으로 함께 저장됩니다. 이 변경은 보기 좋은 표만 추가해요.)
 *
 * 앱이 보내는 JSON 안에는 회의비 데이터(budgets, expenses …)와 함께
 * priceCheck(가격), shopping(쇼핑), golf(골프장), subs(구독·결제), people(인맥) 항목이 같이 들어 있습니다.
 */

var CODE_VERSION = 'v26 (2026-11-14)';
var RAW_SHEET = 'RAW_JSON';
var CHUNK_SIZE = 40000;   // 시트 한 칸 한도(50,000자)보다 작게
var HIST_SHEET = 'RAW_HISTORY';
var HIST_KEEP = 12;                    // 보관할 이전 버전 개수
var HIST_GAP_MS = 30 * 60 * 1000;      // 평소에는 30분 이상 간격으로만 보관

function doPost(e) {
  var t0_ = Date.now();
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(20000);
    locked = true;
    var text = e.postData.contents;
    var payload = JSON.parse(text);
    if (!payload || typeof payload !== 'object') throw new Error('잘못된 데이터입니다');
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var warnings = [];

    // 0) 덮어쓰기 직전 이전 버전 보관 (실패해도 저장은 계속)
    try { archivePrev_(ss, text); } catch (err) { warnings.push('이력 보관 실패: ' + String(err)); }

    // 1) 원본 JSON 저장 (복원의 기준)
    var info = saveRaw_(ss, text);

    // 2) 사람이 보기 좋은 표 (실패해도 원본 저장은 이미 끝난 상태)
    try { writeReadable_(ss, payload); } catch (err) { warnings.push(String(err)); }

    // 3) 구글캘린더 동기화 (앱에서 켠 경우에만, 실패해도 백업에는 영향 없음)
    try { var cw = syncCalendar_(ss, payload.people); if (cw) warnings.push(cw); } catch (err) { warnings.push('캘린더 동기화 실패: ' + String(err)); }
    try { var mw = syncMedCalendar_(ss, payload.medical); if (mw) warnings.push(mw); } catch (err) { warnings.push('의료비 캘린더 동기화 실패: ' + String(err)); }
    try { var aw = syncAgendaCalendar_(ss, payload._agenda); if (aw) warnings.push(aw); } catch (err) { warnings.push('할 일 캘린더 동기화 실패: ' + String(err)); }

    return json_({ ok: true, savedAt: new Date().toISOString(), chunks: info.chunks, length: text.length, warnings: warnings, rev: String(payload._rev || ''), codeVersion: CODE_VERSION, serverMs: Date.now() - t0_ });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (x) { /* 무시 */ } }
  }
}

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'ver') return json_({ ok: true, codeVersion: CODE_VERSION });
    if (e && e.parameter && e.parameter.action === 'hist') return histResponse_(e.parameter.i);
    if (e && e.parameter && e.parameter.action === 'cals') return json_(calsList_());
    if (e && e.parameter && e.parameter.action === 'agenda') return json_(agendaList_(e.parameter.cals, e.parameter.days));
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(RAW_SHEET);
    if (!sh) {
      return json_({ error: '아직 백업된 데이터가 없습니다. 앱에서 "지금 백업"을 먼저 실행해주세요.' });
    }
    try { pullCalendar_(ss, sh); } catch (err) { /* 캘린더 문제가 있어도 데이터 읽기는 계속 */ }
    var raw = readRaw_(sh);
    try {
      var inbox = readInbox_(ss);
      if (inbox.length) { var obj = JSON.parse(raw); obj.inbox = inbox; raw = JSON.stringify(obj); }
    } catch (err2) { /* 등록대기 문제가 있어도 원본 데이터 읽기는 계속 */ }
    return ContentService.createTextOutput(raw).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return json_({ error: String(err) });
  }
}


/* ---------- 이전 버전 조회 (RAW_HISTORY, 읽기 전용) ---------- */
function histResponse_(idx) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hs = ss.getSheetByName(HIST_SHEET);
  if (!hs || hs.getLastRow() < 2) return json_({ list: [] });
  if (!idx) {
    var rows = hs.getRange(2, 1, hs.getLastRow() - 1, 2).getValues(), list = [];
    for (var r = 0; r < rows.length; r++) {
      if (!rows[r][0]) continue;
      list.push({ i: r + 2, at: new Date(rows[r][0]).toISOString(), len: Number(rows[r][1]) || 0 });
    }
    list.sort(function (a, b) { return a.at < b.at ? 1 : -1; });   // 최신이 위로
    return json_({ list: list });
  }
  var row = Number(idx);
  if (!row || row < 2 || row > hs.getLastRow()) return json_({ error: '없는 버전입니다' });
  var vals = hs.getRange(row, 3, 1, Math.max(1, hs.getLastColumn() - 2)).getValues()[0], out = '';
  for (var c = 0; c < vals.length; c++) { if (vals[c] === '' || vals[c] === null) continue; out += String(vals[c]).replace(/^#\d+\|/, ''); }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 등록대기 (시트에 직접 적어 둔 새 기록) ---------- */
function readInbox_(ss) {
  var sh = ss.getSheetByName('등록대기');
  if (!sh || sh.getLastRow() < 2) return [];
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var kind = String(vals[i][0] || '').trim(), txt = String(vals[i][3] || '').trim();
    if (!kind || !txt) continue;
    try { out.push({ kind: kind, item: JSON.parse(txt) }); } catch (e) { /* 잘못된 줄은 건너뜀 */ }
  }
  return out;
}

/* ---------- 원본 JSON 저장/읽기 (분할 저장) ---------- */
function saveRaw_(ss, text) {
  var sh = ss.getSheetByName(RAW_SHEET) || ss.insertSheet(RAW_SHEET);
  var chunks = [];
  for (var i = 0, n = 1; i < text.length; i += CHUNK_SIZE, n++) {
    chunks.push(['#' + n + '|' + text.substring(i, i + CHUNK_SIZE)]);   // 앞의 표식(#번호|) 때문에 숫자/수식으로 오인되지 않음
  }
  if (!chunks.length) chunks.push(['#1|']);
  var last = Math.max(sh.getLastRow(), chunks.length);
  sh.getRange(1, 1, last, 1).clearContent();                 // 이전 조각·옛 안내문 정리
  sh.getRange(1, 1, chunks.length, 1).setValues(chunks);
  sh.getRange('B1').setValue(new Date());
  sh.getRange('C1').setValue('← A열 위에서부터 전체 데이터(JSON)가 조각으로 저장됩니다. 직접 수정하지 마세요.');
  sh.getRange('C2').setValue(chunks.length);                 // 조각 수
  return { chunks: chunks.length };
}

function readRaw_(sh) {
  var n = Number(sh.getRange('C2').getValue());
  if (!n || n < 1) return String(sh.getRange('A1').getValue());   // 이전 방식(A1 한 칸) 호환
  var vals = sh.getRange(1, 1, n, 1).getValues();
  var out = '';
  for (var i = 0; i < n; i++) out += String(vals[i][0]).replace(/^#\d+\|/, '');
  return out;
}

/* ---------- 이전 버전 보관 (RAW_HISTORY) ---------- */
function archivePrev_(ss, newText) {
  var sh = ss.getSheetByName(RAW_SHEET);
  if (!sh) return;
  var prev = readRaw_(sh);
  if (!prev || prev.charAt(0) !== '{') return;               // 비어 있거나 JSON이 아니면 보관하지 않음
  var hs = ss.getSheetByName(HIST_SHEET) || ss.insertSheet(HIST_SHEET);
  if (hs.getLastRow() < 1) hs.getRange(1, 1, 1, 3).setValues([['이전 버전의 저장 시각', '길이(자)', 'JSON 조각 1, 2, … (→ 오른쪽으로 이어서 붙이면 원본)']]);
  var last = hs.getLastRow();
  var shrunk = prev.length > 2000 && newText.length < prev.length * 0.7;   // 데이터가 갑자기 크게 줄어든 경우
  var lastAt = last > 1 ? new Date(hs.getRange(last, 1).getValue()).getTime() : 0;
  var prevAt = sh.getRange('B1').getValue();
  prevAt = prevAt ? new Date(prevAt).getTime() : Date.now();
  if (!shrunk && lastAt && (prevAt - lastAt) < HIST_GAP_MS) return;         // 너무 촘촘하게는 보관하지 않음
  var row = [new Date(prevAt), prev.length];
  for (var i = 0, n = 1; i < prev.length; i += CHUNK_SIZE, n++) row.push('#' + n + '|' + prev.substring(i, i + CHUNK_SIZE));
  hs.getRange(last + 1, 1, 1, row.length).setValues([row]);
  var total = hs.getLastRow() - 1;                                          // 헤더 제외 개수
  if (total > HIST_KEEP) hs.deleteRows(2, total - HIST_KEEP);
}

/* ---------- 읽기 쉬운 표 ---------- */
function writeReadable_(ss, payload) {
  // 예산현황
  var months = Object.keys(payload.budgets || {}).sort();
  var budgetRows = [['월', '예산']];
  months.forEach(function (m) { budgetRows.push([m, payload.budgets[m]]); });
  writeTable_(ss, '예산현황', budgetRows);

  // 지출내역
  var expenses = (payload.expenses || []).slice().sort(function (a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });
  var expRows = [['지출일', '카드구분', '지출항목', '결제금액']];
  expenses.forEach(function (x) { expRows.push([x.date, x.cardType, x.item, x.amount]); });
  writeTable_(ss, '지출내역', expRows);

  // 가격체크_구매이력 (정희님 표와 같은 열 구성)
  if (payload.priceCheck) {
    var pc = payload.priceCheck, items = pc.items || [], recs = pc.records || [];
    var rows = [['구매일', '상품', '용량', '증정', '결제금', '적립금', '적립금감안', '단가', '단가 기준', '구매처', '사이즈', '개수']];
    items.forEach(function (it) {
      var basis = Number(it.basis) || 1;
      recs.filter(function (r) { return r.itemId === it.id; })
        .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
        .forEach(function (r) {
          // v25: 증정(bonus)은 1개당이 아니라 전체 용량 → 총량 = 용량 × 개수 + 증정
          var paid = Number(r.paid) || 0, pts = Number(r.points) || 0, qty = Math.max(1, Math.round(Number(r.qty)) || 1), vol = (Number(r.amount) || 0) * qty + (Number(r.bonus) || 0);
          var net = paid - pts;
          rows.push([r.date, it.name, r.amount + it.unit, r.bonus ? r.bonus + it.unit : '', paid, pts, net,
            vol > 0 ? Math.round(net / vol * basis * 100) / 100 : '', '원/' + (basis === 1 ? '' : basis) + it.unit, r.store || '', r.size || '', qty]);
        });
    });
    writeTable_(ss, '가격체크_구매이력', rows);
  }

  // 쇼핑이력 (기존 대시보드 CSV와 같은 열)
  if (payload.shopping) {
    var cats = [['electronics', '전자제품'], ['fashion', '패션'], ['golf', '골프']];
    ((payload.opts && payload.opts.shopCats) || []).forEach(function (c) { if (c && !c.del && c.k && c.label) cats.push([c.k, c.label]); });
    var sRows = [['카테고리', '품목', '구매처', '수량', '구매일', '구매금액', '실구매금액', '혜택1명', '혜택1금액', '혜택1일',
      '혜택2명', '혜택2금액', '혜택2일', '상태', '판매일', '판매금액', '위약금', '재판매손익', '적립금', '혜택1완료', '혜택2완료', '정가', '브랜드', '메모', '중고보상 업체', '중고보상 금액', '중고보상 가능일', '사이즈']];
    var all = payload.shopping.items || [];
    cats.forEach(function (c) {
      all.filter(function (i) { return i.cat === c[0]; }).forEach(function (i) {
        var actual = (i.actualPrice === '' || i.actualPrice == null || isNaN(i.actualPrice)) ? null : Number(i.actualPrice);
        var net = actual !== null ? actual : (Number(i.purchasePrice) || 0);
        var sold = i.status === 'sold';
        var profit = sold ? ((Number(i.salePrice) || 0) - (Number(i.penalty) || 0)) - net : '';
        sRows.push([c[1], i.item, i.store || '', i.qty || 1, i.purchaseDate || '', i.purchasePrice === undefined ? '' : i.purchasePrice,
          i.actualPrice === undefined ? '' : i.actualPrice, i.b1name || '', i.b1amount === undefined ? '' : i.b1amount, i.b1date || '',
          i.b2name || '', i.b2amount === undefined ? '' : i.b2amount, i.b2date || '', sold ? '판매완료' : '보유중', i.saleDate || '',
          i.salePrice === undefined ? '' : i.salePrice, i.penalty === undefined ? '' : i.penalty, profit, i.points === undefined ? '' : i.points,
          (i.b1done === true || i.b1done === 'true') ? '완료' : '', (i.b2done === true || i.b2done === 'true') ? '완료' : '', i.listPrice === undefined ? '' : i.listPrice, i.brand || '', i.memo || '', i.tName || '', (i.tAmount === undefined || i.tAmount === null) ? '' : i.tAmount, i.tDate || '', i.size || '']);
      });
    });
    writeTable_(ss, '쇼핑이력', sRows);
  }

  // 피부관리: 패키지별 요약 + 시술 기록
  if (payload.skin) {
    var sk = payload.skin, kItems = sk.items || [], kSes = sk.sessions || [];
    var kRows = [['관리명', '피부과', '기능', '결제일', '결제금', '총횟수', '사용', '남은횟수', '1회당', '사용금액', '남은가치', '상태', '마지막 시술', '메모', '이전 사용(날짜 모름)']];
    var kLog = [['시술일', '관리명', '피부과', '기능', '회차', '금액']];
    kItems.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).forEach(function (it) {
      var mine = kSes.filter(function (x) { return x.itemId === it.id; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      var total = Math.max(1, Math.round(Number(it.total)) || 1), cost = Number(it.cost) || 0, pre = Math.max(0, Math.round(Number(it.pre)) || 0), used = mine.length + pre;
      var def = cost;
      if (it.open) { cost = pre * def; mine.forEach(function (x) { cost += (x.cost === '' || x.cost === null || x.cost === undefined) ? def : (Number(x.cost) || 0); }); total = Math.max(1, used); }
      var usedCost = it.open ? cost : Math.round(cost * Math.min(used, total) / total);
      kRows.push([it.name, it.clinic || '', it.func || '', it.date || (it.open && mine.length ? mine[0].date : ''), cost, it.open ? '제한 없음' : total, used, it.open ? '' : Math.max(0, total - used), it.open ? (used ? Math.round(cost / used) : def) : Math.round(cost / total), usedCost, cost - usedCost,
        it.open ? '진행중(제한 없음)' : (used >= total ? (used > total ? '횟수 초과' : '소진 완료') : '진행중'), mine.length ? mine[mine.length - 1].date : '', it.memo || '', pre]);
      mine.forEach(function (x, k) { kLog.push([x.date, it.name, it.clinic || '', it.func || '', (k + 1) + '회', it.open ? ((x.cost === '' || x.cost === null || x.cost === undefined) ? def : (Number(x.cost) || 0)) : '']); });
    });
    writeTable_(ss, '피부관리', kRows);
    writeTable_(ss, '피부관리_시술기록', kLog);
  }

  // 치수표(패션): 옷 종류별 → 공통 먼저, 브랜드순
  if (payload.sizes) {
    var zf = ['목', '어깨', '가슴', '기장', '소매', '소매통', '소맷부리', '허리', '엉덩이', '허벅지', '밑위', '밑단', '총장'];
    var zl = { 목: '목둘레', 어깨: '어깨너비', 가슴: '가슴둘레(상의)·가슴', 기장: '옷길이·기장', 소매: '소매길이', 소매통: '소매통너비', 소맷부리: '소맷부리너비', 밑단: '밑단(상의=둘레)' };
    var zRows = [['옷 종류', '브랜드', '사이즈'].concat(zf.map(function (f) { return zl[f] || f; })).concat(['메모'])];
    (payload.sizes.items || []).slice().sort(function (a, b) {
      return (a.kind || '') < (b.kind || '') ? -1 : (a.kind || '') > (b.kind || '') ? 1 : ((a.brand ? 1 : 0) - (b.brand ? 1 : 0)) || ((a.brand || '') < (b.brand || '') ? -1 : (a.brand || '') > (b.brand || '') ? 1 : 0);
    }).forEach(function (i) {
      zRows.push([i.kind || '', i.brand || '공통', i.size || ''].concat(zf.map(function (f) { return i.m && i.m[f] != null ? i.m[f] : ''; })).concat([i.note || '']));
    });
    writeTable_(ss, '치수표', zRows);
  }

  // 골프장: 골프장별 1·2·3부 최저가 + 거리 + 후기 / 요금 기록
  if (payload.golf) {
    var gf = payload.golf, courses = gf.courses || [], rounds = gf.rounds || [];
    var minPrice = function (cid, part) {
      var p = rounds.filter(function (r) { return r.courseId === cid && Number(r.part) === part && Number(r.price) > 0; }).map(function (r) { return Number(r.price); });
      return p.length ? Math.min.apply(null, p) : '';
    };
    var gRows = [['골프장', '1부', '2부', '3부', '편도(분)', '귀가(분)', '후기']];
    courses.forEach(function (c) { gRows.push([c.name, minPrice(c.id, 1), minPrice(c.id, 2), minPrice(c.id, 3), c.go === undefined ? '' : c.go, c.back === undefined ? '' : c.back, c.review || '']); });
    writeTable_(ss, '골프장', gRows);
    var nameOf = {}; courses.forEach(function (c) { nameOf[c.id] = c.name; });
    var rRows = [['골프장', '날짜', '요일', '티타임', '부', '가격', '메모']];
    rounds.forEach(function (r) {
      var t = String(r.tee || '');
      if (/^\d{3,4}$/.test(t)) { t = ('0' + t).slice(-4); t = t.slice(0, 2) + ':' + t.slice(2); }
      rRows.push([nameOf[r.courseId] || '', r.date || '', r.day || '', t, r.part ? r.part + '부' : '', r.price, r.note || '']);
    });
    writeTable_(ss, '골프_요금기록', rRows);
  }

  // 구독결제: 날짜, 내용, 카드, 비용, 할인정보 순 (현재 금액 기준)
  if (payload.subs) {
    var costIsNet = !!(payload.subs.cfg && payload.subs.cfg.costIsNet);
    var items2 = (payload.subs.items || []).filter(function (i) { return i.active !== false; })
      .sort(function (a, b) { return ((a.cat === '보험') - (b.cat === '보험')) || (a.day - b.day); });
    var sbRows = [['결제일', '내용', '카드', '비용', '할인정보', '분류', '실부담', '변경 예정 카드', '변경 기한']];
    items2.forEach(function (i) {
      var d = i.disc || {}, amt = (i.amount === null || i.amount === undefined || i.amount === '') ? '' : Number(i.amount);
      var info = d.kind === 'pct' ? d.value + '% 할인' : (d.kind === 'point' ? d.value + '원 적립' : (d.kind === 'text' ? (d.text || '') : ''));
      var saved = amt === '' ? 0 : (d.kind === 'pct' ? Math.round(amt * Number(d.value) / 100) : (d.kind === 'point' ? Math.round(Number(d.value)) : 0));
      sbRows.push([i.day, i.name + (i.memo ? ' · ' + i.memo : ''), i.card || '', amt === '' ? '변동' : amt, info, i.cat, amt === '' ? '' : (costIsNet ? amt : amt - saved), i.newCard || '', i.newCard ? (i.ccDate || '') : '']);
    });
    writeTable_(ss, '구독결제', sbRows);
  }

  // 인맥: 사람 / 모임 / 만남 이력(예약 포함)
  if (payload.people) {
    var pp = payload.people, people = pp.people || [], meets = pp.meets || [], last = {}, next = {};
    var todayKst = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    meets.forEach(function (m) {
      var plan = isPlan_(m, todayKst);
      (m.pids || []).forEach(function (id) {
        if (plan) { if (m.date >= todayKst && (!next[id] || m.date < next[id])) next[id] = m.date; }
        else if (!last[id] || m.date > last[id]) last[id] = m.date;
      });
    });
    var clubs = pp.clubs || [], clubOf = {};
    clubs.forEach(function (c) { (c.pids || []).forEach(function (id) { (clubOf[id] = clubOf[id] || []).push(c.name); }); });
    var pRows = [['이름', '그룹', '모임', '마지막 만남', '다음 예약', '메모']];
    people.forEach(function (p) { pRows.push([p.name, p.group, (clubOf[p.id] || []).join(', '), last[p.id] || '', next[p.id] || '', p.memo || '']); });
    writeTable_(ss, '인맥_사람', pRows);
    var nm = {}; people.forEach(function (p) { nm[p.id] = p.name; });
    var cRows = [['모임명', '인원 수', '구성원']];
    clubs.forEach(function (c) { var ns = (c.pids || []).map(function (id) { return nm[id]; }).filter(Boolean); cRows.push([c.name, ns.length, ns.join(', ')]); });
    writeTable_(ss, '인맥_모임', cRows);
    var en = { charge: '충전', normal: '보통', drain: '방전' };
    var mRows = [['날짜', '시간', '상태', '모임', '방식', '사람', '장소', '메모', '에너지']];
    meets.slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); }).forEach(function (m) {
      var mc = clubOfMeet_(m, clubs);
      mRows.push([m.date, m.time || '', isPlan_(m, todayKst) ? '예약' : '완료', mc ? mc.name : '', m.type, (m.pids || []).map(function (id) { return nm[id] || '(삭제된 사람)'; }).join(', '), m.place || '', m.memo || '', en[m.energy] || '']);
    });
    writeTable_(ss, '인맥_이력', mRows);
  }

  // 의료비: 진료 건(회사·실비 상태) / 청구(신청·입금 묶음)
  if (payload.medical) {
    var md = payload.medical, mItems = md.items || [], mClaims = md.claims || [], mCfg = md.cfg || {};
    var ded = isFinite(Number(mCfg.ded)) && mCfg.ded !== '' && mCfg.ded != null ? Number(mCfg.ded) : 5000;
    var byId = {}, coOf = {}, inOf = {};
    mItems.forEach(function (i) { byId[i.id] = i; });
    mClaims.forEach(function (c) { (c.ids || []).forEach(function (id) { if (c.t === 'co') coOf[id] = c; else inOf[id] = c; }); });
    var todayM = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    var stTxt = function (c) { return c ? (c.st === 'paid' ? '입금완료' : '신청') : '미신청'; };
    var mrows = [['진료일', '대상', '병원·약국', '총 결제금액', '비급여(선택진료료 이외)', '결제카드', '할부(개월)', '회사', '회사 신청일', '회사 지급예정일', '회사 예상 지원금', '회사 입금액(묶음 합계)', '실비', '실비 신청일', '실비 예상(묶음 합계)', '실비 입금액(묶음 합계)', '종결', '회사 반영액', '실비 반영액', '실부담(총결제−회사−실비)', '실부담 구분', '실비 묶음', '확인 필요', '메모']];
    var oopM = medOop_(mItems, mClaims, mCfg);
    mItems.slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)); }).forEach(function (i) {
      var c = coOf[i.id], n = inOf[i.id], el = medElig_(i, mItems, ded), cs = stTxt(c), is = !el ? (i.why || '비대상') : stTxt(n);
      var closed = cs === '입금완료' && (!el || is === '입금완료');
      mrows.push([i.date, i.who, i.place, Number(i.total) || 0, Number(i.extra) || 0, i.card || '', Number(i.inst) || '', cs, c ? (c.cdate || '') : '', c ? medEffDue_(c) : '', medCoExp_(i, mCfg),
        c && c.st === 'paid' ? (c.paid === null || c.paid === undefined ? '금액 미상' : c.paid) : '', is, n ? (n.cdate || '') : '', n ? (Number(n.exp) || 0) : '', n && n.st === 'paid' ? (n.paid === null || n.paid === undefined ? '금액 미상' : n.paid) : '',
        closed ? '종결' : '진행중', oopM[i.id].co, oopM[i.id].ins, oopM[i.id].oop, oopM[i.id].sure ? '확정' : '예상', medBundle_(i, mItems), i.chk || '', i.memo || '']);
    });
    writeTable_(ss, '의료비', mrows);
    var crows = [['구분', '신청일', '지급예정일', '상태', '건수', '대상 진료', '예상 지원금', '입금일', '입금액']];
    mClaims.slice().sort(function (a, b) { return (a.cdate || '') < (b.cdate || '') ? 1 : ((a.cdate || '') > (b.cdate || '') ? -1 : 0); }).forEach(function (c) {
      var names = (c.ids || []).map(function (id) { var i = byId[id]; return i ? i.date.slice(5) + ' ' + i.place : ''; }).filter(Boolean).join(', ');
      crows.push([c.t === 'co' ? '회사' : '실비(메리츠)', c.cdate || '', c.t === 'co' ? medEffDue_(c) : '', c.st === 'paid' ? '입금완료' : (c.t === 'co' && medEffDue_(c) && medEffDue_(c) < todayM ? '신청(지급예정일 지남)' : '신청'), (c.ids || []).length, names, Number(c.exp) || 0, c.pdate || '', c.st === 'paid' ? (c.paid === null || c.paid === undefined ? '금액 미상' : c.paid) : '']);
    });
    writeTable_(ss, '의료비_청구', crows);
  }

  // 도수치료(실비 한도 카운팅용 기록) / 연봉 이력 / 가이드
  if (payload.manual) {
    var mrows = [['진료일', '질병·사고', '부위', '횟수(일수)', '병원', '청구금액', '지급보험금', '본인부담', '청구', '청구·지급일', '증상', '메모']];
    (payload.manual.items || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); }).forEach(function (r) {
      var cost = Number(r.cost) || 0, paid = Number(r.paid) || 0;
      mrows.push([r.date, r.dz || '', r.part || '', Number(r.cnt) || 1, r.clinic || '', cost, paid, cost - paid, r.claimed === false ? '미청구' : '청구', r.cdate || '', r.symptom || '', r.memo || '']);
    });
    writeTable_(ss, '도수치료', mrows);
  }
  if (payload.pay) {
    var yrows = [['연도', '직급', '연차', '연봉(만원)', '연봉상승률(%)', '인상률 구성', '업무성과급(원)', '업무성과급률(%)', 'OPI(원)', 'OPI률(%)', '총연봉(원, 연봉+업무성과급+OPI)', '메모']];
    (payload.pay.items || []).slice().sort(function (a, b) { return b.year - a.year; }).forEach(function (r) {
      var sal = Number(r.salary) || 0, bon = Number(r.bonus) || 0, opi = Number(r.opi) || 0;
      var opiRate = (r.opiRate !== '' && r.opiRate != null && isFinite(Number(r.opiRate))) ? Number(r.opiRate) : (sal > 0 && opi > 0 ? Math.round(opi / (sal * 10000) * 1000) / 10 : '');
      yrows.push([r.year, r.cl || '', r.tenure || '', sal, r.rate === '' || r.rate == null ? '' : Number(r.rate), r.parts || '', bon, sal > 0 && bon > 0 ? Math.round(bon / (sal * 10000) * 1000) / 10 : '', opi || '', opiRate, sal > 0 ? sal * 10000 + bon + opi : '', r.memo || '']);
    });
    writeTable_(ss, '연봉이력', yrows);
  }
  if (payload.reminders) {
    var rr = [['제목', '날짜', '미리 알림(일)', '상태', '메모']];
    (payload.reminders.items || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); }).forEach(function (r) {
      rr.push([r.title || '', r.date || '', Number(r.lead) || 0, r.done ? '완료' : '대기', r.memo || '']);
    });
    writeTable_(ss, '알림', rr);
  }
  if (payload.guide) {
    var grows = [['분류', '제목', '내용']], kn = { golf: '골프', skin: '피부', etc: '기타' };
    ((payload.opts && payload.opts.gdKinds) || []).forEach(function (c) { if (c && c.k && c.label) kn[c.k] = c.label; });
    var kord = ['golf', 'skin'];
    ((payload.opts && payload.opts.gdKinds) || []).forEach(function (c) { if (c && c.k && !c.del) kord.push(c.k); });
    kord.push('etc');
    (payload.guide.items || []).map(function (r, ix) { return { r: r, ix: ix }; }).sort(function (a, b) {
      var ka = kord.indexOf(a.r.kind), kb = kord.indexOf(b.r.kind); ka = ka < 0 ? 999 : ka; kb = kb < 0 ? 999 : kb;
      var oa = (a.r.o === null || a.r.o === undefined) ? 1e9 : Number(a.r.o), ob = (b.r.o === null || b.r.o === undefined) ? 1e9 : Number(b.r.o);
      return (ka - kb) || (oa - ob) || (a.ix - b.ix);
    }).forEach(function (x) { grows.push([kn[x.r.kind] || '기타', x.r.title, (x.r.lines || []).join('\n')]); });
    writeTable_(ss, '가이드', grows);
  }
}

/* ---------- 인맥 예약 / 구글캘린더 동기화 (양방향) ---------- */
var CAL_NAME = '';                        // 비우면 내 기본 캘린더. 이름을 적으면 그 이름의 캘린더(없으면 새로 만듦)
var LEGACY_CAL_NAME = '마이라이프 예약';   // v11에서 만들어졌을 수 있는 캘린더(옛 일정 정리용)
var CAL_MAP_SHEET = '캘린더연동';

function isPlan_(m, today) {
  if (m.st === 'plan') return true;
  if (m.st === 'done') return false;
  return String(m.date) > today;     // 예전 기록(상태 없음)은 날짜가 앞으로면 예약으로 봄
}

function getCal_() {
  if (!CAL_NAME) return CalendarApp.getDefaultCalendar();
  var c = CalendarApp.getCalendarsByName(CAL_NAME);
  return c.length ? c[0] : CalendarApp.createCalendar(CAL_NAME);
}

function authorizeCalendar() {
  // 에디터에서 ▶ 실행해 캘린더 권한을 한 번 승인하는 용도입니다.
  Logger.log('캘린더 준비 완료: ' + getCal_().getName());
}

function clubOfMeet_(m, clubs) {
  var hit = null, key = (m.pids || []).slice().sort().join(',');
  (clubs || []).forEach(function (c) { if (m.cid && c.id === m.cid) hit = c; });
  if (hit) return hit;
  (clubs || []).forEach(function (c) { if (!hit && key && (c.pids || []).slice().sort().join(',') === key) hit = c; });
  return hit;
}
function meetTitle_(m, nm, clubs) {
  var c = clubOfMeet_(m, clubs);
  if (c) return c.name;
  return (m.pids || []).map(function (id) { return nm[id]; }).filter(Boolean).join(', ') || '(미정)';
}
function meetSig_(m, title) { return [m.date, m.time || '', title, m.place || '', m.memo || '', m.type || ''].join('|'); }

function readCalMap_(ss) {
  var sh = ss.getSheetByName(CAL_MAP_SHEET), map = {};
  if (!sh || sh.getLastRow() < 2) return map;
  sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues().forEach(function (r) {
    if (r[0]) map[String(r[0])] = { ev: String(r[1] || ''), sig: String(r[2] || ''), date: String(r[3] || ''), time: String(r[4] || ''), place: String(r[5] || '') };
  });
  return map;
}
function writeCalMap_(ss, map) {
  var sh = ss.getSheetByName(CAL_MAP_SHEET) || ss.insertSheet(CAL_MAP_SHEET);
  var rows = [['예약 ID', '캘린더 일정 ID', '내용 서명(변경 감지용)', '날짜', '시간', '장소']];
  Object.keys(map).forEach(function (id) { var x = map[id]; rows.push([id, x.ev, x.sig, x.date, x.time, x.place]); });
  sh.clearContents(); sh.getRange(1, 1, rows.length, 6).setValues(rows);
}
function delEvent_(cal, id) {
  if (!id) return;
  var cals = [cal];
  try { var lg = CalendarApp.getCalendarsByName(LEGACY_CAL_NAME); if (lg.length) cals.push(lg[0]); } catch (x) { /* 무시 */ }
  for (var i = 0; i < cals.length; i++) {
    try { var e = cals[i].getEventById(id); if (e) { e.deleteEvent(); return; } } catch (x) { /* 다음 캘린더 확인 */ }
  }
}
function readEvent_(ev) {
  var date, time = '';
  if (ev.isAllDayEvent()) date = Utilities.formatDate(ev.getAllDayStartDate(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  else { var st = ev.getStartTime(); date = Utilities.formatDate(st, 'Asia/Seoul', 'yyyy-MM-dd'); time = Utilities.formatDate(st, 'Asia/Seoul', 'HH:mm'); }
  return { date: date, time: time, place: ev.getLocation() || '' };
}

// 앱 → 캘린더 (백업할 때)
function syncCalendar_(ss, people) {
  if (!people || !people.cfg || people.cfg.cal !== true) return '';
  var meets = people.meets || [], del = people.del || {}, clubs = people.clubs || [], today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  var nm = {}; (people.people || []).forEach(function (p) { nm[p.id] = p.name; });
  var byId = {}; meets.forEach(function (m) { byId[m.id] = m; });
  var cal = getCal_(), map = readCalMap_(ss);
  var out = {}, made = 0, changed = 0, removed = 0, fail = 0;

  meets.forEach(function (m) {
    if (!m || !m.id || del[m.id] || !isPlan_(m, today)) return;
    var title = meetTitle_(m, nm, clubs), names = (m.pids || []).map(function (id) { return nm[id]; }).filter(Boolean).join(', ');
    var desc = (m.type ? '방식: ' + m.type + '\n' : '') + (names ? '함께: ' + names + '\n' : '') + (m.memo ? '메모: ' + m.memo + '\n' : '') + '\n— 마이라이프 앱에서 만든 예약이에요. 날짜·시간·장소를 바꾸면 앱에도 반영돼요.';
    var sig = meetSig_(m, title), prev = map[m.id];
    var entry = { ev: '', sig: sig, date: m.date, time: m.time || '', place: m.place || '' };
    if (prev && prev.sig === sig && prev.ev) { out[m.id] = prev; return; }
    try {
      if (prev && prev.ev) { delEvent_(cal, prev.ev); changed++; } else made++;
      var opt = { description: desc }; if (m.place) opt.location = m.place;
      var ev;
      if (m.time) {
        var st = Utilities.parseDate(m.date + ' ' + m.time, 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
        ev = cal.createEvent(title, st, new Date(st.getTime() + 90 * 60 * 1000), opt);
      } else {
        ev = cal.createAllDayEvent(title, Utilities.parseDate(m.date, Session.getScriptTimeZone(), 'yyyy-MM-dd'), opt);
      }
      entry.ev = ev.getId(); out[m.id] = entry;
    } catch (err) { fail++; if (prev) out[m.id] = prev; }
  });

  // 앱에서 삭제한 예약은 캘린더에서도 지움. 만남 완료로 바뀐 것은 일정을 남겨 둠.
  Object.keys(map).forEach(function (id) {
    if (out[id]) return;
    var m = byId[id];
    if (m && !del[id] && !isPlan_(m, today)) return;
    try { delEvent_(cal, map[id].ev); removed++; } catch (err) { fail++; out[id] = map[id]; }
  });
  writeCalMap_(ss, out);
  return fail ? ('캘린더 일부 실패 ' + fail + '건 (만듦 ' + made + ' · 변경 ' + changed + ' · 삭제 ' + removed + ')') : '';
}


/* ---------- 회사 의료비 입금 예정일 → 구글캘린더 (앱 설정에서 켠 경우에만) ---------- */
// v25: 청구마다가 아니라 '입금 예정일마다' 일정 1개(건수·합계). 맵의 키는 'due:YYYY-MM-DD'. 옛 방식(청구 ID 키) 일정은 정리 단계에서 지워짐.
var MED_CAL_SHEET = '의료비_캘린더맵';
function syncMedCalendar_(ss, md) {
  if (!md || !md.cfg || md.cfg.cal !== true) {
    // 껐으면 이미 만든 일정을 정리
    var old = readMedCalMap_(ss); if (!Object.keys(old).length) return '';
    var c0 = getCal_(); Object.keys(old).forEach(function (id) { try { delEvent_(c0, old[id].ev); } catch (x) { /* 무시 */ } });
    writeMedCalMap_(ss, {}); return '';
  }
  var items = md.items || [], claims = md.claims || [], del = md.del || {}, byId = {};
  items.forEach(function (i) { byId[i.id] = i; });
  var today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  var cal = getCal_(), map = readMedCalMap_(ss), out = {}, fail = 0, groups = {};
  claims.forEach(function (c) {
    if (!c || !c.id || del[c.id] || c.t !== 'co' || c.st === 'paid') return;
    var its = (c.ids || []).map(function (id) { return byId[id]; }).filter(Boolean); if (!its.length) return;
    var due = medEffDue_(c); if (!due || due < today) return;
    var g = groups[due] || (groups[due] = { n: 0, exp: 0, lines: [] });
    g.n++; g.exp += medNum_(c.exp);
    its.forEach(function (i) { g.lines.push(i.date + ' ' + (i.place || '')); });
  });
  Object.keys(groups).forEach(function (due) {
    var g = groups[due], key = 'due:' + due, prev = map[key];
    var title = '💰 회사 의료비 입금 예정 ' + (g.n > 1 ? g.n + '건 · ' : '') + Math.round(g.exp).toLocaleString('en-US') + '원';
    var sig = [due, Math.round(g.exp), g.n, g.lines.length].join('|');
    if (prev && prev.sig === sig && prev.ev) { out[key] = prev; return; }
    try {
      if (prev && prev.ev) delEvent_(cal, prev.ev);
      var st = Utilities.parseDate(due + ' 09:00', 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
      var ev = cal.createEvent(title, st, new Date(st.getTime() + 30 * 60 * 1000), { description: g.lines.join('\n') + '\n\n통장을 확인하고 앱에서 “입금 확인”(또는 💳 입금 일괄 확인)을 눌러 주세요. — 마이라이프' });
      try { ev.removeAllReminders(); ev.addPopupReminder(0); } catch (x) { /* 알림 설정 실패는 무시 */ }
      out[key] = { ev: ev.getId(), sig: sig, date: due };
    } catch (err) { fail++; if (prev) out[key] = prev; }
  });
  // 입금 확인했거나 날짜가 지났거나 지운 청구의 일정(옛 방식 일정 포함) 정리
  Object.keys(map).forEach(function (id) {
    if (out[id]) return;
    try { delEvent_(cal, map[id].ev); } catch (err) { fail++; out[id] = map[id]; }
  });
  writeMedCalMap_(ss, out);
  return fail ? ('의료비 캘린더 일부 실패 ' + fail + '건') : '';
}
function readMedCalMap_(ss) {
  var sh = ss.getSheetByName(MED_CAL_SHEET), map = {};
  if (!sh || sh.getLastRow() < 2) return map;
  sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().forEach(function (r) { if (r[0]) map[String(r[0])] = { ev: String(r[1] || ''), sig: String(r[2] || ''), date: String(r[3] || '') }; });
  return map;
}
function writeMedCalMap_(ss, map) {
  var sh = ss.getSheetByName(MED_CAL_SHEET) || ss.insertSheet(MED_CAL_SHEET);
  var rows = [['키(입금 예정일)', '캘린더 일정 ID', '내용 서명(변경 감지용)', '입금 예정일']];
  Object.keys(map).forEach(function (id) { var x = map[id]; rows.push([id, x.ev, x.sig, x.date]); });
  sh.clearContents(); sh.getRange(1, 1, rows.length, 4).setValues(rows);
}

/* ---------- 오늘 화면 일원화 (v24) ---------- */
var AGENDA_MAP_SHEET = '할일_캘린더맵';
function readAgendaMap_(ss) {
  var sh = ss.getSheetByName(AGENDA_MAP_SHEET), map = {};
  if (!sh || sh.getLastRow() < 2) return map;
  sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().forEach(function (r) { if (r[0]) map[String(r[0])] = { ev: String(r[1] || ''), sig: String(r[2] || ''), date: String(r[3] || '') }; });
  return map;
}
function writeAgendaMap_(ss, map) {
  var sh = ss.getSheetByName(AGENDA_MAP_SHEET) || ss.insertSheet(AGENDA_MAP_SHEET);
  var rows = [['할 일 키', '캘린더 일정 ID', '내용 서명(변경 감지용)', '날짜']];
  Object.keys(map).forEach(function (k) { var x = map[k]; rows.push([k, x.ev, x.sig, x.date]); });
  sh.clearContents(); sh.getRange(1, 1, rows.length, 4).setValues(rows);
}
// ag = { on: true/false, items: [{ k, date, title, sub }] } — 앱이 백업할 때 함께 보냄. ag가 없으면(옛 앱) 아무것도 하지 않음.
function syncAgendaCalendar_(ss, ag) {
  if (!ag || typeof ag !== 'object') return '';
  var map = readAgendaMap_(ss), cal, fail = 0, out = {};
  if (ag.on !== true) {                                  // 껐으면 이미 만든 일정을 정리
    if (!Object.keys(map).length) return '';
    cal = getCal_(); Object.keys(map).forEach(function (k) { try { delEvent_(cal, map[k].ev); } catch (x) { /* 무시 */ } });
    writeAgendaMap_(ss, {}); return '';
  }
  cal = getCal_();
  var today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'), items = (ag.items || []).slice(0, 60);
  items.forEach(function (it) {
    if (!it || !it.k || !/^\d{4}-\d{2}-\d{2}$/.test(String(it.date)) || it.date < today) return;
    var k = String(it.k).slice(0, 120), title = '📌 ' + String(it.title || '').slice(0, 100), sig = [it.date, title, it.sub || ''].join('|'), prev = map[k];
    if (prev && prev.sig === sig && prev.ev) { out[k] = prev; return; }
    try {
      if (prev && prev.ev) delEvent_(cal, prev.ev);
      var st = Utilities.parseDate(it.date + ' 08:00', 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
      var ev = cal.createEvent(title, st, new Date(st.getTime() + 30 * 60 * 1000), { description: String(it.sub || '') + '\n\n— 마이라이프 (앱에서 확인 처리하면 이 일정도 정리됩니다)' });
      try { ev.removeAllReminders(); ev.addPopupReminder(0); ev.addPopupReminder(14 * 60); } catch (x) { /* 알림 설정 실패는 무시 */ }
      out[k] = { ev: ev.getId(), sig: sig, date: it.date };
    } catch (err) { fail++; if (prev) out[k] = prev; }
  });
  // 앱 목록에서 빠진(확인 처리·삭제·날짜 지남) 항목의 일정 정리
  Object.keys(map).forEach(function (k) {
    if (out[k]) return;
    try { delEvent_(cal, map[k].ev); } catch (err) { fail++; out[k] = map[k]; }
  });
  writeAgendaMap_(ss, out);
  return fail ? ('할 일 캘린더 일부 실패 ' + fail + '건') : '';
}
function calsList_() {
  try {
    return { ok: true, cals: CalendarApp.getAllCalendars().map(function (c) { return { id: c.getId(), name: c.getName(), color: c.getColor(), mine: c.isMyPrimaryCalendar() }; }) };
  } catch (err) { return { ok: false, error: String(err) }; }
}
function agendaList_(calIds, days) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), tz = 'Asia/Seoul';
    var n = Math.max(1, Math.min(14, Number(days) || 7)), skip = {};
    [readCalMap_(ss), readMedCalMap_(ss), readAgendaMap_(ss)].forEach(function (m) { Object.keys(m).forEach(function (k) { if (m[k].ev) skip[m[k].ev] = 1; }); });
    var start = Utilities.parseDate(Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd') + ' 00:00', tz, 'yyyy-MM-dd HH:mm'), end = new Date(start.getTime() + n * 86400000);
    var ids = String(calIds || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 8), out = [];
    ids.forEach(function (id) {
      var cal = null; try { cal = CalendarApp.getCalendarById(id); } catch (x) { /* 없음 */ }
      if (!cal) return;
      var nm = cal.getName();
      cal.getEvents(start, end).forEach(function (ev) {
        if (skip[ev.getId()]) return;
        var r = readEvent_(ev);
        out.push({ id: ev.getId(), cal: nm, title: ev.getTitle() || '(제목 없음)', date: r.date, time: r.time, allDay: ev.isAllDayEvent() });
      });
    });
    out.sort(function (a, b) { return (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')); });
    return { ok: true, asOf: new Date().toISOString(), events: out.slice(0, 80) };
  } catch (err) { return { ok: false, error: String(err) }; }
}

// 캘린더 → 앱 (앱이 서버에서 데이터를 가져갈 때): 캘린더에서 바꾼 날짜·시간·장소를 예약에 반영
function pullCalendar_(ss, sh) {
  var lock = LockService.getScriptLock(), locked = false;
  try {
    lock.waitLock(10000); locked = true;
    var map = readCalMap_(ss);
    if (!Object.keys(map).length) return;
    var raw = readRaw_(sh);
    if (!raw || raw.charAt(0) !== '{') return;
    var payload = JSON.parse(raw), pe = payload.people;
    if (!pe || !pe.cfg || pe.cfg.cal !== true) return;
    var nm = {}; (pe.people || []).forEach(function (p) { nm[p.id] = p.name; });
    var cal = getCal_(), now = new Date().toISOString(), any = false;
    (pe.meets || []).forEach(function (m) {
      var mp = map[m.id];
      if (!mp || !mp.ev || m.st !== 'plan') return;
      var ev = null; try { ev = cal.getEventById(mp.ev); } catch (x) { /* 없음 */ }
      if (!ev) return;                                                   // 캘린더에서 지운 일정은 앱에 반영하지 않음
      var cur = readEvent_(ev);
      if (cur.date === mp.date && cur.time === mp.time && cur.place === mp.place) return;     // 캘린더 쪽 변경 없음
      if ((m.date || '') !== mp.date || (m.time || '') !== mp.time || (m.place || '') !== mp.place) return;   // 앱에서도 바뀐 상태면 앱 값을 우선
      m.date = cur.date; m.time = cur.time; m.place = cur.place; m.u = now; any = true;
      mp.date = cur.date; mp.time = cur.time; mp.place = cur.place; mp.sig = meetSig_(m, meetTitle_(m, nm, pe.clubs || []));
    });
    if (any) { saveRaw_(ss, JSON.stringify(payload)); writeCalMap_(ss, map); }
  } finally { if (locked) { try { lock.releaseLock(); } catch (x) { /* 무시 */ } } }
}

/* ---------- 의료비 계산 (앱과 같은 규칙: 회사 = 본인부담[+비급여] − 세금 − 배우자 공제 / 실비 = 같은 날 총 결제금액 − 공제액) ---------- */
function medNum_(v) { return (v === '' || v === null || v === undefined || !isFinite(Number(v))) ? 0 : Number(v); }
function medHas_(v) { return v !== '' && v !== null && v !== undefined && isFinite(Number(v)); }
function medCoExp_(it, cfg) {
  if (medHas_(it.cOv)) return Number(it.cOv);
  var total = medNum_(it.total), extra = Math.min(total, medNum_(it.extra));
  var base = total - extra + (it.incl ? extra : 0);
  var taxPct = medHas_(cfg.taxPct) ? Number(cfg.taxPct) : 6.6, tax = Math.floor(base * taxPct / 100 + 0.5);
  var sp = it.who === '배우자' ? (medHas_(cfg.spouse) ? Number(cfg.spouse) : 10000) : 0;
  return Math.max(0, base - tax - sp);
}
function medElig_(it, items, ded) {
  if (it.tg === 'yes') return true; if (it.tg === 'no') return false;
  if (it.who !== '본인' || /치과/.test(it.place || '')) return false;
  var s = 0; items.forEach(function (i) { if (!/치과/.test(i.place || '') && (it.vg ? i.vg === it.vg : (!i.vg && i.who === it.who && i.date === it.date))) s += medNum_(i.total); });   // 직접 묶은 건(vg)은 묶음 단위
  return s > ded;
}

/* 회사 지급예정일: 신청일 11~25일 → 다음 달 10일 / 26일~다음 달 10일 → 25일 (앱의 Med.dueFor와 같은 규칙) */
// 회사 지급일(10·25일)이 주말·공휴일이면 그 앞 평일로 당김 (앱 Med.dueFor와 같은 규칙 · 공휴일은 2026~2027만, 이후는 주말만 반영)
var MED_HOL_ = ['2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-01','2026-03-02','2026-05-05','2026-05-24','2026-05-25','2026-06-03','2026-06-06','2026-08-15','2026-08-17','2026-09-24','2026-09-25','2026-09-26','2026-10-03','2026-10-05','2026-10-09','2026-12-25','2027-01-01','2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-03-01','2027-05-05','2027-05-13','2027-06-06','2027-08-15','2027-08-16','2027-09-14','2027-09-15','2027-09-16','2027-10-03','2027-10-04','2027-10-09','2027-10-11','2027-12-25','2027-12-27'];
function medPayAdj_(y, mo, pd) {
  var t = Date.UTC(y, mo - 1, pd);
  for (var k = 0; k < 15; k++) {
    var d = new Date(t), wd = d.getUTCDay();
    if (wd === 0 || wd === 6 || MED_HOL_.indexOf(d.toISOString().slice(0, 10)) >= 0) t -= 86400000; else break;
  }
  return new Date(t).toISOString().slice(0, 10);
}
function medDueFor_(cdate) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cdate || ''); if (!m) return '';
  var y = +m[1], mo = +m[2], d = +m[3], pd;
  if (d >= 11 && d <= 25) { mo += 1; pd = 10; } else if (d >= 26) { mo += 1; pd = 25; } else { pd = 25; }
  if (mo > 12) { mo = 1; y += 1; }
  return medPayAdj_(y, mo, pd);
}
function medEffDue_(c) { return (c && (c.due || medDueFor_(c.cdate))) || ''; }

/* 직접 묶은 건(vg)이 있으면 함께 묶인 병원·약국 이름 */
function medBundle_(it, items) {
  if (!it.vg || String(it.vg).indexOf('u_') === 0) return '';
  var m = items.filter(function (o) { return o.vg === it.vg; });
  return m.length > 1 ? m.map(function (o) { return o.place; }).join(' + ') : '';
}
/* 건별 실부담 = 총 결제 − 회사 − 실비 (앱의 Med.oop와 같은 규칙. 묶음 신청은 건별 예상액 비율로 나눔. 입금 전·금액 미상은 예상액) */
function medOop_(items, claims, cfg) {
  var ded = medHas_(cfg.ded) ? Number(cfg.ded) : 5000, byId = {}, out = {}, coOf = {}, inOf = {};
  items.forEach(function (i) { byId[i.id] = i; });
  claims.forEach(function (c) { (c.ids || []).forEach(function (id) { if (c.t === 'co') coOf[id] = c; else inOf[id] = c; }); });
  var grp = {}, share = {};   // 같은 사람·같은 날 실비 대상 건을 합쳐 공제액을 한 번만 뺌 (금액이 큰 건부터 공제)
  items.forEach(function (i) { if (medElig_(i, items, ded) || inOf[i.id]) { var k = i.vg ? 'v:' + i.vg : 'd:' + i.who + '|' + i.date + '|' + (inOf[i.id] ? inOf[i.id].id : '-'); (grp[k] = grp[k] || []).push(i); } });   // 직접 묶은 건은 묶음 단위, 아니면 같은 날(신청이 다르면 따로)
  Object.keys(grp).forEach(function (k) {
    var rem = ded;
    grp[k].slice().sort(function (a, b) { return (medNum_(b.total) - medNum_(a.total)) || (a.id < b.id ? -1 : 1); }).forEach(function (i) { var t = medNum_(i.total), cut = Math.min(rem, t); rem -= cut; share[i.id] = t - cut; });
  });
  var insShare = function (i) { return share[i.id] || 0; };
  var alloc = function (c, wf, dest) {
    var its = (c.ids || []).map(function (id) { return byId[id]; }).filter(Boolean); if (!its.length) return;
    var known = c.st === 'paid' && c.paid !== null && c.paid !== undefined, amt = c.st === 'paid' ? (known ? Number(c.paid) : medNum_(c.exp)) : medNum_(c.exp);
    var ws = its.map(wf), sum = ws.reduce(function (a, b) { return a + b; }, 0); if (sum <= 0) { ws = its.map(function () { return 1; }); sum = its.length; }
    var left = amt;
    its.forEach(function (i, n) { var v = n === its.length - 1 ? left : Math.round(amt * ws[n] / sum); dest[i.id] = { v: v, known: known }; left -= v; });
  };
  var coA = {}, inA = {};
  claims.forEach(function (c) { if (c.t === 'co') alloc(c, function (i) { return medCoExp_(i, cfg); }, coA); else alloc(c, insShare, inA); });
  items.forEach(function (i) {
    var el = medElig_(i, items, ded), hasCo = !!coOf[i.id], hasIn = !!inOf[i.id];
    var co = hasCo && coA[i.id] ? coA[i.id] : { v: medCoExp_(i, cfg), known: false };
    var ins = hasIn && inA[i.id] ? inA[i.id] : { v: el ? Math.round(insShare(i)) : 0, known: !el };
    var t = medNum_(i.total);
    out[i.id] = { co: co.v, ins: ins.v, oop: t - co.v - ins.v, sure: !!(hasCo && co.known && (!el || (hasIn && ins.known))) };
  });
  return out;
}

function writeTable_(ss, name, rows) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  if (!rows.length) return;
  var width = rows[0].length;
  var safe = rows.map(function (r) {
    var o = [];
    for (var c = 0; c < width; c++) {
      var v = r[c] === undefined || r[c] === null ? '' : r[c];
      if (typeof v === 'string' && /^[=+\-@]/.test(v)) v = "'" + v;   // 수식으로 오인되는 글자 방지
      o.push(v);
    }
    return o;
  });
  sh.getRange(1, 1, safe.length, width).setValues(safe);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 배포 전 테스트용: 이 함수를 선택해서 ▶ 실행 버튼을 눌러보면
 * 권한 승인 팝업이 뜨고, 시트가 생성되는지 확인할 수 있습니다.
 * (주의: 실행하면 RAW_JSON 시트의 내용이 테스트 데이터로 바뀝니다. 실제 데이터가 있는 시트에서는 실행하지 마세요.)
 */
function testSetup() {
  var fake = { postData: { contents: JSON.stringify({
    budgets: { '2026-08': 550000 },
    expenses: [{ id: 'test1', date: '2026-08-04', cardType: 'MG', item: '테스트지출', amount: 10000 }],
    priceCheck: { items: [], records: [], del: {} },
    shopping: { items: [], del: {} }
  }) } };
  Logger.log(doPost(fake).getContent());
}
