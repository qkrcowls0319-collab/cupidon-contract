import {
  PRODUCTS,
  TRAVEL_FEE,
  OWNER_INFO,
  SHEETS_WEBHOOK_URLS,
} from './config.js';
import { validateStep } from './validators.js';
import {
  calculateQuote,
  getOptionsTable,
  getImmediateDiscounts,
  getPromiseDiscounts,
  getTravelFeeTable,
  resolveOptionAmount,
  isBundle,
  MUTUAL_EXCLUSIVE_OPTIONS,
} from './pricing.js';
import { generateContractPDF, downloadBlob } from './pdf.js';

const STORAGE_KEY = 'cupidon-contract-session-v1';

const DEFAULT_DATA = {
  customerName: '',
  customerPhone: '',
  eventDate: '',
  eventTime: '',
  venue: '',
  region: '',
  customTravelFee: '',  // region==='other' 일 때 사장님이 안내한 출장비 (원)
  product: '',
  options: [],
  dolHasMainSnap: null,
  immediateDiscounts: [],
  promiseDiscounts: [],
  partnerCode: '',
  quoteConfirmed: false,
  signature: '',
  agreed: false,
  submittedAt: '',      // 시트 전송 완료 시각 (중복 전송 방지 플래그)
  submissionId: '',     // 고유 제출 ID (서버측 중복 검증용)
};

// localStorage에서 저장된 세션 복원 (있으면)
function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 저장된 세션이 7일 이상 지났으면 폐기 (오래된 데이터 방지)
    if (parsed.savedAt && (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn('세션 복원 실패:', e);
    return null;
  }
}

const _saved = loadSavedState();
export const state = {
  currentStep: _saved?.currentStep || 1,
  totalSteps: 8,
  errors: {},
  data: { ...DEFAULT_DATA, ...(_saved?.data || {}) },
};

// 세션 저장 (data 또는 currentStep 변경 시 호출)
function saveSession() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentStep: state.currentStep,
      data: state.data,
      savedAt: Date.now(),
    }));
  } catch (e) {
    console.warn('세션 저장 실패:', e);
  }
}

// 세션 초기화 (계약 완료 후 "새로 시작" 등에서 사용)
export function resetSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  state.currentStep = 1;
  state.data = { ...DEFAULT_DATA };
  state.errors = {};
  submissionState.status = 'idle';
  submissionState.error = null;
  submissionState.pdfBlob = null;
  submissionState.pdfFilename = null;
  render();
}

const renderers = {}; // step번호 → 렌더 함수
const afterRenderHooks = {}; // step 렌더 후 실행할 훅 (signature_pad 초기화 등)

export function registerRenderer(step, fn, afterRender = null) {
  renderers[step] = fn;
  if (afterRender) afterRenderHooks[step] = afterRender;
}

let _resumeBannerShown = false;
export function render() {
  const app = document.getElementById('app');
  const indicator = document.getElementById('step-indicator');
  // 재접속 안내 배너 (한 번만)
  if (_saved && !_resumeBannerShown && state.currentStep > 1) {
    _resumeBannerShown = true;
    const banner = document.createElement('div');
    banner.className = 'info-box';
    banner.style.cssText = 'background:#EAF4FF;border-left-color:#5B8DEF;margin-bottom:16px';
    banner.innerHTML = `
      💡 이전 진행 내역을 불러왔어요 (Step ${state.currentStep}부터 이어서 진행).
      &nbsp; <a href="#" id="reset-session-link" style="color:#5B8DEF;font-weight:600">처음부터 다시 시작</a>
    `;
    const container = document.querySelector('.container');
    if (container) {
      const existing = container.querySelector('.info-box[data-resume]');
      if (existing) existing.remove();
      banner.setAttribute('data-resume', '1');
      container.insertBefore(banner, document.getElementById('step-indicator'));
      const link = banner.querySelector('#reset-session-link');
      if (link) link.addEventListener('click', e => {
        e.preventDefault();
        if (confirm('저장된 진행 내역을 삭제하고 Step 1부터 시작하시겠어요?')) {
          resetSession();
          banner.remove();
        }
      });
    }
  }

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
          if (el.checked) {
            state.data[key] = [...state.data[key], val];
            // 번들 티어 상호배타 — 같은 그룹의 다른 옵션은 자동 해제
            if (key === 'options') {
              MUTUAL_EXCLUSIVE_OPTIONS.forEach(group => {
                if (group.includes(val)) {
                  state.data.options = state.data.options.filter(
                    v => v === val || !group.includes(v)
                  );
                }
              });
            }
          } else {
            state.data[key] = state.data[key].filter(v => v !== val);
          }
        } else {
          state.data[key] = el.checked;
        }
        saveSession();
        onDataChange();
      });
    } else if (el.type === 'radio') {
      el.addEventListener('change', () => {
        if (el.checked) {
          state.data[key] = el.value === 'true' ? true : el.value === 'false' ? false : el.value;
          saveSession();
          onDataChange();
        }
      });
    } else {
      // 텍스트/tel/date/time 입력은 state만 업데이트 (한글 IME 조합이 재렌더로 깨지는 문제 방지)
      el.addEventListener('input', () => {
        state.data[key] = el.value;
      });
      // blur 시점에 세션 저장
      el.addEventListener('blur', () => {
        state.data[key] = el.value;
        saveSession();
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
    saveSession();
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
    saveSession();
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
        ${s.data.region === 'other' ? `
          <div style="margin-top:12px;padding:12px;background:#f4efe5;border-radius:8px">
            <label style="display:block;margin-bottom:6px;font-weight:600">사장님 안내 출장비 (원)</label>
            <input type="number" min="0" step="1000" data-bind="customTravelFee"
                   value="${escapeAttr(String(s.data.customTravelFee || ''))}"
                   placeholder="예: 100000" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px">
            <div style="margin-top:6px;font-size:12px;color:#6B4E1E">
              사장님이 안내한 금액을 입력하면 총액에 즉시 반영됩니다. 미입력 시 '별도 문의'로 처리 (총액 미포함).
            </div>
          </div>
        ` : ''}
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
// Step 3: 상품 선택 (카테고리별 그룹핑)
// ============================
registerRenderer(3, s => {
  const renderCard = p => {
    const checked = s.data.product === p.code ? 'checked' : '';
    const cls = s.data.product === p.code ? 'selected' : '';
    const specs = Object.entries(p.spec).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(' / ');
    const subtitle = p.subtitle ? ` <span style="color:#888;font-size:13px">· ${p.subtitle}</span>` : '';
    return `
      <label class="radio-option ${cls}">
        <input type="radio" name="product" data-bind="product" value="${p.code}" ${checked}>
        <div style="flex:1">
          <div><strong>${p.name}</strong>${subtitle}</div>
          <span class="desc">${specs}</span>
        </div>
        <span class="price">${p.basePrice.toLocaleString('ko-KR')}원</span>
      </label>`;
  };

  const snapProducts = Object.values(PRODUCTS).filter(p => p.category === 'snap').map(renderCard).join('');
  const chukuidaeProducts = Object.values(PRODUCTS).filter(p => p.category === 'chukuidae').map(renderCard).join('');

  return `
    <div class="card">
      <h2>3. 상품 선택</h2>
      <div class="field ${s.errors.product ? 'has-error' : ''}">
        <h3 style="margin-top:8px">📸 아이폰 스냅</h3>
        <div class="radio-group">${snapProducts}</div>

        <h3 style="margin-top:20px">🎀 큐피돈 × 더체크 축의대</h3>
        <div class="radio-group">${chukuidaeProducts}</div>

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
// Step 4: 추가 옵션 (카테고리별 옵션 테이블)
// ============================
registerRenderer(4, s => {
  if (!s.data.product) {
    return `<div class="card"><p>상품을 먼저 선택해주세요.</p><div class="actions"><button class="btn btn-secondary" data-action="prev">이전</button></div></div>`;
  }
  const product = PRODUCTS[s.data.product];
  const optionsTable = getOptionsTable(product, s.data.options);
  // 카테고리별로 옵션 분리 렌더 (본 상품 옵션 / 번들 상대편 옵션)
  const bundleActive = isBundle(product, s.data.options);
  const renderOpt = ([code, o]) => {
    const checked = s.data.options.includes(code) ? 'checked' : '';
    const cls = s.data.options.includes(code) ? 'selected' : '';
    const amount = resolveOptionAmount(product, code);
    return `
      <label class="checkbox-option ${cls}">
        <input type="checkbox" data-bind="options" value="${code}" ${checked}>
        <span>${o.name}</span>
        <span class="price">+${amount.toLocaleString('ko-KR')}원</span>
      </label>`;
  };

  // 옵션을 "본상품 옵션"과 "번들 상대편 옵션"으로 분리
  const isChukuidaeOptCode = code => ['readyBag', 'offlineLedger', 'thankyouSMS'].includes(code);
  const isSnapBundleCode = code => ['snapSpecialBundle', 'snapPremiumBundle'].includes(code);
  const isChukuidaeBundleCode = code => ['chukuidae1', 'chukuidae2', 'chukuidae4'].includes(code);

  const entries = Object.entries(optionsTable);
  let ownGroup, otherGroup, otherGroupTitle;
  if (product.category === 'snap') {
    // 스냅 본 옵션 = chukuidae2/4 포함 (번들 트리거); 번들 활성 시 축의대 순수 옵션 별도 그룹
    ownGroup = entries.filter(([c]) => !isChukuidaeOptCode(c));
    otherGroup = entries.filter(([c]) => isChukuidaeOptCode(c));
    otherGroupTitle = '축의대 추가 옵션 (번들 시)';
  } else {
    // 축의대 본 옵션 = readyBag/offlineLedger/thankyouSMS + snap 번들 트리거
    ownGroup = entries.filter(([c]) => !isSnapBundleCode(c) && !isChukuidaeBundleCode(c) || isSnapBundleCode(c));
    otherGroup = entries.filter(([c]) => !isSnapBundleCode(c) && !isChukuidaeOptCode(c));
    otherGroupTitle = '스냅 추가 옵션 (번들 시)';
  }

  const ownHtml = ownGroup.map(renderOpt).join('');
  const otherHtml = bundleActive && otherGroup.length
    ? `<h3 style="margin-top:16px">${otherGroupTitle}</h3><div class="checkbox-group">${otherGroup.map(renderOpt).join('')}</div>`
    : '';

  const bundleNote = bundleActive
    ? '<div class="info-box" style="margin-top:12px">✨ 스냅 ⇄ 축의대 번들 조합이 적용됩니다. 어느 쪽에서 시작해도 최종 금액이 동일하도록 계산됩니다.</div>'
    : '';

  // 돌스냅 아이폰 단독 여부 (돌스냅에만 노출)
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
      <div class="checkbox-group">${ownHtml}</div>
      ${otherHtml}
      ${bundleNote}
      ${dolQuestion}
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>
  `;
});

// ============================
// Step 5: 할인 적용 (카테고리별 할인 테이블)
// ============================
registerRenderer(5, s => {
  const product = PRODUCTS[s.data.product];
  const immediateTable = getImmediateDiscounts(product, s.data.options);
  const promiseTable = getPromiseDiscounts(product, s.data.options);

  const immediate = Object.entries(immediateTable).map(([code, d]) => {
    if (d.appliesTo && d.appliesTo !== 'all' && !d.appliesTo.includes(s.data.product)) return '';
    const checked = s.data.immediateDiscounts.includes(code) ? 'checked' : '';
    const cls = s.data.immediateDiscounts.includes(code) ? 'selected' : '';
    return `
      <label class="checkbox-option ${cls}">
        <input type="checkbox" data-bind="immediateDiscounts" value="${code}" ${checked}>
        <span>${d.name}</span>
        <span class="price">${d.amount.toLocaleString('ko-KR')}원</span>
      </label>`;
  }).join('');

  const promise = Object.entries(promiseTable).map(([code, d]) => {
    const checked = s.data.promiseDiscounts.includes(code) ? 'checked' : '';
    const cls = s.data.promiseDiscounts.includes(code) ? 'selected' : '';
    return `
      <label class="checkbox-option ${cls}">
        <input type="checkbox" data-bind="promiseDiscounts" value="${code}" ${checked}>
        <span>${d.name} <span class="badge-warn">약속</span></span>
        <span class="price">${d.amount.toLocaleString('ko-KR')}원</span>
      </label>`;
  }).join('');

  // 짝꿍코드는 스냅 상품 전용 (축의대엔 없음)
  const partnerField = s.data.immediateDiscounts.includes('partner') && product?.category === 'snap'
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
    customTravelFee: s.data.customTravelFee,
  });
  const p = n => n.toLocaleString('ko-KR') + '원';
  const product = PRODUCTS[s.data.product];
  const optionsTable = getOptionsTable(product, s.data.options);
  const immediateTable = getImmediateDiscounts(product, s.data.options);
  const promiseTable = getPromiseDiscounts(product, s.data.options);

  const optionLines = s.data.options.map(code => {
    const o = optionsTable[code];
    if (!o) return '';
    const amt = resolveOptionAmount(product, code);
    return `<div class="quote-line"><span>+ ${o.name}</span><span>+${p(amt)}</span></div>`;
  }).join('');

  const immediateLines = s.data.immediateDiscounts.map(code => {
    const d = immediateTable[code];
    if (!d) return '';
    const label = code === 'partner' && s.data.partnerCode ? `${d.name} (${s.data.partnerCode})` : d.name;
    return `<div class="quote-line"><span>${label}</span><span>${p(d.amount)}</span></div>`;
  }).join('');

  const promiseLines = s.data.promiseDiscounts.map(code => {
    const d = promiseTable[code];
    if (!d) return '';
    return `<div class="quote-line promise-line"><span>${d.name} <span class="badge-warn">약속</span></span><span>${p(d.amount)}</span></div>`;
  }).join('');

  const travelLabel = s.data.region === 'other' ? '출장비 (사장님 안내)' : '출장비';
  const travelLine = quote.travelFee === null
    ? '<div class="quote-line"><span>출장비</span><span class="badge-warn">별도 문의</span></div>'
    : quote.travelFee > 0
      ? `<div class="quote-line"><span>${travelLabel}</span><span>+${p(quote.travelFee)}</span></div>`
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
  const quote7 = _computeQuote(s);
  return `
    <div class="card">
      <h2>7. 계약 동의 및 서명</h2>
      <div class="info-box">
        <strong>${PRODUCTS[s.data.product].name}</strong> 상품을 선택하셨습니다.<br>
        계약금 ${quote7.deposit.toLocaleString('ko-KR')}원, 잔금 ${quote7.balance.toLocaleString('ko-KR')}원.<br>
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

function _computeQuote(s) {
  return calculateQuote({
    product: s.data.product,
    region: s.data.region,
    options: s.data.options,
    immediateDiscounts: s.data.immediateDiscounts,
    promiseDiscounts: s.data.promiseDiscounts,
    dolHasMainSnap: s.data.dolHasMainSnap,
    customTravelFee: s.data.customTravelFee,
  });
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
    return `
      <div class="card success-box">
        <div class="check">✓</div>
        <h2>신청이 완료되었습니다!</h2>
        <p style="color:var(--text-mute)">서명된 계약서 PDF가 참고용으로 다운로드되었습니다.</p>

        <div class="send-primary-box">
          <div class="send-primary-title">📮 사장님께 신청 내역 보내기</div>
          <div style="font-size:13px;color:#6B4E1E;line-height:1.6;margin-bottom:12px">
            아래 버튼을 누르면 <strong>신청 내역이 자동 복사되고 카카오톡 채널이 열립니다.</strong><br>
            채팅창에 <strong>붙여넣기(길게 눌러 붙여넣기 또는 Ctrl+V)</strong> 하고 전송해주세요.
          </div>
          <button id="send-to-kakao-btn" class="btn btn-share">
            📋 신청 내역 복사 + 카톡 채널 열기
          </button>
        </div>

        <div class="send-steps">
          <div class="send-steps-title">✅ 이후 진행 절차</div>
          <ol class="send-steps-list">
            <li>사장님이 신청 내역 확인 후 <strong>예약 등록</strong></li>
            <li>고객님이 아래 계좌로 <strong>계약금 ${_computeQuote(s).deposit.toLocaleString('ko-KR')}원 입금</strong> (1시간 이내)</li>
            <li>사장님이 <strong>서명된 계약서 PDF를 카톡으로 전달</strong>드립니다</li>
          </ol>
        </div>

        <div class="actions" style="flex-direction:column;gap:10px;margin-top:16px">
          <button class="btn btn-secondary" id="copy-msg-btn">📋 신청 내역만 복사</button>
          <button class="btn btn-secondary" id="redownload-btn">PDF 다시 다운로드</button>
          <button class="btn btn-secondary" id="new-contract-btn" style="color:#999">🔄 새 계약 시작 (현재 세션 삭제)</button>
        </div>

        <div class="deposit-box">
          <div class="deposit-title">💰 계약금 입금 안내</div>
          <div class="deposit-alert">
            <div class="deposit-alert-title">⏰ 1시간 이내 입금 필수</div>
            <div class="deposit-alert-body">계약금 <strong>${_computeQuote(s).deposit.toLocaleString('ko-KR')}원</strong>을
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

  // ========== 신청 내역 복사 + 카톡 채널 열기 (메인 액션) ==========
  const sendBtn = document.getElementById('send-to-kakao-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      // 1) 카톡 채널 창을 먼저 오픈 (사용자 클릭 컨텍스트 안에서 → 팝업 차단 회피)
      const kakaoWin = window.open(OWNER_INFO.kakaoChannelUrl, '_blank', 'noopener,noreferrer');

      // 2) 클립보드 복사
      const message = buildKakaoMessage();
      let copied = false;
      try {
        await navigator.clipboard.writeText(message);
        copied = true;
      } catch (e) {
        // 클립보드 실패 시 폴백: 화면에 텍스트 노출
        console.warn('clipboard write failed:', e);
      }

      // 3) 시각 피드백
      sendBtn.textContent = copied ? '✓ 복사 완료! 카톡 창에서 붙여넣기' : '⚠ 자동 복사 실패 (수동 복사 필요)';
      sendBtn.style.background = copied ? '#4CAF50' : '#F5A623';
      sendBtn.style.color = '#fff';
      setTimeout(() => {
        sendBtn.textContent = '📋 신청 내역 복사 + 카톡 채널 열기';
        sendBtn.style.background = '';
        sendBtn.style.color = '';
      }, 3500);

      // 클립보드 실패 시 아래 fallback 영역에 텍스트 표시
      if (!copied) {
        showFallbackMessage(message);
      }
    });
  }

  // 신청 내역만 복사 버튼
  const copyMsg = document.getElementById('copy-msg-btn');
  if (copyMsg) {
    copyMsg.addEventListener('click', async () => {
      const message = buildKakaoMessage();
      try {
        await navigator.clipboard.writeText(message);
        copyMsg.textContent = '✓ 복사되었습니다';
        setTimeout(() => { copyMsg.textContent = '📋 신청 내역만 복사'; }, 2000);
      } catch (e) {
        showFallbackMessage(message);
      }
    });
  }

  // 새 계약 시작 버튼
  const newBtn = document.getElementById('new-contract-btn');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      if (confirm('현재 진행 중인 계약 세션을 삭제하고 처음부터 다시 시작하시겠어요?\n(이미 완료된 계약서와 카톡 전송에는 영향 없음)')) {
        resetSession();
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
        showFallbackMessage(OWNER_INFO.bankAccount);
      }
    });
  }
});

function showFallbackMessage(text) {
  let box = document.getElementById('fallback-copy-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'fallback-copy-box';
    box.className = 'info-box';
    box.style.cssText = 'margin-top:12px;background:#FFF4E0;border-left-color:#F5A623';
    box.innerHTML = `
      <div style="font-weight:600;margin-bottom:8px">자동 복사 실패 — 아래 텍스트를 직접 복사해주세요</div>
      <textarea readonly style="width:100%;min-height:160px;padding:10px;border:1px solid #ccc;border-radius:6px;font-family:inherit;font-size:12px"></textarea>
    `;
    const card = document.querySelector('.card.success-box') || document.querySelector('.card');
    if (card) card.appendChild(box);
  }
  const ta = box.querySelector('textarea');
  if (ta) {
    ta.value = text;
    ta.select();
  }
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function buildKakaoMessage() {
  const d = state.data;
  const product = PRODUCTS[d.product];
  const productName = product?.name || '';
  const optionsTable = getOptionsTable(product, d.options);
  const immediateTable = getImmediateDiscounts(product, d.options);
  const promiseTable = getPromiseDiscounts(product, d.options);
  const travelTable = getTravelFeeTable(product, d.options);
  const p = n => n.toLocaleString('ko-KR');

  const quote = calculateQuote({
    product: d.product,
    region: d.region,
    options: d.options,
    immediateDiscounts: d.immediateDiscounts,
    promiseDiscounts: d.promiseDiscounts,
    dolHasMainSnap: d.dolHasMainSnap,
    customTravelFee: d.customTravelFee,
  });

  const regionLabel = travelTable[d.region]?.name || TRAVEL_FEE[d.region]?.name || d.region;
  const categoryLabel = quote.isBundle
    ? '스냅+축의대 번들'
    : product?.category === 'chukuidae' ? '축의대' : '스냅';

  // 상품 + 옵션 (인라인)
  const optionText = d.options.length
    ? d.options.map(c => optionsTable[c]?.name).filter(Boolean).join(', ')
    : '';
  const dolAlone = d.product === 'dol' && d.dolHasMainSnap === false ? ' + 아이폰 단독(+50,000)' : '';
  const productLine = optionText
    ? `📷 상품: ${productName} + ${optionText}${dolAlone}`
    : `📷 상품: ${productName}${dolAlone}`;

  // 할인 요약 (카테고리별 축약 라벨)
  const shortLabels = {
    sameDay: '당일계약', portrait: '초상권', partner: '짝꿍',
    blogPromise: '블로그', cupidonPromise: '큐피돈',
    contractReview: '계약후기', usageReview: '이용후기',
  };
  const immediateText = d.immediateDiscounts.length
    ? d.immediateDiscounts.map(c => {
        if (c === 'partner' && d.partnerCode) return `짝꿍[${d.partnerCode}]`;
        return shortLabels[c] || immediateTable[c]?.name || c;
      }).join(', ')
    : '없음';

  const promiseText = d.promiseDiscounts.length
    ? d.promiseDiscounts.map(c => shortLabels[c] || promiseTable[c]?.name || c).join(', ')
    : '';

  const promiseLine = promiseText
    ? `\n🎁 후기 약속: ${promiseText} → 최종 잔금 ${p(quote.balanceAfterReviews)}원`
    : '';

  const travelHint = quote.travelFee === null
    ? ' (출장비 별도)'
    : quote.travelFee > 0
      ? ` (출장비${d.region === 'other' ? ' · 사장님 안내' : ''} +${p(quote.travelFee)})`
      : '';

  return `[큐피돈 ${categoryLabel} 계약 신청]

${d.customerName} / ${d.customerPhone}
📅 ${d.eventDate} ${d.eventTime} · ${d.venue} · ${regionLabel}

${productLine}
💰 할인: ${immediateText}${promiseLine}

━━━━━━━━━━━━━━
총액: ${p(quote.total)}원${travelHint}
계약금: ${p(quote.deposit)}원 ⭐
잔금: ${p(quote.balance)}원
━━━━━━━━━━━━━━

✅ 서명 완료`;
}

async function submitContract() {
  // Guard 1: 이미 처리 중 or 완료된 상태면 재실행 방지 (중복 클릭·리렌더 대응)
  if (submissionState.status === 'submitting' || submissionState.status === 'success') return;

  // Guard 2: 이미 시트로 전송 완료된 계약이면 (재접속 케이스)
  //   → PDF만 재생성해서 다운로드는 하되, 시트 재전송은 스킵
  const alreadySubmitted = !!state.data.submittedAt;

  submissionState.status = 'submitting';
  render();
  try {
    const result = await generateContractPDF(state.data);
    submissionState.pdfBlob = result.blob;
    submissionState.pdfFilename = result.filename;
    downloadBlob(result.blob, result.filename);
    submissionState.status = 'success';

    if (!alreadySubmitted) {
      // 최초 제출 시에만 시트 전송 + 완료 마크 저장
      if (!state.data.submissionId) {
        state.data.submissionId = 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      }
      state.data.submittedAt = new Date().toISOString();
      saveSession();

      sendToGoogleSheets(state.data, result.quote, result.base64, result.filename).catch(err =>
        console.warn('Sheets 저장 실패:', err)
      );
    }
  } catch (err) {
    console.error('PDF 생성 실패:', err);
    submissionState.error = err.message;
    submissionState.status = 'error';
  }
  render();
}

async function sendToGoogleSheets(data, quote, pdfBase64, pdfFilename) {
  const product = PRODUCTS[data.product];
  const categoryKey = product?.category === 'chukuidae' ? 'chukuidae' : 'snap';
  const webhookUrl = SHEETS_WEBHOOK_URLS[categoryKey];
  if (!webhookUrl) return; // 해당 카테고리 웹훅이 세팅 안 됐으면 스킵
  const optionsTable = getOptionsTable(product, data.options);
  const immediateTable = getImmediateDiscounts(product, data.options);
  const promiseTable = getPromiseDiscounts(product, data.options);
  const travelTable = getTravelFeeTable(product, data.options);
  const optionNames = data.options.map(c => optionsTable[c]?.name).filter(Boolean).join(', ');
  const immediateNames = data.immediateDiscounts.map(c => {
    if (c === 'partner' && data.partnerCode) return `짝꿍[${data.partnerCode}]`;
    return immediateTable[c]?.name;
  }).filter(Boolean).join(', ');
  const promiseNames = data.promiseDiscounts.map(c => promiseTable[c]?.name).filter(Boolean).join(', ');

  const payload = {
    submissionId: data.submissionId || '',
    submittedAt: data.submittedAt || new Date().toISOString(),
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    eventDate: data.eventDate,
    eventTime: data.eventTime,
    venue: data.venue,
    region: travelTable[data.region]?.name || TRAVEL_FEE[data.region]?.name || data.region,
    customTravelFee: data.region === 'other' && data.customTravelFee ? Number(data.customTravelFee) : '',
    category: quote.isBundle
      ? '스냅+축의대 번들'
      : (product?.category === 'chukuidae' ? '축의대' : '스냅'),
    product: product?.name || data.product,
    options: optionNames,
    dolAloneSurcharge: data.product === 'dol' && data.dolHasMainSnap === false ? '적용(+50,000)' : '',
    immediateDiscounts: immediateNames,
    promiseDiscounts: promiseNames,
    partnerCode: data.partnerCode || '',
    travelFee: quote.travelFee !== null ? quote.travelFee : '별도 문의',
    total: quote.total,
    deposit: quote.deposit,
    balance: quote.balance,
    balanceAfterReviews: quote.balanceAfterReviews,
    isQuoteFinal: quote.isQuoteFinal,
    isBundle: quote.isBundle,
    pdfBase64: pdfBase64 || '',
    pdfFilename: pdfFilename || '',
  };

  // no-cors 모드로 전송 (Apps Script는 CORS 응답 헤더가 없어 반응 확인 불가하지만 데이터는 전달됨)
  await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
}
