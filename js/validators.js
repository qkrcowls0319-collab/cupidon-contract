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
