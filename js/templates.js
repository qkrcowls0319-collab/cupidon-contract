import { PRODUCTS, IMMEDIATE_DISCOUNTS, PROMISE_DISCOUNTS, OWNER_INFO, FIXED_DEPOSIT } from './config.js';

/**
 * 견적 결과와 폼 데이터로 계약서 HTML 조각을 생성.
 * A4 한 페이지에 딱 맞도록 컴팩트하게 설계.
 * pdf.js가 이 HTML을 hidden div에 넣고 html2canvas로 캡처.
 */
export function renderContractHTML({ formData, quote, todayStr }) {
  const product = PRODUCTS[formData.product];
  const appliedImmediate = formData.immediateDiscounts.map(c => IMMEDIATE_DISCOUNTS[c].name);
  const subtitleLabel = appliedImmediate.length ? `(${appliedImmediate.join(', ')} 적용)` : '';

  const eventDateStr = formatEventDate(formData.eventDate, formData.eventTime);
  const priceStr = n => n.toLocaleString('ko-KR') + '원';

  // 상품 스펙: 인라인으로 한 줄에 콤팩트하게
  const specInline = Object.entries(product.spec)
    .map(([k, v]) => `<span style="margin-right:12px"><b>${k}</b> ${v}</span>`)
    .join('');

  // 옵션 인라인
  const optionLabels = formData.options.map(code => {
    const table = product.hasWeddingOptions
      ? { finalPlus5: '최종본 5장', colorPlus10: '색보정 10장', part2: '2부 촬영', pyebaek: '폐백 촬영' }
      : { finalPlus5: '최종본 5장', part2Half: '2부 촬영(30분)' };
    return table[code];
  });
  const optionText = optionLabels.length ? optionLabels.join(', ') : '없음';

  // 데이터 전달 안내
  const deliveryList = product.deliveryNote.map(t => `<li>${t}</li>`).join('');

  // 후기 약속 표기
  const promiseLabels = formData.promiseDiscounts.map(c => PROMISE_DISCOUNTS[c].name);
  const promiseSection = promiseLabels.length
    ? `<div style="margin-top:4px;color:#555;font-size:10px"><b>추후 정산 가능:</b> ${promiseLabels.join(', ')} — 각 -10,000원 (후기 URL 전달 시 잔금 차감)</div>`
    : '';

  const partnerCodeSection = formData.partnerCode
    ? ` · <b>짝꿍코드:</b> ${escapeHtml(formData.partnerCode)}`
    : '';

  const signatureImg = formData.signature
    ? `<img src="${formData.signature}" alt="서명" style="height:50px;display:block">`
    : '<div style="height:50px"></div>';

  const travelNote = quote.isQuoteFinal
    ? ''
    : '<div style="color:#c00;font-size:10px;margin-top:2px"><b>*출장비는 별도 문의 후 안내 (본 금액에 미포함)</b></div>';

  return `
    <div style="width:794px;padding:30px 36px;font-family:'Malgun Gothic','맑은 고딕',sans-serif;font-size:11px;line-height:1.5;color:#222;box-sizing:border-box">

      <div style="text-align:center;margin-bottom:14px">
        <h1 style="font-size:20px;margin:0;letter-spacing:0.05em">큐피돈 아이폰 스냅 계약서</h1>
        <div style="color:#666;font-size:11px;margin-top:2px">${subtitleLabel}</div>
      </div>

      <!-- 1. 상품 구성 -->
      <div style="margin-bottom:10px">
        <div style="font-weight:700;font-size:12px;border-bottom:1.5px solid #333;padding-bottom:3px;margin-bottom:6px">1. 상품 구성</div>
        <div style="padding:4px 0"><b>상품명:</b> ${product.name}</div>
        <div style="padding:4px 0"><b>제공 콘텐츠:</b> ${specInline}</div>
        <div style="padding:4px 0"><b>추가 옵션:</b> ${optionText}</div>
      </div>

      <!-- 2. 결제·환불 -->
      <div style="margin-bottom:10px">
        <div style="font-weight:700;font-size:12px;border-bottom:1.5px solid #333;padding-bottom:3px;margin-bottom:6px">2. 결제 및 환불 안내</div>
        <div style="padding-left:4px">
          <div>· 잔금은 예식 7일 전까지 완납</div>
          <div>· 계약금 <b>${priceStr(FIXED_DEPOSIT)}</b> 입금으로 예약 확정 · 예약 확정일 기준 14일 이내 100% 환불, 14일 이후 환불 불가</div>
          <div>· 천재지변 등 불가피한 사유: 환불 가능 · 단순 변심·웨딩홀 귀책: 환불 불가</div>
          <div>· 큐피돈 스냅 귀책 사유: <b>200% 환불 보장</b></div>
        </div>
      </div>

      <!-- 3. 데이터 전달 -->
      <div style="margin-bottom:12px">
        <div style="font-weight:700;font-size:12px;border-bottom:1.5px solid #333;padding-bottom:3px;margin-bottom:6px">3. 데이터 전달 및 보관 안내</div>
        <ul style="margin:2px 0 0 18px;padding:0">${deliveryList}</ul>
      </div>

      <!-- 동의문 -->
      <div style="margin:12px 0;padding:6px 8px;background:#f6f2ea;border-radius:4px;font-size:10.5px">
        큐피돈 아이폰 스냅과 관련하여 상기 촬영 상품 구성·추가 요금·결제·환불·데이터 보관 및 전달 규정 전반에 대해 충분히 안내받았으며, 이에 동의합니다.
      </div>

      <!-- 견적/계약 요약 -->
      <div style="margin-bottom:12px;padding:10px 12px;border:1.5px solid #333;border-radius:6px">
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <div><b>총액:</b> ${priceStr(quote.total)}</div>
          <div><b>계약금:</b> ${priceStr(FIXED_DEPOSIT)}</div>
          <div><b>잔금:</b> ${priceStr(quote.balance)}</div>
        </div>
        ${travelNote}
        ${promiseSection}
        <div style="margin-top:4px;font-size:10px;color:#555"><b>용역 공급자:</b> 큐피돈 스냅</div>
      </div>

      <!-- 계약자 정보 -->
      <div style="margin-bottom:14px;font-size:11px;line-height:1.7">
        <div><b>예식일:</b> ${eventDateStr} · <b>장소:</b> ${escapeHtml(formData.venue)} · <b>출장지역:</b> ${escapeHtml(getRegionLabel(formData.region))}</div>
        <div><b>계약자:</b> ${escapeHtml(formData.customerName)} 님 · <b>연락처:</b> ${escapeHtml(formData.customerPhone)}${partnerCodeSection}</div>
      </div>

      <!-- 서명 -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #ccc;padding-top:10px">
        <div>
          <div style="font-size:10.5px;color:#555">계약일: ${todayStr}</div>
          <div style="font-size:10.5px;color:#555;margin-top:4px">계약자 서명</div>
          ${signatureImg}
        </div>
        <div style="text-align:right;font-size:10.5px;color:#555">
          <div><b>용역 공급자</b></div>
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
