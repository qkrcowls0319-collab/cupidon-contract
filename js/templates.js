import {
  PRODUCTS,
  IMMEDIATE_DISCOUNTS,
  PROMISE_DISCOUNTS,
  IMMEDIATE_DISCOUNTS_CHUKUIDAE,
  PROMISE_DISCOUNTS_CHUKUIDAE,
  OWNER_INFO,
  FIXED_DEPOSIT,
} from './config.js';

/**
 * 계약서 HTML 렌더러 — 카테고리별 분기 진입점.
 * pdf.js에서 A4 한 페이지에 딱 맞도록 자동 스케일.
 */
export function renderContractHTML(input) {
  const product = PRODUCTS[input.formData.product];
  if (product?.category === 'chukuidae') return renderContractHTML_chukuidae(input);
  return renderContractHTML_snap(input);
}

/**
 * 스냅 계약서 (기존 원본 계약서 양식 재현).
 */
function renderContractHTML_snap({ formData, quote, todayStr }) {
  const product = PRODUCTS[formData.product];
  const appliedImmediate = formData.immediateDiscounts.map(c => IMMEDIATE_DISCOUNTS[c].name);
  const subtitleLabel = appliedImmediate.length ? `(${appliedImmediate.join(', ')})` : '';

  const eventDateStr = formatEventDate(formData.eventDate, formData.eventTime);
  const priceStr = n => n.toLocaleString('ko-KR') + '원';

  // 상품 콘텐츠 라인 (원본 양식과 동일한 스타일)
  const contentLines = Object.entries(product.spec)
    .map(([k, v]) => `${k} ${v}`)
    .join('<br>');

  // 옵션 라인
  const optionLabels = formData.options.map(code => {
    const table = product.hasWeddingOptions
      ? { finalPlus5: '최종본 5장', colorPlus10: '색보정 10장', part2: '2부 촬영', pyebaek: '폐백 촬영', vintageDigicam: '빈티지 디카', chukuidae2: '축의대 2인 1팀', chukuidae4: '축의대 4인 2팀' }
      : { finalPlus5: '최종본 5장', part2Half: '2부 촬영(30분)', vintageDigicam: '빈티지 디카' };
    return `${table[code]} → +${priceStr(optionAmount(product, code))}`;
  });
  const optionSection = optionLabels.length
    ? optionLabels.map(l => `${l}`).join('<br>')
    : '선택된 추가 옵션 없음';

  const deliveryList = product.deliveryNote.map(t => `<li style="margin:2px 0">${t}</li>`).join('');

  const promiseLabels = formData.promiseDiscounts.map(c => PROMISE_DISCOUNTS[c].name);
  const promiseSection = promiseLabels.length
    ? `<div style="margin-top:6px;color:#555;font-size:10px"><b>추후 정산 가능 할인:</b> ${promiseLabels.join(', ')} — 각 -10,000원 (후기 URL 전달 시 잔금 차감)</div>`
    : '';

  const partnerCodeSection = formData.partnerCode
    ? `<div style="margin-top:2px;font-size:10.5px">짝꿍코드: <b>${escapeHtml(formData.partnerCode)}</b></div>`
    : '';

  const signatureImg = formData.signature
    ? `<img src="${formData.signature}" alt="서명" style="height:44px;display:block;margin-top:2px">`
    : '<div style="height:44px;border-bottom:1px solid #666;width:180px"></div>';

  const travelNote = quote.isQuoteFinal
    ? ''
    : '<div style="color:#c00;font-size:10px;margin-top:2px"><b>*출장비는 별도 문의 후 안내 (본 금액에 미포함)</b></div>';

  // font-family를 모든 요소에 명시적으로 적용 (숫자 폰트 깨짐 방지)
  const FONT = "'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo','Noto Sans KR',sans-serif";

  return `
    <div style="width:794px;padding:32px 40px;font-family:${FONT};font-size:11px;line-height:1.55;color:#222;box-sizing:border-box;background:#fff">

      <!-- 헤더 -->
      <div style="text-align:center;margin-bottom:14px">
        <h1 style="font-family:${FONT};font-size:20px;margin:0;font-weight:700;letter-spacing:0.02em">큐피돈 아이폰 스냅 계약서</h1>
        <div style="font-family:${FONT};color:#555;font-size:11px;margin-top:3px">${subtitleLabel}</div>
      </div>

      <!-- 1. 상품 구성 (표 형태 — 원본 양식) -->
      <div style="font-family:${FONT};font-weight:700;font-size:12px;margin-bottom:4px">1. 상품 구성</div>
      <table style="width:100%;border-collapse:collapse;font-family:${FONT};font-size:10.5px;margin-bottom:10px">
        <thead>
          <tr style="background:#f4efe5">
            <th style="border:1px solid #999;padding:5px 6px;width:22%;text-align:center;font-family:${FONT};font-weight:700">상품명</th>
            <th style="border:1px solid #999;padding:5px 6px;text-align:center;font-family:${FONT};font-weight:700">내용</th>
            <th style="border:1px solid #999;padding:5px 6px;width:28%;text-align:center;font-family:${FONT};font-weight:700">추가 상품 안내</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #999;padding:6px 8px;vertical-align:top;font-family:${FONT}">
              <b>${product.name}</b>
            </td>
            <td style="border:1px solid #999;padding:6px 8px;vertical-align:top;font-family:${FONT}">
              <b>제공 콘텐츠</b><br>
              ${contentLines}
            </td>
            <td style="border:1px solid #999;padding:6px 8px;vertical-align:top;font-family:${FONT}">
              ${optionSection}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 2. 결제 및 환불 안내 -->
      <div style="font-family:${FONT};font-weight:700;font-size:12px;margin-bottom:4px">2. 결제 및 환불 안내</div>
      <ul style="font-family:${FONT};margin:0 0 10px 18px;padding:0;font-size:10.5px">
        <li style="margin:2px 0">잔금은 예식 7일 전까지 완납해주셔야 합니다.</li>
        <li style="margin:2px 0">계약금은 <b>${priceStr(FIXED_DEPOSIT)} 입금</b>을 통해 예약이 확정됩니다.</li>
        <li style="margin:2px 0">예약 확정일 기준 14일 이내: 계약금 100% 환불 가능</li>
        <li style="margin:2px 0">예약 확정일 기준 14일 이후: 계약금 환불 불가</li>
        <li style="margin:2px 0">천재지변 등 불가피한 사유로 인한 취소: 계약금 환불 가능</li>
        <li style="margin:2px 0">단순 변심, 웨딩홀의 귀책 등 제3자 사유: 환불 불가</li>
        <li style="margin:2px 0">큐피돈 스냅 귀책 사유 발생 시: <b>200% 환불 보장</b></li>
      </ul>

      <!-- 3. 데이터 전달 및 보관 안내 -->
      <div style="font-family:${FONT};font-weight:700;font-size:12px;margin-bottom:4px">3. 데이터 전달 및 보관 안내</div>
      <ul style="font-family:${FONT};margin:0 0 10px 18px;padding:0;font-size:10.5px">${deliveryList}</ul>

      <!-- 동의문 -->
      <div style="font-family:${FONT};margin:10px 0;font-size:10.5px;line-height:1.6">
        큐피돈 아이폰 스냅과 관련하여 상기 내용을 통해 촬영 상품 구성, 추가 요금, 결제 및 환불,
        데이터 보관 및 전달 규정에 대해 충분히 안내받았으며, 이에 동의합니다.
      </div>

      <!-- 계약 금액 박스 -->
      <div style="border:1.5px solid #333;border-radius:4px;padding:8px 12px;margin:10px 0;font-family:${FONT}">
        <div style="font-family:${FONT};display:flex;justify-content:space-between;gap:16px;font-size:12px;font-weight:700">
          <span>계약금: ${priceStr(FIXED_DEPOSIT)}</span>
          <span>잔금: ${priceStr(quote.balance)}</span>
          <span>총액: ${priceStr(quote.total)}</span>
        </div>
        ${travelNote}
        ${promiseSection}
        <div style="font-family:${FONT};margin-top:5px;font-size:10.5px"><b>용역 공급자:</b> 큐피돈 스냅</div>
      </div>

      <!-- 계약자 정보 -->
      <div style="font-family:${FONT};font-size:10.5px;line-height:1.75;margin-bottom:10px">
        <div><b>예식일:</b> ${eventDateStr}</div>
        <div><b>장소:</b> ${escapeHtml(formData.venue)} &nbsp;&nbsp; <b>출장지역:</b> ${escapeHtml(getRegionLabel(formData.region))}</div>
        <div><b>계약자 성함:</b> ${escapeHtml(formData.customerName)} 님 &nbsp;&nbsp; <b>연락처:</b> ${escapeHtml(formData.customerPhone)}</div>
        ${partnerCodeSection}
      </div>

      <!-- 서명 영역 -->
      <div style="font-family:${FONT};display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #999;padding-top:10px;margin-top:8px">
        <div>
          <div style="font-family:${FONT};font-size:10px;color:#555">계약일: ${todayStr}</div>
          <div style="font-family:${FONT};font-size:10.5px;margin-top:4px"><b>계약자 서명</b></div>
          ${signatureImg}
        </div>
        <div style="text-align:right;font-family:${FONT};font-size:10.5px">
          <div style="color:#555">용역 공급자</div>
          <div style="margin-top:2px"><b>${OWNER_INFO.accountHolder}</b></div>
        </div>
      </div>
    </div>
  `;
}

function optionAmount(product, code) {
  const w = { finalPlus5: 50000, colorPlus10: 50000, part2: 70000, pyebaek: 50000, vintageDigicam: 30000, chukuidae2: 380000, chukuidae4: 680000 };
  const s = { finalPlus5: 50000, part2Half: 50000, vintageDigicam: 30000 };
  return product.hasWeddingOptions ? (w[code] || 0) : (s[code] || 0);
}

// ================================================================
// 축의대 계약서 렌더러 (원본 축의대_계약서_스탠다드/프리미엄.html 스타일)
// ================================================================
function renderContractHTML_chukuidae({ formData, quote, todayStr }) {
  const product = PRODUCTS[formData.product];
  const priceStr = n => n.toLocaleString('ko-KR') + '원';
  const eventDateStr = formatEventDate(formData.eventDate, formData.eventTime);

  // 상품 스펙 라인
  const contentLines = Object.entries(product.spec)
    .map(([k, v]) => `${k}: ${v}`)
    .join('<br>');

  // 축의대 옵션 표시
  const chukuidaeOptionNames = {
    readyBag: '레디백',
    offlineLedger: '오프라인 장부 (양가 혼주용, 1팀 기준)',
    thankyouSMS: '감사문자 발송 서비스 (200명 이하 기준)',
  };
  const chukuidaeOptionPrices = { readyBag: 10000, offlineLedger: 30000, thankyouSMS: 30000 };
  const optionLabels = formData.options.map(code => {
    const name = chukuidaeOptionNames[code] || code;
    const amt = chukuidaeOptionPrices[code] || 0;
    return `${name} → +${priceStr(amt)}`;
  });
  const optionSection = optionLabels.length
    ? optionLabels.join('<br>')
    : '선택된 추가 옵션 없음';

  // 감사문자 선택 시 후불 안내 노출
  const smsPostBillingNote = formData.options.includes('thankyouSMS')
    ? '<li style="margin:2px 0">감사문자 200명 초과 시, 초과분(50명당 +10,000원)은 예식 후 실 발송 인원 기준 <b>후불 청구</b>됩니다.</li>'
    : '';

  const deliveryList = product.deliveryNote.map(t => `<li style="margin:2px 0">${t}</li>`).join('');

  // 할인 요약 (즉시 + 후기 약속)
  const immediateLabels = formData.immediateDiscounts.map(c => IMMEDIATE_DISCOUNTS_CHUKUIDAE[c]?.name).filter(Boolean);
  const promiseLabels = formData.promiseDiscounts.map(c => PROMISE_DISCOUNTS_CHUKUIDAE[c]?.name).filter(Boolean);

  const promiseSection = promiseLabels.length
    ? `<div style="margin-top:6px;color:#555;font-size:10px"><b>추후 정산 가능 할인:</b> ${promiseLabels.join(', ')} (후기 URL 전달 시 잔금 차감)</div>`
    : '';

  const immediateHeader = immediateLabels.length
    ? `<div style="color:#555;font-size:11px;margin-top:2px">(${immediateLabels.join(', ')})</div>`
    : '';

  const signatureImg = formData.signature
    ? `<img src="${formData.signature}" alt="서명" style="height:44px;display:block;margin-top:2px">`
    : '<div style="height:44px;border-bottom:1px solid #666;width:180px"></div>';

  const travelNote = quote.isQuoteFinal
    ? ''
    : '<div style="color:#c00;font-size:10px;margin-top:2px"><b>*출장비는 경기 이외 지역 별도 문의 (본 금액에 미포함)</b></div>';

  const FONT = "'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo','Noto Sans KR',sans-serif";

  return `
    <div style="width:794px;padding:32px 40px;font-family:${FONT};font-size:11px;line-height:1.55;color:#222;box-sizing:border-box;background:#fff">

      <!-- 헤더 -->
      <div style="text-align:center;margin-bottom:14px">
        <h1 style="font-family:${FONT};font-size:20px;margin:0;font-weight:700;letter-spacing:0.02em">큐피돈 × 더체크 축의대 계약서</h1>
        ${immediateHeader}
      </div>

      <!-- 1. 상품 구성 -->
      <div style="font-family:${FONT};font-weight:700;font-size:12px;margin-bottom:4px">1. 상품 구성</div>
      <table style="width:100%;border-collapse:collapse;font-family:${FONT};font-size:10.5px;margin-bottom:10px">
        <thead>
          <tr style="background:#ead4ec">
            <th style="border:1px solid #999;padding:5px 6px;width:22%;text-align:center;font-family:${FONT};font-weight:700">상품명</th>
            <th style="border:1px solid #999;padding:5px 6px;text-align:center;font-family:${FONT};font-weight:700">내용</th>
            <th style="border:1px solid #999;padding:5px 6px;width:28%;text-align:center;font-family:${FONT};font-weight:700">추가 옵션</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #999;padding:6px 8px;vertical-align:top;font-family:${FONT}">
              <b>${product.name}</b><br>
              <span style="color:#555;font-size:10px">${product.subtitle || ''}</span>
            </td>
            <td style="border:1px solid #999;padding:6px 8px;vertical-align:top;font-family:${FONT}">
              <b>제공 서비스</b><br>
              ${contentLines}
            </td>
            <td style="border:1px solid #999;padding:6px 8px;vertical-align:top;font-family:${FONT}">
              ${optionSection}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 2. 결제 및 환불 안내 -->
      <div style="font-family:${FONT};font-weight:700;font-size:12px;margin-bottom:4px">2. 결제 및 환불 안내</div>
      <ul style="font-family:${FONT};margin:0 0 10px 18px;padding:0;font-size:10.5px">
        <li style="margin:2px 0">잔금은 예식 7일 전까지 완납해주셔야 합니다.</li>
        <li style="margin:2px 0">계약금은 <b>${priceStr(quote.deposit)} 입금</b>을 통해 예약이 확정됩니다.</li>
        <li style="margin:2px 0">예약 확정일 기준 14일 이내: 계약금 100% 환불 가능</li>
        <li style="margin:2px 0">예약 확정일 기준 14일 이후: 계약금 환불 불가</li>
        <li style="margin:2px 0">천재지변 등 불가피한 사유로 인한 취소: 계약금 환불 가능</li>
        <li style="margin:2px 0">단순 변심, 웨딩홀의 귀책 등 제3자 사유: 환불 불가</li>
        <li style="margin:2px 0">큐피돈 축의대 귀책 사유 발생 시: <b>200% 환불 보장</b></li>
      </ul>

      <!-- 3. 서비스 진행 안내 -->
      <div style="font-family:${FONT};font-weight:700;font-size:12px;margin-bottom:4px">3. 서비스 진행 안내</div>
      <ul style="font-family:${FONT};margin:0 0 10px 18px;padding:0;font-size:10.5px">${deliveryList}${smsPostBillingNote}</ul>

      <!-- 동의문 -->
      <div style="font-family:${FONT};margin:10px 0;font-size:10.5px;line-height:1.6">
        큐피돈 × 더체크 축의대와 관련하여 상기 내용을 통해 서비스 구성, 추가 요금, 결제 및 환불,
        진행 및 인수인계 규정에 대해 충분히 안내받았으며, 이에 동의합니다.
      </div>

      <!-- 계약 금액 박스 -->
      <div style="border:1.5px solid #333;border-radius:4px;padding:8px 12px;margin:10px 0;font-family:${FONT}">
        <div style="font-family:${FONT};display:flex;justify-content:space-between;gap:16px;font-size:12px;font-weight:700">
          <span>계약금: ${priceStr(quote.deposit)}</span>
          <span>잔금: ${priceStr(quote.balance)}</span>
          <span>총액: ${priceStr(quote.total)}</span>
        </div>
        ${travelNote}
        ${promiseSection}
        <div style="font-family:${FONT};margin-top:5px;font-size:10.5px"><b>용역 공급자:</b> 큐피돈 스냅 (큐피돈 × 더체크 축의대)</div>
      </div>

      <!-- 계약자 정보 -->
      <div style="font-family:${FONT};font-size:10.5px;line-height:1.75;margin-bottom:10px">
        <div><b>예식일:</b> ${eventDateStr}</div>
        <div><b>장소:</b> ${escapeHtml(formData.venue)} &nbsp;&nbsp; <b>출장지역:</b> ${escapeHtml(getRegionLabel(formData.region))}</div>
        <div><b>계약자 성함:</b> ${escapeHtml(formData.customerName)} 님 &nbsp;&nbsp; <b>연락처:</b> ${escapeHtml(formData.customerPhone)}</div>
      </div>

      <!-- 서명 영역 -->
      <div style="font-family:${FONT};display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #999;padding-top:10px;margin-top:8px">
        <div>
          <div style="font-family:${FONT};font-size:10px;color:#555">계약일: ${todayStr}</div>
          <div style="font-family:${FONT};font-size:10.5px;margin-top:4px"><b>계약자 서명</b></div>
          ${signatureImg}
        </div>
        <div style="text-align:right;font-family:${FONT};font-size:10.5px">
          <div style="color:#555">용역 공급자</div>
          <div style="margin-top:2px"><b>${OWNER_INFO.accountHolder}</b></div>
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
