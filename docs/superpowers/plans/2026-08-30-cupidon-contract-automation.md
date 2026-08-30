# 큐피돈 아이폰 스냅 계약서 발송 자동화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고객이 카톡 링크 하나로 상담-견적-계약-서명까지 원스톱 완료하고, 사장님 이메일로 서명본 PDF가 자동 도착하는 정적 웹앱을 구현한다.

**Architecture:** 서버 없이 브라우저에서만 동작하는 SPA. HTML/Vanilla JS로 8단계 스텝 폼을 구성하고, jsPDF+html2canvas로 한글 계약서 PDF를 생성한 뒤 EmailJS로 사장님에게 발송한다. GitHub Pages에 배포하여 URL 링크만으로 접근 가능하게 한다.

**Tech Stack:** HTML5, Vanilla JavaScript (ES modules), Tailwind CSS (CDN), signature_pad, jsPDF, html2canvas, EmailJS SDK.

**Working Directory:** `C:\Users\User\Desktop\박채진\cupidon-contract\`

---

## File Structure

```
cupidon-contract/
├── index.html                  # SPA entry, 8-step form
├── css/style.css               # Custom styles (Tailwind CDN 보완)
├── js/
│   ├── config.js               # 상수: PRODUCTS, DISCOUNTS, OPTIONS, TRAVEL_FEE
│   ├── pricing.js              # 순수 함수: calculateQuote(input) → { total, deposit, balance, ... }
│   ├── validators.js           # 스텝별 유효성 검사 함수
│   ├── templates.js            # 계약서 4종 문구 템플릿
│   ├── form.js                 # 폼 상태 관리, 스텝 이동, DOM 렌더링
│   ├── pdf.js                  # html2canvas + jsPDF로 계약서 PDF 생성
│   ├── email.js                # EmailJS로 사장님에게 PDF 발송
│   └── app.js                  # 진입점, 모든 모듈 조립
├── tests/
│   ├── test-runner.html        # 브라우저 기반 테스트 러너
│   ├── test-pricing.js         # pricing.js 단위 테스트
│   └── test-validators.js      # validators.js 단위 테스트
├── README.md                   # 배포/EmailJS 세팅 가이드
└── docs/superpowers/
    ├── specs/2026-08-30-cupidon-contract-automation-design.md
    └── plans/2026-08-30-cupidon-contract-automation.md
```

**Design principles:**
- `config.js`와 `pricing.js`는 순수 데이터/함수 — DOM 의존 없이 테스트 가능.
- `form.js`가 UI/이벤트 담당, `pricing.js`를 호출.
- `pdf.js`는 hidden `<div>`에 계약서를 렌더 후 html2canvas로 캡처 → jsPDF에 이미지 삽입 (한글 폰트 문제 회피).
- 파일 하나가 200줄 넘어가면 분리 고려.

---

## Task 1: 프로젝트 초기화 & Git 설정

**Files:**
- Create: `C:/Users/User/Desktop/박채진/cupidon-contract/.gitignore`
- Create: `C:/Users/User/Desktop/박채진/cupidon-contract/README.md`

- [ ] **Step 1: cupidon-contract 폴더가 이미 존재하는지 확인**

Run:
```bash
ls -la "C:/Users/User/Desktop/박채진/cupidon-contract/"
```
Expected: `docs/` 폴더만 존재 (앞선 브레인스토밍/플래닝 산출물).

- [ ] **Step 2: git 저장소 초기화**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git init && git branch -M main
```
Expected: `Initialized empty Git repository`.

- [ ] **Step 3: .gitignore 작성**

Create `.gitignore`:
```
# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp

# Local secrets (EmailJS keys will be baked in — this is intentional for a static site)
# Nothing to ignore here unless private notes are added.

# Node (not used, but future-proof)
node_modules/
```

- [ ] **Step 4: 최소 README 작성**

Create `README.md`:
```markdown
# 큐피돈 아이폰 스냅 계약서 자동화

큐피돈 스냅 예약 문의 → 견적 → 계약서 서명까지 원스톱 처리하는 정적 웹앱.

## 로컬 실행
1. 이 폴더의 `index.html`을 브라우저에서 열면 됩니다. (별도 서버 불필요)

## 배포 (GitHub Pages)
자세한 배포 및 EmailJS 설정 가이드는 Task 12에서 채워집니다.
```

- [ ] **Step 5: 첫 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add .gitignore README.md docs/ && git commit -m "chore: initial repo scaffold with spec and plan"
```
Expected: `1 file(s) changed` 또는 유사한 결과.

---

## Task 2: config.js (상수 정의)

**Files:**
- Create: `js/config.js`

- [ ] **Step 1: js 디렉토리 생성**

Run:
```bash
mkdir -p "C:/Users/User/Desktop/박채진/cupidon-contract/js"
```

- [ ] **Step 2: config.js 작성**

Create `js/config.js`:
```javascript
// 큐피돈 스냅 상품·할인·옵션 상수. Source of Truth.
// 가격 변경 시 이 파일만 수정.

export const PRODUCTS = {
  special: {
    code: 'special',
    name: '1인 스페셜',
    basePrice: 350000,
    hasWeddingOptions: true,
    spec: {
      원본: '800장',
      최종본: '10장',
      색보정: '20장',
      영상: '10개',
      카드: 'Thank you card 1장',
      촬영시간: '예식 60분 전 → 본식 → 원판 촬영',
    },
    deliveryNote: [
      "원본 및 'Thank you card': 촬영일 기준 24시간 이내 전달",
      '보정본: 셀렉일 기준 7일 이내 전달',
      '전달 방식: My box 링크',
      '보정본&원본: 1개월간 보관, 이후 다운로드하지 않은 경우 책임지지 않음',
    ],
  },
  premium: {
    code: 'premium',
    name: '2인 프리미엄',
    basePrice: 550000,
    hasWeddingOptions: true,
    spec: {
      원본: '1,200장',
      최종본: '20장',
      색보정: '30장',
      영상: '20개 (+릴스용 2개)',
      카드: 'Thank you card 1장',
      촬영시간: '예식 90분 전 → 본식 → 원판 촬영 (총 약 3시간)',
    },
    deliveryNote: [
      "원본 및 'Thank you card': 촬영일 기준 24시간 이내 전달",
      '최종본&색보정본: 촬영일 기준 14일 이내 전달',
      '전달 방식: My box 링크',
      '보정본&원본: 1개월간 보관, 이후 다운로드하지 않은 경우 책임지지 않음',
    ],
  },
  studio: {
    code: 'studio',
    name: '스튜디오&가봉 스냅',
    basePrice: 200000,
    hasWeddingOptions: false,
    spec: {
      원본: '500장',
      최종본: '10장',
      색보정: '10장',
      영상: '20개',
      카드: '웨딩포스터 1장',
      촬영시간: '1시간 기준',
    },
    deliveryNote: [
      '원본&웨딩포스터: 촬영일 기준 24시간 이내 전달',
      '보정본: 셀렉일 기준 7일 이내 전달',
      '전달 방식: 네이버 드라이브 링크',
      '보정본&원본: 1개월간 보관, 이후 다운로드하지 않은 경우 책임지지 않음',
    ],
  },
  dol: {
    code: 'dol',
    name: '돌스냅',
    basePrice: 300000,
    hasWeddingOptions: false,
    spec: {
      원본: '500장',
      최종본: '10장',
      색보정: '10장',
      영상: '20개',
      카드: '감사카드 1장',
      촬영시간: '2시간 기준',
    },
    deliveryNote: [
      '원본&감사카드: 촬영일 기준 24시간 이내 전달',
      '보정본: 셀렉일 기준 7일 이내 전달',
      '전달 방식: 네이버 드라이브 링크',
      '보정본&원본: 1개월간 보관, 이후 다운로드하지 않은 경우 책임지지 않음',
    ],
  },
};

// A. 즉시 적용 할인 (총액에서 바로 차감)
export const IMMEDIATE_DISCOUNTS = {
  sameDay: { name: '당일 계약 할인', amount: -30000, appliesTo: 'all' },
  portrait: { name: '초상권 활용 동의', amount: -20000, appliesTo: 'all' },
  partner: { name: '짝꿍 할인', amount: -20000, appliesTo: ['special', 'premium'], requiresCode: true },
};

// B. 후기 약속 할인 (잔금 정산 시 차감, 계약 시엔 표기만)
export const PROMISE_DISCOUNTS = {
  blogPromise: { name: '블로그 계약 후기 약속', amount: -10000, appliesTo: 'all' },
  cupidonPromise: { name: '큐피돈 이용 후기 약속', amount: -10000, appliesTo: 'all' },
};

// 추가 옵션
export const OPTIONS_WEDDING = {
  finalPlus5: { name: '최종본 추가 5장', amount: 50000 },
  colorPlus10: { name: '색보정 추가 10장', amount: 50000 },
  part2: { name: '2부 촬영 추가', amount: 70000 },
  pyebaek: { name: '폐백 촬영 추가', amount: 50000 },
};

export const OPTIONS_STUDIO_DOL = {
  finalPlus5: { name: '최종본 추가 5장', amount: 50000 },
  part2Half: { name: '2부 촬영 추가 (30분)', amount: 50000 },
};

// 출장비
export const TRAVEL_FEE = {
  seoul: { name: '서울', amount: 0 },
  gyeonggi_incheon: { name: '경기·인천', amount: 50000 },
  pyeongtaek: { name: '평택', amount: 70000 },
  other: { name: '그 외 지역', amount: null }, // null = 별도 문의
};

// 돌스냅 아이폰 단독 촬영 가산금
export const DOL_ALONE_SURCHARGE = 50000;

// 계약금 (고정)
export const FIXED_DEPOSIT = 100000;

// 사장님 정보 (계약서 하단에 표시될 계좌·연락처)
export const OWNER_INFO = {
  bankAccount: '(계좌번호는 README 세팅 후 입력)',
  bankName: '은행명',
  accountHolder: '큐피돈 스냅',
  kakaoContact: '(카카오톡 채널 링크 또는 ID)',
};

// EmailJS 설정 (README 참고, 실제 배포 전 실제 값으로 교체)
export const EMAILJS_CONFIG = {
  publicKey: 'YOUR_PUBLIC_KEY',
  serviceId: 'YOUR_SERVICE_ID',
  templateId: 'YOUR_TEMPLATE_ID',
  toEmail: 'chaejin.park@myrealtrip.com',
};
```

- [ ] **Step 3: 파일 로드 확인 (수동)**

`index.html`은 아직 없으므로 브라우저 콘솔로 검증. 다음 단계 태스크에서 자동 검증됨.

- [ ] **Step 4: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add js/config.js && git commit -m "feat: add product/discount/option constants in config.js"
```

---

## Task 3: pricing.js (TDD로 견적 계산 로직)

**Files:**
- Create: `tests/test-runner.html`
- Create: `tests/test-pricing.js`
- Create: `js/pricing.js`

- [ ] **Step 1: 테스트 러너 HTML 스캐폴딩**

Create `tests/test-runner.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>큐피돈 테스트 러너</title>
  <style>
    body { font-family: monospace; padding: 20px; }
    .pass { color: green; }
    .fail { color: red; font-weight: bold; }
    .summary { margin-top: 20px; padding: 10px; border-top: 2px solid #333; }
    pre { background: #f4f4f4; padding: 5px; }
  </style>
</head>
<body>
  <h1>큐피돈 테스트 결과</h1>
  <div id="results"></div>
  <div class="summary" id="summary"></div>

  <script type="module">
    // 미니 테스트 프레임워크
    window.__tests = [];
    window.test = (name, fn) => window.__tests.push({ name, fn });
    window.assertEqual = (actual, expected, msg = '') => {
      if (actual !== expected) {
        throw new Error(`${msg} — Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
      }
    };
    window.assertDeepEqual = (actual, expected, msg = '') => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${msg} — Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
      }
    };
  </script>
  <script type="module" src="./test-pricing.js"></script>
  <script type="module" src="./test-validators.js"></script>
  <script type="module">
    // 러너
    const resultsEl = document.getElementById('results');
    const summaryEl = document.getElementById('summary');
    let pass = 0, fail = 0;
    for (const { name, fn } of window.__tests) {
      const div = document.createElement('div');
      try {
        fn();
        div.className = 'pass';
        div.textContent = `✅ PASS: ${name}`;
        pass++;
      } catch (e) {
        div.className = 'fail';
        div.innerHTML = `❌ FAIL: ${name}<pre>${e.message}</pre>`;
        fail++;
      }
      resultsEl.appendChild(div);
    }
    summaryEl.textContent = `총 ${pass + fail}개 중 ${pass}개 통과, ${fail}개 실패`;
    summaryEl.className = fail === 0 ? 'summary pass' : 'summary fail';
  </script>
</body>
</html>
```

- [ ] **Step 2: 실패하는 테스트 작성**

Create `tests/test-pricing.js`:
```javascript
import { calculateQuote } from '../js/pricing.js';

// 케이스 1: 프리미엄 기본, 서울, 옵션 없음, 할인 없음
test('프리미엄 기본 (서울, 옵션·할인 없음) → 총액 550,000', () => {
  const result = calculateQuote({
    product: 'premium',
    region: 'seoul',
    options: [],
    immediateDiscounts: [],
    promiseDiscounts: [],
    dolHasMainSnap: null,
  });
  assertEqual(result.subtotal, 550000, 'subtotal');
  assertEqual(result.travelFee, 0, 'travelFee');
  assertEqual(result.total, 550000, 'total');
  assertEqual(result.deposit, 100000, 'deposit');
  assertEqual(result.balance, 450000, 'balance');
  assertEqual(result.promiseTotal, 0, 'promiseTotal');
});

// 케이스 2: 스페셜, 경기·인천, 폐백 옵션, 당일+초상권+짝꿍 할인
test('스페셜 + 경기 + 폐백 + 즉시할인 3종', () => {
  const result = calculateQuote({
    product: 'special',
    region: 'gyeonggi_incheon',
    options: ['pyebaek'],
    immediateDiscounts: ['sameDay', 'portrait', 'partner'],
    promiseDiscounts: [],
    dolHasMainSnap: null,
  });
  // 350000 + 50000(경기) + 50000(폐백) - 30000 - 20000 - 20000 = 380000
  assertEqual(result.total, 380000, 'total');
  assertEqual(result.balance, 280000, 'balance');
});

// 케이스 3: 돌스냅, 아이폰 단독 촬영
test('돌스냅 + 아이폰 단독 → +50,000', () => {
  const result = calculateQuote({
    product: 'dol',
    region: 'seoul',
    options: [],
    immediateDiscounts: [],
    promiseDiscounts: [],
    dolHasMainSnap: false,
  });
  // 300000 + 50000(단독) = 350000
  assertEqual(result.total, 350000, 'total');
});

// 케이스 4: 돌스냅, 메인스냅 함께
test('돌스냅 + 메인스냅 있음 → 정가', () => {
  const result = calculateQuote({
    product: 'dol',
    region: 'seoul',
    options: [],
    immediateDiscounts: [],
    promiseDiscounts: [],
    dolHasMainSnap: true,
  });
  assertEqual(result.total, 300000, 'total');
});

// 케이스 5: 후기 약속 할인은 total에 반영되지 않고 promiseTotal에만
test('후기 약속 할인은 total에 미반영, promiseTotal에만 계산', () => {
  const result = calculateQuote({
    product: 'premium',
    region: 'seoul',
    options: [],
    immediateDiscounts: [],
    promiseDiscounts: ['blogPromise', 'cupidonPromise'],
    dolHasMainSnap: null,
  });
  assertEqual(result.total, 550000, 'total');
  assertEqual(result.promiseTotal, -20000, 'promiseTotal');
  assertEqual(result.balanceAfterReviews, 430000, 'balanceAfterReviews'); // 550000 - 100000 - 20000
});

// 케이스 6: 출장지역 '그 외' → travelFee = null
test('출장지역 기타 → travelFee null, isQuoteFinal false', () => {
  const result = calculateQuote({
    product: 'premium',
    region: 'other',
    options: [],
    immediateDiscounts: [],
    promiseDiscounts: [],
    dolHasMainSnap: null,
  });
  assertEqual(result.travelFee, null, 'travelFee');
  assertEqual(result.isQuoteFinal, false, 'isQuoteFinal');
  // 출장비 제외 부분 총액
  assertEqual(result.total, 550000, 'total (excluding travel fee)');
});

// 케이스 7: 프리미엄 풀옵션
test('프리미엄 + 평택 + 모든 옵션 + 모든 할인', () => {
  const result = calculateQuote({
    product: 'premium',
    region: 'pyeongtaek',
    options: ['finalPlus5', 'colorPlus10', 'part2', 'pyebaek'],
    immediateDiscounts: ['sameDay', 'portrait', 'partner'],
    promiseDiscounts: ['blogPromise', 'cupidonPromise'],
    dolHasMainSnap: null,
  });
  // 550000 + 70000(평택) + 50000+50000+70000+50000(옵션) - 30000-20000-20000(즉시) = 720000
  assertEqual(result.subtotal, 550000, 'subtotal');
  assertEqual(result.travelFee, 70000, 'travelFee');
  assertEqual(result.optionsTotal, 220000, 'optionsTotal');
  assertEqual(result.immediateDiscountTotal, -70000, 'immediateDiscountTotal');
  assertEqual(result.total, 770000, 'total');
  assertEqual(result.balance, 670000, 'balance');
  assertEqual(result.balanceAfterReviews, 650000, 'balanceAfterReviews');
});
```

- [ ] **Step 3: 테스트 러너를 브라우저에서 열어 실패 확인**

브라우저에서 `file:///C:/Users/User/Desktop/박채진/cupidon-contract/tests/test-runner.html`을 열고 콘솔 확인.
Expected: 모든 테스트 FAIL (pricing.js 파일 없음). 콘솔에 `Failed to fetch module` 에러.

- [ ] **Step 4: pricing.js 최소 구현**

Create `js/pricing.js`:
```javascript
import {
  PRODUCTS,
  IMMEDIATE_DISCOUNTS,
  PROMISE_DISCOUNTS,
  OPTIONS_WEDDING,
  OPTIONS_STUDIO_DOL,
  TRAVEL_FEE,
  DOL_ALONE_SURCHARGE,
  FIXED_DEPOSIT,
} from './config.js';

/**
 * 견적 계산 순수 함수.
 * @param {Object} input
 * @param {string} input.product - 'special' | 'premium' | 'studio' | 'dol'
 * @param {string} input.region - 'seoul' | 'gyeonggi_incheon' | 'pyeongtaek' | 'other'
 * @param {string[]} input.options - 옵션 코드 배열
 * @param {string[]} input.immediateDiscounts - 즉시 할인 코드 배열
 * @param {string[]} input.promiseDiscounts - 후기 약속 할인 코드 배열
 * @param {boolean|null} input.dolHasMainSnap - 돌스냅일 때만 사용. null이면 무시.
 * @returns {Object} 견적 결과
 */
export function calculateQuote(input) {
  const product = PRODUCTS[input.product];
  if (!product) throw new Error(`Unknown product: ${input.product}`);

  const subtotal = product.basePrice;

  const travel = TRAVEL_FEE[input.region];
  const travelFee = travel.amount; // null이면 별도 문의
  const isQuoteFinal = travelFee !== null;

  const optionsTable = product.hasWeddingOptions ? OPTIONS_WEDDING : OPTIONS_STUDIO_DOL;
  const optionsTotal = input.options.reduce((sum, code) => sum + (optionsTable[code]?.amount || 0), 0);

  const dolSurcharge =
    input.product === 'dol' && input.dolHasMainSnap === false ? DOL_ALONE_SURCHARGE : 0;

  const immediateDiscountTotal = input.immediateDiscounts.reduce(
    (sum, code) => sum + (IMMEDIATE_DISCOUNTS[code]?.amount || 0),
    0
  );

  const promiseTotal = input.promiseDiscounts.reduce(
    (sum, code) => sum + (PROMISE_DISCOUNTS[code]?.amount || 0),
    0
  );

  const total =
    subtotal + (travelFee || 0) + optionsTotal + dolSurcharge + immediateDiscountTotal;

  const deposit = FIXED_DEPOSIT;
  const balance = total - deposit;
  const balanceAfterReviews = balance + promiseTotal;

  return {
    subtotal,
    travelFee,
    isQuoteFinal,
    optionsTotal,
    dolSurcharge,
    immediateDiscountTotal,
    promiseTotal,
    total,
    deposit,
    balance,
    balanceAfterReviews,
  };
}
```

- [ ] **Step 5: 테스트 러너 재실행 → 모두 통과 확인**

브라우저에서 `test-runner.html` 새로고침.
Expected: 7개 테스트 모두 PASS (초록색), 하단 요약 `총 7개 중 7개 통과, 0개 실패`.

- [ ] **Step 6: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add tests/ js/pricing.js && git commit -m "feat(pricing): calculate quote with immediate + promise discounts"
```

---

## Task 4: validators.js (TDD로 폼 유효성 검사)

**Files:**
- Create: `tests/test-validators.js`
- Create: `js/validators.js`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `tests/test-validators.js`:
```javascript
import { validateStep } from '../js/validators.js';

test('Step 1: 성함/연락처 미입력 → error', () => {
  const errors = validateStep(1, { customerName: '', customerPhone: '' });
  assertEqual(errors.customerName, '성함을 입력해주세요.', 'customerName');
  assertEqual(errors.customerPhone, '연락처를 입력해주세요.', 'customerPhone');
});

test('Step 1: 전화번호 형식 잘못 → error', () => {
  const errors = validateStep(1, { customerName: '홍길동', customerPhone: '1234' });
  assertEqual(errors.customerPhone, '올바른 전화번호 형식이 아닙니다.', 'customerPhone');
});

test('Step 1: 정상 입력 → error 없음', () => {
  const errors = validateStep(1, { customerName: '홍길동', customerPhone: '010-1234-5678' });
  assertDeepEqual(errors, {}, 'no errors');
});

test('Step 2: 필수 항목 누락 → error', () => {
  const errors = validateStep(2, { eventDate: '', eventTime: '', venue: '', region: '' });
  assertEqual(!!errors.eventDate, true, 'eventDate');
  assertEqual(!!errors.eventTime, true, 'eventTime');
  assertEqual(!!errors.venue, true, 'venue');
  assertEqual(!!errors.region, true, 'region');
});

test('Step 3: 상품 미선택 → error', () => {
  const errors = validateStep(3, { product: '' });
  assertEqual(!!errors.product, true, 'product');
});

test('Step 4: 돌스냅인데 dolHasMainSnap 미선택 → error', () => {
  const errors = validateStep(4, { product: 'dol', dolHasMainSnap: null });
  assertEqual(!!errors.dolHasMainSnap, true, 'dolHasMainSnap');
});

test('Step 4: 돌스냅 아니면 dolHasMainSnap 검사 안함', () => {
  const errors = validateStep(4, { product: 'premium', dolHasMainSnap: null });
  assertDeepEqual(errors, {}, 'no errors');
});

test('Step 5: 짝꿍할인 체크 + 코드 미입력 → error', () => {
  const errors = validateStep(5, {
    immediateDiscounts: ['partner'],
    partnerCode: '',
  });
  assertEqual(!!errors.partnerCode, true, 'partnerCode');
});

test('Step 5: 짝꿍할인 체크 + 코드 입력 → ok', () => {
  const errors = validateStep(5, {
    immediateDiscounts: ['partner'],
    partnerCode: 'KHR2026',
  });
  assertDeepEqual(errors, {}, 'no errors');
});

test('Step 7: 서명 데이터/동의 미완료 → error', () => {
  const errors = validateStep(7, { signature: '', agreed: false });
  assertEqual(!!errors.signature, true, 'signature');
  assertEqual(!!errors.agreed, true, 'agreed');
});
```

- [ ] **Step 2: 브라우저에서 실패 확인**

`test-runner.html` 새로고침 → validators 관련 테스트 FAIL.

- [ ] **Step 3: validators.js 구현**

Create `js/validators.js`:
```javascript
// 스텝별 폼 유효성 검사. errors 객체 반환 (key: field, value: 메시지).

export function validateStep(step, data) {
  const errors = {};
  switch (step) {
    case 1:
      if (!data.customerName?.trim()) errors.customerName = '성함을 입력해주세요.';
      if (!data.customerPhone?.trim()) {
        errors.customerPhone = '연락처를 입력해주세요.';
      } else if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(data.customerPhone.replace(/\s/g, ''))) {
        errors.customerPhone = '올바른 전화번호 형식이 아닙니다.';
      }
      break;
    case 2:
      if (!data.eventDate) errors.eventDate = '예식일자를 선택해주세요.';
      if (!data.eventTime) errors.eventTime = '예식시간을 선택해주세요.';
      if (!data.venue?.trim()) errors.venue = '예식장/장소를 입력해주세요.';
      if (!data.region) errors.region = '출장지역을 선택해주세요.';
      break;
    case 3:
      if (!data.product) errors.product = '상품을 선택해주세요.';
      break;
    case 4:
      if (data.product === 'dol' && (data.dolHasMainSnap === null || data.dolHasMainSnap === undefined)) {
        errors.dolHasMainSnap = '메인스냅 동반 여부를 선택해주세요.';
      }
      break;
    case 5:
      if (data.immediateDiscounts?.includes('partner') && !data.partnerCode?.trim()) {
        errors.partnerCode = '짝꿍코드를 입력해주세요.';
      }
      break;
    case 6:
      if (!data.quoteConfirmed) errors.quoteConfirmed = '견적 확인에 체크해주세요.';
      break;
    case 7:
      if (!data.signature) errors.signature = '서명을 입력해주세요.';
      if (!data.agreed) errors.agreed = '계약 내용에 동의해주세요.';
      break;
  }
  return errors;
}
```

- [ ] **Step 4: 테스트 통과 확인**

`test-runner.html` 새로고침 → 전체 테스트 (pricing + validators) 모두 PASS.

- [ ] **Step 5: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add tests/test-validators.js js/validators.js && git commit -m "feat(validators): validate each step's form data"
```

---

## Task 5: templates.js (계약서 문구 템플릿)

**Files:**
- Create: `js/templates.js`

- [ ] **Step 1: templates.js 작성**

Create `js/templates.js`:
```javascript
import { PRODUCTS, IMMEDIATE_DISCOUNTS, PROMISE_DISCOUNTS, OWNER_INFO } from './config.js';

/**
 * 견적 결과와 폼 데이터로 계약서 HTML 조각을 생성.
 * pdf.js가 이 HTML을 hidden div에 넣고 html2canvas로 캡처.
 */
export function renderContractHTML({ formData, quote, todayStr }) {
  const product = PRODUCTS[formData.product];
  const appliedImmediate = formData.immediateDiscounts.map(c => IMMEDIATE_DISCOUNTS[c].name);
  const subtitleLabel = appliedImmediate.length ? `(${appliedImmediate.join(', ')} 적용)` : '';

  const eventDateStr = formatEventDate(formData.eventDate, formData.eventTime);
  const priceStr = n => n.toLocaleString('ko-KR') + '원';

  // 상품 스펙 표 로우
  const specRows = Object.entries(product.spec)
    .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
    .join('');

  // 옵션 표기
  const optionLabels = formData.options.map(code => {
    const table = product.hasWeddingOptions
      ? { finalPlus5: '최종본 5장', colorPlus10: '색보정 10장', part2: '2부 촬영', pyebaek: '폐백 촬영' }
      : { finalPlus5: '최종본 5장', part2Half: '2부 촬영(30분)' };
    return table[code];
  });
  const optionSection = optionLabels.length
    ? optionLabels.map(l => `<div>+ ${l}</div>`).join('')
    : '<div>선택된 추가 옵션 없음</div>';

  // 데이터 전달 안내
  const deliveryList = product.deliveryNote.map(t => `<li>${t}</li>`).join('');

  // 후기 약속 표기
  const promiseLabels = formData.promiseDiscounts.map(c => PROMISE_DISCOUNTS[c].name);
  const promiseSection = promiseLabels.length
    ? `<p style="margin-top:8px;color:#666">
        <strong>추후 정산 가능 할인:</strong> ${promiseLabels.join(', ')} — 각 -10,000원 (후기 URL 전달 시 잔금에서 차감)
      </p>`
    : '';

  // 짝꿍코드 표기
  const partnerCodeSection = formData.partnerCode
    ? `<div>짝꿍코드: <strong>${escapeHtml(formData.partnerCode)}</strong></div>`
    : '';

  // 서명 이미지
  const signatureImg = formData.signature
    ? `<img src="${formData.signature}" alt="서명" style="max-height:60px;border-bottom:1px solid #333">`
    : '';

  // 출장비 미확정 알림
  const travelNote = quote.isQuoteFinal
    ? ''
    : '<p style="color:#c00"><strong>*출장비는 별도 문의 후 안내 (본 금액에 미포함)</strong></p>';

  return `
    <div style="width:800px;padding:40px;font-family:'Malgun Gothic','맑은 고딕',sans-serif;font-size:13px;line-height:1.6;color:#222">
      <h1 style="text-align:center;font-size:22px;margin:0">큐피돈 아이폰 스냅 계약서</h1>
      <p style="text-align:center;color:#666;margin:4px 0 24px">${subtitleLabel}</p>

      <h3 style="border-bottom:2px solid #333;padding-bottom:4px">1. 상품 구성</h3>
      <div style="padding:8px 0"><strong>상품명:</strong> ${product.name}</div>
      <div style="padding:8px 0"><strong>제공 콘텐츠:</strong></div>
      <div style="padding-left:16px">${specRows}</div>
      <div style="padding:8px 0"><strong>추가 옵션:</strong></div>
      <div style="padding-left:16px">${optionSection}</div>

      <h3 style="border-bottom:2px solid #333;padding-bottom:4px;margin-top:20px">2. 결제 및 환불 안내</h3>
      <ul>
        <li>잔금은 예식 7일 전까지 완납해주셔야 합니다.</li>
        <li>계약금은 <strong>100,000원 입금</strong>을 통해 예약이 확정됩니다.</li>
        <li>예약 확정일 기준 14일 이내: 계약금 100% 환불 가능</li>
        <li>예약 확정일 기준 14일 이후: 계약금 환불 불가</li>
        <li>천재지변 등 불가피한 사유: 계약금 환불 가능</li>
        <li>단순 변심, 웨딩홀 귀책 등 제3자 사유: 환불 불가</li>
        <li>큐피돈 스냅 귀책 사유 발생 시: 200% 환불 보장</li>
      </ul>

      <h3 style="border-bottom:2px solid #333;padding-bottom:4px;margin-top:20px">3. 데이터 전달 및 보관 안내</h3>
      <ul>${deliveryList}</ul>

      <p style="margin-top:20px">
        큐피돈 아이폰 스냅과 관련하여 상기 내용을 통해 촬영 상품 구성, 추가 요금, 결제 및 환불,
        데이터 보관 및 전달 규정에 대해 충분히 안내받았으며, 이에 동의합니다.
      </p>

      <div style="margin-top:24px;padding:12px;border:1px solid #ccc;border-radius:6px">
        <div><strong>계약금:</strong> 100,000원 &nbsp;&nbsp; <strong>잔금:</strong> ${priceStr(quote.balance)}</div>
        <div><strong>총액:</strong> ${priceStr(quote.total)}</div>
        ${travelNote}
        ${promiseSection}
        <div style="margin-top:8px"><strong>용역 공급자:</strong> 큐피돈 스냅</div>
      </div>

      <div style="margin-top:20px">
        <div><strong>예식일:</strong> ${eventDateStr}</div>
        <div><strong>장소:</strong> ${escapeHtml(formData.venue)}</div>
        <div><strong>출장지역:</strong> ${escapeHtml(getRegionLabel(formData.region))}</div>
        <div><strong>계약자 성함:</strong> ${escapeHtml(formData.customerName)} 님</div>
        <div><strong>연락처:</strong> ${escapeHtml(formData.customerPhone)}</div>
        ${partnerCodeSection}
      </div>

      <div style="margin-top:32px;display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div>계약일: ${todayStr}</div>
          <div style="margin-top:8px">서명:</div>
          <div>${signatureImg}</div>
        </div>
        <div style="text-align:right;font-size:11px;color:#666">
          <div>${OWNER_INFO.accountHolder}</div>
        </div>
      </div>
    </div>
  `;
}

function formatEventDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '';
  const [y, m, d] = dateStr.split('-');
  const [hh, mm] = timeStr.split(':');
  const hour = parseInt(hh, 10);
  const ampm = hour < 12 ? '오전' : '오후';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${y}년 ${parseInt(m,10)}월 ${parseInt(d,10)}일 ${ampm} ${hour12}시${mm !== '00' ? ' ' + parseInt(mm,10) + '분' : ''}`;
}

function getRegionLabel(code) {
  return { seoul: '서울', gyeonggi_incheon: '경기·인천', pyeongtaek: '평택', other: '그 외 지역' }[code] || code;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

- [ ] **Step 2: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add js/templates.js && git commit -m "feat(templates): render contract HTML for PDF"
```

---

## Task 6: index.html + style.css (기본 UI 스캐폴딩)

**Files:**
- Create: `index.html`
- Create: `css/style.css`

- [ ] **Step 1: css 디렉토리 생성**

Run:
```bash
mkdir -p "C:/Users/User/Desktop/박채진/cupidon-contract/css"
```

- [ ] **Step 2: style.css 작성**

Create `css/style.css`:
```css
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Malgun Gothic', '맑은 고딕', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #faf7f2;
  color: #333;
  line-height: 1.6;
}
.container {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px 16px 60px;
}
.header {
  text-align: center;
  padding: 24px 0;
}
.header h1 {
  font-size: 28px;
  letter-spacing: 2px;
  margin: 0;
  font-weight: 300;
}
.header p { color: #999; margin: 4px 0 0; font-size: 13px; }

.step-indicator {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 12px 0 20px;
}
.step-dot {
  width: 24px; height: 24px; border-radius: 50%;
  background: #e0d9cc; color: #999;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600;
}
.step-dot.active { background: #333; color: #fff; }
.step-dot.done { background: #999; color: #fff; }

.card {
  background: #fff; border-radius: 12px; padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-bottom: 16px;
}
.card h2 { margin: 0 0 20px; font-size: 20px; font-weight: 500; }
.card h3 { margin: 20px 0 12px; font-size: 15px; color: #555; font-weight: 500; }

.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; margin-bottom: 6px; color: #666; }
.field input[type="text"],
.field input[type="tel"],
.field input[type="date"],
.field input[type="time"],
.field textarea {
  width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px;
  font-size: 15px; font-family: inherit; background: #fff;
}
.field input:focus, .field textarea:focus { outline: none; border-color: #333; }
.field .error { color: #c00; font-size: 12px; margin-top: 4px; }
.field.has-error input { border-color: #c00; }

.radio-group, .checkbox-group { display: grid; gap: 8px; }
.radio-option, .checkbox-option {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px; border: 1px solid #e0d9cc; border-radius: 8px; cursor: pointer;
  transition: all 0.15s;
}
.radio-option:hover, .checkbox-option:hover { background: #f8f4ee; }
.radio-option input, .checkbox-option input { margin-top: 3px; }
.radio-option.selected, .checkbox-option.selected { border-color: #333; background: #f4efe5; }
.radio-option .price, .checkbox-option .price {
  margin-left: auto; font-weight: 600; color: #333; white-space: nowrap;
}
.radio-option .desc, .checkbox-option .desc {
  display: block; font-size: 12px; color: #888; margin-top: 4px;
}

.quote-summary {
  background: #f4efe5; padding: 16px; border-radius: 8px; margin: 20px 0;
}
.quote-line {
  display: flex; justify-content: space-between; padding: 6px 0;
  border-bottom: 1px dashed #ddd;
}
.quote-line:last-child { border: none; }
.quote-line.total { border-top: 2px solid #333; padding-top: 12px; margin-top: 8px; font-weight: 700; font-size: 18px; }
.quote-line.note { color: #888; font-size: 12px; }

.signature-wrap {
  border: 2px dashed #ccc; border-radius: 8px; background: #fff; padding: 4px;
}
canvas.signature-pad { width: 100%; height: 200px; touch-action: none; }
.signature-actions { display: flex; gap: 8px; margin-top: 8px; }
.btn-clear { padding: 6px 14px; background: #eee; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }

.actions { display: flex; gap: 8px; margin-top: 24px; }
.btn {
  flex: 1; padding: 14px; border: none; border-radius: 8px;
  font-size: 15px; font-weight: 500; cursor: pointer;
}
.btn-primary { background: #333; color: #fff; }
.btn-primary:disabled { background: #999; cursor: not-allowed; }
.btn-secondary { background: #eee; color: #333; }

.success-box {
  text-align: center; padding: 40px 20px;
}
.success-box .check {
  font-size: 60px; color: #4caf50; margin-bottom: 16px;
}
.info-box {
  background: #fff9e6; border-left: 4px solid #f5a623;
  padding: 12px 14px; border-radius: 4px; font-size: 13px; margin: 12px 0;
}
.badge-warn {
  display: inline-block; padding: 2px 8px; background: #fff3cd; color: #856404;
  border-radius: 4px; font-size: 11px; margin-left: 4px;
}

#pdf-render-area {
  position: fixed; left: -9999px; top: 0;
  background: #fff;
}

@media (max-width: 480px) {
  .container { padding: 12px 12px 40px; }
  .card { padding: 16px; }
  .header h1 { font-size: 22px; }
}
```

- [ ] **Step 3: index.html 작성**

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>큐피돈 아이폰 스냅 - 계약 신청</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CUPIDON SNAP</h1>
      <p>아이폰 스냅 계약 신청</p>
    </div>

    <div class="step-indicator" id="step-indicator"></div>

    <main id="app"></main>
  </div>

  <!-- PDF 생성용 hidden render area -->
  <div id="pdf-render-area"></div>

  <!-- 외부 라이브러리 (CDN) -->
  <script src="https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: 브라우저에서 열어 확인 (아직 app.js 없음 → 빈 화면 정상)**

브라우저에서 `index.html` 열기. Expected: 상단 헤더와 스텝 인디케이터 영역만 보임. 콘솔에 `Failed to resolve module` 에러 (app.js 없음).

- [ ] **Step 5: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add index.html css/style.css && git commit -m "feat(ui): scaffold index.html and base styles"
```

---

## Task 7: form.js - 상태 관리 + Step 1~2 렌더링

**Files:**
- Create: `js/form.js`

- [ ] **Step 1: form.js 골격 & Step 1-2 렌더러 작성**

Create `js/form.js`:
```javascript
import { TRAVEL_FEE } from './config.js';
import { validateStep } from './validators.js';

export const state = {
  currentStep: 1,
  totalSteps: 8,
  errors: {},
  data: {
    customerName: '',
    customerPhone: '',
    eventDate: '',
    eventTime: '',
    venue: '',
    region: '',
    product: '',
    options: [],
    dolHasMainSnap: null,
    immediateDiscounts: [],
    promiseDiscounts: [],
    partnerCode: '',
    quoteConfirmed: false,
    signature: '', // base64 dataURL
    agreed: false,
  },
};

const renderers = {}; // step번호 → 렌더 함수
const afterRenderHooks = {}; // step 렌더 후 실행할 훅 (signature_pad 초기화 등)

export function registerRenderer(step, fn, afterRender = null) {
  renderers[step] = fn;
  if (afterRender) afterRenderHooks[step] = afterRender;
}

export function render() {
  const app = document.getElementById('app');
  const indicator = document.getElementById('step-indicator');

  // 스텝 인디케이터
  indicator.innerHTML = '';
  for (let i = 1; i <= state.totalSteps; i++) {
    const dot = document.createElement('div');
    dot.className = 'step-dot' + (i === state.currentStep ? ' active' : i < state.currentStep ? ' done' : '');
    dot.textContent = i;
    indicator.appendChild(dot);
  }

  // 스텝 컨텐츠
  const renderer = renderers[state.currentStep];
  app.innerHTML = renderer ? renderer(state) : `<div class="card">Step ${state.currentStep} (미구현)</div>`;

  attachCommonHandlers();
  const hook = afterRenderHooks[state.currentStep];
  if (hook) hook(state);
}

function attachCommonHandlers() {
  const nextBtn = document.querySelector('[data-action="next"]');
  const prevBtn = document.querySelector('[data-action="prev"]');
  if (nextBtn) nextBtn.addEventListener('click', goNext);
  if (prevBtn) prevBtn.addEventListener('click', goPrev);

  // 입력 필드 자동 바인딩
  document.querySelectorAll('[data-bind]').forEach(el => {
    const key = el.dataset.bind;
    if (el.type === 'checkbox') {
      el.addEventListener('change', () => {
        if (Array.isArray(state.data[key])) {
          const val = el.value;
          if (el.checked) state.data[key] = [...state.data[key], val];
          else state.data[key] = state.data[key].filter(v => v !== val);
        } else {
          state.data[key] = el.checked;
        }
        onDataChange();
      });
    } else if (el.type === 'radio') {
      el.addEventListener('change', () => {
        if (el.checked) {
          state.data[key] = el.value === 'true' ? true : el.value === 'false' ? false : el.value;
          onDataChange();
        }
      });
    } else {
      el.addEventListener('input', () => {
        state.data[key] = el.value;
        onDataChange();
      });
    }
  });
}

function onDataChange() {
  // 실시간 재렌더 필요한 경우 오버라이드 가능
  const hook = afterRenderHooks['onChange_' + state.currentStep];
  if (hook) hook(state);
}

function goNext() {
  const errors = validateStep(state.currentStep, state.data);
  state.errors = errors;
  if (Object.keys(errors).length > 0) {
    render();
    return;
  }
  if (state.currentStep < state.totalSteps) {
    state.currentStep++;
    render();
  }
}

function goPrev() {
  if (state.currentStep > 1) {
    state.currentStep--;
    state.errors = {};
    render();
  }
}

// ============================
// Step 1: 기본 정보
// ============================
registerRenderer(1, s => `
  <div class="card">
    <h2>1. 기본 정보</h2>
    <div class="field ${s.errors.customerName ? 'has-error' : ''}">
      <label>계약자 성함 *</label>
      <input type="text" data-bind="customerName" value="${escapeAttr(s.data.customerName)}" placeholder="예: 홍길동" />
      ${s.errors.customerName ? `<div class="error">${s.errors.customerName}</div>` : ''}
    </div>
    <div class="field ${s.errors.customerPhone ? 'has-error' : ''}">
      <label>연락처 *</label>
      <input type="tel" data-bind="customerPhone" value="${escapeAttr(s.data.customerPhone)}" placeholder="010-0000-0000" />
      ${s.errors.customerPhone ? `<div class="error">${s.errors.customerPhone}</div>` : ''}
    </div>
    <div class="actions">
      <button class="btn btn-primary" data-action="next">다음</button>
    </div>
  </div>
`);

// ============================
// Step 2: 행사 정보
// ============================
registerRenderer(2, s => {
  const regions = Object.entries(TRAVEL_FEE).map(([code, r]) => {
    const feeLabel = r.amount === null ? '별도 문의' : r.amount === 0 ? '기본' : `+${r.amount.toLocaleString('ko-KR')}원`;
    const checked = s.data.region === code ? 'checked' : '';
    const selectedCls = s.data.region === code ? 'selected' : '';
    return `
      <label class="radio-option ${selectedCls}">
        <input type="radio" name="region" data-bind="region" value="${code}" ${checked}>
        <span>${r.name}</span>
        <span class="price">${feeLabel}</span>
      </label>`;
  }).join('');

  return `
    <div class="card">
      <h2>2. 행사 정보</h2>
      <div class="field ${s.errors.eventDate ? 'has-error' : ''}">
        <label>예식일자 *</label>
        <input type="date" data-bind="eventDate" value="${s.data.eventDate}">
        ${s.errors.eventDate ? `<div class="error">${s.errors.eventDate}</div>` : ''}
      </div>
      <div class="field ${s.errors.eventTime ? 'has-error' : ''}">
        <label>예식시간 *</label>
        <input type="time" data-bind="eventTime" value="${s.data.eventTime}">
        ${s.errors.eventTime ? `<div class="error">${s.errors.eventTime}</div>` : ''}
      </div>
      <div class="field ${s.errors.venue ? 'has-error' : ''}">
        <label>예식장/장소명 *</label>
        <input type="text" data-bind="venue" value="${escapeAttr(s.data.venue)}" placeholder="예: 서울 그랜드하얏트">
        ${s.errors.venue ? `<div class="error">${s.errors.venue}</div>` : ''}
      </div>
      <div class="field ${s.errors.region ? 'has-error' : ''}">
        <label>출장지역 *</label>
        <div class="radio-group">${regions}</div>
        ${s.errors.region ? `<div class="error">${s.errors.region}</div>` : ''}
        ${s.data.region === 'other' ? '<div class="info-box">출장비는 별도 문의 후 안내됩니다. 계약서 총액에는 포함되지 않습니다.</div>' : ''}
      </div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>
  `;
});

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
```

- [ ] **Step 2: 임시 app.js 만들어 확인**

Create `js/app.js`:
```javascript
import { render } from './form.js';
render();
```

- [ ] **Step 3: 브라우저에서 Step 1, 2 동작 확인**

`index.html` 열기.
Expected:
- Step 1 화면 노출: 성함, 연락처 필드
- 아무것도 입력하지 않고 "다음" 클릭 → 빨간 에러 메시지
- 유효 값 입력 후 "다음" → Step 2로 이동
- Step 2에서 "이전" 클릭 → Step 1으로

- [ ] **Step 4: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add js/form.js js/app.js && git commit -m "feat(form): render step 1-2 with validation and navigation"
```

---

## Task 8: form.js - Step 3~5 렌더링 (상품/옵션/할인)

**Files:**
- Modify: `js/form.js` (아래 코드를 파일 하단에 추가)

- [ ] **Step 1: Step 3~5 렌더러 추가**

Append to `js/form.js`:
```javascript
import {
  PRODUCTS,
  IMMEDIATE_DISCOUNTS,
  PROMISE_DISCOUNTS,
  OPTIONS_WEDDING,
  OPTIONS_STUDIO_DOL,
} from './config.js';

// ============================
// Step 3: 상품 선택
// ============================
registerRenderer(3, s => {
  const cards = Object.values(PRODUCTS).map(p => {
    const checked = s.data.product === p.code ? 'checked' : '';
    const cls = s.data.product === p.code ? 'selected' : '';
    const specs = Object.entries(p.spec).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(' / ');
    return `
      <label class="radio-option ${cls}">
        <input type="radio" name="product" data-bind="product" value="${p.code}" ${checked}>
        <div style="flex:1">
          <div><strong>${p.name}</strong></div>
          <span class="desc">${specs}</span>
        </div>
        <span class="price">${p.basePrice.toLocaleString('ko-KR')}원</span>
      </label>`;
  }).join('');
  return `
    <div class="card">
      <h2>3. 상품 선택</h2>
      <div class="field ${s.errors.product ? 'has-error' : ''}">
        <div class="radio-group">${cards}</div>
        ${s.errors.product ? `<div class="error">${s.errors.product}</div>` : ''}
      </div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>
  `;
});

// ============================
// Step 4: 추가 옵션
// ============================
registerRenderer(4, s => {
  if (!s.data.product) {
    return `<div class="card"><p>상품을 먼저 선택해주세요.</p><div class="actions"><button class="btn btn-secondary" data-action="prev">이전</button></div></div>`;
  }
  const product = PRODUCTS[s.data.product];
  const optionsTable = product.hasWeddingOptions ? OPTIONS_WEDDING : OPTIONS_STUDIO_DOL;
  const options = Object.entries(optionsTable).map(([code, o]) => {
    const checked = s.data.options.includes(code) ? 'checked' : '';
    const cls = s.data.options.includes(code) ? 'selected' : '';
    return `
      <label class="checkbox-option ${cls}">
        <input type="checkbox" data-bind="options" value="${code}" ${checked}>
        <span>${o.name}</span>
        <span class="price">+${o.amount.toLocaleString('ko-KR')}원</span>
      </label>`;
  }).join('');

  // 돌스냅 아이폰 단독 여부
  let dolQuestion = '';
  if (s.data.product === 'dol') {
    const hasMainYes = s.data.dolHasMainSnap === true ? 'checked' : '';
    const hasMainNo = s.data.dolHasMainSnap === false ? 'checked' : '';
    const yesCls = s.data.dolHasMainSnap === true ? 'selected' : '';
    const noCls = s.data.dolHasMainSnap === false ? 'selected' : '';
    dolQuestion = `
      <h3>메인스냅(사진사)이 함께 촬영하나요? *</h3>
      <div class="radio-group">
        <label class="radio-option ${yesCls}">
          <input type="radio" name="dolHasMainSnap" data-bind="dolHasMainSnap" value="true" ${hasMainYes}>
          <span>예, 함께 있습니다</span>
        </label>
        <label class="radio-option ${noCls}">
          <input type="radio" name="dolHasMainSnap" data-bind="dolHasMainSnap" value="false" ${hasMainNo}>
          <span>아니요 (아이폰 스냅 단독)</span>
          <span class="price">+50,000원</span>
        </label>
      </div>
      ${s.errors.dolHasMainSnap ? `<div class="error">${s.errors.dolHasMainSnap}</div>` : ''}
    `;
  }

  return `
    <div class="card">
      <h2>4. 추가 옵션</h2>
      <h3>선택 옵션</h3>
      <div class="checkbox-group">${options}</div>
      ${dolQuestion}
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>
  `;
});

// ============================
// Step 5: 할인 적용
// ============================
registerRenderer(5, s => {
  const immediate = Object.entries(IMMEDIATE_DISCOUNTS).map(([code, d]) => {
    if (d.appliesTo !== 'all' && !d.appliesTo.includes(s.data.product)) return '';
    const checked = s.data.immediateDiscounts.includes(code) ? 'checked' : '';
    const cls = s.data.immediateDiscounts.includes(code) ? 'selected' : '';
    return `
      <label class="checkbox-option ${cls}">
        <input type="checkbox" data-bind="immediateDiscounts" value="${code}" ${checked}>
        <span>${d.name}</span>
        <span class="price">${d.amount.toLocaleString('ko-KR')}원</span>
      </label>`;
  }).join('');

  const promise = Object.entries(PROMISE_DISCOUNTS).map(([code, d]) => {
    const checked = s.data.promiseDiscounts.includes(code) ? 'checked' : '';
    const cls = s.data.promiseDiscounts.includes(code) ? 'selected' : '';
    return `
      <label class="checkbox-option ${cls}">
        <input type="checkbox" data-bind="promiseDiscounts" value="${code}" ${checked}>
        <span>${d.name} <span class="badge-warn">약속</span></span>
        <span class="price">${d.amount.toLocaleString('ko-KR')}원</span>
      </label>`;
  }).join('');

  const partnerField = s.data.immediateDiscounts.includes('partner')
    ? `
      <div class="field ${s.errors.partnerCode ? 'has-error' : ''}" style="margin-top:12px;padding:12px;background:#f4efe5;border-radius:8px">
        <label>짝꿍코드 * (필수 입력)</label>
        <input type="text" data-bind="partnerCode" value="${escapeAttr(s.data.partnerCode)}" placeholder="예: KHR2026">
        ${s.errors.partnerCode ? `<div class="error">${s.errors.partnerCode}</div>` : ''}
      </div>`
    : '';

  return `
    <div class="card">
      <h2>5. 할인 적용</h2>
      <h3>즉시 적용 할인 (총액에서 바로 차감)</h3>
      <div class="checkbox-group">${immediate}</div>
      ${partnerField}
      <h3>후기 약속 할인 (실제 후기 URL 전달 시 잔금에서 차감)</h3>
      <div class="checkbox-group">${promise}</div>
      <div class="info-box">약속 할인은 계약 시점 총액엔 반영되지 않으며, 나중에 후기 작성 후 사장님께 URL을 보내주시면 잔금에서 차감됩니다.</div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>
  `;
});
```

- [ ] **Step 2: 중복 import 정리**

`js/form.js` 상단의 첫 import 라인(`import { TRAVEL_FEE } from './config.js';`)을 삭제하고, 방금 추가한 두 번째 import 라인을 다음처럼 통합:

Replace in `js/form.js`:
```javascript
import { TRAVEL_FEE } from './config.js';
import { validateStep } from './validators.js';
```
With:
```javascript
import {
  PRODUCTS,
  TRAVEL_FEE,
  IMMEDIATE_DISCOUNTS,
  PROMISE_DISCOUNTS,
  OPTIONS_WEDDING,
  OPTIONS_STUDIO_DOL,
} from './config.js';
import { validateStep } from './validators.js';
```
Then remove the second (Step 3~5 앞의) import block.

- [ ] **Step 3: 브라우저에서 Step 3~5 동작 확인**

`index.html` 새로고침. Step 1~2 입력 후 진행.
Expected:
- Step 3: 4개 상품 카드 표시, 하나 선택 → 다음 진행
- Step 4: 선택 상품에 맞는 옵션 표시. 돌스냅 선택 시 메인스냅 질문 노출
- Step 5: 짝꿍할인 체크 시 코드 입력창 노출. 미입력 시 진행 불가

- [ ] **Step 4: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add js/form.js && git commit -m "feat(form): render step 3-5 (product/options/discounts)"
```

---

## Task 9: form.js - Step 6 견적 확인

**Files:**
- Modify: `js/form.js`

- [ ] **Step 1: Step 6 렌더러 추가**

Append to `js/form.js`:
```javascript
import { calculateQuote } from './pricing.js';

// ============================
// Step 6: 견적 확인
// ============================
registerRenderer(6, s => {
  const quote = calculateQuote({
    product: s.data.product,
    region: s.data.region,
    options: s.data.options,
    immediateDiscounts: s.data.immediateDiscounts,
    promiseDiscounts: s.data.promiseDiscounts,
    dolHasMainSnap: s.data.dolHasMainSnap,
  });
  const p = n => n.toLocaleString('ko-KR') + '원';
  const product = PRODUCTS[s.data.product];
  const optionsTable = product.hasWeddingOptions ? OPTIONS_WEDDING : OPTIONS_STUDIO_DOL;

  const optionLines = s.data.options.map(code => {
    const o = optionsTable[code];
    return `<div class="quote-line"><span>+ ${o.name}</span><span>+${p(o.amount)}</span></div>`;
  }).join('');

  const immediateLines = s.data.immediateDiscounts.map(code => {
    const d = IMMEDIATE_DISCOUNTS[code];
    const label = code === 'partner' && s.data.partnerCode ? `${d.name} (${s.data.partnerCode})` : d.name;
    return `<div class="quote-line"><span>${label}</span><span>${p(d.amount)}</span></div>`;
  }).join('');

  const promiseLines = s.data.promiseDiscounts.map(code => {
    const d = PROMISE_DISCOUNTS[code];
    return `<div class="quote-line note"><span>${d.name} (약속)</span><span>${p(d.amount)}</span></div>`;
  }).join('');

  const travelLine = quote.travelFee === null
    ? '<div class="quote-line"><span>출장비</span><span class="badge-warn">별도 문의</span></div>'
    : quote.travelFee > 0
      ? `<div class="quote-line"><span>출장비</span><span>+${p(quote.travelFee)}</span></div>`
      : '';

  const dolLine = quote.dolSurcharge > 0
    ? `<div class="quote-line"><span>아이폰 단독 촬영</span><span>+${p(quote.dolSurcharge)}</span></div>`
    : '';

  const promiseNote = s.data.promiseDiscounts.length
    ? `<div class="quote-line note"><span>후기 반영 시 잔금</span><span>${p(quote.balanceAfterReviews)}</span></div>`
    : '';

  const confirmChecked = s.data.quoteConfirmed ? 'checked' : '';

  return `
    <div class="card">
      <h2>6. 견적 확인</h2>
      <div class="quote-summary">
        <div class="quote-line"><span>${product.name}</span><span>${p(quote.subtotal)}</span></div>
        ${travelLine}
        ${optionLines}
        ${dolLine}
        ${immediateLines}
        <div class="quote-line total"><span>총액</span><span>${p(quote.total)}</span></div>
        <div class="quote-line"><span>계약금 (고정)</span><span>${p(quote.deposit)}</span></div>
        <div class="quote-line"><span><strong>잔금</strong></span><span><strong>${p(quote.balance)}</strong></span></div>
        ${promiseLines}
        ${promiseNote}
      </div>
      ${!quote.isQuoteFinal ? '<div class="info-box">출장비는 별도 문의 후 반영되므로, 위 총액에는 출장비가 포함되어 있지 않습니다.</div>' : ''}
      <div class="field ${s.errors.quoteConfirmed ? 'has-error' : ''}">
        <label class="checkbox-option ${s.data.quoteConfirmed ? 'selected' : ''}">
          <input type="checkbox" data-bind="quoteConfirmed" ${confirmChecked}>
          <span>위 금액으로 계약을 진행합니다.</span>
        </label>
        ${s.errors.quoteConfirmed ? `<div class="error">${s.errors.quoteConfirmed}</div>` : ''}
      </div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">서명하기</button>
      </div>
    </div>
  `;
});
```

- [ ] **Step 2: form.js 상단 import에 calculateQuote 통합**

`js/form.js` 상단의 import 문에 `calculateQuote`를 추가하고, 방금 추가한 별도 import 라인을 제거:

Add to top import:
```javascript
import { calculateQuote } from './pricing.js';
```

- [ ] **Step 3: 브라우저에서 Step 6 확인**

Step 1~5 진행 후 Step 6 도달. 견적 정확히 계산되는지, 옵션·할인 라인 표기되는지, 확인 체크박스 동작하는지 확인.

- [ ] **Step 4: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add js/form.js && git commit -m "feat(form): render step 6 quote review with real-time calculation"
```

---

## Task 10: form.js - Step 7 서명

**Files:**
- Modify: `js/form.js`

- [ ] **Step 1: Step 7 렌더러 + signature_pad 초기화**

Append to `js/form.js`:
```javascript
// ============================
// Step 7: 서명
// ============================
registerRenderer(7, s => {
  const agreedChecked = s.data.agreed ? 'checked' : '';
  return `
    <div class="card">
      <h2>7. 계약 동의 및 서명</h2>
      <div class="info-box">
        <strong>${PRODUCTS[s.data.product].name}</strong> 상품을 선택하셨습니다.<br>
        계약금 100,000원, 잔금 ${(_lastQuoteTotalMinusDeposit(s)).toLocaleString('ko-KR')}원.<br>
        예식일: ${s.data.eventDate} ${s.data.eventTime} / 장소: ${escapeAttr(s.data.venue)}
      </div>
      <div class="field ${s.errors.agreed ? 'has-error' : ''}">
        <label class="checkbox-option ${s.data.agreed ? 'selected' : ''}">
          <input type="checkbox" data-bind="agreed" ${agreedChecked}>
          <span>위 계약 내용을 충분히 이해했으며, 상품 구성·결제·환불·데이터 보관 규정 모두에 동의합니다.</span>
        </label>
        ${s.errors.agreed ? `<div class="error">${s.errors.agreed}</div>` : ''}
      </div>
      <h3>서명 *</h3>
      <div class="signature-wrap ${s.errors.signature ? 'has-error' : ''}" style="${s.errors.signature ? 'border-color:#c00' : ''}">
        <canvas id="signature-canvas" class="signature-pad"></canvas>
      </div>
      <div class="signature-actions">
        <button type="button" class="btn-clear" id="clear-signature">다시 서명</button>
      </div>
      ${s.errors.signature ? `<div class="error">${s.errors.signature}</div>` : ''}
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">계약 완료</button>
      </div>
    </div>
  `;
}, (s) => {
  // afterRender: signature_pad 초기화
  const canvas = document.getElementById('signature-canvas');
  if (!canvas) return;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  canvas.getContext('2d').scale(ratio, ratio);
  const pad = new SignaturePad(canvas, { backgroundColor: '#fff' });
  if (s.data.signature) pad.fromDataURL(s.data.signature);
  pad.addEventListener('endStroke', () => {
    s.data.signature = pad.toDataURL('image/png');
  });
  document.getElementById('clear-signature').addEventListener('click', () => {
    pad.clear();
    s.data.signature = '';
  });
});

function _lastQuoteTotalMinusDeposit(s) {
  const q = calculateQuote({
    product: s.data.product,
    region: s.data.region,
    options: s.data.options,
    immediateDiscounts: s.data.immediateDiscounts,
    promiseDiscounts: s.data.promiseDiscounts,
    dolHasMainSnap: s.data.dolHasMainSnap,
  });
  return q.balance;
}
```

- [ ] **Step 2: 브라우저에서 서명 캔버스 동작 확인**

Step 7 도달 → 캔버스에 마우스로 서명 → 다시 서명 버튼 클릭 → 지워지는지 확인.

- [ ] **Step 3: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add js/form.js && git commit -m "feat(form): render step 7 signature with signature_pad"
```

---

## Task 11: pdf.js - PDF 생성

**Files:**
- Create: `js/pdf.js`

- [ ] **Step 1: pdf.js 작성**

Create `js/pdf.js`:
```javascript
import { renderContractHTML } from './templates.js';
import { calculateQuote } from './pricing.js';

/**
 * 계약서 PDF를 생성하고 Blob(및 다운로드용 dataURL, base64)를 반환.
 * html2canvas로 hidden div를 캡처 → jsPDF에 이미지 삽입.
 */
export async function generateContractPDF(formData) {
  const quote = calculateQuote({
    product: formData.product,
    region: formData.region,
    options: formData.options,
    immediateDiscounts: formData.immediateDiscounts,
    promiseDiscounts: formData.promiseDiscounts,
    dolHasMainSnap: formData.dolHasMainSnap,
  });
  const today = new Date();
  const todayStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, '0')}. ${String(today.getDate()).padStart(2, '0')}.`;

  const html = renderContractHTML({ formData, quote, todayStr });

  // hidden div에 삽입
  const renderArea = document.getElementById('pdf-render-area');
  renderArea.innerHTML = html;
  const target = renderArea.firstElementChild;

  // html2canvas로 캡처
  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // A4 한 페이지에 들어가는지 확인, 넘치면 여러 페이지 분할
  let heightLeft = imgHeight;
  let position = 10;
  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - 20);
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20);
  }

  const blob = pdf.output('blob');
  const base64 = pdf.output('datauristring').split(',')[1];
  const filename = `큐피돈_계약서_${PRODUCT_LABEL(formData.product)}_${sanitizeFilename(formData.customerName)}_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.pdf`;

  // 화면 정리
  renderArea.innerHTML = '';

  return { blob, base64, filename, quote };
}

function PRODUCT_LABEL(code) {
  return { special: '스페셜', premium: '프리미엄', studio: '스튜디오', dol: '돌스냅' }[code] || code;
}

function sanitizeFilename(name) {
  return (name || 'customer').replace(/[\\/:*?"<>|]/g, '');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: 브라우저 콘솔에서 수동 테스트**

`index.html` 열고 Step 1~7 진행 후 서명까지 완료. 브라우저 콘솔에서:
```javascript
import('./js/pdf.js').then(m => m.generateContractPDF({
  customerName: '홍길동',
  customerPhone: '010-1234-5678',
  eventDate: '2027-01-16',
  eventTime: '14:00',
  venue: '서울 그랜드하얏트',
  region: 'seoul',
  product: 'premium',
  options: ['pyebaek'],
  dolHasMainSnap: null,
  immediateDiscounts: ['sameDay', 'portrait'],
  promiseDiscounts: [],
  partnerCode: '',
  signature: '',
}).then(r => m.downloadBlob(r.blob, r.filename)));
```
Expected: PDF가 자동 다운로드됨. 열어보면 계약서 형식으로 잘 렌더됨.

- [ ] **Step 3: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add js/pdf.js && git commit -m "feat(pdf): generate contract PDF via html2canvas + jsPDF"
```

---

## Task 12: email.js - EmailJS 발송

**Files:**
- Create: `js/email.js`

- [ ] **Step 1: email.js 작성**

Create `js/email.js`:
```javascript
import { EMAILJS_CONFIG, IMMEDIATE_DISCOUNTS, PROMISE_DISCOUNTS, PRODUCTS } from './config.js';

let initialized = false;

function initIfNeeded() {
  if (initialized) return;
  if (typeof emailjs === 'undefined') {
    throw new Error('EmailJS SDK가 로드되지 않았습니다.');
  }
  emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
  initialized = true;
}

/**
 * 사장님 이메일로 계약서 정보 + PDF 첨부 전송.
 * PDF는 base64로 첨부하며, EmailJS 템플릿에서 `{{pdf_attachment}}` 변수로 사용.
 */
export async function sendContractEmail({ formData, quote, pdfBase64, pdfFilename }) {
  if (EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY') {
    throw new Error('EmailJS 설정이 안 되어 있습니다. js/config.js에서 EMAILJS_CONFIG를 실제 값으로 교체해주세요.');
  }
  initIfNeeded();

  const immediateNames = formData.immediateDiscounts
    .map(c => IMMEDIATE_DISCOUNTS[c].name + (c === 'partner' ? `(코드: ${formData.partnerCode})` : ''))
    .join(', ') || '없음';
  const promiseNames = formData.promiseDiscounts.map(c => PROMISE_DISCOUNTS[c].name).join(', ') || '없음';
  const p = n => (n === null || n === undefined) ? '별도문의' : n.toLocaleString('ko-KR');

  const payload = {
    to_email: EMAILJS_CONFIG.toEmail,
    customer_name: formData.customerName,
    customer_phone: formData.customerPhone,
    product: PRODUCTS[formData.product].name,
    event_date: formData.eventDate + ' ' + formData.eventTime,
    venue: formData.venue,
    region: formData.region,
    options: formData.options.join(', ') || '없음',
    partner_code: formData.partnerCode || '',
    immediate_discounts: immediateNames,
    promise_discounts: promiseNames,
    total_price: p(quote.total),
    deposit: p(quote.deposit),
    balance: p(quote.balance),
    balance_after_reviews: p(quote.balanceAfterReviews),
    is_quote_final: quote.isQuoteFinal ? '확정' : '출장비 별도문의',
    pdf_filename: pdfFilename,
    pdf_attachment: pdfBase64,
  };

  return emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, payload);
}
```

- [ ] **Step 2: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add js/email.js && git commit -m "feat(email): send contract data + PDF via EmailJS"
```

---

## Task 13: form.js - Step 8 완료 화면 & 최종 연결

**Files:**
- Modify: `js/form.js`
- Modify: `js/app.js`

- [ ] **Step 1: Step 8 렌더러 + submitContract 로직**

Append to `js/form.js`:
```javascript
import { generateContractPDF, downloadBlob } from './pdf.js';
import { sendContractEmail } from './email.js';
import { OWNER_INFO } from './config.js';

// ============================
// Step 8: 완료
// ============================
const submissionState = { status: 'idle', error: null, pdfBlob: null, pdfFilename: null };

registerRenderer(8, s => {
  if (submissionState.status === 'idle') {
    // 첫 진입 시 자동 제출
    setTimeout(() => submitContract(), 100);
    return `<div class="card"><h2>계약서 생성 중...</h2><p>잠시만 기다려주세요.</p></div>`;
  }
  if (submissionState.status === 'submitting') {
    return `<div class="card"><h2>이메일 전송 중...</h2><p>PDF 생성 및 사장님께 발송하고 있습니다.</p></div>`;
  }
  if (submissionState.status === 'success') {
    return `
      <div class="card success-box">
        <div class="check">✓</div>
        <h2>계약이 완료되었습니다!</h2>
        <p>계약서 PDF가 자동으로 다운로드되었으며, 사장님께도 전달되었습니다.</p>
        <div class="info-box" style="text-align:left">
          <strong>다음 단계:</strong><br>
          아래 계좌로 <strong>계약금 100,000원</strong>을 입금해주시면 예약이 최종 확정됩니다.
        </div>
        <div style="text-align:left;padding:16px;background:#f4efe5;border-radius:8px;margin-top:12px">
          <div><strong>계좌:</strong> ${OWNER_INFO.bankName} ${OWNER_INFO.bankAccount}</div>
          <div><strong>예금주:</strong> ${OWNER_INFO.accountHolder}</div>
          <div style="margin-top:8px"><strong>카카오톡:</strong> ${OWNER_INFO.kakaoContact}</div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" id="redownload-btn">PDF 다시 다운로드</button>
        </div>
      </div>
    `;
  }
  if (submissionState.status === 'partial') {
    // 이메일 실패, PDF는 다운로드됨
    return `
      <div class="card success-box">
        <div class="check" style="color:#f5a623">⚠</div>
        <h2>계약서는 생성되었습니다</h2>
        <p>PDF는 다운로드 완료되었으나, 이메일 자동 발송에 실패했습니다.</p>
        <div class="info-box">
          다운로드된 PDF 파일을 카카오톡으로 사장님(<strong>${OWNER_INFO.kakaoContact}</strong>)께 직접 전달해주세요.
        </div>
        <p style="color:#999;font-size:12px">에러: ${submissionState.error || ''}</p>
        <div class="actions">
          <button class="btn btn-secondary" id="redownload-btn">PDF 다시 다운로드</button>
        </div>
      </div>
    `;
  }
  // error 상태
  return `
    <div class="card">
      <h2>오류가 발생했습니다</h2>
      <p>${submissionState.error || '알 수 없는 오류'}</p>
      <div class="actions">
        <button class="btn btn-primary" id="retry-btn">다시 시도</button>
      </div>
    </div>
  `;
}, () => {
  const redl = document.getElementById('redownload-btn');
  if (redl) redl.addEventListener('click', () => {
    if (submissionState.pdfBlob) downloadBlob(submissionState.pdfBlob, submissionState.pdfFilename);
  });
  const retry = document.getElementById('retry-btn');
  if (retry) retry.addEventListener('click', () => {
    submissionState.status = 'idle';
    render();
  });
});

async function submitContract() {
  submissionState.status = 'submitting';
  render();
  try {
    const result = await generateContractPDF(state.data);
    submissionState.pdfBlob = result.blob;
    submissionState.pdfFilename = result.filename;
    downloadBlob(result.blob, result.filename);

    try {
      await sendContractEmail({
        formData: state.data,
        quote: result.quote,
        pdfBase64: result.base64,
        pdfFilename: result.filename,
      });
      submissionState.status = 'success';
    } catch (emailErr) {
      console.error('EmailJS 실패:', emailErr);
      submissionState.error = emailErr.message;
      submissionState.status = 'partial';
    }
  } catch (err) {
    console.error('PDF 생성 실패:', err);
    submissionState.error = err.message;
    submissionState.status = 'error';
  }
  render();
}
```

- [ ] **Step 2: form.js의 import를 최종 정리**

`js/form.js` 상단 import 블록이 다음과 같이 통합되어 있어야 함 (중복 제거):
```javascript
import {
  PRODUCTS,
  TRAVEL_FEE,
  IMMEDIATE_DISCOUNTS,
  PROMISE_DISCOUNTS,
  OPTIONS_WEDDING,
  OPTIONS_STUDIO_DOL,
  OWNER_INFO,
} from './config.js';
import { validateStep } from './validators.js';
import { calculateQuote } from './pricing.js';
import { generateContractPDF, downloadBlob } from './pdf.js';
import { sendContractEmail } from './email.js';
```
중복된 import 라인들은 모두 제거.

- [ ] **Step 3: app.js 최종 형태 확인**

`js/app.js`는 이미 다음 상태:
```javascript
import { render } from './form.js';
render();
```
변경 없음.

- [ ] **Step 4: 전체 흐름 브라우저에서 검증**

`index.html` 새로고침 → Step 1부터 8까지 모두 진행.
Expected:
- Step 8 도달 시 자동으로 PDF 생성·다운로드 트리거
- EmailJS 설정 안 되어 있으면 "partial" 상태로 표시되고 PDF는 다운로드됨 (정상)

- [ ] **Step 5: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add js/form.js && git commit -m "feat(form): step 8 submission with auto PDF download and EmailJS"
```

---

## Task 14: README (배포·EmailJS 세팅 가이드)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README 완성**

Replace `README.md`:
```markdown
# 큐피돈 아이폰 스냅 계약서 자동화

큐피돈 스냅 예약 문의 → 견적 → 계약서 서명까지 원스톱 처리하는 정적 웹앱.

## 특징

- 링크 하나로 고객이 스스로 상담 폼 작성 → 견적 자동 계산 → 서명 → 계약 완료
- 계약서 PDF 자동 다운로드 + 사장님 이메일 자동 발송
- 상품 4종 (스페셜/프리미엄/스튜디오/돌스냅), 할인 5종, 옵션·출장비 자동 반영
- 서버 불필요, 무료 배포 (GitHub Pages)

## 로컬 실행

브라우저에서 `index.html`을 직접 열면 됩니다.
(테스트: `tests/test-runner.html` 열기)

## 배포 (GitHub Pages)

1. GitHub에 새 리포지토리 생성 (예: `cupidon-contract`, Public)
2. 이 폴더에서:
   ```bash
   git remote add origin https://github.com/<사용자명>/cupidon-contract.git
   git push -u origin main
   ```
3. GitHub 웹에서 **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` / root
   - Save
4. 몇 분 후 `https://<사용자명>.github.io/cupidon-contract/`가 활성화됨
5. 이 URL을 카카오톡 문의에 붙여 전달

## EmailJS 세팅 (사장님 이메일 자동 발송)

1. https://www.emailjs.com/ 가입 (무료 200건/월)
2. **Email Services** → Add New Service → Gmail 연결 (OAuth)
   - 생성된 Service ID 복사
3. **Email Templates** → Create New Template:
   - Subject: `[큐피돈 계약] {{customer_name}} - {{product}}`
   - Content (아래 참고):
     ```
     신규 계약이 접수되었습니다.

     고객: {{customer_name}} ({{customer_phone}})
     상품: {{product}}
     행사: {{event_date}} / {{venue}} ({{region}})

     옵션: {{options}}
     즉시할인: {{immediate_discounts}}
     후기약속: {{promise_discounts}}
     짝꿍코드: {{partner_code}}

     총액: {{total_price}}원 (견적: {{is_quote_final}})
     계약금: {{deposit}}원
     잔금: {{balance}}원
     후기 반영 시 잔금: {{balance_after_reviews}}원

     ---
     첨부된 서명 PDF 확인 부탁드립니다.
     ```
   - **Attachments** 섹션에서:
     - Filename: `{{pdf_filename}}`
     - Content: `{{pdf_attachment}}` (Base64 선택)
   - To Email: `{{to_email}}` (또는 사장님 이메일 직접 입력)
   - 저장 → Template ID 복사
4. **Integration** → Public Key 복사
5. `js/config.js` 하단 `EMAILJS_CONFIG` 값 교체:
   ```javascript
   export const EMAILJS_CONFIG = {
     publicKey: '<복사한 Public Key>',
     serviceId: '<복사한 Service ID>',
     templateId: '<복사한 Template ID>',
     toEmail: 'chaejin.park@myrealtrip.com',
   };
   ```
6. 커밋 & 푸시 → GitHub Pages 자동 재배포

## 가격/옵션 변경 방법

- `js/config.js`만 수정 → 커밋 → 푸시 → 즉시 반영
- 계약서 문구 변경: `js/templates.js` 수정
- 계좌·카톡 정보 변경: `js/config.js`의 `OWNER_INFO` 수정

## 파일 구조

```
├── index.html          # 진입점 (SPA)
├── css/style.css
├── js/
│   ├── config.js       # 상품·할인·옵션 상수
│   ├── pricing.js      # 금액 계산 (순수 함수)
│   ├── validators.js   # 스텝별 유효성 검사
│   ├── templates.js    # 계약서 HTML 템플릿
│   ├── form.js         # 폼 UI 및 상태 관리
│   ├── pdf.js          # PDF 생성
│   ├── email.js        # 이메일 발송
│   └── app.js          # 진입점
└── tests/
    ├── test-runner.html
    ├── test-pricing.js
    └── test-validators.js
```

## 라이선스

Private / 큐피돈 스냅 전용.
```

- [ ] **Step 2: 커밋**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git add README.md && git commit -m "docs: complete README with deployment and EmailJS guide"
```

---

## Task 15: 최종 통합 테스트 & QA

**Files:** 없음 (수동 QA)

- [ ] **Step 1: 테스트 러너 재실행**

브라우저에서 `tests/test-runner.html` 열기.
Expected: 전체 테스트 PASS (17개 이상).

- [ ] **Step 2: 시나리오 1 — 프리미엄 풀옵션**

`index.html`에서:
1. 성함: 김테스트 / 연락처: 010-1111-2222
2. 예식: 오늘+30일 / 시간: 14:00 / 장소: 테스트홀 / 지역: 평택
3. 상품: 2인 프리미엄
4. 옵션: 폐백, 최종본+5장
5. 할인: 당일, 초상권, 짝꿍(코드: TEST123)
6. 후기 약속: 블로그, 큐피돈
7. 견적 확인 → 서명 → 완료

Expected:
- Step 6 견적: 총액 700,000 (550k + 70k평택 + 50k폐백 + 50k최종+ -30k -20k -20k = 650k) — **정확한 값 재확인 필요**
- 실제 계산: 550,000 + 70,000 + 50,000 + 50,000 - 30,000 - 20,000 - 20,000 = **650,000**
- 잔금: 550,000
- PDF 다운로드 정상

- [ ] **Step 3: 시나리오 2 — 돌스냅 단독**

1. 성함: 이돌잔 / 연락처: 010-3333-4444
2. 행사: 오늘+15일 / 11:00 / 돌잔치홀 / 서울
3. 상품: 돌스냅
4. 옵션: (없음) / 메인스냅 없음
5. 할인: 당일 계약만
6. 견적: 300,000 + 50,000(단독) - 30,000 = 320,000. 잔금 220,000.

Expected: 정확히 계산 & PDF 렌더 확인.

- [ ] **Step 4: 시나리오 3 — 스튜디오, 출장지역 "그 외"**

Expected:
- Step 2에서 "출장비 별도 문의" 배너 노출
- Step 6 견적: `총액 200,000, 출장비 별도문의` 표기
- PDF에도 "출장비 별도 문의 (미포함)" 문구 삽입

- [ ] **Step 5: 크로스브라우저 체크**

- 데스크톱 크롬: OK
- 모바일 크롬(안드로이드) or Safari(iOS): 폼 진행 + 캔버스 서명 터치 OK

- [ ] **Step 6: 최종 커밋 & 태그**

Run:
```bash
cd "C:/Users/User/Desktop/박채진/cupidon-contract" && git tag v1.0.0 && git log --oneline
```

---

## 완료 기준

- [ ] 상품 4종 각각 견적 계산이 정확 (테스트 케이스 7개 이상 PASS)
- [ ] 8단계 폼이 순서대로 동작하며 뒤로가기·앞으로가기 정상
- [ ] 짝꿍할인 체크 시 코드 필수 입력이 강제됨
- [ ] 돌스냅 아이폰 단독 촬영 시 +50,000 자동 가산
- [ ] 출장지역 "그 외" 시 견적 미확정 배지 & 계약서 문구 삽입
- [ ] 후기 약속 할인은 총액 미반영, 잔금 정산 표기만
- [ ] 서명 캔버스가 마우스·터치 모두 동작
- [ ] PDF 다운로드 성공, 한글 정상 표시
- [ ] EmailJS 설정 시 이메일 자동 발송 성공
- [ ] EmailJS 실패 시에도 PDF 다운로드는 성공하며 안내 메시지 노출
- [ ] GitHub Pages 배포 후 카카오톡에서 링크 접속 시 정상 동작

---

## 향후 개선 (v2)

- Firebase Firestore로 계약 이력 저장 + 관리자 대시보드
- 솔라피 카카오 알림톡 연동
- 토스페이먼츠 결제 링크로 계약금 자동 수납
- 후기 URL 제출 폼 & 자동 잔금 재계산

