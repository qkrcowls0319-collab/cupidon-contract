import { renderContractHTML } from './templates.js';
import { calculateQuote } from './pricing.js';

/**
 * 계약서 PDF를 생성하고 Blob(및 다운로드용 dataURL, base64)를 반환.
 * html2canvas로 hidden div를 캡처 → 페이지별로 슬라이스해서 jsPDF에 삽입.
 * 페이지 경계에서 텍스트가 잘려 깨지지 않도록 각 페이지마다 원본 캔버스에서
 * 해당 세로 구간을 크롭한 새 캔버스를 만들어 이미지로 삽입.
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

  const renderArea = document.getElementById('pdf-render-area');
  renderArea.innerHTML = html;
  const target = renderArea.firstElementChild;

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();   // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

  const margin = 10; // mm
  const contentWidthMm = pageWidth - margin * 2;
  const contentHeightMm = pageHeight - margin * 2;

  // canvas 픽셀 → mm 환산
  const pxPerMm = canvas.width / contentWidthMm;
  const pageContentHeightPx = Math.floor(contentHeightMm * pxPerMm);

  // 세로로 페이지 단위 크롭
  let sourceY = 0;
  let pageIndex = 0;
  while (sourceY < canvas.height) {
    const remaining = canvas.height - sourceY;
    const sliceHeightPx = Math.min(pageContentHeightPx, remaining);

    // 페이지별 임시 캔버스에 원본 캔버스의 해당 세로 구간만 그림
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0, sourceY, canvas.width, sliceHeightPx,
      0, 0, canvas.width, sliceHeightPx
    );

    const sliceHeightMm = sliceHeightPx / pxPerMm;
    const pageImgData = pageCanvas.toDataURL('image/png');

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidthMm, sliceHeightMm, undefined, 'FAST');

    sourceY += sliceHeightPx;
    pageIndex += 1;
  }

  const blob = pdf.output('blob');
  const base64 = pdf.output('datauristring').split(',')[1];
  const filename = `큐피돈_계약서_${PRODUCT_LABEL(formData.product)}_${sanitizeFilename(formData.customerName)}_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.pdf`;

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
