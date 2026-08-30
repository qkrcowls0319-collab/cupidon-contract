import { renderContractHTML } from './templates.js';
import { calculateQuote } from './pricing.js';

/**
 * 계약서 PDF를 생성하고 Blob(및 다운로드용 dataURL, base64)를 반환.
 * html2canvas로 hidden div를 캡처 → jsPDF에 이미지 삽입.
 */
export async function generateContractPDF(formData) {
  const quote = calculateQuote({
    product: formData.product,
    region: formData.region,
    options: formData.options,
    immediateDiscounts: formData.immediateDiscounts,
    promiseDiscounts: formData.promiseDiscounts,
    dolHasMainSnap: formData.dolHasMainSnap,
  });
  const today = new Date();
  const todayStr = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, '0')}. ${String(today.getDate()).padStart(2, '0')}.`;

  const html = renderContractHTML({ formData, quote, todayStr });

  // hidden div에 삽입
  const renderArea = document.getElementById('pdf-render-area');
  renderArea.innerHTML = html;
  const target = renderArea.firstElementChild;

  // html2canvas로 캡처
  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // A4 한 페이지에 들어가는지 확인, 넘치면 여러 페이지 분할
  let heightLeft = imgHeight;
  let position = 10;
  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - 20);
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20);
  }

  const blob = pdf.output('blob');
  const base64 = pdf.output('datauristring').split(',')[1];
  const filename = `큐피돈_계약서_${PRODUCT_LABEL(formData.product)}_${sanitizeFilename(formData.customerName)}_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.pdf`;

  // 화면 정리
  renderArea.innerHTML = '';

  return { blob, base64, filename, quote };
}

function PRODUCT_LABEL(code) {
  return { special: '스페셜', premium: '프리미엄', studio: '스튜디오', dol: '돌스냅' }[code] || code;
}

function sanitizeFilename(name) {
  return (name || 'customer').replace(/[\\/:*?"<>|]/g, '');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
