import { SHEETS_WEBHOOK_URLS } from '../config.js';

// ============================================
// 축의대 D-7 확인 설문 — 카드 wizard
// ============================================

const STORAGE_KEY = 'cupidon-survey-session-v1';
const TOTAL_STEPS = 9;

const DEFAULT_DATA = {
  // Step 1 — 상품·대상
  product: '',          // 'std' | 'premium'
  servedSide: '',       // 'groom' | 'bride' | 'both'
  // Step 2 — 예식 기본
  coupleName: '',
  couplePhone: '',
  eventDate: '',
  venue: '',
  hall: '',
  // Step 3 — 하객·식사
  guestCount: '',
  mealType: '',         // 'buffet' | 'course' | 'hansang' | 'other'
  mealTypeOther: '',
  // Step 4 — 예식장 위치 (ATM만)
  atmLocation: '',
  // Step 5 — 축의금·식권·자물쇠
  readyBag: '',         // 'self' | 'cupidon'
  policy5m: '',         // 'agree' | 'need_discussion'
  slipManager: '',
  slipManagerPhone: '',
  slipTotal: '',
  bankAccount: '',
  lockType: '',         // 'self' | 'cupidon' | 'couple_prepare'
  // Step 6 — 인수인계자
  handover1Name: '',
  handover1Phone: '',
  handover2Name: '',
  handover2Phone: '',
  // Step 7 — 주차·답례품
  parkingFreeHours: '',
  giftProvided: '',     // 'yes' | 'no'
  giftCriteria: '',     // 'no_slip' | 'all' | 'other' (giftProvided='yes'일 때만)
  giftCriteriaOther: '',
  // Step 8 — 링크 전달 방식 ⭐신규
  linkDeliveryMethod: '', // 'consult_only' | 'openchat'
  // Step 9 — 마무리
  freeNote: '',
  // 메타
  submittedAt: '',
  submissionId: '',
};

// ============================================
// 세션 저장/복원
// ============================================
function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.savedAt && Date.now() - parsed.savedAt > 14 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (e) { return null; }
}

const _saved = loadSaved();
const state = {
  currentStep: _saved?.currentStep || 1,
  errors: {},
  data: { ...DEFAULT_DATA, ...(_saved?.data || {}) },
  submission: { status: 'idle', error: null },
};

function saveSession() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentStep: state.currentStep,
      data: state.data,
      savedAt: Date.now(),
    }));
  } catch (e) {}
}

function resetSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  state.currentStep = 1;
  state.data = { ...DEFAULT_DATA };
  state.errors = {};
  state.submission = { status: 'idle', error: null };
  render();
}

// ============================================
// 공통 유틸
// ============================================
function escapeAttr(str) {
  if (str == null) return '';
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function validateStep(step, d) {
  const errors = {};
  switch (step) {
    case 1:
      if (!d.product) errors.product = '상품을 선택해주세요.';
      if (!d.servedSide) errors.servedSide = '서비스 이용 대상을 선택해주세요.';
      break;
    case 2:
      if (!d.coupleName?.trim()) errors.coupleName = '신랑·신부 성함을 입력해주세요.';
      if (!d.couplePhone?.trim()) errors.couplePhone = '연락처를 입력해주세요.';
      else if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(d.couplePhone.replace(/\s/g, ''))) {
        errors.couplePhone = '올바른 전화번호 형식이 아닙니다.';
      }
      if (!d.eventDate) errors.eventDate = '예식일을 선택해주세요.';
      if (!d.venue?.trim()) errors.venue = '예식장 이름을 입력해주세요.';
      break;
    case 5:
      if (!d.readyBag) errors.readyBag = '레디백 준비 여부를 선택해주세요.';
      if (!d.policy5m) errors.policy5m = '5만원 미만 정책 동의 여부를 선택해주세요.';
      if (!d.lockType) errors.lockType = '자물쇠 방식을 선택해주세요.';
      break;
    case 8:
      if (!d.linkDeliveryMethod) errors.linkDeliveryMethod = '링크 전달 방식을 선택해주세요.';
      break;
  }
  return errors;
}

// ============================================
// Step Renderers
// ============================================
const steps = {};
const afterHooks = {};

function registerStep(num, title, renderFn, afterRenderFn) {
  steps[num] = { title, render: renderFn };
  if (afterRenderFn) afterHooks[num] = afterRenderFn;
}

// Step 1 — 상품·서비스 대상
registerStep(1, '상품·서비스 대상', s => {
  const products = [
    { v: 'std', label: '2인 1팀 스탠다드' },
    { v: 'premium', label: '4인 2팀 프리미엄' },
  ];
  const sides = [
    { v: 'groom', label: '신랑측' },
    { v: 'bride', label: '신부측' },
    { v: 'both', label: '양측' },
  ];
  return `
    <div class="card">
      <h2>1. 상품·서비스 대상</h2>
      <div class="field ${s.errors.product ? 'has-error' : ''}">
        <label>계약하신 상품 *</label>
        <div class="radio-group">
          ${products.map(p => `
            <label class="radio-option ${s.data.product === p.v ? 'selected' : ''}">
              <input type="radio" name="product" data-bind="product" value="${p.v}" ${s.data.product === p.v ? 'checked' : ''}>
              <span>${p.label}</span>
            </label>`).join('')}
        </div>
        ${s.errors.product ? `<div class="error">${s.errors.product}</div>` : ''}
      </div>
      <div class="field ${s.errors.servedSide ? 'has-error' : ''}">
        <label>서비스 이용 대상 *</label>
        <div class="radio-group">
          ${sides.map(p => `
            <label class="radio-option ${s.data.servedSide === p.v ? 'selected' : ''}">
              <input type="radio" name="servedSide" data-bind="servedSide" value="${p.v}" ${s.data.servedSide === p.v ? 'checked' : ''}>
              <span>${p.label}</span>
            </label>`).join('')}
        </div>
        ${s.errors.servedSide ? `<div class="error">${s.errors.servedSide}</div>` : ''}
      </div>
      <div class="actions">
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>`;
});

// Step 2 — 예식 기본 정보
registerStep(2, '예식 기본 정보', s => `
  <div class="card">
    <h2>2. 예식 기본 정보</h2>
    <div class="field ${s.errors.coupleName ? 'has-error' : ''}">
      <label>신랑·신부 성함 *</label>
      <input type="text" data-bind="coupleName" value="${escapeAttr(s.data.coupleName)}" placeholder="예: 김신랑 · 이신부" />
      ${s.errors.coupleName ? `<div class="error">${s.errors.coupleName}</div>` : ''}
    </div>
    <div class="field ${s.errors.couplePhone ? 'has-error' : ''}">
      <label>신랑·신부 연락처 *</label>
      <input type="tel" data-bind="couplePhone" value="${escapeAttr(s.data.couplePhone)}" placeholder="010-0000-0000" />
      ${s.errors.couplePhone ? `<div class="error">${s.errors.couplePhone}</div>` : ''}
    </div>
    <div class="field ${s.errors.eventDate ? 'has-error' : ''}">
      <label>예식일 *</label>
      <input type="text" id="fp-date" data-bind="eventDate" value="${s.data.eventDate}" placeholder="예식 날짜를 선택하세요" readonly>
      ${s.errors.eventDate ? `<div class="error">${s.errors.eventDate}</div>` : ''}
    </div>
    <div class="field ${s.errors.venue ? 'has-error' : ''}">
      <label>예식장 이름 *</label>
      <input type="text" data-bind="venue" value="${escapeAttr(s.data.venue)}" placeholder="예: 그랜드하얏트 서울" />
      ${s.errors.venue ? `<div class="error">${s.errors.venue}</div>` : ''}
    </div>
    <div class="field">
      <label>홀/층</label>
      <input type="text" data-bind="hall" value="${escapeAttr(s.data.hall)}" placeholder="예: 그랜드볼룸 B2" />
    </div>
    <div class="actions">
      <button class="btn btn-secondary" data-action="prev">이전</button>
      <button class="btn btn-primary" data-action="next">다음</button>
    </div>
  </div>`, (s) => {
  if (typeof flatpickr === 'undefined') return;
  const koLocale = window.flatpickr?.l10ns?.ko || 'ko';
  const dateEl = document.getElementById('fp-date');
  if (dateEl) {
    flatpickr(dateEl, {
      locale: koLocale, dateFormat: 'Y-m-d',
      altInput: true, altFormat: 'Y년 m월 d일 (D)',
      onChange: (_, dateStr) => { s.data.eventDate = dateStr; },
    });
  }
});

// Step 3 — 하객·식사
registerStep(3, '하객·식사', s => {
  const meals = [
    { v: 'buffet', label: '뷔페' },
    { v: 'course', label: '코스' },
    { v: 'hansang', label: '한상차림' },
    { v: 'other', label: '기타' },
  ];
  return `
    <div class="card">
      <h2>3. 하객·식사</h2>
      <div class="field">
        <label>예상 하객수</label>
        <input type="number" min="0" data-bind="guestCount" value="${escapeAttr(s.data.guestCount)}" placeholder="예: 250" />
      </div>
      <div class="field">
        <label>식사 형태</label>
        <div class="radio-group">
          ${meals.map(m => `
            <label class="radio-option ${s.data.mealType === m.v ? 'selected' : ''}">
              <input type="radio" name="mealType" data-bind="mealType" value="${m.v}" ${s.data.mealType === m.v ? 'checked' : ''}>
              <span>${m.label}</span>
            </label>`).join('')}
        </div>
        ${s.data.mealType === 'other' ? `
          <input type="text" data-bind="mealTypeOther" value="${escapeAttr(s.data.mealTypeOther)}" placeholder="기타 식사 형태" style="margin-top:8px">
        ` : ''}
      </div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>`;
});

// Step 4 — 예식장 위치 (ATM)
registerStep(4, '예식장 위치 정보', s => `
  <div class="card">
    <h2>4. 예식장 위치 정보</h2>
    <div class="field">
      <label>ATM 위치</label>
      <input type="text" data-bind="atmLocation" value="${escapeAttr(s.data.atmLocation)}" placeholder="예: 지하 1층 로비 우측" />
      <div style="margin-top:4px;font-size:11.5px;color:#8a6d3b">하객이 축의금 입금 시 안내할 수 있도록 알려주세요</div>
    </div>
    <div class="actions">
      <button class="btn btn-secondary" data-action="prev">이전</button>
      <button class="btn btn-primary" data-action="next">다음</button>
    </div>
  </div>`);

// Step 5 — 축의금·식권·자물쇠 (5만원 정책 상세 안내 포함)
registerStep(5, '축의금·식권·자물쇠', s => {
  const readyOptions = [
    { v: 'self', label: '직접 준비함' },
    { v: 'cupidon', label: '큐피돈 준비 요청' },
  ];
  const policyOptions = [
    { v: 'agree', label: '동의합니다' },
    { v: 'need_discussion', label: '별도 협의 필요' },
  ];
  const lockOptions = [
    { v: 'self', label: '직접 준비' },
    { v: 'cupidon', label: '큐피돈 준비 요청' },
    { v: 'couple_prepare', label: '신랑·신부측에서 직접 준비' },
  ];
  return `
    <div class="card">
      <h2>5. 축의금·식권·자물쇠</h2>

      <div class="field ${s.errors.readyBag ? 'has-error' : ''}">
        <label>레디백 준비 여부 *</label>
        <div class="radio-group">
          ${readyOptions.map(o => `
            <label class="radio-option ${s.data.readyBag === o.v ? 'selected' : ''}">
              <input type="radio" name="readyBag" data-bind="readyBag" value="${o.v}" ${s.data.readyBag === o.v ? 'checked' : ''}>
              <span>${o.label}</span>
            </label>`).join('')}
        </div>
        ${s.errors.readyBag ? `<div class="error">${s.errors.readyBag}</div>` : ''}
      </div>

      <div class="field ${s.errors.policy5m ? 'has-error' : ''}">
        <label>5만원 미만 정책 동의 *</label>
        <div style="margin:6px 0 10px;padding:12px;background:#FFF8E8;border-left:3px solid #B89968;border-radius:6px;font-size:12.5px;color:#5A3B1A;line-height:1.6">
          <strong>💡 5만원 미만 정책이란?</strong><br>
          식권 제출 금액이 <strong>5만원보다 적은 경우</strong>, 최근 이슈된 암행투어 등의 이슈를 방지하고자
          신랑·신부님의 동의 하에 미만 금액에 대해서는 <strong>신랑·신부님께 식권 수령 안내를 요청</strong>드리고 있습니다.<br><br>
          <span style="color:#7A5A2E">※ 현장에서 하객께는 금액이 미만이라는 안내 대신,
          <em>"저희가 준비된 식권 체크하는데 시간이 조금 걸려서, 신랑님께 말씀주시면 식권 수령 빠르게 가능하세요"</em>
          로 안내드립니다.</span>
        </div>
        <div class="radio-group">
          ${policyOptions.map(o => `
            <label class="radio-option ${s.data.policy5m === o.v ? 'selected' : ''}">
              <input type="radio" name="policy5m" data-bind="policy5m" value="${o.v}" ${s.data.policy5m === o.v ? 'checked' : ''}>
              <span>${o.label}</span>
            </label>`).join('')}
        </div>
        ${s.errors.policy5m ? `<div class="error">${s.errors.policy5m}</div>` : ''}
      </div>

      <div class="field">
        <label>신부대기실 식권 관리자</label>
        <input type="text" data-bind="slipManager" value="${escapeAttr(s.data.slipManager)}" placeholder="예: 신부측 이모 홍길동" />
      </div>
      <div class="field">
        <label>신부대기실 관리자 연락처</label>
        <input type="tel" data-bind="slipManagerPhone" value="${escapeAttr(s.data.slipManagerPhone)}" placeholder="010-0000-0000" />
      </div>
      <div class="field">
        <label>예식장 식권 총매수</label>
        <input type="number" min="0" data-bind="slipTotal" value="${escapeAttr(s.data.slipTotal)}" placeholder="예: 250" />
      </div>
      <div class="field">
        <label>축의금 이체 계좌</label>
        <input type="text" data-bind="bankAccount" value="${escapeAttr(s.data.bankAccount)}" placeholder="예: 카카오뱅크 3333-01-1234567 홍길동" />
      </div>

      <div class="field ${s.errors.lockType ? 'has-error' : ''}">
        <label>축의금 보관함 자물쇠 방식 *</label>
        <div class="radio-group">
          ${lockOptions.map(o => `
            <label class="radio-option ${s.data.lockType === o.v ? 'selected' : ''}">
              <input type="radio" name="lockType" data-bind="lockType" value="${o.v}" ${s.data.lockType === o.v ? 'checked' : ''}>
              <span>${o.label}</span>
            </label>`).join('')}
        </div>
        ${s.errors.lockType ? `<div class="error">${s.errors.lockType}</div>` : ''}
      </div>

      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>`;
});

// Step 6 — 인수인계자
registerStep(6, '인수인계자', s => `
  <div class="card">
    <h2>6. 인수인계자 정보</h2>
    <p style="color:var(--text-mute);font-size:13px;margin-bottom:12px">
      예식 종료 후 축의금 봉투·명단·정산 리포트를 전달받으실 분(들)의 정보를 입력해주세요.
    </p>

    <h3 style="margin-top:12px">① 1인</h3>
    <div class="field">
      <label>이름</label>
      <input type="text" data-bind="handover1Name" value="${escapeAttr(s.data.handover1Name)}" placeholder="예: 신랑측 삼촌 김홍길" />
    </div>
    <div class="field">
      <label>연락처</label>
      <input type="tel" data-bind="handover1Phone" value="${escapeAttr(s.data.handover1Phone)}" placeholder="010-0000-0000" />
    </div>

    <h3 style="margin-top:12px">② 2인 (선택)</h3>
    <div class="field">
      <label>이름</label>
      <input type="text" data-bind="handover2Name" value="${escapeAttr(s.data.handover2Name)}" placeholder="예: 신부측 이모 이순이" />
    </div>
    <div class="field">
      <label>연락처</label>
      <input type="tel" data-bind="handover2Phone" value="${escapeAttr(s.data.handover2Phone)}" placeholder="010-0000-0000" />
    </div>

    <div class="actions">
      <button class="btn btn-secondary" data-action="prev">이전</button>
      <button class="btn btn-primary" data-action="next">다음</button>
    </div>
  </div>`);

// Step 7 — 주차·답례품 (조건부)
registerStep(7, '주차·답례품', s => {
  const giftOptions = [
    { v: 'yes', label: '제공함' },
    { v: 'no', label: '제공 안 함' },
  ];
  const criteriaOptions = [
    { v: 'no_slip', label: '식권 미수령 하객' },
    { v: 'all', label: '하객 모두' },
    { v: 'other', label: '기타' },
  ];
  const giftIsProvided = s.data.giftProvided === 'yes';
  const criteriaIsOther = s.data.giftCriteria === 'other';
  return `
    <div class="card">
      <h2>7. 주차·답례품</h2>

      <div class="field">
        <label>주차 무료 시간</label>
        <input type="text" data-bind="parkingFreeHours" value="${escapeAttr(s.data.parkingFreeHours)}" placeholder="예: 2시간 / 식사 후 1시간 추가" />
      </div>

      <div class="field">
        <label>답례품 제공 여부</label>
        <div class="radio-group">
          ${giftOptions.map(o => `
            <label class="radio-option ${s.data.giftProvided === o.v ? 'selected' : ''}">
              <input type="radio" name="giftProvided" data-bind="giftProvided" value="${o.v}" ${s.data.giftProvided === o.v ? 'checked' : ''}>
              <span>${o.label}</span>
            </label>`).join('')}
        </div>
      </div>

      ${giftIsProvided ? `
        <div class="field">
          <label>답례품 제공 기준</label>
          <div class="radio-group">
            ${criteriaOptions.map(o => `
              <label class="radio-option ${s.data.giftCriteria === o.v ? 'selected' : ''}">
                <input type="radio" name="giftCriteria" data-bind="giftCriteria" value="${o.v}" ${s.data.giftCriteria === o.v ? 'checked' : ''}>
                <span>${o.label}</span>
              </label>`).join('')}
          </div>
          ${criteriaIsOther ? `
            <input type="text" data-bind="giftCriteriaOther" value="${escapeAttr(s.data.giftCriteriaOther)}" placeholder="기타 기준을 입력해주세요" style="margin-top:8px">
          ` : ''}
        </div>
      ` : ''}

      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>`;
});

// Step 8 — 링크 전달 방식 ⭐ 신규
registerStep(8, '링크 전달 방식', s => {
  const options = [
    {
      v: 'consult_only',
      title: '상담 채팅으로만 받기',
      desc: '사장님 파트너채널 1:1 상담 채팅으로만 양가 온라인 정산표를 전달받습니다.',
    },
    {
      v: 'openchat',
      title: '오픈 채팅으로 받기',
      desc: '예식 전날 오픈채팅방이 생성되고, <strong>양측 인수인계 담당자가 입장</strong>하여 현장에서 실시간으로 양가 축의 현황을 확인할 수 있습니다.',
    },
  ];
  return `
    <div class="card">
      <h2>8. 양가 온라인 축의 정산 링크 전달 방식 *</h2>

      <div style="margin:6px 0 12px;padding:12px;background:#F0E8DA;border-left:3px solid #B89968;border-radius:6px;font-size:12.5px;color:#5A3B1A;line-height:1.6">
        <strong>💡 정산 링크 안내</strong><br>
        예식 당일 축의 접수 실시간 현황을 양가에서 함께 확인할 수 있는 링크입니다.<br>
        <strong>오픈채팅</strong>은 예식 전날 생성되며, <strong>양측 인수인계 담당자가 함께 입장</strong>해 현장에서 소통합니다.<br>
        예식 이후 <strong>오픈채팅방 유지를 원치 않으시면</strong>, 양가 온라인 정산표는 <strong>사장님 파트너채널로 별도 전달</strong>도 가능합니다.
      </div>

      <div class="field ${s.errors.linkDeliveryMethod ? 'has-error' : ''}">
        <div class="radio-group">
          ${options.map(o => `
            <label class="radio-option ${s.data.linkDeliveryMethod === o.v ? 'selected' : ''}" style="align-items:flex-start;padding:14px">
              <input type="radio" name="linkDeliveryMethod" data-bind="linkDeliveryMethod" value="${o.v}" ${s.data.linkDeliveryMethod === o.v ? 'checked' : ''} style="margin-top:2px">
              <div style="flex:1;margin-left:4px">
                <div style="font-weight:700;font-size:14.5px;color:#2A2624">${o.title}</div>
                <div style="margin-top:4px;font-size:12.5px;color:#6B5B4E;line-height:1.55">${o.desc}</div>
              </div>
            </label>`).join('')}
        </div>
        ${s.errors.linkDeliveryMethod ? `<div class="error">${s.errors.linkDeliveryMethod}</div>` : ''}
      </div>

      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" data-action="next">다음</button>
      </div>
    </div>`;
});

// Step 9 — 마무리
registerStep(9, '마무리', s => {
  if (state.submission.status === 'success') {
    return `
      <div class="card success-box">
        <div class="check">✓</div>
        <h2>설문이 완료되었습니다!</h2>
        <p style="color:var(--text-mute)">사장님께 설문 결과가 전달되었습니다. 예식 당일 완벽한 진행을 위해 큐피돈 팀에서 사전 체크 후 연락드립니다.</p>
        <div class="actions" style="flex-direction:column;gap:10px;margin-top:16px">
          <button class="btn btn-secondary" id="new-survey-btn" style="color:#999">🔄 설문 다시 시작</button>
        </div>
      </div>`;
  }
  if (state.submission.status === 'submitting') {
    return `<div class="card"><h2>전송 중...</h2><p>잠시만 기다려주세요.</p></div>`;
  }
  if (state.submission.status === 'error') {
    return `
      <div class="card">
        <h2>전송 실패</h2>
        <p>${state.submission.error || '알 수 없는 오류'}</p>
        <div class="actions">
          <button class="btn btn-secondary" data-action="prev">이전</button>
          <button class="btn btn-primary" id="retry-submit-btn">다시 시도</button>
        </div>
      </div>`;
  }
  // idle — 요약 + 제출 버튼
  return `
    <div class="card">
      <h2>9. 마무리</h2>
      <div class="field">
        <label>궁금하신 점이나 추가 요청사항</label>
        <textarea data-bind="freeNote" rows="5" placeholder="편하게 적어주세요" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font-family:inherit;font-size:14px;resize:vertical">${escapeAttr(s.data.freeNote)}</textarea>
      </div>
      <div class="info-box" style="margin-top:14px">
        아래 '제출' 버튼을 누르시면 설문 내용이 큐피돈 측에 바로 전달됩니다.
      </div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="prev">이전</button>
        <button class="btn btn-primary" id="submit-survey-btn">📬 제출</button>
      </div>
    </div>`;
}, () => {
  const btn = document.getElementById('submit-survey-btn');
  if (btn) btn.addEventListener('click', submitSurvey);
  const retry = document.getElementById('retry-submit-btn');
  if (retry) retry.addEventListener('click', () => { state.submission.status = 'idle'; render(); });
  const newBtn = document.getElementById('new-survey-btn');
  if (newBtn) newBtn.addEventListener('click', () => {
    if (confirm('설문을 처음부터 다시 시작하시겠어요?')) resetSession();
  });
});

// ============================================
// 공통 input 바인딩 + navigation
// ============================================
function render() {
  const app = document.getElementById('app');
  const indicator = document.getElementById('step-indicator');
  indicator.innerHTML = '';
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const dot = document.createElement('div');
    dot.className = 'step-dot' + (i === state.currentStep ? ' active' : i < state.currentStep ? ' done' : '');
    dot.textContent = i;
    indicator.appendChild(dot);
  }
  const step = steps[state.currentStep];
  app.innerHTML = step ? step.render(state) : `<div class="card">Step ${state.currentStep} 미구현</div>`;
  attachCommon();
  const hook = afterHooks[state.currentStep];
  if (hook) hook(state);
}

function attachCommon() {
  const nextBtn = document.querySelector('[data-action="next"]');
  const prevBtn = document.querySelector('[data-action="prev"]');
  if (nextBtn) nextBtn.addEventListener('click', goNext);
  if (prevBtn) prevBtn.addEventListener('click', goPrev);

  document.querySelectorAll('[data-bind]').forEach(el => {
    const key = el.dataset.bind;
    if (el.type === 'radio') {
      el.addEventListener('change', () => {
        if (el.checked) {
          state.data[key] = el.value;
          saveSession();
          onDataChange();
        }
      });
    } else {
      el.addEventListener('input', () => { state.data[key] = el.value; });
      el.addEventListener('blur', () => { state.data[key] = el.value; saveSession(); });
    }
  });
}

function onDataChange() {
  const activeBind = document.activeElement?.dataset?.bind;
  const selStart = document.activeElement?.selectionStart;
  render();
  if (activeBind) {
    const el = document.querySelector(`[data-bind="${activeBind}"]`);
    if (el && el.focus) {
      el.focus();
      if (selStart != null && el.setSelectionRange) {
        try { el.setSelectionRange(selStart, selStart); } catch (e) {}
      }
    }
  }
}

function goNext() {
  const errs = validateStep(state.currentStep, state.data);
  state.errors = errs;
  if (Object.keys(errs).length) { render(); return; }
  if (state.currentStep < TOTAL_STEPS) {
    state.currentStep++;
    saveSession();
    render();
  }
}

function goPrev() {
  if (state.currentStep > 1) {
    state.currentStep--;
    state.errors = {};
    saveSession();
    render();
  }
}

// ============================================
// 제출 — GAS webhook (type: 'survey')
// ============================================
async function submitSurvey() {
  if (state.submission.status === 'submitting' || state.submission.status === 'success') return;
  state.submission.status = 'submitting';
  render();

  if (!state.data.submissionId) {
    state.data.submissionId = 'srv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }
  state.data.submittedAt = new Date().toISOString();
  saveSession();

  const PRODUCT_LABEL = { std: '2인 1팀 스탠다드', premium: '4인 2팀 프리미엄' };
  const SIDE_LABEL = { groom: '신랑측', bride: '신부측', both: '양측' };
  const MEAL_LABEL = { buffet: '뷔페', course: '코스', hansang: '한상차림', other: '기타' };
  const READY_LABEL = { self: '직접 준비함', cupidon: '큐피돈 준비 요청' };
  const POLICY_LABEL = { agree: '동의합니다', need_discussion: '별도 협의 필요' };
  const LOCK_LABEL = { self: '직접 준비', cupidon: '큐피돈 준비 요청', couple_prepare: '신랑·신부측에서 직접 준비' };
  const GIFT_LABEL = { yes: '제공함', no: '제공 안 함' };
  const CRIT_LABEL = { no_slip: '식권 미수령 하객', all: '하객 모두', other: '기타' };
  const LINK_LABEL = { consult_only: '상담 채팅으로만 받기', openchat: '오픈 채팅으로 받기' };

  const d = state.data;
  const payload = {
    type: 'survey_d7',
    submittedAt: d.submittedAt,
    submissionId: d.submissionId,
    product: PRODUCT_LABEL[d.product] || d.product,
    servedSide: SIDE_LABEL[d.servedSide] || d.servedSide,
    coupleName: d.coupleName,
    couplePhone: d.couplePhone,
    eventDate: d.eventDate,
    venue: d.venue,
    hall: d.hall,
    guestCount: d.guestCount,
    mealType: (MEAL_LABEL[d.mealType] || d.mealType) + (d.mealType === 'other' && d.mealTypeOther ? ` (${d.mealTypeOther})` : ''),
    atmLocation: d.atmLocation,
    readyBag: READY_LABEL[d.readyBag] || d.readyBag,
    policy5m: POLICY_LABEL[d.policy5m] || d.policy5m,
    slipManager: d.slipManager,
    slipManagerPhone: d.slipManagerPhone,
    slipTotal: d.slipTotal,
    bankAccount: d.bankAccount,
    lockType: LOCK_LABEL[d.lockType] || d.lockType,
    handover1Name: d.handover1Name,
    handover1Phone: d.handover1Phone,
    handover2Name: d.handover2Name,
    handover2Phone: d.handover2Phone,
    parkingFreeHours: d.parkingFreeHours,
    giftProvided: GIFT_LABEL[d.giftProvided] || d.giftProvided,
    giftCriteria: d.giftProvided === 'yes'
      ? (CRIT_LABEL[d.giftCriteria] || d.giftCriteria) + (d.giftCriteria === 'other' && d.giftCriteriaOther ? ` (${d.giftCriteriaOther})` : '')
      : '',
    linkDeliveryMethod: LINK_LABEL[d.linkDeliveryMethod] || d.linkDeliveryMethod,
    freeNote: d.freeNote,
  };

  try {
    await fetch(SHEETS_WEBHOOK_URLS.snap, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    state.submission.status = 'success';
  } catch (err) {
    console.error('설문 전송 실패:', err);
    state.submission.error = err.message || String(err);
    state.submission.status = 'error';
  }
  render();
}

// ============================================
// Boot
// ============================================
render();
