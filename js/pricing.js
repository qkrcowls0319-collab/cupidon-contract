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
  BUNDLE_DISCOUNTS,
} from './config.js';

// 번들 옵션 코드 — 상대 카테고리 상품을 옵션으로 얹는 코드들
const SNAP_TO_CHUKUIDAE_BUNDLE_CODES = ['chukuidae2', 'chukuidae4'];
const CHUKUIDAE_TO_SNAP_BUNDLE_CODES = ['snapSpecialBundle', 'snapPremiumBundle'];

// 상호배타 그룹 (한 번들 티어만 선택 가능)
export const MUTUAL_EXCLUSIVE_OPTIONS = [
  ['chukuidae2', 'chukuidae4'],
  ['snapSpecialBundle', 'snapPremiumBundle'],
];

/**
 * 번들 조합인지 판정.
 * - 스냅 상품 + 축의대 번들 옵션(chukuidae2/4)
 * - 축의대 상품 + 스냅 번들 옵션(snapSpecial/Premium)
 */
export function isBundle(product, options = []) {
  if (!product) return false;
  if (product.category === 'snap') {
    return options.some(c => SNAP_TO_CHUKUIDAE_BUNDLE_CODES.includes(c));
  }
  if (product.category === 'chukuidae') {
    return options.some(c => CHUKUIDAE_TO_SNAP_BUNDLE_CODES.includes(c));
  }
  return false;
}

/**
 * 옵션 테이블 반환. 번들이면 양쪽 옵션 병합.
 * 재귀 방지: 병합 시 상대편의 번들 옵션은 제외.
 */
export function getOptionsTable(product, options = []) {
  if (!product) return {};
  const snapBase = product.hasWeddingOptions ? OPTIONS_WEDDING : OPTIONS_STUDIO_DOL;

  if (product.category === 'chukuidae') {
    if (isBundle(product, options)) {
      // 축의대 주 + 스냅 번들 → 축의대 옵션 + 웨딩 스냅 옵션 (chukuidae2/4 제외)
      const {
        chukuidae2: _c2, chukuidae4: _c4, ...weddingWithoutBundle
      } = OPTIONS_WEDDING;
      return { ...OPTIONS_CHUKUIDAE, ...weddingWithoutBundle };
    }
    return OPTIONS_CHUKUIDAE;
  }

  // 스냅 주
  if (isBundle(product, options)) {
    // 스냅 주 + 축의대 번들 → 스냅 옵션 + 축의대 옵션 (snapBundle 제외)
    const {
      snapSpecialBundle: _s1, snapPremiumBundle: _s2, ...chukuidaeExtras
    } = OPTIONS_CHUKUIDAE;
    return { ...snapBase, ...chukuidaeExtras };
  }
  return snapBase;
}

/**
 * 즉시 할인 테이블. 번들이면 스냅 할인으로 통일 (대칭성 위해).
 */
export function getImmediateDiscounts(product, options = []) {
  if (isBundle(product, options)) return IMMEDIATE_DISCOUNTS;
  return product?.category === 'chukuidae' ? IMMEDIATE_DISCOUNTS_CHUKUIDAE : IMMEDIATE_DISCOUNTS;
}

/**
 * 후기 약속 할인 테이블. 번들이면 스냅 할인으로 통일.
 */
export function getPromiseDiscounts(product, options = []) {
  if (isBundle(product, options)) return PROMISE_DISCOUNTS;
  return product?.category === 'chukuidae' ? PROMISE_DISCOUNTS_CHUKUIDAE : PROMISE_DISCOUNTS;
}

/**
 * 출장비 테이블. 번들이면 스냅 테이블(평택 포함)로 통일.
 */
export function getTravelFeeTable(product, options = []) {
  if (isBundle(product, options)) return TRAVEL_FEE;
  return product?.category === 'chukuidae' ? TRAVEL_FEE_CHUKUIDAE : TRAVEL_FEE;
}

/**
 * 특정 옵션의 실제 금액 계산.
 * 스냅 번들 옵션(snapSpecialBundle/snapPremiumBundle)은 주 상품(축의대 등급)에 따라 동적:
 *   snapSpecialBundle = 350k(스페셜 정가) - BUNDLE_DISCOUNTS[주상품]
 *   snapPremiumBundle = 550k(프리미엄 정가) - BUNDLE_DISCOUNTS[주상품]
 */
export function resolveOptionAmount(product, code) {
  if (code === 'snapSpecialBundle') {
    return PRODUCTS.special.basePrice - (BUNDLE_DISCOUNTS[product?.code] || 0);
  }
  if (code === 'snapPremiumBundle') {
    return PRODUCTS.premium.basePrice - (BUNDLE_DISCOUNTS[product?.code] || 0);
  }
  // 모든 옵션 테이블 후보에서 amount lookup (번들 컨텍스트 소실 방지)
  const candidates = [OPTIONS_WEDDING, OPTIONS_STUDIO_DOL, OPTIONS_CHUKUIDAE];
  for (const table of candidates) {
    if (table[code] && typeof table[code].amount === 'number') return table[code].amount;
  }
  return 0;
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
 * @param {number|string} [input.customTravelFee] - region==='other'일 때 사장님이 안내한 금액
 * @returns {Object} 견적 결과
 */
export function calculateQuote(input) {
  const product = PRODUCTS[input.product];
  if (!product) throw new Error(`Unknown product: ${input.product}`);
  const options = input.options || [];

  const subtotal = product.basePrice;

  // 출장비 — 테이블 amount 우선. null이면(또는 'other') customTravelFee가 있을 때 대체.
  const travelTable = getTravelFeeTable(product, options);
  const entry = travelTable[input.region];
  const tableAmount = entry ? entry.amount : null;
  const custom = Number(input.customTravelFee);
  const customValid = isFinite(custom) && custom > 0;
  // 테이블 amount가 있으면 그것을 사용, 없으면 customTravelFee 시도
  const travelFee = tableAmount !== null ? tableAmount : (customValid ? custom : null);
  const isQuoteFinal = travelFee !== null;

  // 옵션 — 현재 활성 테이블에 없는 stale 옵션은 제외
  const optionsTable = getOptionsTable(product, options);
  const optionsTotal = options.reduce((sum, code) => {
    if (!optionsTable[code]) return sum;
    return sum + resolveOptionAmount(product, code);
  }, 0);

  const dolSurcharge =
    input.product === 'dol' && input.dolHasMainSnap === false ? DOL_ALONE_SURCHARGE : 0;

  const immediateTable = getImmediateDiscounts(product, options);
  const immediateDiscountTotal = input.immediateDiscounts.reduce(
    (sum, code) => sum + (immediateTable[code]?.amount || 0),
    0
  );

  const promiseTable = getPromiseDiscounts(product, options);
  const promiseTotal = input.promiseDiscounts.reduce(
    (sum, code) => sum + (promiseTable[code]?.amount || 0),
    0
  );

  const total =
    subtotal + (travelFee || 0) + optionsTotal + dolSurcharge + immediateDiscountTotal;

  // 계약금: 스냅·축의대·번들 공통 고정 10만원
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
    isBundle: isBundle(product, options),
  };
}
