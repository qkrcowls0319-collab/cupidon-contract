# 짝꿍코드 기능 — Google Apps Script 설정

## 개요

짝꿍코드는 **최대 2회까지 사용 가능**합니다. 3번째 사용 시도부터는 "만료된 코드"로 자동 차단됩니다.

- **발급**: 모든 계약 완료 시 고객에게 자동 발급 (예: `CPX3K2A4`)
- **사용**: 다른 고객이 짝꿍할인 체크 시 이 코드를 입력 → GAS가 시트에서 사용 횟수 조회 → 2회 미만이면 통과
- **기록**: 모든 계약서 시트에 "사용 짝꿍코드"와 "발급 짝꿍코드" 두 컬럼이 함께 저장

## 1. 시트 컬럼 추가

**신청 이력 시트** (현재 payload가 쌓이는 시트, 예: '스냅' 시트)에 두 컬럼을 추가하세요:

| 컬럼명 (헤더) | 설명 |
|---|---|
| `짝꿍코드` | 이 고객이 사용한 (타인이 발급한) 코드. 이미 있으면 그대로 유지 |
| `발급 짝꿍코드` | 이 고객에게 발급된 신규 코드. 사장님이 고객에게 전달용 |

## 2. Apps Script 코드 추가

Apps Script 편집기(`확장 → Apps Script`)에서 아래 두 함수를 **기존 `doPost` 외에 추가**하세요.

### 2-1. `doGet` — 짝꿍코드 조회 엔드포인트 (신규)

```javascript
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'checkPartner') {
    return checkPartnerCode(e.parameter.code);
  }

  return jsonResponse({ error: 'unknown action' });
}

function checkPartnerCode(rawCode) {
  // 뒤쪽 숫자만 추출해서 매칭 (영문/대소문자/공백 무시)
  // 예: 'KHR2026' → '2026', 'cpab123456' → '123456', '2026' → '2026'
  const codeDigits = extractDigits(rawCode);
  if (!codeDigits) return jsonResponse({ error: 'no digits in code' });

  // ⚠ 시트 이름이 다르면 이 부분을 바꿔주세요 (예: '즉시할인', '신청이력' 등)
  const SHEET_NAME = '스냅';

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse({ error: 'sheet not found: ' + SHEET_NAME });

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return jsonResponse({ code: rawCode, codeDigits, usedCount: 0, status: 'valid', remaining: 2 });
  }

  const header = data[0];
  // "짝꿍코드" 컬럼 자동 탐색 (헤더 정확히 일치해야 함)
  const idx = header.indexOf('짝꿍코드');
  if (idx === -1) {
    return jsonResponse({ error: "'짝꿍코드' 컬럼이 없습니다 (헤더 확인 필요)" });
  }

  const usedCount = data.slice(1).filter(function(row) {
    return extractDigits(row[idx]) === codeDigits;
  }).length;

  return jsonResponse({
    code: rawCode,
    codeDigits,
    usedCount,
    status: usedCount >= 2 ? 'expired' : 'valid',
    remaining: Math.max(0, 2 - usedCount),
  });
}

// 뒤쪽 연속 숫자 그룹만 추출 ('KHR2026 ' → '2026')
function extractDigits(raw) {
  const m = String(raw || '').trim().match(/(\d+)\s*$/);
  return m ? m[1] : '';
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 2-2. `doPost` — 발급 짝꿍코드 저장 (기존 함수 수정)

기존 `doPost`에서 `sheet.appendRow(...)` 하는 부분에 두 필드를 추가:

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActive().getSheetByName('스냅');  // 시트명

  // ... 기존 중복 체크 로직 (submissionId) ...

  sheet.appendRow([
    data.submittedAt,
    data.submissionId,
    data.customerName,
    data.customerPhone,
    data.eventDate,
    data.eventTime,
    data.venue,
    data.region,
    data.customTravelFee,
    data.category,
    data.product,
    data.options,
    data.dolAloneSurcharge,
    data.immediateDiscounts,
    data.promiseDiscounts,
    data.partnerCode,           // ← 사용한 짝꿍코드 (기존 유지)
    data.issuedPartnerCode,     // ← 발급 짝꿍코드 (신규 추가)
    data.travelFee,
    data.total,
    data.deposit,
    data.balance,
    data.balanceAfterReviews,
    data.isQuoteFinal,
    data.isBundle,
    // ... 기타 필드 ...
  ]);

  // PDF 저장 로직 등 기존 그대로
}
```

> 💡 컬럼 순서는 시트 헤더 순서와 1:1 매칭되어야 합니다. 현재 사장님 Apps Script의 `appendRow` 순서를 보고 `data.issuedPartnerCode`를 적절한 위치에 끼워 넣으세요.

## 3. Apps Script 배포

1. Apps Script 편집기에서 **배포 → 배포 관리** 클릭
2. 기존 배포가 있으면 **편집(연필) → 새 버전 선택 → 배포**
3. 배포 설정:
   - **실행 계정**: 본인(사장님)
   - **액세스 권한**: **모든 사용자** ← CORS GET 요청 허용에 필수
4. 배포 후 URL은 바뀌지 않습니다 (기존 `js/config.js`의 `SHEETS_WEBHOOK_URLS` 그대로)

## 4. 동작 확인

1. 브라우저에서 `https://[your-gas-url]?action=checkPartner&code=TEST123` 열기
2. 아래와 같은 JSON이 보이면 성공:
   ```json
   {"code":"TEST123","usedCount":0,"status":"valid","remaining":2}
   ```

## 5. 고객 플로우

```
[신규 고객 A]
  Step 5: 짝꿍코드 체크 → 코드 입력 안 함 (혹은 이전 고객이 전달한 코드 입력)
  Step 8: 발급 짝꿍코드 자동 생성 (예: CPX3K2A4)
          → 화면 노출 + 카톡 메시지에 포함 + 시트에 '발급 짝꿍코드' 컬럼으로 저장

[소개받은 고객 B]
  Step 5: 짝꿍할인 체크 → 'CPX3K2A4' 입력 → blur 시 자동 조회
          ✓ 사용 가능 (현재 0회 사용 · 잔여 2회)
  Step 8: 신규 발급 코드 받음

[3번째로 'CPX3K2A4' 입력하는 고객 C]
  Step 5: ⚠ 만료된 코드입니다 (이미 2회 사용)
          → 다음 단계 진행 차단 (validator)
```

## 트러블슈팅

**Q. 조회가 안 돼요 (네트워크 오류)**
- Apps Script 배포 시 "액세스 권한: 모든 사용자" 확인
- 재배포 시 URL이 바뀌면 `js/config.js`의 `SHEETS_WEBHOOK_URLS.snap`도 업데이트

**Q. "'짝꿍코드' 컬럼이 없습니다" 에러**
- 시트 1행 헤더에 정확히 `짝꿍코드` 라고 적혀있는지 확인 (공백 금지)

**Q. 동시 접속한 2명이 같은 코드를 쓰면?**
- 거의 동시에 입력하면 둘 다 "사용 가능"으로 통과할 수 있음
- 완벽 차단 필요 시: 사장님이 시트에서 수동으로 2회 초과분 확인하여 환불/안내
