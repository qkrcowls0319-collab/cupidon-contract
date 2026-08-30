import { calculateQuote } from '../js/pricing.js';

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
  assertEqual(result.balanceAfterReviews, 430000, 'balanceAfterReviews');
});

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
  assertEqual(result.total, 550000, 'total (excluding travel fee)');
});

test('프리미엄 + 평택 + 모든 옵션 + 모든 할인', () => {
  const result = calculateQuote({
    product: 'premium',
    region: 'pyeongtaek',
    options: ['finalPlus5', 'colorPlus10', 'part2', 'pyebaek'],
    immediateDiscounts: ['sameDay', 'portrait', 'partner'],
    promiseDiscounts: ['blogPromise', 'cupidonPromise'],
    dolHasMainSnap: null,
  });
  // 550000 + 70000 + 50000+50000+70000+50000 - 30000-20000-20000 = 770000
  assertEqual(result.subtotal, 550000, 'subtotal');
  assertEqual(result.travelFee, 70000, 'travelFee');
  assertEqual(result.optionsTotal, 220000, 'optionsTotal');
  assertEqual(result.immediateDiscountTotal, -70000, 'immediateDiscountTotal');
  assertEqual(result.total, 770000, 'total');
  assertEqual(result.balance, 670000, 'balance');
  assertEqual(result.balanceAfterReviews, 650000, 'balanceAfterReviews');
});
