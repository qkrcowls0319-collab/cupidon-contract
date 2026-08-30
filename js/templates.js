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
