import {
  PRODUCTS,
  IMMEDIATE_DISCOUNTS,
  PROMISE_DISCOUNTS,
  IMMEDIATE_DISCOUNTS_CHUKUIDAE,
  PROMISE_DISCOUNTS_CHUKUIDAE,
  OPTIONS_WEDDING,
  OPTIONS_STUDIO_DOL,
  OPTIONS_CHUKUIDAE,
  TRAVEL_FEE,
  TRAVEL_FEE_CHUKUIDAE,
  DOL_ALONE_SURCHARGE,
  FIXED_DEPOSIT,
} from './config.js';

// 카테고리별 참조 테이블 도우미 (form.js에서도 재사용)
export function getOptionsTable(product) {
  if (!product) return {};
  if (product.category === 'chukuidae') return OPTIONS_CHUKUIDAE;
  return product.hasWeddingOptions ? OPTIONS_WEDDING : OPTIONS_STUDIO_DOL;
}

export function getImmediateDiscounts(product) {
  return product?.category === 'chukuidae' ? IMMEDIATE_DISCOUNTS_CHUKUIDAE : IMMEDIATE_DISCOUNTS;
}

export function getPromiseDiscounts(product) {
  return product?.category === 'chukuidae' ? PROMISE_DISCOUNTS_CHUKUIDAE : PROMISE_DISCOUNTS;
}

export function getTravelFeeTable(product) {
  return product?.category === 'chukuidae' ? TRAVEL_FEE_CHUKUIDAE : TRAVEL_FEE;
}

/**
 * 견적 계산 순수 함수.
 * @param {Object} input
 * @param {string} input.product - PRODUCTS 키
 * @param {string} input.region - TRAVEL_FEE 키
 * @param {string[]} input.options - 옵션 코드 배열
 * @param {string[]} input.immediateDiscounts - 즉시 할인 코드 배열
 * @param {string[]} input.promiseDiscounts - 후기 약속 할인 코드 배열
 * @param {boolean|null} input.dolHasMainSnap - 돌스냅일 때만 사용
 * @returns {Object} 견적 결과
 */
export function calculateQuote(input) {
  const product = PRODUCTS[input.product];
  if (!product) throw new Error(`Unknown product: ${input.product}`);

  const subtotal = product.basePrice;

  const travelTable = getTravelFeeTable(product);
  const travel = travelTable[input.region];
  // 카테고리에 해당 지역이 없거나 amount가 null이면 '별도 문의'로 처리
  const travelFee = travel ? travel.amount : null;
  const isQuoteFinal = travelFee !== null;

  const optionsTable = getOptionsTable(product);
  const optionsTotal = input.options.reduce((sum, code) => sum + (optionsTable[code]?.amount || 0), 0);

  const dolSurcharge =
    input.product === 'dol' && input.dolHasMainSnap === false ? DOL_ALONE_SURCHARGE : 0;

  const immediateTable = getImmediateDiscounts(product);
  const immediateDiscountTotal = input.immediateDiscounts.reduce(
    (sum, code) => sum + (immediateTable[code]?.amount || 0),
    0
  );

  const promiseTable = getPromiseDiscounts(product);
  const promiseTotal = input.promiseDiscounts.reduce(
    (sum, code) => sum + (promiseTable[code]?.amount || 0),
    0
  );

  const total =
    subtotal + (travelFee || 0) + optionsTotal + dolSurcharge + immediateDiscountTotal;

  // 계약금: 스냅·축의대 공통 고정 10만원
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
