# 축의대 D-7 확인 설문 — 세팅 가이드

## 개요
- **설문 URL**: https://qkrcowls0319-collab.github.io/cupidon-contract/survey.html
- **데이터 저장**: 설문 전용 스프레드시트 ([1NHAyIK...](https://docs.google.com/spreadsheets/d/1NHAyIKwaXR3asTHdiLCs7C4Ss5VG_dAB-EmRxVm2QRI/edit)) · **계약서 시스템과 완전 별개**
- **Apps Script**: 설문 스프레드시트 전용 (아래 코드 통째로 복붙)

## 1. 설문 스프레드시트 Apps Script 세팅

### 전체 코드 (복붙)
설문 시트 → **확장 → Apps Script** → 기존 내용 전부 삭제 후 아래 복붙:

```javascript
// ========================================
// 큐피돈 축의대 D-7 설문 · Apps Script
// 전용 시트: 1NHAyIKwaXR3asTHdiLCs7C4Ss5VG_dAB-EmRxVm2QRI
// 저장 탭: 'D-7설문-앱' (자동 생성)
// ========================================

const SHEET_NAME = 'D-7설문-앱';
const HEADERS = [
  '접수시각','제출ID','상품','서비스대상','신랑신부성함','연락처','예식일','예식장','홀/층',
  '예상하객수','식사형태','ATM위치','레디백준비','5만원정책','식권관리자','관리자연락처',
  '식권총매수','이체계좌','자물쇠방식','인수인계자1이름','인수인계자1연락처',
  '인수인계자2이름','인수인계자2연락처','주차무료시간','답례품제공','답례품기준',
  '링크전달방식','추가요청사항'
];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet_();

    // 중복 제출 방지
    if (d.submissionId) {
      const existing = sheet.getDataRange().getValues();
      if (existing.length > 1) {
        const idIdx = existing[0].indexOf('제출ID');
        if (idIdx !== -1) {
          const dup = existing.slice(1).some(function(r) {
            return String(r[idIdx]) === d.submissionId;
          });
          if (dup) return jsonResp({ ok: true, duplicate: true });
        }
      }
    }

    sheet.appendRow([
      new Date(d.submittedAt || Date.now()),
      d.submissionId || '',
      d.product || '',
      d.servedSide || '',
      d.coupleName || '',
      d.couplePhone || '',
      d.eventDate || '',
      d.venue || '',
      d.hall || '',
      d.guestCount || '',
      d.mealType || '',
      d.atmLocation || '',
      d.readyBag || '',
      d.policy5m || '',
      d.slipManager || '',
      d.slipManagerPhone || '',
      d.slipTotal || '',
      d.bankAccount || '',
      d.lockType || '',
      d.handover1Name || '',
      d.handover1Phone || '',
      d.handover2Name || '',
      d.handover2Phone || '',
      d.parkingFreeHours || '',
      d.giftProvided || '',
      d.giftCriteria || '',
      d.linkDeliveryMethod || '',
      d.freeNote || '',
    ]);

    return jsonResp({ ok: true });
  } catch (err) {
    return jsonResp({ ok: false, error: String(err) });
  }
}

// 시트 탭이 없으면 생성 + 헤더 설정
function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 편집기 테스트 (▶ 실행)
function testDoPost() {
  const fake = {
    postData: {
      contents: JSON.stringify({
        submissionId: 'test_' + Date.now(),
        submittedAt: new Date().toISOString(),
        product: '2인 1팀 스탠다드',
        servedSide: '양측',
        coupleName: '테스트 신랑·신부',
        couplePhone: '010-1234-5678',
        eventDate: '2026-12-15',
        venue: '테스트 홀',
        hall: '그랜드볼룸',
        guestCount: '250',
        mealType: '뷔페',
        atmLocation: '1층 로비',
        readyBag: '직접 준비함',
        policy5m: '동의합니다',
        slipManager: '테스트 이모',
        slipManagerPhone: '010-0000-0000',
        slipTotal: '250',
        bankAccount: '카카오뱅크 1234-5678',
        lockType: '큐피돈 준비 요청',
        handover1Name: '김홍길',
        handover1Phone: '010-1111-2222',
        handover2Name: '',
        handover2Phone: '',
        parkingFreeHours: '2시간',
        giftProvided: '제공함',
        giftCriteria: '식권 미수령 하객',
        linkDeliveryMethod: '오픈 채팅으로 받기',
        freeNote: '테스트 요청사항',
      })
    }
  };
  Logger.log(doPost(fake).getContent());
}
```

### 저장 + 테스트
1. **💾 저장** (Ctrl+S)
2. 함수 드롭다운에서 **`testDoPost`** 선택 → ▶ 실행
3. 하단 로그에 `{"ok":true}` 나오면 성공
4. 설문 스프레드시트로 돌아가서 **`D-7설문-앱` 탭이 자동 생성**되었고 테스트 데이터 1줄이 들어갔는지 확인

### 배포
1. **배포 → 새 배포**
2. 유형: **웹 앱**
3. 설정:
   - 설명: `큐피돈 D-7 설문 접수`
   - 실행 계정: **나 (사장님 본인)**
   - 액세스 권한: **모든 사용자** ⭐
4. **배포** 클릭 → 권한 승인 팝업 → 액세스 허용
5. 발급된 **웹 앱 URL 복사** → 저한테 전달해주세요

## 2. 클라이언트 연결 (제가 처리)
사장님이 발급 URL 알려주시면:
- `js/config.js`의 `SURVEY_WEBHOOK_URL` 에 넣고 커밋/푸시
- GitHub Pages 자동 재배포

## 3. 변경된 질문 (vs 기존 Google Form)

| 섹션 | 변경 |
|---|---|
| 하객·식사 | ~~동시 예식 여부~~ 삭제 |
| 예식장 위치 | ~~신랑 대기실 위치~~ 삭제, ATM 위치만 유지 |
| 축의금 | **5만원 미만 정책 상세 설명 추가** (암행투어 이슈 방지 맥락 + 현장 멘트 예시) |
| ~~감사 서비스~~ | **섹션 통째로 삭제** (감사문자/땡큐카드/발송자수 모두 제거) |
| 주차·답례품 | 답례품 상세 삭제, 조건부 노출 (제공함 선택 시만 기준 문의) |
| **링크 전달 방식** | ⭐ **신규 섹션** — 상담 채팅 only / 오픈 채팅 선택 |

## 4. 기존 Google Form과의 관계
- 기존 Google Form(https://docs.google.com/forms/d/e/1FAIpQLScrZUWV2mAYRt1ma5shouebiGP9LE4mqGru89DNoPalqMdZaA)은 **그대로 유지됨** (사용 중단 or 백업 용도)
- 신규 wizard URL은 완전 신규 저장 탭(`D-7설문-앱`)에 저장 → 기존 Google Form 응답 시트와 **데이터 섞이지 않음**
- 나중에 Google Form 완전 폐지하고 싶으시면 Forms 편집기에서 응답 받기 OFF로 변경
