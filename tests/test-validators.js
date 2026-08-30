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
