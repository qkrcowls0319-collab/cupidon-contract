// 큐피돈 스냅 · 축의대 상품·할인·옵션 상수. Source of Truth.
// 가격 변경 시 이 파일만 수정.

export const PRODUCTS = {
  special: {
    code: 'special',
    name: '1인 스페셜',
    basePrice: 350000,
    category: 'snap',
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
    category: 'snap',
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
    category: 'snap',
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
    category: 'snap',
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
  chukuidaeStd: {
    code: 'chukuidaeStd',
    name: '축의대 스탠다드',
    subtitle: '2인 1팀',
    basePrice: 450000,
    category: 'chukuidae',
    spec: {
      담당자: '2인 1팀 (격식 정장)',
      도착: '예식 1시간 30분 전',
      진행: '약 3시간 (예식 완료까지)',
      장부: '실시간 디지털 장부(태블릿) + 정산 리포트',
      보관: '이중잠금 축의금 보관함',
      부가: '접수 영상 촬영 · 감사 화환·혼주 준비 촬영 · 현금영수증 발급',
    },
    deliveryNote: [
      '축의금은 이중잠금 보관함에 실시간 보관',
      '예식 종료 직후 봉투·명단·정산 리포트 인수인계',
      '접수 실시간 영상 촬영본 및 감사 화환·혼주 준비 촬영본 예식 후 전달',
      '현금영수증 발급 가능',
    ],
  },
  chukuidaePremium: {
    code: 'chukuidaePremium',
    name: '축의대 프리미엄',
    subtitle: '4인 2팀 · 양측 접수대 완벽 커버',
    basePrice: 800000,
    category: 'chukuidae',
    spec: {
      담당자: '4인 2팀 (양가 각 2인씩 · 격식 정장)',
      도착: '예식 1시간 30분 전',
      진행: '약 3시간 (예식 완료까지)',
      커버: '신랑측·신부측 접수대 동시 운영',
      장부: '실시간 디지털 장부(태블릿) + 정산 리포트',
      보관: '이중잠금 축의금 보관함',
      부가: '접수 영상 촬영 · 감사 화환·혼주 준비 촬영 · 현금영수증 발급',
    },
    deliveryNote: [
      '양가 접수대 각각 이중잠금 보관함으로 실시간 관리',
      '예식 종료 직후 봉투·명단·통합 정산 리포트 인수인계',
      '접수 실시간 영상 촬영본 및 감사 화환·혼주 준비 촬영본 예식 후 전달',
      '현금영수증 발급 가능',
    ],
  },
};

// ============================
// 스냅 상품 할인 (기존)
// ============================

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

// ============================
// 축의대 상품 할인 (짝꿍코드 없음)
// ============================

export const IMMEDIATE_DISCOUNTS_CHUKUIDAE = {
  sameDay: { name: '당일 계약 할인', amount: -20000, appliesTo: 'all' },
};

export const PROMISE_DISCOUNTS_CHUKUIDAE = {
  contractReview: { name: '계약 후기 약속', amount: -10000, appliesTo: 'all' },
  usageReview: { name: '이용 후기 약속', amount: -20000, appliesTo: 'all' },
};

// ============================
// 추가 옵션
// ============================

// 스냅 - 웨딩 상품 (special / premium)
export const OPTIONS_WEDDING = {
  finalPlus5: { name: '최종본 추가 5장', amount: 50000 },
  colorPlus10: { name: '색보정 추가 10장', amount: 50000 },
  part2: { name: '2부 촬영 추가', amount: 70000 },
  pyebaek: { name: '폐백 촬영 추가', amount: 50000 },
  vintageDigicam: { name: '빈티지 디카', amount: 30000 },
  chukuidae2: { name: '축의대 2인 1팀 (스탠다드 · 스냅 번들가)', amount: 380000 },
  chukuidae4: { name: '축의대 4인 2팀 (프리미엄 · 스냅 번들가)', amount: 680000 },
};

// 스냅 - 스튜디오·돌
export const OPTIONS_STUDIO_DOL = {
  finalPlus5: { name: '최종본 추가 5장', amount: 50000 },
  part2Half: { name: '2부 촬영 추가 (30분)', amount: 50000 },
  vintageDigicam: { name: '빈티지 디카', amount: 30000 },
};

// 축의대 전용 옵션
// - 감사문자: 200명 이하 기준가. 초과분은 예식 후 후불 청구 (실제 발송 인원 기준 50명당 +10,000)
// - snapSpecialBundle / snapPremiumBundle: 축의대 상품에 스냅을 번들로 얹는 옵션.
//   amount는 상수 대신 pricing.js의 resolveOptionAmount()에서 주 상품(축의대 등급)에 따라 동적 계산.
export const OPTIONS_CHUKUIDAE = {
  readyBag: { name: '레디백', amount: 10000 },
  offlineLedger: { name: '오프라인 장부 (양가 혼주용, 1팀 기준)', amount: 30000 },
  thankyouSMS: { name: '감사문자 발송 서비스 (200명 이하 기준 · 초과분 후불 청구)', amount: 30000 },
  snapSpecialBundle: { name: '아이폰 스냅 스페셜 번들 (1인)', dynamic: 'snapBundle', snapCode: 'special' },
  snapPremiumBundle: { name: '아이폰 스냅 프리미엄 번들 (2인)', dynamic: 'snapBundle', snapCode: 'premium' },
};

// ============================
// 번들 할인 (스냅 ⇄ 축의대 대칭성)
// ============================
// 스냅 상품 + 축의대 번들 옵션(chukuidae2/4) → OPTIONS_WEDDING의 amount로 이미 -70k/-120k 반영됨
//   chukuidae2 = 450k(축의대 스탠다드) - 70k = 380k
//   chukuidae4 = 800k(축의대 프리미엄) - 120k = 680k
// 축의대 상품 + 스냅 번들 옵션(snapSpecial/Premium) → 같은 규칙으로 대칭 계산:
//   snapSpecialBundle amount = 350k(스냅 스페셜) - BUNDLE_DISCOUNTS[주상품]
//   snapPremiumBundle amount = 550k(스냅 프리미엄) - BUNDLE_DISCOUNTS[주상품]
// 어느 쪽에서 시작하든 총액이 동일해집니다.
export const BUNDLE_DISCOUNTS = {
  chukuidaeStd: 70000,
  chukuidaePremium: 120000,
};

// ============================
// 출장비
// ============================

// 스냅 출장비
// 'other'는 별도 문의 지역. 폼에서 사장님이 안내 금액을 입력할 수 있음 (customTravelFee).
export const TRAVEL_FEE = {
  seoul: { name: '서울', amount: 0 },
  gyeonggi_incheon: { name: '경기·인천', amount: 50000 },
  pyeongtaek: { name: '평택', amount: 70000 },
  other: { name: '그 외 지역 (사장님 안내 금액 입력)', amount: null },
};

// 축의대 출장비 (경기 이외 지역은 별도 문의)
export const TRAVEL_FEE_CHUKUIDAE = {
  seoul: { name: '서울', amount: 0 },
  gyeonggi_incheon: { name: '경기·인천', amount: 50000 },
  other: { name: '경기 이외 지역 (사장님 안내 금액 입력)', amount: null },
};

// ============================
// 기타
// ============================

// 돌스냅 아이폰 단독 촬영 가산금
export const DOL_ALONE_SURCHARGE = 50000;

// 계약금 (스냅·축의대 공통 고정)
export const FIXED_DEPOSIT = 100000;

// 사장님 정보 (계약서 하단·완료화면에 표시)
export const OWNER_INFO = {
  bankName: '토스뱅크',
  bankAccount: '1002-5123-8652',
  accountHolder: '큐피돈 스냅',
  kakaoChannelUrl: 'http://pf.kakao.com/_jVYdn/chat',
  kakaoDisplayName: '큐피돈 스냅 카카오톡 채널',
};

// Google Sheets 자동 저장 웹훅 URL (카테고리별 별도 시트)
// 세팅 방법은 README의 "Google Sheets 신청 이력 관리" 섹션 참고
// URL을 비워두면 해당 카테고리의 자동 저장은 비활성화됨 (계약서 흐름은 정상 작동)
export const SHEETS_WEBHOOK_URLS = {
  snap: 'https://script.google.com/macros/s/AKfycbx4eogBqNv8j4sedJ0kK2KtbO0zfH1bhJQ2FVg14Eyg2OKKP5gPR3HLJDjZKFPyZP3mVQ/exec',
  chukuidae: '', // 축의대용 Apps Script 배포 후 URL 여기에 입력
};

// 하위 호환 (기존 코드가 아직 import 하고 있으면 스냅 URL을 반환)
export const SHEETS_WEBHOOK_URL = SHEETS_WEBHOOK_URLS.snap;
