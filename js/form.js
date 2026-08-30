import {
  PRODUCTS,
  TRAVEL_FEE,
  IMMEDIATE_DISCOUNTS,
  PROMISE_DISCOUNTS,
  OPTIONS_WEDDING,
  OPTIONS_STUDIO_DOL,
  OWNER_INFO,
  FIXED_DEPOSIT,
} from './config.js';
import { validateStep } from './validators.js';
import { calculateQuote } from './pricing.js';
import { generateContractPDF, downloadBlob } from './pdf.js';

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
      // 텍스트/tel/date/time 입력은 state만 업데이트 (한글 IME 조합이 재렌더로 깨지는 문제 방지)
      el.addEventListener('input', () => {
        state.data[key] = el.value;
      });
      // blur 시점에만 재렌더 (에러 표시 등 최신 상태 반영)
      el.addEventListener('blur', () => {
        state.data[key] = el.value;
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
        <input type="text" id="fp-date" data-bind="eventDate" value="${s.data.eventDate}" placeholder="예식 날짜를 선택하세요" readonly>
        ${s.errors.eventDate ? `<div class="error">${s.errors.eventDate}</div>` : ''}
      </div>
      <div class="field ${s.errors.eventTime ? 'has-error' : ''}">
        <label>예식시간 *</label>
        <input type="text" id="fp-time" data-bind="eventTime" value="${s.data.eventTime}" placeholder="예식 시간을 선택하세요" readonly>
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
}, (s) => {
  // Step 2 afterRender: flatpickr 초기화 (한국어)
  if (typeof flatpickr === 'undefined') return;
  const koLocale = window.flatpickr?.l10ns?.ko || 'ko';

  const dateEl = document.getElementById('fp-date');
  if (dateEl) {
    flatpickr(dateEl, {
      locale: koLocale,
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'Y년 m월 d일 (D)',
      minDate: 'today',
      onChange: (selectedDates, dateStr) => {
        s.data.eventDate = dateStr;
      },
    });
  }
  const timeEl = document.getElementById('fp-time');
  if (timeEl) {
    flatpickr(timeEl, {
      locale: koLocale,
      enableTime: true,
      noCalendar: true,
      dateFormat: 'H:i',
      time_24hr: false,
      minuteIncrement: 10,
      onChange: (selectedDates, dateStr) => {
        s.data.eventTime = dateStr;
      },
    });
  }
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
    return `<div class="quote-line promise-line"><span>${d.name} <span class="badge-warn">약속</span></span><span>${p(d.amount)}</span></div>`;
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
    ? `<div class="quote-line promise-total"><span>✨ 후기 반영 시 최종 잔금</span><span>${p(quote.balanceAfterReviews)}</span></div>`
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
        <div class="quote-line balance"><span>잔금</span><span>${p(quote.balance)}</span></div>
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
        계약금 ${FIXED_DEPOSIT.toLocaleString('ko-KR')}원, 잔금 ${(_lastQuoteTotalMinusDeposit(s)).toLocaleString('ko-KR')}원.<br>
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
    setTimeout(() => submitContract(), 100);
    return `<div class="card"><h2>계약서 생성 중...</h2><p>잠시만 기다려주세요.</p></div>`;
  }
  if (submissionState.status === 'submitting') {
    return `<div class="card"><h2>PDF 생성 중...</h2><p>계약서를 만들고 있습니다.</p></div>`;
  }
  if (submissionState.status === 'success') {
    const productName = PRODUCTS[s.data.product]?.name || '';
    return `
      <div class="card success-box">
        <div class="check">✓</div>
        <h2>계약서가 준비되었습니다!</h2>
        <p style="color:var(--text-mute)">서명된 계약서 PDF가 다운로드되었습니다.</p>

        <div class="send-primary-box">
          <div class="send-primary-title">📤 이제 사장님께 계약서를 전송해주세요</div>
          <button id="share-pdf-btn" class="btn btn-share">
            📎 계약서 사장님께 전송하기
          </button>
          <div id="share-hint" class="send-hint">
            <span class="share-mobile-hint">모바일: 공유 시트에서 <strong>카카오톡</strong> 선택 후 큐피돈 채널 선택</span>
            <span class="share-desktop-hint">PC: 카톡 채널이 열리면, 다운로드된 PDF를 채팅창에 드래그해서 넣어주세요</span>
          </div>
        </div>

        <div class="send-steps">
          <div class="send-steps-title">📋 전송 방법 안내</div>
          <ol class="send-steps-list">
            <li>위 <strong>"계약서 사장님께 전송하기"</strong> 버튼 클릭</li>
            <li><strong>카카오톡</strong> 앱 또는 <strong>채널 채팅창</strong>이 열림</li>
            <li>방금 다운로드된 <strong>PDF 파일</strong>을 채팅창에 첨부해서 전송</li>
          </ol>
        </div>

        <div class="actions" style="flex-direction:column;gap:10px;margin-top:16px">
          <button class="btn btn-secondary" id="redownload-btn">PDF 다시 다운로드</button>
          <button class="btn btn-secondary" id="copy-msg-btn">📋 채팅 메시지 복사 (${productName})</button>
        </div>

        <div class="deposit-box">
          <div class="deposit-title">💰 계약금 입금 안내</div>
          <div class="deposit-alert">
            <div class="deposit-alert-title">⏰ 1시간 이내 입금 필수</div>
            <div class="deposit-alert-body">계약금 <strong>${FIXED_DEPOSIT.toLocaleString('ko-KR')}원</strong>을
            <strong>1시간 이내</strong>로 입금해주셔야 예약이 <strong>최종 확정</strong>됩니다.<br>
            <span style="font-size:12px;color:#8a6d3b">시간 내 미입금 시 예약이 자동 취소될 수 있습니다.</span></div>
          </div>
          <div class="deposit-account">
            <div><strong>은행:</strong> ${OWNER_INFO.bankName}</div>
            <div><strong>계좌:</strong> ${OWNER_INFO.bankAccount}</div>
            <div><strong>예금주:</strong> ${OWNER_INFO.accountHolder}</div>
            <button class="btn-copy-account" id="copy-account-btn">계좌번호 복사</button>
          </div>
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

  // ========== 계약서 전송 버튼 (Web Share API + 폴백) ==========
  const shareBtn = document.getElementById('share-pdf-btn');
  if (shareBtn) {
    const canShareFile = () => {
      if (!navigator.share || !submissionState.pdfBlob) return false;
      const file = new File([submissionState.pdfBlob], submissionState.pdfFilename, { type: 'application/pdf' });
      return navigator.canShare && navigator.canShare({ files: [file] });
    };

    // 지원 여부에 따라 힌트 문구 조정
    const hint = document.getElementById('share-hint');
    if (hint) {
      if (canShareFile()) {
        hint.querySelector('.share-mobile-hint').style.display = 'block';
        hint.querySelector('.share-desktop-hint').style.display = 'none';
      } else {
        hint.querySelector('.share-mobile-hint').style.display = 'none';
        hint.querySelector('.share-desktop-hint').style.display = 'block';
      }
    }

    shareBtn.addEventListener('click', async () => {
      const message = buildKakaoMessage();
      // 1) Web Share API 사용 가능 시 → 카톡 앱에 파일 첨부 (진짜 자동 첨부!)
      if (canShareFile()) {
        try {
          const file = new File([submissionState.pdfBlob], submissionState.pdfFilename, { type: 'application/pdf' });
          await navigator.share({
            title: '큐피돈 스냅 계약서',
            text: message,
            files: [file],
          });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return; // 사용자가 취소
          console.warn('Web Share 실패, 폴백:', err);
        }
      }
      // 2) 폴백: 클립보드에 메시지 복사 + 카톡 채널 새 탭 오픈
      try {
        await navigator.clipboard.writeText(message);
        alert('📋 채팅 메시지가 복사되었습니다.\n\n카카오톡 채팅창이 열리면:\n1) 메시지 붙여넣기(Ctrl+V)\n2) + 버튼 눌러 다운로드된 PDF 파일 첨부\n3) 전송');
      } catch (e) {
        // 클립보드 실패해도 카톡 창은 열어줌
      }
      window.open(OWNER_INFO.kakaoChannelUrl, '_blank', 'noopener');
    });
  }

  // 채팅 메시지 복사 버튼
  const copyMsg = document.getElementById('copy-msg-btn');
  if (copyMsg) {
    copyMsg.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(buildKakaoMessage());
        copyMsg.textContent = '✓ 복사되었습니다';
        setTimeout(() => { copyMsg.textContent = '📋 채팅 메시지 복사'; }, 2000);
      } catch (e) {
        alert('복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
      }
    });
  }

  // 계좌번호 복사 버튼
  const copyAcc = document.getElementById('copy-account-btn');
  if (copyAcc) {
    copyAcc.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(OWNER_INFO.bankAccount);
        copyAcc.textContent = '✓ 복사됨';
        setTimeout(() => { copyAcc.textContent = '계좌번호 복사'; }, 2000);
      } catch (e) {
        alert('복사에 실패했습니다.');
      }
    });
  }
});

function buildKakaoMessage() {
  const d = state.data;
  const productName = PRODUCTS[d.product]?.name || '';
  return `[큐피돈 아이폰 스냅 계약]
성함: ${d.customerName}
연락처: ${d.customerPhone}
상품: ${productName}
예식일: ${d.eventDate} ${d.eventTime}
장소: ${d.venue}

계약서 PDF 첨부드립니다. 확인 부탁드립니다!`;
}

async function submitContract() {
  submissionState.status = 'submitting';
  render();
  try {
    const result = await generateContractPDF(state.data);
    submissionState.pdfBlob = result.blob;
    submissionState.pdfFilename = result.filename;
    downloadBlob(result.blob, result.filename);
    submissionState.status = 'success';
  } catch (err) {
    console.error('PDF 생성 실패:', err);
    submissionState.error = err.message;
    submissionState.status = 'error';
  }
  render();
}
