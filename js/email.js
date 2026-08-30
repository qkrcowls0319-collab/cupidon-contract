import { EMAILJS_CONFIG, IMMEDIATE_DISCOUNTS, PROMISE_DISCOUNTS, PRODUCTS } from './config.js';

let initialized = false;

function initIfNeeded() {
  if (initialized) return;
  if (typeof emailjs === 'undefined') {
    throw new Error('EmailJS SDK가 로드되지 않았습니다.');
  }
  emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
  initialized = true;
}

/**
 * 사장님 이메일로 계약서 정보 + PDF 첨부 전송.
 * PDF는 base64로 첨부하며, EmailJS 템플릿에서 `{{pdf_attachment}}` 변수로 사용.
 */
export async function sendContractEmail({ formData, quote, pdfBase64, pdfFilename }) {
  if (EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY') {
    throw new Error('EmailJS 설정이 안 되어 있습니다. js/config.js에서 EMAILJS_CONFIG를 실제 값으로 교체해주세요.');
  }
  initIfNeeded();

  const immediateNames = formData.immediateDiscounts
    .map(c => IMMEDIATE_DISCOUNTS[c].name + (c === 'partner' ? `(코드: ${formData.partnerCode})` : ''))
    .join(', ') || '없음';
  const promiseNames = formData.promiseDiscounts.map(c => PROMISE_DISCOUNTS[c].name).join(', ') || '없음';
  const p = n => (n === null || n === undefined) ? '별도문의' : n.toLocaleString('ko-KR');

  const payload = {
    to_email: EMAILJS_CONFIG.toEmail,
    customer_name: formData.customerName,
    customer_phone: formData.customerPhone,
    product: PRODUCTS[formData.product].name,
    event_date: formData.eventDate + ' ' + formData.eventTime,
    venue: formData.venue,
    region: formData.region,
    options: formData.options.join(', ') || '없음',
    partner_code: formData.partnerCode || '',
    immediate_discounts: immediateNames,
    promise_discounts: promiseNames,
    total_price: p(quote.total),
    deposit: p(quote.deposit),
    balance: p(quote.balance),
    balance_after_reviews: p(quote.balanceAfterReviews),
    is_quote_final: quote.isQuoteFinal ? '확정' : '출장비 별도문의',
    pdf_filename: pdfFilename,
    pdf_attachment: pdfBase64,
  };

  return emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, payload);
}
