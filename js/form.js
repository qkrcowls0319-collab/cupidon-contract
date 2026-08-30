import { TRAVEL_FEE } from './config.js';
import { validateStep } from './validators.js';

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
  // 실시간 재렌더 필요한 경우 오버라이드 가능
  const hook = afterRenderHooks['onChange_' + state.currentStep];
  if (hook) hook(state);
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

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
