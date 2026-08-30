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

// 사장님 정보 (계약서 하단·완료화면에 표시)
export const OWNER_INFO = {
  bankName: '토스뱅크',
  bankAccount: '1002-5123-8652',
  accountHolder: '큐피돈 스냅',
  // 카카오톡 채널 홈 URL (버튼 클릭 시 이 링크로 이동)
  kakaoChannelUrl: 'http://pf.kakao.com/_decupidon',
  // 화면 표시명
  kakaoDisplayName: '큐피돈 스냅 카카오톡 채널',
};
