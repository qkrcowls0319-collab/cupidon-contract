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
