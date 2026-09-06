import { calculateQuote, isBundle, resolveOptionAmount } from '../js/pricing.js';
import { PRODUCTS } from '../js/config.js';

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

// ============================
// 사장님 안내 출장비 (customTravelFee)
// ============================
test('출장 그 외 지역 + customTravelFee 120000 → 총액에 포함, isQuoteFinal true', () => {
  const result = calculateQuote({
    product: 'premium',
    region: 'other',
    options: [],
    immediateDiscounts: [],
    promiseDiscounts: [],
    dolHasMainSnap: null,
    customTravelFee: 120000,
  });
  assertEqual(result.travelFee, 120000, 'travelFee');
  assertEqual(result.isQuoteFinal, true, 'isQuoteFinal');
  assertEqual(result.total, 670000, 'total (550k + 120k)');
});

test('출장 그 외 지역 + customTravelFee 미입력 → 별도 문의', () => {
  const result = calculateQuote({
    product: 'premium',
    region: 'other',
    options: [],
    immediateDiscounts: [],
    promiseDiscounts: [],
    dolHasMainSnap: null,
    customTravelFee: '',
  });
  assertEqual(result.travelFee, null, 'travelFee');
  assertEqual(result.isQuoteFinal, false, 'isQuoteFinal');
  assertEqual(result.total, 550000, 'total');
});

test('축의대 + 평택(테이블 없음) + customTravelFee 90000 → customTravelFee 반영', () => {
  const result = calculateQuote({
    product: 'chukuidaeStd',
    region: 'pyeongtaek',
    options: [],
    immediateDiscounts: [],
    promiseDiscounts: [],
    dolHasMainSnap: null,
    customTravelFee: 90000,
  });
  assertEqual(result.travelFee, 90000, 'travelFee (fallback)');
  assertEqual(result.total, 540000, 'total (450k + 90k)');
});

// ============================
// 번들 대칭성: 어느 쪽에서 시작해도 총액 동일
// ============================
test('번들 대칭: 스냅 프리미엄 + 축의대 스탠다드 번들 = 축의대 스탠다드 + 스냅 프리미엄 번들', () => {
  const fromSnap = calculateQuote({
    product: 'premium', region: 'seoul',
    options: ['chukuidae2'],
    immediateDiscounts: [], promiseDiscounts: [], dolHasMainSnap: null,
  });
  const fromChukuidae = calculateQuote({
    product: 'chukuidaeStd', region: 'seoul',
    options: ['snapPremiumBundle'],
    immediateDiscounts: [], promiseDiscounts: [], dolHasMainSnap: null,
  });
  // 550 + 427.5 = 977.5 vs 450 + 527.5 = 977.5 (번들 할인 5% = -22.5k)
  assertEqual(fromSnap.total, 977500, '스냅 → 축의대 총액');
  assertEqual(fromChukuidae.total, 977500, '축의대 → 스냅 총액');
  assertEqual(fromSnap.total, fromChukuidae.total, '대칭성');
  assertEqual(fromSnap.isBundle, true, 'fromSnap isBundle');
  assertEqual(fromChukuidae.isBundle, true, 'fromChukuidae isBundle');
});

test('번들 대칭: 스냅 프리미엄 + 축의대 프리미엄 번들 (양방향)', () => {
  const fromSnap = calculateQuote({
    product: 'premium', region: 'seoul',
    options: ['chukuidae4'],
    immediateDiscounts: [], promiseDiscounts: [], dolHasMainSnap: null,
  });
  const fromChukuidae = calculateQuote({
    product: 'chukuidaePremium', region: 'seoul',
    options: ['snapPremiumBundle'],
    immediateDiscounts: [], promiseDiscounts: [], dolHasMainSnap: null,
  });
  // 550 + 760 = 1310 vs 800 + 510 = 1310 (번들 할인 5% = -40k)
  assertEqual(fromSnap.total, 1310000, '스냅 → 축의대 총액');
  assertEqual(fromChukuidae.total, 1310000, '축의대 → 스냅 총액');
});

test('번들 대칭: 스냅 스페셜 + 축의대 스탠다드 번들 (양방향)', () => {
  const fromSnap = calculateQuote({
    product: 'special', region: 'seoul',
    options: ['chukuidae2'],
    immediateDiscounts: [], promiseDiscounts: [], dolHasMainSnap: null,
  });
  const fromChukuidae = calculateQuote({
    product: 'chukuidaeStd', region: 'seoul',
    options: ['snapSpecialBundle'],
    immediateDiscounts: [], promiseDiscounts: [], dolHasMainSnap: null,
  });
  // 350 + 427.5 = 777.5 vs 450 + 327.5 = 777.5
  assertEqual(fromSnap.total, 777500, '스냅 → 축의대 총액');
  assertEqual(fromChukuidae.total, 777500, '축의대 → 스냅 총액');
});

test('번들 대칭: 스냅 스페셜 + 축의대 프리미엄 번들 (양방향)', () => {
  const fromSnap = calculateQuote({
    product: 'special', region: 'seoul',
    options: ['chukuidae4'],
    immediateDiscounts: [], promiseDiscounts: [], dolHasMainSnap: null,
  });
  const fromChukuidae = calculateQuote({
    product: 'chukuidaePremium', region: 'seoul',
    options: ['snapSpecialBundle'],
    immediateDiscounts: [], promiseDiscounts: [], dolHasMainSnap: null,
  });
  // 350 + 760 = 1110 vs 800 + 310 = 1110
  assertEqual(fromSnap.total, 1110000, '스냅 → 축의대 총액');
  assertEqual(fromChukuidae.total, 1110000, '축의대 → 스냅 총액');
});

test('번들 시 스냅 할인 테이블 사용 (축의대 상품에서 시작해도 sameDay -30k 적용)', () => {
  const result = calculateQuote({
    product: 'chukuidaeStd', region: 'seoul',
    options: ['snapPremiumBundle'],
    immediateDiscounts: ['sameDay', 'portrait'],
    promiseDiscounts: ['blogPromise', 'cupidonPromise'],
    dolHasMainSnap: null,
  });
  // base 450 + snapPremiumBundle 527.5 = 977.5, - sameDay(30) - portrait(20) = 927.5
  assertEqual(result.immediateDiscountTotal, -50000, 'sameDay + portrait = -50k (스냅 할인 테이블)');
  assertEqual(result.total, 927500, 'total');
  assertEqual(result.promiseTotal, -20000, 'promise total (블로그 + 큐피돈)');
});

test('번들에 축의대 옵션(readyBag, thankyouSMS)도 추가 가능', () => {
  const fromSnap = calculateQuote({
    product: 'premium', region: 'seoul',
    options: ['chukuidae4', 'readyBag', 'thankyouSMS'],
    immediateDiscounts: [], promiseDiscounts: [], dolHasMainSnap: null,
  });
  // 550 + 760 + 10 + 30 = 1350
  assertEqual(fromSnap.total, 1350000, '스냅 번들 + 축의대 세부 옵션');
});

test('번들에 스냅 옵션(폐백, 색보정)도 추가 가능', () => {
  const fromChukuidae = calculateQuote({
    product: 'chukuidaePremium', region: 'seoul',
    options: ['snapPremiumBundle', 'pyebaek', 'colorPlus10'],
    immediateDiscounts: [], promiseDiscounts: [], dolHasMainSnap: null,
  });
  // 800 + 510 + 50 + 50 = 1410
  assertEqual(fromChukuidae.total, 1410000, '축의대 번들 + 스냅 세부 옵션');
});

test('isBundle 판정', () => {
  assertEqual(isBundle(PRODUCTS.premium, ['chukuidae2']), true, '스냅+축의대옵션');
  assertEqual(isBundle(PRODUCTS.chukuidaeStd, ['snapSpecialBundle']), true, '축의대+스냅옵션');
  assertEqual(isBundle(PRODUCTS.premium, ['pyebaek']), false, '스냅 단독');
  assertEqual(isBundle(PRODUCTS.chukuidaeStd, ['readyBag']), false, '축의대 단독');
});

test('resolveOptionAmount: snapSpecialBundle이 축의대 상품에 따라 동적 (5%)', () => {
  // snapSpecial 350k - {basic:17500, std:22500, premium:40000}
  assertEqual(resolveOptionAmount(PRODUCTS.chukuidaeBasic, 'snapSpecialBundle'), 332500, '베이직 기준');
  assertEqual(resolveOptionAmount(PRODUCTS.chukuidaeStd, 'snapSpecialBundle'), 327500, '스탠다드 기준');
  assertEqual(resolveOptionAmount(PRODUCTS.chukuidaePremium, 'snapSpecialBundle'), 310000, '프리미엄 기준');
  // snapPremium 550k - {basic:17500, std:22500, premium:40000}
  assertEqual(resolveOptionAmount(PRODUCTS.chukuidaeBasic, 'snapPremiumBundle'), 532500, '베이직 기준');
  assertEqual(resolveOptionAmount(PRODUCTS.chukuidaeStd, 'snapPremiumBundle'), 527500, '스탠다드 기준');
  assertEqual(resolveOptionAmount(PRODUCTS.chukuidaePremium, 'snapPremiumBundle'), 510000, '프리미엄 기준');
});
