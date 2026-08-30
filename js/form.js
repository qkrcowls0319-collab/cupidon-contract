import {
  PRODUCTS,
  TRAVEL_FEE,
  IMMEDIATE_DISCOUNTS,
  PROMISE_DISCOUNTS,
  OPTIONS_WEDDING,
  OPTIONS_STUDIO_DOL,
  OWNER_INFO,
} from './config.js';
import { validateStep } from './validators.js';
import { calculateQuote } from './pricing.js';
import { generateContractPDF, downloadBlob } from './pdf.js';
import { sendContractEmail } from './email.js';

export const state = {
  currentStep: 1,
  totalSteps: 8,
  errors: {},
  data: {
    customerName: '',
    customerPhone: '',
    eventDate: '',
    eventTime: '',
    venue: '',
    region: '',
    product: '',
    options: [],
    dolHasMainSnap: null,
    immediateDiscounts: [],
    promiseDiscounts: [],
    partnerCode: '',
    quoteConfirmed: false,
    signature: '', // base64 dataURL
    agreed: false,
  },
};

const renderers = {}; // step번호 → 렌더 함수
const afterRenderHooks = {}; // step 렌더 후 실행할 훅 (signature_pad 초기화 등)

export function registerRenderer(step, fn, afterRender = null) {
  renderers[step] = fn;
  if (afterRender) afterRenderHooks[step] = afterRender;
}

export function render() {
  const app = document.getElementById('app');
  const indicator = document.getElementById('step-indicator');

  // 스텝 인디케이터
  indicator.innerHTML = '';
  for (let i = 1; i <= state.totalSteps; i++) {
    const dot = document.createElement('div');
    dot.className = 'step-dot' + (i === state.currentStep ? ' active' : i < state.currentStep ? ' done' : '');
    dot.textContent = i;
    indicator.appendChild(dot);
  }

  // 스텝 컨텐츠
  const renderer = renderers[state.currentStep];
  app.innerHTML = renderer ? renderer(state) : `<div class="card">Step ${state.currentStep} (미구현)</div>`;

  attachCommonHandlers();
  const hook = afterRenderHooks[state.currentStep];
  if (hook) hook(state);
}

function attachCommonHandlers() {
  const nextBtn = document.querySelector('[data-action="next"]');
  const prevBtn = document.querySelector('[data-action="prev"]');
  if (nextBtn) nextBtn.addEventListener('click', goNext);
  if (prevBtn) prevBtn.addEventListener('click', goPrev);

  // 입력 필드 자동 바인딩
  document.querySelectorAll('[data-bind]').forEach(el => {
    const key = el.dataset.bind;
    if (el.type === 'checkbox') {
      el.addEventListener('change', () => {
        if (Array.isArray(state.data[key])) {
          const val = el.value;
          if (el.checked) state.data[key] = [...state.data[key], val];
          else state.data[key] = state.data[key].filter(v => v !== val);
        } else {
          state.data[key] = el.checked;
        }
        onDataChange();
      });
    } else if (el.type === 'radio') {
      el.addEventListener('change', () => {
        if (el.checked) {
          state.data[key] = el.value === 'true' ? true : el.value === 'false' ? false : el.value;
          onDataChange();
        }
      });
    } else {
      el.addEventListener('input', () => {
        state.data[key] = el.value;
        onDataChange();
      });
    }
  });
}

function onDataChange() {
  // Never re-render on Step 7 — signature canvas would be recreated and stroke lost.
  // Step 7's endStroke handler assigns to state.data.signature directly, but the
  // agreed checkbox flows through here; skip re-render to preserve canvas state.
  if (state.currentStep === 7) return;
  // Re-render on data change so conditional fields (짝꿍코드, 그 외 info-box) appear
  // immediately and `.selected` visual classes stay in sync. Preserve focus and
  // caret position for text inputs so the user can keep typing without flicker.
  const activeBind = document.activeElement?.dataset?.bind;
  const selectionStart = document.activeElement?.selectionStart;
  render();
  if (activeBind) {
    const el = document.querySelector(`[data-bind="${activeBind}"]`);
    if (el && el.focus) {
      el.focus();
      if (selectionStart != null && el.setSelectionRange) {
        try { el.setSelectionRange(selectionStart, selectionStart); } catch (e) {}
      }
    }
  }
}

function goNext() {
  const errors = validateStep(state.currentStep, state.data);
  state.errors = errors;
  if (Object.keys(errors).length > 0) {
    render();
    return;
  }
  if (state.currentStep < state.totalSteps) {
    state.currentStep++;
    render();
  }
}

function goPrev() {
  if (state.currentStep > 1) {
    if (state.currentStep === 8) {
      submissionState.status = 'idle';
      submissionState.error = null;
      submissionState.pdfBlob = null;
      submissionState.pdfFilename = null;
    }
    state.currentStep--;
    state.errors = {};
    render();
  }
}

// ============================
// Step 1: 기본 정보
// ============================
registerRenderer(1, s => `
  <div class="card">
    <h2>1. 기본 정보</h2>
    <div class="field ${s.errors.customerName ? 'has-error' : ''}">
      <label>계약자 성함 *</label>
      <input type="text" data-bind="customerName" value="${escapeAttr(s.data.customerName)}" placeholder="예: 홍길동" />
      ${s.errors.customerName ? `<div class="error">${s.errors.customerName}</div>` : ''}
    </div>
    <div class="field ${s.errors.customerPhone ? 'has-error' : ''}">
      <label>연락처 *</label>
      <input type="tel" data-bind="customerPhone" value="${escapeAttr(s.data.customerPhone)}" placeholder="010-0000-0000" />
      ${s.errors.customerPhone ? `<div class="error">${s.errors.customerPhone}</div>` : ''}
    </div>
    <div class="actions">
      <button class="btn btn-primary" data-action="next">다음</button>
    </div>
  </div>
`);

// ============================
// Step 2: 행사 정보
// ============================
registerRenderer(2, s => {
  const regions = Object.entries(TRAVEL_FEE).map(([code, r]) => {
    const feeLabel = r.amount === null ? '별도 문의' : r.amount === 0 ? '기본' : `+${r.amount.toLocaleString('ko-KR')}원`;
    const checked = s.data.region === code ? 'checked' : '';
    const selectedCls = s.data.region === code ? 'selected' : '';
    return `
      <label class="radio-option ${selectedCls}">
        <input type="radio" name="region" data-bind="region" value="${code}" ${checked}>
        <span>${r.name}</span>
        <span class="price">${feeLabel}</span>
      </label>`;
  }).join('');

  return `
    <div class="card">
      <h2>2. 행사 정보</h2>
      <div class="field ${s.errors.eventDate ? 'has-error' : ''}">
        <label>예식일자 *</label>
        <input type="date" data-bind="eventDate" value="${s.data.eventDate}">
        ${s.errors.eventDate ? `<div class="error">${s.errors.eventDate}</div>` : ''}
      </div>
      <div class="field ${s.errors.eventTime ? 'has-error' : ''}">
        <label>예식시간 *</label>
        <input type="time" data-bind="eventTime" value="${s.data.eventTime}">
        ${s.errors.eventTime ? `<div class="error">${s.errors.eventTime}</div>` : ''}
      </div>
      <div class="field ${s.errors.venue ? 'has-error' : ''}">
        <label>예식장/장소명 *</label>
        <input type="text" data-bind="venue" value="${escapeAttr(s.data.venue)}" placeholder="예: 서울 그랜드하얏트">
        ${s.errors.venue ? `<div class="error">${s.errors.venue}</div>` : ''}
      </div>
      <div class="field ${s.errors.region ? 'has-error' : ''}">
        <label>출장지역 *</label>
        <div class="radio-group">${regions}</div>
        ${s.errors.region ? `<div class="error">${s.errors.region}</div>` : ''}
        ${s.data.region === 'other' ? '<div class="info-box">출장비는 별도 문의 후 안내됩니다. 계약서 총액에는 포함되지 않습니다.</div>' : ''}
      </div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>
  `;
});

// ============================
// Step 3: 상품 선택
// ============================
registerRenderer(3, s => {
  const cards = Object.values(PRODUCTS).map(p => {
    const checked = s.data.product === p.code ? 'checked' : '';
    const cls = s.data.product === p.code ? 'selected' : '';
    const specs = Object.entries(p.spec).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(' / ');
    return `
      <label class="radio-option ${cls}">
        <input type="radio" name="product" data-bind="product" value="${p.code}" ${checked}>
        <div style="flex:1">
          <div><strong>${p.name}</strong></div>
          <span class="desc">${specs}</span>
        </div>
        <span class="price">${p.basePrice.toLocaleString('ko-KR')}원</span>
      </label>`;
  }).join('');
  return `
    <div class="card">
      <h2>3. 상품 선택</h2>
      <div class="field ${s.errors.product ? 'has-error' : ''}">
        <div class="radio-group">${cards}</div>
        ${s.errors.product ? `<div class="error">${s.errors.product}</div>` : ''}
      </div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>
  `;
});

// ============================
// Step 4: 추가 옵션
// ============================
registerRenderer(4, s => {
  if (!s.data.product) {
    return `<div class="card"><p>상품을 먼저 선택해주세요.</p><div class="actions"><button class="btn btn-secondary" data-action="prev">이전</button></div></div>`;
  }
  const product = PRODUCTS[s.data.product];
  const optionsTable = product.hasWeddingOptions ? OPTIONS_WEDDING : OPTIONS_STUDIO_DOL;
  const options = Object.entries(optionsTable).map(([code, o]) => {
    const checked = s.data.options.includes(code) ? 'checked' : '';
    const cls = s.data.options.includes(code) ? 'selected' : '';
    return `
      <label class="checkbox-option ${cls}">
        <input type="checkbox" data-bind="options" value="${code}" ${checked}>
        <span>${o.name}</span>
        <span class="price">+${o.amount.toLocaleString('ko-KR')}원</span>
      </label>`;
  }).join('');

  // 돌스냅 아이폰 단독 여부
  let dolQuestion = '';
  if (s.data.product === 'dol') {
    const hasMainYes = s.data.dolHasMainSnap === true ? 'checked' : '';
    const hasMainNo = s.data.dolHasMainSnap === false ? 'checked' : '';
    const yesCls = s.data.dolHasMainSnap === true ? 'selected' : '';
    const noCls = s.data.dolHasMainSnap === false ? 'selected' : '';
    dolQuestion = `
      <h3>메인스냅(사진사)이 함께 촬영하나요? *</h3>
      <div class="radio-group">
        <label class="radio-option ${yesCls}">
          <input type="radio" name="dolHasMainSnap" data-bind="dolHasMainSnap" value="true" ${hasMainYes}>
          <span>예, 함께 있습니다</span>
        </label>
        <label class="radio-option ${noCls}">
          <input type="radio" name="dolHasMainSnap" data-bind="dolHasMainSnap" value="false" ${hasMainNo}>
          <span>아니요 (아이폰 스냅 단독)</span>
          <span class="price">+50,000원</span>
        </label>
      </div>
      ${s.errors.dolHasMainSnap ? `<div class="error">${s.errors.dolHasMainSnap}</div>` : ''}
    `;
  }

  return `
    <div class="card">
      <h2>4. 추가 옵션</h2>
      <h3>선택 옵션</h3>
      <div class="checkbox-group">${options}</div>
      ${dolQuestion}
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>
  `;
});

// ============================
// Step 5: 할인 적용
// ============================
registerRenderer(5, s => {
  const immediate = Object.entries(IMMEDIATE_DISCOUNTS).map(([code, d]) => {
    if (d.appliesTo !== 'all' && !d.appliesTo.includes(s.data.product)) return '';
    const checked = s.data.immediateDiscounts.includes(code) ? 'checked' : '';
    const cls = s.data.immediateDiscounts.includes(code) ? 'selected' : '';
    return `
      <label class="checkbox-option ${cls}">
        <input type="checkbox" data-bind="immediateDiscounts" value="${code}" ${checked}>
        <span>${d.name}</span>
        <span class="price">${d.amount.toLocaleString('ko-KR')}원</span>
      </label>`;
  }).join('');

  const promise = Object.entries(PROMISE_DISCOUNTS).map(([code, d]) => {
    const checked = s.data.promiseDiscounts.includes(code) ? 'checked' : '';
    const cls = s.data.promiseDiscounts.includes(code) ? 'selected' : '';
    return `
      <label class="checkbox-option ${cls}">
        <input type="checkbox" data-bind="promiseDiscounts" value="${code}" ${checked}>
        <span>${d.name} <span class="badge-warn">약속</span></span>
        <span class="price">${d.amount.toLocaleString('ko-KR')}원</span>
      </label>`;
  }).join('');

  const partnerField = s.data.immediateDiscounts.includes('partner')
    ? `
      <div class="field ${s.errors.partnerCode ? 'has-error' : ''}" style="margin-top:12px;padding:12px;background:#f4efe5;border-radius:8px">
        <label>짝꿍코드 * (필수 입력)</label>
        <input type="text" data-bind="partnerCode" value="${escapeAttr(s.data.partnerCode)}" placeholder="예: KHR2026">
        ${s.errors.partnerCode ? `<div class="error">${s.errors.partnerCode}</div>` : ''}
      </div>`
    : '';

  return `
    <div class="card">
      <h2>5. 할인 적용</h2>
      <h3>즉시 적용 할인 (총액에서 바로 차감)</h3>
      <div class="checkbox-group">${immediate}</div>
      ${partnerField}
      <h3>후기 약속 할인 (실제 후기 URL 전달 시 잔금에서 차감)</h3>
      <div class="checkbox-group">${promise}</div>
      <div class="info-box">약속 할인은 계약 시점 총액엔 반영되지 않으며, 나중에 후기 작성 후 사장님께 URL을 보내주시면 잔금에서 차감됩니다.</div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>
  `;
});

// ============================
// Step 6: 견적 확인
// ============================
registerRenderer(6, s => {
  const quote = calculateQuote({
    product: s.data.product,
    region: s.data.region,
    options: s.data.options,
    immediateDiscounts: s.data.immediateDiscounts,
    promiseDiscounts: s.data.promiseDiscounts,
    dolHasMainSnap: s.data.dolHasMainSnap,
  });
  const p = n => n.toLocaleString('ko-KR') + '원';
  const product = PRODUCTS[s.data.product];
  const optionsTable = product.hasWeddingOptions ? OPTIONS_WEDDING : OPTIONS_STUDIO_DOL;

  const optionLines = s.data.options.map(code => {
    const o = optionsTable[code];
    return `<div class="quote-line"><span>+ ${o.name}</span><span>+${p(o.amount)}</span></div>`;
  }).join('');

  const immediateLines = s.data.immediateDiscounts.map(code => {
    const d = IMMEDIATE_DISCOUNTS[code];
    const label = code === 'partner' && s.data.partnerCode ? `${d.name} (${s.data.partnerCode})` : d.name;
    return `<div class="quote-line"><span>${label}</span><span>${p(d.amount)}</span></div>`;
  }).join('');

  const promiseLines = s.data.promiseDiscounts.map(code => {
    const d = PROMISE_DISCOUNTS[code];
    return `<div class="quote-line note"><span>${d.name} (약속)</span><span>${p(d.amount)}</span></div>`;
  }).join('');

  const travelLine = quote.travelFee === null
    ? '<div class="quote-line"><span>출장비</span><span class="badge-warn">별도 문의</span></div>'
    : quote.travelFee > 0
      ? `<div class="quote-line"><span>출장비</span><span>+${p(quote.travelFee)}</span></div>`
      : '';

  const dolLine = quote.dolSurcharge > 0
    ? `<div class="quote-line"><span>아이폰 단독 촬영</span><span>+${p(quote.dolSurcharge)}</span></div>`
    : '';

  const promiseNote = s.data.promiseDiscounts.length
    ? `<div class="quote-line note"><span>후기 반영 시 잔금</span><span>${p(quote.balanceAfterReviews)}</span></div>`
    : '';

  const confirmChecked = s.data.quoteConfirmed ? 'checked' : '';

  return `
    <div class="card">
      <h2>6. 견적 확인</h2>
      <div class="quote-summary">
        <div class="quote-line"><span>${product.name}</span><span>${p(quote.subtotal)}</span></div>
        ${travelLine}
        ${optionLines}
        ${dolLine}
        ${immediateLines}
        <div class="quote-line total"><span>총액</span><span>${p(quote.total)}</span></div>
        <div class="quote-line"><span>계약금 (고정)</span><span>${p(quote.deposit)}</span></div>
        <div class="quote-line"><span><strong>잔금</strong></span><span><strong>${p(quote.balance)}</strong></span></div>
        ${promiseLines}
        ${promiseNote}
      </div>
      ${!quote.isQuoteFinal ? '<div class="info-box">출장비는 별도 문의 후 반영되므로, 위 총액에는 출장비가 포함되어 있지 않습니다.</div>' : ''}
      <div class="field ${s.errors.quoteConfirmed ? 'has-error' : ''}">
        <label class="checkbox-option ${s.data.quoteConfirmed ? 'selected' : ''}">
          <input type="checkbox" data-bind="quoteConfirmed" ${confirmChecked}>
          <span>위 금액으로 계약을 진행합니다.</span>
        </label>
        ${s.errors.quoteConfirmed ? `<div class="error">${s.errors.quoteConfirmed}</div>` : ''}
      </div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">서명하기</button>
      </div>
    </div>
  `;
});

// ============================
// Step 7: 서명
// ============================
registerRenderer(7, s => {
  const agreedChecked = s.data.agreed ? 'checked' : '';
  return `
    <div class="card">
      <h2>7. 계약 동의 및 서명</h2>
      <div class="info-box">
        <strong>${PRODUCTS[s.data.product].name}</strong> 상품을 선택하셨습니다.<br>
        계약금 100,000원, 잔금 ${(_lastQuoteTotalMinusDeposit(s)).toLocaleString('ko-KR')}원.<br>
        예식일: ${s.data.eventDate} ${s.data.eventTime} / 장소: ${escapeAttr(s.data.venue)}
      </div>
      <div class="field ${s.errors.agreed ? 'has-error' : ''}">
        <label class="checkbox-option ${s.data.agreed ? 'selected' : ''}">
          <input type="checkbox" data-bind="agreed" ${agreedChecked}>
          <span>위 계약 내용을 충분히 이해했으며, 상품 구성·결제·환불·데이터 보관 규정 모두에 동의합니다.</span>
        </label>
        ${s.errors.agreed ? `<div class="error">${s.errors.agreed}</div>` : ''}
      </div>
      <h3>서명 *</h3>
      <div class="signature-wrap ${s.errors.signature ? 'has-error' : ''}" style="${s.errors.signature ? 'border-color:#c00' : ''}">
        <canvas id="signature-canvas" class="signature-pad"></canvas>
      </div>
      <div class="signature-actions">
        <button type="button" class="btn-clear" id="clear-signature">다시 서명</button>
      </div>
      ${s.errors.signature ? `<div class="error">${s.errors.signature}</div>` : ''}
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">계약 완료</button>
      </div>
    </div>
  `;
}, (s) => {
  // afterRender: signature_pad 초기화
  const canvas = document.getElementById('signature-canvas');
  if (!canvas) return;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  canvas.getContext('2d').scale(ratio, ratio);
  const pad = new SignaturePad(canvas, { backgroundColor: '#fff' });
  if (s.data.signature) pad.fromDataURL(s.data.signature);
  pad.addEventListener('endStroke', () => {
    s.data.signature = pad.toDataURL('image/png');
  });
  document.getElementById('clear-signature').addEventListener('click', () => {
    pad.clear();
    s.data.signature = '';
  });
});

function _lastQuoteTotalMinusDeposit(s) {
  const q = calculateQuote({
    product: s.data.product,
    region: s.data.region,
    options: s.data.options,
    immediateDiscounts: s.data.immediateDiscounts,
    promiseDiscounts: s.data.promiseDiscounts,
    dolHasMainSnap: s.data.dolHasMainSnap,
  });
  return q.balance;
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// ============================
// Step 8: 완료
// ============================
const submissionState = { status: 'idle', error: null, pdfBlob: null, pdfFilename: null };

registerRenderer(8, s => {
  if (submissionState.status === 'idle') {
    // 첫 진입 시 자동 제출
    setTimeout(() => submitContract(), 100);
    return `<div class="card"><h2>계약서 생성 중...</h2><p>잠시만 기다려주세요.</p></div>`;
  }
  if (submissionState.status === 'submitting') {
    return `<div class="card"><h2>이메일 전송 중...</h2><p>PDF 생성 및 사장님께 발송하고 있습니다.</p></div>`;
  }
  if (submissionState.status === 'success') {
    return `
      <div class="card success-box">
        <div class="check">✓</div>
        <h2>계약이 완료되었습니다!</h2>
        <p>계약서 PDF가 자동으로 다운로드되었으며, 사장님께도 전달되었습니다.</p>
        <div class="info-box" style="text-align:left">
          <strong>다음 단계:</strong><br>
          아래 계좌로 <strong>계약금 100,000원</strong>을 입금해주시면 예약이 최종 확정됩니다.
        </div>
        <div style="text-align:left;padding:16px;background:#f4efe5;border-radius:8px;margin-top:12px">
          <div><strong>계좌:</strong> ${OWNER_INFO.bankName} ${OWNER_INFO.bankAccount}</div>
          <div><strong>예금주:</strong> ${OWNER_INFO.accountHolder}</div>
          <div style="margin-top:8px"><strong>카카오톡:</strong> ${OWNER_INFO.kakaoContact}</div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" id="redownload-btn">PDF 다시 다운로드</button>
        </div>
      </div>
    `;
  }
  if (submissionState.status === 'partial') {
    // 이메일 실패, PDF는 다운로드됨
    return `
      <div class="card success-box">
        <div class="check" style="color:#f5a623">⚠</div>
        <h2>계약서는 생성되었습니다</h2>
        <p>PDF는 다운로드 완료되었으나, 이메일 자동 발송에 실패했습니다.</p>
        <div class="info-box">
          다운로드된 PDF 파일을 카카오톡으로 사장님(<strong>${OWNER_INFO.kakaoContact}</strong>)께 직접 전달해주세요.
        </div>
        <p style="color:#999;font-size:12px">에러: ${submissionState.error || ''}</p>
        <div class="actions">
          <button class="btn btn-secondary" id="redownload-btn">PDF 다시 다운로드</button>
        </div>
      </div>
    `;
  }
  // error 상태
  return `
    <div class="card">
      <h2>오류가 발생했습니다</h2>
      <p>${submissionState.error || '알 수 없는 오류'}</p>
      <div class="actions">
        <button class="btn btn-primary" id="retry-btn">다시 시도</button>
      </div>
    </div>
  `;
}, () => {
  const redl = document.getElementById('redownload-btn');
  if (redl) redl.addEventListener('click', () => {
    if (submissionState.pdfBlob) downloadBlob(submissionState.pdfBlob, submissionState.pdfFilename);
  });
  const retry = document.getElementById('retry-btn');
  if (retry) retry.addEventListener('click', () => {
    submissionState.status = 'idle';
    render();
  });
});

async function submitContract() {
  submissionState.status = 'submitting';
  render();
  try {
    const result = await generateContractPDF(state.data);
    submissionState.pdfBlob = result.blob;
    submissionState.pdfFilename = result.filename;
    downloadBlob(result.blob, result.filename);

    try {
      await sendContractEmail({
        formData: state.data,
        quote: result.quote,
        pdfBase64: result.base64,
        pdfFilename: result.filename,
      });
      submissionState.status = 'success';
    } catch (emailErr) {
      console.error('EmailJS 실패:', emailErr);
      submissionState.error = emailErr.message;
      submissionState.status = 'partial';
    }
  } catch (err) {
    console.error('PDF 생성 실패:', err);
    submissionState.error = err.message;
    submissionState.status = 'error';
  }
  render();
}
