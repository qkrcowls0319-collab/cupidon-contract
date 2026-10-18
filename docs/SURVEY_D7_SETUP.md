# 축의대 D-7 확인 설문 — 세팅 가이드

## 개요
축의대 계약 완료한 고객에게 **예식 7일 전**에 전달하는 상세 확인 설문입니다.

- **URL**: https://qkrcowls0319-collab.github.io/cupidon-contract/survey.html
- **UI**: 큐피돈 계약서와 동일한 wizard 카드 형식 (9 Step)
- **데이터**: 기존 Google Sheet의 새 탭 `D-7설문` 에 자동 기록

## Google Sheets 세팅

### 1. 신규 시트 탭 추가
현재 사용 중인 큐피돈 스프레드시트 하단의 **+** 버튼으로 새 탭 추가:
- 탭 이름: **`D-7설문`** (정확히 일치)

### 2. 헤더 추가 (1행에 복붙)
```
접수시각	제출ID	상품	서비스대상	신랑신부성함	연락처	예식일	예식장	홀/층	예상하객수	식사형태	ATM위치	레디백준비	5만원정책	식권관리자	관리자연락처	식권총매수	이체계좌	자물쇠방식	인수인계자1이름	인수인계자1연락처	인수인계자2이름	인수인계자2연락처	주차무료시간	답례품제공	답례품기준	링크전달방식	추가요청사항
```

## Apps Script 업데이트

`doPost` 함수가 **설문/계약서 두 가지 payload 유형을 분기**해서 처리하도록 수정:

```javascript
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);

    // ⭐ 설문 응답은 D-7설문 시트로 분기
    if (d.type === 'survey_d7') {
      return handleSurveySubmit_(d);
    }
    // 기본: 계약서 신청 (기존 로직)
    return handleContractSubmit_(d);
  } catch (err) {
    return jsonResp({ ok: false, error: String(err) });
  }
}

function handleSurveySubmit_(d) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('D-7설문');
  if (!sheet) {
    sheet = ss.insertSheet('D-7설문');
    sheet.appendRow([
      '접수시각','제출ID','상품','서비스대상','신랑신부성함','연락처','예식일','예식장','홀/층',
      '예상하객수','식사형태','ATM위치','레디백준비','5만원정책','식권관리자','관리자연락처',
      '식권총매수','이체계좌','자물쇠방식','인수인계자1이름','인수인계자1연락처',
      '인수인계자2이름','인수인계자2연락처','주차무료시간','답례품제공','답례품기준',
      '링크전달방식','추가요청사항'
    ]);
  }

  // 중복 제출 방지
  if (d.submissionId) {
    const existing = sheet.getDataRange().getValues();
    const idIdx = existing[0].indexOf('제출ID');
    if (idIdx !== -1) {
      const dup = existing.slice(1).some(r => String(r[idIdx]) === d.submissionId);
      if (dup) return jsonResp({ ok: true, duplicate: true });
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
}

// 기존 계약서 처리는 그대로 별도 함수로 분리
function handleContractSubmit_(d) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (d.submissionId) {
    const existing = sheet.getDataRange().getValues();
    const idIdx = existing[0].indexOf('제출ID');
    if (idIdx !== -1) {
      const dup = existing.slice(1).some(r => String(r[idIdx]) === d.submissionId);
      if (dup) return jsonResp({ ok: true, duplicate: true });
    }
  }

  sheet.appendRow([
    new Date(d.submittedAt || Date.now()),
    d.submissionId || '',
    d.customerName || '',
    d.customerPhone || '',
    d.eventDate || '',
    d.eventTime || '',
    d.venue || '',
    d.region || '',
    d.customTravelFee || '',
    d.category || '',
    d.product || '',
    d.options || '',
    d.dolAloneSurcharge || '',
    d.immediateDiscounts || '',
    d.promiseDiscounts || '',
    d.partnerCode || '',
    d.issuedPartnerCode || '',
    d.travelFee || '',
    d.total || '',
    d.deposit || '',
    d.balance || '',
    d.balanceAfterReviews || '',
    d.isQuoteFinal ? '확정' : '출장비별도문의',
    d.isBundle ? '패키지' : '단일',
  ]);

  return jsonResp({ ok: true });
}
```

> ⚠️ 기존 `doPost` 전체를 위 코드로 교체 → 저장 → **배포 → 배포 관리 → ✏️ → 새 버전 → 배포**

## 전체 흐름

```
사장님 → 축의대 계약 고객에게 예식 7일 전 설문 링크 전달
         └─ URL: https://qkrcowls0319-collab.github.io/cupidon-contract/survey.html

고객 → 9 Step wizard 완료 → 📬 제출
       └─ GAS doPost 호출 (type: 'survey_d7')
           └─ 'D-7설문' 시트에 자동 기록

사장님 → 시트에서 설문 응답 확인 → 예식 당일 사전 체크 → 고객에게 피드백/확인 연락
```

## 변경된 질문 요약

| 섹션 | 변경 |
|---|---|
| 하객·식사 | ~~동시 예식 여부~~ 삭제 |
| 예식장 위치 | ~~신랑 대기실 위치~~ 삭제, ATM 위치만 유지 |
| 축의금 | **5만원 미만 정책 상세 설명 추가** (암행투어 이슈 방지 맥락 + 현장 멘트 예시) |
| ~~감사 서비스~~ | **섹션 통째로 삭제** (감사문자/땡큐카드/발송자수 모두 제거) |
| 주차·답례품 | 답례품 상세 삭제, 조건부 노출 (제공함 선택 시만 기준 문의) |
| 링크 전달 방식 | ⭐ **신규 섹션** — 상담 채팅 only / 오픈 채팅 선택 |
