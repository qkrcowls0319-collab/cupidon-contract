import { renderContractHTML } from './templates.js';
import { calculateQuote } from './pricing.js';
import { PRODUCTS } from './config.js';

/**
 * 계약서 PDF를 생성.
 * 전략: 계약서 HTML을 캡처한 뒤, 그 이미지를 A4 한 페이지에 무조건 들어가도록
 * 종횡비 유지하며 축소. 페이지 분할 로직 자체를 없애 잘림/깨짐 원천 방지.
 */
export async function generateContractPDF(formData) {
  const quote = calculateQuote({
    product: formData.product,
    region: formData.region,
    options: formData.options,
    immediateDiscounts: formData.immediateDiscounts,
    promiseDiscounts: formData.promiseDiscounts,
    dolHasMainSnap: formData.dolHasMainSnap,
    customTravelFee: formData.customTravelFee,
  });
  const today = new Date();
  const todayStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, '0')}. ${String(today.getDate()).padStart(2, '0')}.`;

  const html = renderContractHTML({ formData, quote, todayStr });

  const renderArea = document.getElementById('pdf-render-area');
  renderArea.innerHTML = html;
  const target = renderArea.firstElementChild;

  // 폰트 로드 대기 (한글 폰트 렌더링 안정성)
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) {}
  }

  // 고해상도 캡처
  const canvas = await html2canvas(target, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
    letterRendering: true,
    logging: false,
    imageTimeout: 15000,
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();   // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const margin = 8;
  const availWidth = pageWidth - margin * 2;
  const availHeight = pageHeight - margin * 2;

  // 캔버스 종횡비 유지하며 A4 안에 딱 맞게 축소
  const canvasAspect = canvas.width / canvas.height;
  const pageAspect = availWidth / availHeight;

  let imgWidth, imgHeight;
  if (canvasAspect > pageAspect) {
    // 가로가 상대적으로 더 넓음 → 가로 기준 맞춤
    imgWidth = availWidth;
    imgHeight = availWidth / canvasAspect;
  } else {
    // 세로가 상대적으로 더 김 → 세로 기준 맞춤
    imgHeight = availHeight;
    imgWidth = availHeight * canvasAspect;
  }

  // 페이지 중앙 정렬
  const x = margin + (availWidth - imgWidth) / 2;
  const y = margin + (availHeight - imgHeight) / 2;

  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'SLOW'); // 고품질 압축

  const blob = pdf.output('blob');
  const base64 = pdf.output('datauristring').split(',')[1];
  const product = PRODUCTS[formData.product];
  const prefix = quote.isBundle
    ? '큐피돈_패키지_계약서'
    : product?.category === 'chukuidae' ? '큐피돈_축의대_계약서' : '큐피돈_계약서';
  const filename = `${prefix}_${PRODUCT_LABEL(formData.product)}_${sanitizeFilename(formData.customerName)}_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.pdf`;

  renderArea.innerHTML = '';

  return { blob, base64, filename, quote };
}

function PRODUCT_LABEL(code) {
  return {
    special: '스페셜', premium: '프리미엄', studio: '스튜디오', dol: '돌스냅', dolMain: '돌메인스냅',
    chukuidaeBasic: '베이직', chukuidaeStd: '스탠다드', chukuidaePremium: '프리미엄',
  }[code] || code;
}

function sanitizeFilename(name) {
  return (name || 'customer').replace(/[\\/:*?"<>|]/g, '');
}

// 인앱 브라우저(카카오톡·인스타·페북·네이버·라인) 감지
// 이들 환경에서는 <a download>가 "지원하지 않는 기능"으로 뜨거나 무시됨 → 새 탭으로 PDF 오픈
function isInAppBrowser() {
  const ua = navigator.userAgent || '';
  return /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\//i.test(ua);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  if (isInAppBrowser()) {
    // 인앱 브라우저: 새 창(또는 현재 창)에 PDF 뷰어로 열어 → 사용자가 저장/공유
    const win = window.open(url, '_blank');
    if (!win) {
      // 팝업 차단 시 현재 창에서 이동
      window.location.href = url;
    }
    // 사용자가 PDF를 보고 저장할 시간 확보 (즉시 revoke 시 빈 탭 됨)
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
