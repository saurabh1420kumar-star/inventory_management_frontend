import jsPDF from 'jspdf';
import { amountToWords } from './amount-to-words';
import { TransactionVoucher, TransactionFund } from '../../services/transaction.service';

// ---------------------------------------------------------------------------
// Official Nectar Origin voucher PDF generator.
//
// Produces single-page A4 landscape forms matching the company's printed
// stationery:
//   • Payment Voucher  (EXPENSE)  — prefix NOPL/PV/
//   • Receipt Voucher  (INCOME)   — prefix NOPL/RV/
//   • Fund Transfer Voucher (Fund)— prefix NOPL/FTV/
//
// Data we hold is pre-filled; everything else is rendered as blank ruled
// lines / unticked checkboxes for manual completion after printing.
// ---------------------------------------------------------------------------

const NAVY: [number, number, number] = [26, 40, 99];
const ORANGE: [number, number, number] = [240, 140, 0];
const AMBER: [number, number, number] = [255, 243, 214];
const LINE: [number, number, number] = [160, 170, 200];
const INK: [number, number, number] = [45, 50, 70];
const GREY: [number, number, number] = [110, 115, 130];

const COMPANY = {
  name: 'NECTAR ORIGIN PRIVATE LIMITED',
  address: 'Registered Office : Ground Floor, 360-K, Shiv Parwati Nagar, Block Road No. 2, Ward No. 16, Kahalgaon, Bhagalpur, Bihar, 813203',
  cin: 'CIN No. : U74999BR2016PTC032690',
  website: 'Website : www.nectarorigin.com',
  email: 'Email : info@nectarorigin.com',
  contact: 'Contact No. : 06429-450126, +91-9797979522',
  iso: 'An ISO 9001:2015 Certified Company',
  tagline: 'Integrity     •     Transparency     •     Accountability',
};

const PAGE_W = 297;
const PAGE_H = 210;
const M = 10; // outer margin

// Output is an A5 landscape sheet (210 × 148 mm — exactly half of A4) so two
// vouchers fit on one A4 page. The whole form is authored in the 297 × 210
// "design space" above and rendered through a scaling Pen so every coordinate
// and font size shrinks uniformly to fit A5.
const PAGE_OUT_W = 210;
const PAGE_OUT_H = 148;
const SCALE = PAGE_OUT_H / PAGE_H; // ≈ 0.7048 — maps 210→148 (and 297→209.3)

// A thin proxy over jsPDF that multiplies every coordinate / size by SCALE,
// letting the design-space drawing code below stay unchanged.
interface Pen {
  setFont(family: string, style?: string): void;
  setFontSize(n: number): void;
  setTextColor(r: number, g: number, b: number): void;
  setDrawColor(r: number, g: number, b: number): void;
  setFillColor(r: number, g: number, b: number): void;
  setLineWidth(n: number): void;
  text(text: string | string[], x: number, y: number, opts?: any): void;
  rect(x: number, y: number, w: number, h: number, style?: string): void;
  roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  circle(x: number, y: number, r: number, style?: string): void;
  triangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, style?: string): void;
  addImage(data: string, fmt: string, x: number, y: number, w: number, h: number): void;
  getTextWidth(t: string): number;
  splitTextToSize(t: string, w: number): string[];
}

function makePen(doc: jsPDF, s: number): Pen {
  return {
    setFont: (f, st) => doc.setFont(f, st),
    setFontSize: (n) => doc.setFontSize(n * s),
    setTextColor: (r, g, b) => doc.setTextColor(r, g, b),
    setDrawColor: (r, g, b) => doc.setDrawColor(r, g, b),
    setFillColor: (r, g, b) => doc.setFillColor(r, g, b),
    setLineWidth: (n) => doc.setLineWidth(Math.max(n * s, 0.1)),
    text: (t, x, y, opts) => doc.text(t as any, x * s, y * s, opts),
    rect: (x, y, w, h, style) => doc.rect(x * s, y * s, w * s, h * s, style as any),
    roundedRect: (x, y, w, h, rx, ry, style) => doc.roundedRect(x * s, y * s, w * s, h * s, rx * s, ry * s, style as any),
    line: (x1, y1, x2, y2) => doc.line(x1 * s, y1 * s, x2 * s, y2 * s),
    circle: (x, y, r, style) => doc.circle(x * s, y * s, r * s, style as any),
    triangle: (x1, y1, x2, y2, x3, y3, style) => doc.triangle(x1 * s, y1 * s, x2 * s, y2 * s, x3 * s, y3 * s, style as any),
    addImage: (d, f, x, y, w, h) => doc.addImage(d, f as any, x * s, y * s, w * s, h * s),
    getTextWidth: (t) => doc.getTextWidth(t) / s,
    splitTextToSize: (t, w) => doc.splitTextToSize(t, w * s),
  };
}

// ── low-level helpers ──────────────────────────────────────────────────────

function setFill(doc: Pen, c: [number, number, number]) { doc.setFillColor(c[0], c[1], c[2]); }
function setDraw(doc: Pen, c: [number, number, number]) { doc.setDrawColor(c[0], c[1], c[2]); }
function setText(doc: Pen, c: [number, number, number]) { doc.setTextColor(c[0], c[1], c[2]); }

/** A rounded section container. */
function sectionBox(doc: Pen, x: number, y: number, w: number, h: number) {
  setDraw(doc, NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 1.8, 1.8, 'S');
}

/** A navy title tab that sits over the top-left of a section box. */
function sectionTab(doc: Pen, x: number, y: number, label: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const w = doc.getTextWidth(label) + 7;
  // Outlined chip: white fill + navy border + navy text (no dark background).
  setFill(doc, [255, 255, 255]);
  setDraw(doc, NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y - 3.2, w, 6, 1.4, 1.4, 'FD');
  setText(doc, NAVY);
  doc.text(label, x + 3.5, y + 1.2);
}

/** "Label : ______value______" on one line. */
function labelledLine(
  doc: Pen, label: string, lx: number, colonX: number, lineEndX: number, y: number, value = '',
) {
  doc.setFont('helvetica', 'normal');
  setText(doc, INK);
  // fit the label into the space before the colon so it can never collide with it
  fitText(doc, label, lx, y, colonX - 1.5 - lx, 8);
  doc.setFontSize(8);
  doc.text(':', colonX, y);
  setDraw(doc, LINE);
  doc.setLineWidth(0.25);
  doc.line(colonX + 3, y + 0.9, lineEndX, y + 0.9);
  if (value) {
    doc.setFont('helvetica', 'bold');
    setText(doc, NAVY);
    // auto-fit so the value never runs past the end of its line
    fitText(doc, value, colonX + 4, y - 0.3, lineEndX - (colonX + 4), 8.5);
  }
}

/** Draw text shrinking the font (down to a floor) so it never exceeds maxWidth. */
function fitText(doc: Pen, text: string, x: number, y: number, maxWidth: number, baseSize: number) {
  let size = baseSize;
  doc.setFontSize(size);
  while (doc.getTextWidth(text) > maxWidth && size > 5.5) {
    size -= 0.3;
    doc.setFontSize(size);
  }
  doc.text(text, x, y);
}

function checkbox(doc: Pen, x: number, y: number, label: string, checked = false) {
  setDraw(doc, NAVY);
  doc.setLineWidth(0.3);
  doc.rect(x, y - 3, 3.3, 3.3, 'S');
  if (checked) {
    setDraw(doc, ORANGE);
    doc.setLineWidth(0.6);
    doc.line(x + 0.6, y - 1.4, x + 1.4, y - 0.5);
    doc.line(x + 1.4, y - 0.5, x + 2.9, y - 3);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  setText(doc, INK);
  doc.text(label, x + 5, y);
  return x + 5 + doc.getTextWidth(label);
}

function signatureColumns(doc: Pen, x: number, y: number, w: number, h: number, labels: string[]) {
  const colW = w / labels.length;
  // header band
  setFill(doc, [243, 245, 250]);
  doc.rect(x, y, w, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  setText(doc, NAVY);
  labels.forEach((lab, i) => {
    doc.text(lab, x + colW * i + colW / 2, y + 4, { align: 'center' });
    if (i > 0) {
      setDraw(doc, [225, 228, 238]);
      doc.setLineWidth(0.2);
      doc.line(x + colW * i, y, x + colW * i, y + h);
    }
  });
  // signature lines + caption
  const lineY = y + h - 6;
  setDraw(doc, LINE);
  doc.setLineWidth(0.25);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  setText(doc, GREY);
  labels.forEach((_, i) => {
    const cx = x + colW * i + colW / 2;
    doc.line(x + colW * i + 5, lineY, x + colW * (i + 1) - 5, lineY);
    doc.text('Signature & Date', cx, lineY + 4, { align: 'center' });
  });
}

// ── shared chrome ──────────────────────────────────────────────────────────

function drawFrameAndHeader(doc: Pen, logo: string | null) {
  // outer frame
  setDraw(doc, NAVY);
  doc.setLineWidth(0.7);
  doc.roundedRect(M, 7, PAGE_W - 2 * M, PAGE_H - 14, 3, 3, 'S');

  // logo
  if (logo) {
    try { doc.addImage(logo, 'JPEG', M + 4, 9, 22, 22); } catch { /* ignore */ }
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(4.8);
  setText(doc, GREY);
  doc.text(COMPANY.iso, M + 6, 34.2, { align: 'left' });

  // company name
  doc.setFont('times', 'bold');
  doc.setFontSize(19);
  setText(doc, NAVY);
  doc.text(COMPANY.name, PAGE_W / 2 + 8, 15.5, { align: 'center' });

  // contact block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  setText(doc, INK);
  doc.text(COMPANY.address, PAGE_W / 2 + 8, 21, { align: 'center' });
  doc.text(`${COMPANY.cin}        |        ${COMPANY.website}`, PAGE_W / 2 + 8, 25.5, { align: 'center' });
  doc.text(`${COMPANY.email}        |        ${COMPANY.contact}`, PAGE_W / 2 + 8, 30, { align: 'center' });

  // divider
  setDraw(doc, NAVY);
  doc.setLineWidth(0.4);
  doc.line(M + 2, 36.5, PAGE_W - M - 2, 36.5);
}

function drawBanner(doc: Pen, title: string, statusTitle: string, statusOptions: [string, string]) {
  const cy = 42;
  const bw = 104;
  const bx = (M + (PAGE_W - M - 56)) / 2 - bw / 2; // centred in the area left of the status box
  // ribbon — outlined (navy border + navy text), no dark fill
  setFill(doc, [255, 255, 255]);
  setDraw(doc, NAVY);
  doc.setLineWidth(0.6);
  doc.roundedRect(bx, cy - 4.5, bw, 9.5, 1.5, 1.5, 'FD');
  // orange chevrons
  setFill(doc, ORANGE);
  doc.triangle(bx - 3, cy, bx - 8.5, cy - 3.4, bx - 8.5, cy + 3.4, 'F');
  doc.triangle(bx + bw + 3, cy, bx + bw + 8.5, cy - 3.4, bx + bw + 8.5, cy + 3.4, 'F');
  doc.circle(bx - 11.5, cy, 1.1, 'F');
  doc.circle(bx + bw + 11.5, cy, 1.1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setText(doc, NAVY);
  doc.text(title, bx + bw / 2, cy + 1.4, { align: 'center' });

  // tagline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  setText(doc, ORANGE);
  doc.text(COMPANY.tagline, bx + bw / 2, cy + 7.2, { align: 'center' });

  // status box (top-right)
  const sx = PAGE_W - M - 52;
  const sy = 38;
  setDraw(doc, NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(sx, sy, 50, 11, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  setText(doc, NAVY);
  doc.text(statusTitle, sx + 25, sy + 4, { align: 'center' });
  checkbox(doc, sx + 5, sy + 9, statusOptions[0], false);
  checkbox(doc, sx + 28, sy + 9, statusOptions[1], false);
}

function drawVoucherNoDate(doc: Pen, prefix: string, value: string, dateStr: string) {
  const y = 56;
  setDraw(doc, NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(M + 2, 51, PAGE_W - 2 * M - 4, 8, 1.5, 1.5, 'S');
  // voucher no
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, INK);
  doc.text('Voucher No. :', M + 8, y);
  doc.setFont('helvetica', 'bold');
  setText(doc, NAVY);
  doc.text(`${prefix}${value}`, M + 38, y);
  // divider
  setDraw(doc, LINE);
  doc.line(PAGE_W / 2 - 4, 52, PAGE_W / 2 - 4, 58);
  // date
  setText(doc, INK);
  doc.text('Date :', PAGE_W / 2 + 6, y);
  setDraw(doc, LINE);
  doc.setLineWidth(0.3);
  doc.line(PAGE_W / 2 + 20, y + 0.8, PAGE_W - M - 8, y + 0.8);
  doc.setFont('helvetica', 'bold');
  setText(doc, NAVY);
  doc.text(dateStr, PAGE_W / 2 + 24, y - 0.3);
}

function drawDocChecklist(doc: Pen, y: number, items: string[]) {
  const w = PAGE_W - 2 * M - 4;
  sectionBox(doc, M + 2, y, w, 12);
  sectionTab(doc, M + 5, y, 'DOCUMENT CHECKLIST');
  const startX = M + 8;
  const gap = w / items.length;
  items.forEach((it, i) => checkbox(doc, startX + gap * i, y + 9, it, false));
}

function drawAccountsUseOnly(doc: Pen, y: number) {
  const w = PAGE_W - 2 * M - 4;
  sectionBox(doc, M + 2, y, w, 13);
  sectionTab(doc, M + 5, y, 'FOR ACCOUNTS USE ONLY');
  const yy = y + 9.5;
  const q = w / 4;
  labelledLine(doc, 'Entry No.', M + 8, M + 26, M + 2 + q - 4, yy);
  labelledLine(doc, 'Posting Date', M + 2 + q + 4, M + 2 + q + 26, M + 2 + 2 * q - 4, yy);
  labelledLine(doc, 'Checked By', M + 2 + 2 * q + 4, M + 2 + 2 * q + 26, M + 2 + 3 * q - 4, yy);
  labelledLine(doc, 'Remarks', M + 2 + 3 * q + 4, M + 2 + 3 * q + 24, PAGE_W - M - 6, yy);
}

/** A 3-row amount table (Description | Amount). Highlights the final row. */
function amountTable(
  doc: Pen, x: number, y: number, w: number,
  rows: Array<[string, string]>, amountHeader: string,
) {
  const col1 = w * 0.6;
  const rowH = 7;
  // header — outlined (navy border + navy text), no dark fill
  setFill(doc, [255, 255, 255]);
  setDraw(doc, NAVY);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, rowH, 'FD');
  doc.line(x + col1, y, x + col1, y + rowH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  setText(doc, NAVY);
  doc.text('Description', x + 3, y + 4.7);
  doc.text(amountHeader, x + col1 + 3, y + 4.7);
  // rows
  rows.forEach((r, i) => {
    const ry = y + rowH * (i + 1);
    const isLast = i === rows.length - 1;
    if (isLast) { setFill(doc, AMBER); doc.rect(x, ry, w, rowH, 'F'); }
    setDraw(doc, [215, 220, 235]);
    doc.setLineWidth(0.25);
    doc.rect(x, ry, w, rowH, 'S');
    doc.line(x + col1, ry, x + col1, ry + rowH);
    doc.setFont('helvetica', isLast ? 'bold' : 'normal');
    doc.setFontSize(8);
    setText(doc, isLast ? NAVY : INK);
    doc.text(r[0], x + 3, ry + 4.7);
    if (r[1]) doc.text(r[1], x + col1 + 3, ry + 4.7);
  });
}

function openInNewTab(doc: jsPDF) {
  window.open(String(doc.output('bloburi')), '_blank');
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d} / ${m} / ${y}`;
}

function numberPart(ref: string): string {
  const digits = ref.replace(/\D/g, '');
  return digits || ref;
}

/**
 * Format a number with Indian digit grouping using only ASCII characters
 * (commas, period, minus). Avoids `toLocaleString`/`₹`, which insert glyphs
 * jsPDF's standard Helvetica cannot render (showing up as `¹` / spacing junk).
 */
function formatIndianNumber(value: number): string {
  const neg = value < 0;
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  let lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  if (rest) lastThree = ',' + lastThree;
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return (neg ? '-' : '') + grouped + '.' + decPart;
}

// ── Reusable branded letterhead (real A4 coordinates, any width) ────────────
// Draws the Nectar Origin letterhead at the top of a normal (unscaled) jsPDF
// page and returns the Y position where body content should begin. Used by the
// cashbook PDFs so they match the voucher branding.
export function drawCompanyLetterhead(doc: jsPDF, logo: string | null, pageW: number): number {
  const cx = pageW / 2;

  if (logo) {
    try { doc.addImage(logo, 'JPEG', 12, 9, 24, 24); } catch { /* ignore */ }
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(COMPANY.name, cx + 6, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  let y = 21.5;
  const addr = doc.splitTextToSize(COMPANY.address, pageW - 80);
  doc.text(addr, cx + 6, y, { align: 'center' });
  y += addr.length * 3.6 + 1;
  doc.text(`${COMPANY.cin}      |      ${COMPANY.website}`, cx + 6, y, { align: 'center' });
  y += 4;
  doc.text(`${COMPANY.email}      |      ${COMPANY.contact}`, cx + 6, y, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.6);
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  doc.text(COMPANY.iso, 13, 33, { align: 'left' });

  const dividerY = Math.max(y + 2.5, 36);
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.6);
  doc.line(12, dividerY, pageW - 12, dividerY);
  return dividerY + 7;
}

/** A small outlined section/title chip used on the cashbook PDFs. */
export function drawTitleChip(doc: jsPDF, x: number, y: number, label: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const w = doc.getTextWidth(label) + 8;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, 7, 1.5, 1.5, 'FD');
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(label, x + 4, y + 4.8);
  return w;
}

// Navy brand colour for callers that build their own tables.
export const BRAND_NAVY: [number, number, number] = NAVY;
export const BRAND_AMBER: [number, number, number] = AMBER;

// ── Payment / Receipt voucher (EXPENSE | INCOME) ────────────────────────────

export function generateVoucherPdf(voucher: TransactionVoucher, logo: string | null): jsPDF {
  const raw = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [PAGE_OUT_W, PAGE_OUT_H] });
  const doc = makePen(raw, SCALE);
  const isExpense = voucher.voucherType === 'EXPENSE';

  const cfg = isExpense
    ? {
        title: 'PAYMENT VOUCHER', prefix: 'NOPL/PV/', status: ['Paid', 'Pending'] as [string, string],
        partyBox: 'PAYEE DETAILS', partyLabel: 'Paid To', purposeLabel: 'Purpose of Payment',
        amountBox: 'PAYMENT DETAILS', netLabel: 'Net Amount Paid', modeBox: 'MODE OF PAYMENT',
        ackTitle: 'RECEIVER ACKNOWLEDGEMENT', ackLine: 'I hereby acknowledge receipt of the above payment.', ackName: 'Receiver Name',
      }
    : {
        title: 'RECEIPT VOUCHER', prefix: 'NOPL/RV/', status: ['Received', 'Pending'] as [string, string],
        partyBox: 'RECEIVED FROM', partyLabel: 'Received From', purposeLabel: 'Purpose of Receipt',
        amountBox: 'RECEIPT DETAILS', netLabel: 'Net Amount Received', modeBox: 'MODE OF RECEIPT',
        ackTitle: 'PAYER ACKNOWLEDGEMENT', ackLine: 'Received the above sum with thanks.', ackName: 'Payer Name',
      };

  drawFrameAndHeader(doc, logo);
  drawBanner(doc, cfg.title, 'Voucher Status', cfg.status);
  drawVoucherNoDate(doc, cfg.prefix, numberPart(voucher.voucherNo), fmtDate(voucher.date));

  const gross = voucher.amount;
  const lessAdj = voucher.lessAdjustment || 0;
  const net = Math.max(gross - lessAdj, 0);
  const grossStr = `Rs. ${gross.toLocaleString('en-IN')}`;
  const lessStr = lessAdj > 0 ? `Rs. ${lessAdj.toLocaleString('en-IN')}` : '';
  const netStr = `Rs. ${net.toLocaleString('en-IN')}`;

  // LEFT — party details
  const lx = M + 2;
  const lw = (PAGE_W - 2 * M - 4) / 2 - 2;
  sectionBox(doc, lx, 64, lw, 40);
  sectionTab(doc, lx + 3, 64, cfg.partyBox);
  labelledLine(doc, cfg.partyLabel, lx + 5, lx + 47, lx + lw - 5, 75, voucher.partyName || '');
  labelledLine(doc, 'Mobile No.', lx + 5, lx + 47, lx + lw - 5, 83, voucher.mobileNo || '');
  labelledLine(doc, cfg.purposeLabel, lx + 5, lx + 47, lx + lw - 5, 91, voucher.ledgerName);
  labelledLine(doc, 'Invoice / Bill Ref. No.', lx + 5, lx + 47, lx + lw - 5, 99, voucher.invoiceRef || '');

  // RIGHT — amount details
  const rx = PAGE_W / 2 + 1;
  const rw = (PAGE_W - 2 * M - 4) / 2 - 2;
  sectionBox(doc, rx, 64, rw, 40);
  sectionTab(doc, rx + 3, 64, cfg.amountBox);
  amountTable(doc, rx + 4, 69, rw - 8, [
    ['Gross Amount', grossStr],
    ['Less Adjustment (if Any)', lessStr],
    [cfg.netLabel, netStr],
  ], 'Amount (Rs.)');
  // amount in words — auto-fit so long values never spill past the box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, INK);
  doc.text('Amount in Words', rx + 5, 101);
  doc.text(':', rx + 38, 101);
  setDraw(doc, LINE);
  doc.setLineWidth(0.25);
  doc.line(rx + 40, 101.9, rx + rw - 5, 101.9);
  doc.setFont('helvetica', 'bold');
  setText(doc, NAVY);
  fitText(doc, amountToWords(net), rx + 41, 100.7, rw - 47, 8.5);

  // LEFT row 2 — mode of payment
  sectionBox(doc, lx, 108, lw, 22);
  sectionTab(doc, lx + 3, 108, cfg.modeBox);
  checkbox(doc, lx + 6, 117, 'Cash', voucher.paymentMode === 'CASH');
  checkbox(doc, lx + 40, 117, 'UPI', voucher.paymentMode === 'UPI');
  labelledLine(doc, 'Transaction / UTR', lx + 5, lx + 47, lx + lw - 5, 126, voucher.transactionId || '');

  // RIGHT row 2 — narration
  sectionBox(doc, rx, 108, rw, 22);
  sectionTab(doc, rx + 3, 108, 'NARRATION');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, INK);
  const narr = doc.splitTextToSize(voucher.narration || '', rw - 12);
  doc.text(narr.slice(0, 3), rx + 5, 117);
  setDraw(doc, LINE);
  doc.setLineWidth(0.2);
  doc.line(rx + 5, 122, rx + rw - 5, 122);
  doc.line(rx + 5, 127, rx + rw - 5, 127);

  // Document checklist
  drawDocChecklist(doc, 135, ['Invoice Attached', 'Bill Attached', 'PO Attached', 'Approval Copy Attached', 'Receipt Attached']);

  // Approval (left) + Acknowledgement (right)
  const apW = (PAGE_W - 2 * M - 4) * 0.62;
  sectionBox(doc, M + 2, 152, apW, 28);
  sectionTab(doc, M + 5, 152, 'APPROVAL');
  signatureColumns(doc, M + 4, 158, apW - 4, 20, ['Prepared By', 'Verified By', 'Accounts Head', 'Authorized Signatory']);

  const ackX = M + 2 + apW + 2;
  const ackW = PAGE_W - M - 2 - ackX;
  sectionBox(doc, ackX, 152, ackW, 28);
  sectionTab(doc, ackX + 3, 152, cfg.ackTitle);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.4);
  setText(doc, GREY);
  doc.text(cfg.ackLine, ackX + 4, 161);
  labelledLine(doc, cfg.ackName, ackX + 4, ackX + 30, ackX + ackW - 4, 168);
  labelledLine(doc, 'Signature', ackX + 4, ackX + 30, ackX + ackW - 4, 174);
  labelledLine(doc, 'Date', ackX + 4, ackX + 30, ackX + ackW - 4, 179);

  // Accounts use only
  drawAccountsUseOnly(doc, 185);

  return raw;
}

// ── Fund transfer voucher ───────────────────────────────────────────────────

export function generateFundVoucherPdf(fund: TransactionFund, logo: string | null): jsPDF {
  const raw = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [PAGE_OUT_W, PAGE_OUT_H] });
  const doc = makePen(raw, SCALE);

  drawFrameAndHeader(doc, logo);
  drawBanner(doc, 'FUND TRANSFER VOUCHER', 'Voucher Status', ['Draft', 'Posted']);
  drawVoucherNoDate(doc, 'NOPL/FTV/', numberPart(fund.fundNo), fmtDate(fund.date));

  const amt = `Rs. ${fund.amount.toLocaleString('en-IN')}`;
  const location = fund.location === 'OFFICE' ? 'Office' : fund.location === 'FACTORY' ? 'Factory' : '';

  // LEFT — transfer details (evenly distributed to fill the box)
  const lx = M + 2;
  const lw = (PAGE_W - 2 * M - 4) / 2 - 2;
  sectionBox(doc, lx, 64, lw, 40);
  sectionTab(doc, lx + 3, 64, 'TRANSFER DETAILS');
  labelledLine(doc, 'Transfer From Branch', lx + 5, lx + 47, lx + lw - 5, 78);
  labelledLine(doc, 'Transfer To Branch', lx + 5, lx + 47, lx + lw - 5, 89, location);
  labelledLine(doc, 'Purpose of Transfer', lx + 5, lx + 47, lx + lw - 5, 100);

  // RIGHT — transfer amount details (mirrors the left box height/rhythm)
  const rx = PAGE_W / 2 + 1;
  const rw = (PAGE_W - 2 * M - 4) / 2 - 2;
  sectionBox(doc, rx, 64, rw, 40);
  sectionTab(doc, rx + 3, 64, 'TRANSFER AMOUNT DETAILS');
  // highlighted amount transferred bar
  setFill(doc, AMBER);
  setDraw(doc, [215, 220, 235]);
  doc.setLineWidth(0.3);
  doc.roundedRect(rx + 4, 73, rw - 8, 12, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, INK);
  doc.text('Amount Transferred (Rs.)', rx + 7, 80.5);
  doc.setFontSize(12);
  setText(doc, NAVY);
  doc.text(amt, rx + rw - 7, 80.9, { align: 'right' });
  // amount in words — label + value on the first rule, blank continuation rule
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, INK);
  doc.text('Amount in Words', rx + 5, 95);
  doc.text(':', rx + 38, 95);
  setDraw(doc, LINE);
  doc.setLineWidth(0.25);
  doc.line(rx + 40, 95.9, rx + rw - 5, 95.9);
  doc.line(rx + 5, 101, rx + rw - 5, 101);
  doc.setFont('helvetica', 'bold');
  setText(doc, NAVY);
  fitText(doc, amountToWords(fund.amount), rx + 41, 94.7, rw - 47, 8.5);

  // LEFT row 2 — mode of transfer
  sectionBox(doc, lx, 108, lw, 22);
  sectionTab(doc, lx + 3, 108, 'MODE OF TRANSFER');
  checkbox(doc, lx + 6, 117, 'Cash', fund.paymentMode === 'CASH');
  checkbox(doc, lx + 34, 117, 'UPI', fund.paymentMode === 'UPI');
  checkbox(doc, lx + 60, 117, 'Bank Transfer', false);
  labelledLine(doc, 'Transaction / UTR No.', lx + 5, lx + 47, lx + lw - 5, 126, fund.transactionId || '');

  // RIGHT row 2 — narration
  sectionBox(doc, rx, 108, rw, 22);
  sectionTab(doc, rx + 3, 108, 'NARRATION');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, INK);
  const narr = doc.splitTextToSize(fund.narration || '', rw - 12);
  doc.text(narr.slice(0, 3), rx + 5, 117);
  setDraw(doc, LINE);
  doc.setLineWidth(0.2);
  doc.line(rx + 5, 122, rx + rw - 5, 122);
  doc.line(rx + 5, 127, rx + rw - 5, 127);

  // Document checklist
  drawDocChecklist(doc, 135, ['Approval Copy Attached', 'Transfer Proof Attached', 'Supporting Document Attached']);

  // Approval (full width)
  const apW = PAGE_W - 2 * M - 4;
  sectionBox(doc, M + 2, 152, apW, 28);
  sectionTab(doc, M + 5, 152, 'APPROVAL');
  signatureColumns(doc, M + 4, 158, apW - 4, 20, ['Prepared By', 'Verified By', 'Accounts Head', 'Authorized Signatory']);

  // Accounts use only
  drawAccountsUseOnly(doc, 185);

  return raw;
}

export function openVoucherPdf(voucher: TransactionVoucher, logo: string | null) {
  openInNewTab(generateVoucherPdf(voucher, logo));
}

export function openFundVoucherPdf(fund: TransactionFund, logo: string | null) {
  openInNewTab(generateFundVoucherPdf(fund, logo));
}

// ── Account Ledger Statement ────────────────────────────────────────────────

export interface LedgerStatementRow {
  date: string;
  reference: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerStatementParams {
  ledgerName: string;
  partyName: string;
  partyAddress: string;
  partyCity?: string;
  partyState?: string;
  partyPincode?: string;
  partyPhone: string;
  partyEmail: string;
  rows: LedgerStatementRow[];
  logo: string | null;
}

export function generateLedgerStatementPdf(
  ledgerName: string,
  partyName: string,
  partyAddress: string,
  partyPhone: string,
  partyEmail: string,
  rows: LedgerStatementRow[],
  logo: string | null,
  partyCity?: string,
  partyState?: string,
  partyPincode?: string,
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const cx = pageW / 2;
  let y = 10;

  // Header with logo
  if (logo) {
    try {
      doc.addImage(logo, 'JPEG', 14, y - 2, 20, 20);
    } catch {
      /* ignore */
    }
  }

  // Company name
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(COMPANY.name, cx, y + 6, { align: 'center' });

  // Company details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  y += 12;
  doc.text(COMPANY.address, cx, y, { align: 'center' });
  y += 4;
  doc.text(`${COMPANY.cin} | ${COMPANY.website}`, cx, y, { align: 'center' });
  y += 3.5;
  doc.text(`${COMPANY.email} | ${COMPANY.contact}`, cx, y, { align: 'center' });

  // ── Account / Ledger party block (centered, Tally-style) ─────────────────
  const now = new Date();

  // Account / dealer name (bold, centered)
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(partyName || ledgerName, cx, y, { align: 'center' });

  // "Ledger Account" subtitle (centered)
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  doc.text('Ledger Account', cx, y, { align: 'center' });

  // Dealer name + address lines (centered)
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(partyName || ledgerName, cx, y, { align: 'center' });
  y += 4;

  // Address lines
  const addrLines = (partyAddress || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  addrLines.forEach(line => {
    doc.text(line, cx, y, { align: 'center' });
    y += 3.5;
  });

  // City, State on same line
  if (partyCity || partyState) {
    const cityState = [partyCity, partyState].filter(Boolean).join(', ');
    doc.text(cityState, cx, y, { align: 'center' });
    y += 3.5;
  }

  // Pincode (prominent)
  if (partyPincode) {
    doc.setFont('helvetica', 'bold');
    doc.text(partyPincode, cx, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    y += 3.5;
  }

  // Contact details (phone and email)
  y += 1;
  doc.setFontSize(8);
  if (partyPhone) {
    doc.text(`Phone: ${partyPhone}`, cx, y, { align: 'center' });
    y += 3.5;
  }
  if (partyEmail) {
    doc.text(`Email: ${partyEmail}`, cx, y, { align: 'center' });
    y += 3.5;
  }

  // Financial-year date range (centered)
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const yy2 = (yr: number) => yr.toString().slice(-2);
  const fyRange = `1-Apr-${yy2(fyStartYear)} to 31-Mar-${yy2(fyStartYear + 1)}`;
  y += 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(fyRange, cx, y, { align: 'center' });

  // Divider above the table
  y += 4;
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.5);
  doc.line(12, y, pageW - 12, y);

  // Ledger table
  y += 6;

  const cols: Array<{ header: string; width: number; align: 'left' | 'center' | 'right' }> = [
    { header: 'Date', width: 20, align: 'left' },
    { header: 'Reference', width: 24, align: 'left' },
    { header: 'Description', width: 48, align: 'left' },
    { header: 'Type', width: 18, align: 'center' },
    { header: 'Debit', width: 24, align: 'right' },
    { header: 'Credit', width: 24, align: 'right' },
    { header: 'Closing Balance', width: 28, align: 'right' },
  ];

  const rowHeight = 6;
  const tableW = cols.reduce((sum, c) => sum + c.width, 0);
  const maxRows = Math.floor((pageH - y - 15) / rowHeight);

  let currentY = y;

  // Header row — single full-width navy bar, then white labels on top
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(12, currentY, tableW, rowHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  let x = 12;
  cols.forEach((col) => {
    const tx = col.align === 'right' ? x + col.width - 2 : col.align === 'center' ? x + col.width / 2 : x + 2;
    doc.text(col.header, tx, currentY + 4, { align: col.align as any });
    x += col.width;
  });

  currentY += rowHeight;

  // Data rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(INK[0], INK[1], INK[2]);

  rows.slice(0, maxRows).forEach((row, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(240, 240, 240);
      doc.rect(12, currentY, pageW - 24, rowHeight, 'F');
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);

    const debitStr = row.debit > 0 ? formatIndianNumber(row.debit) : '';
    const creditStr = row.credit > 0 ? formatIndianNumber(row.credit) : '';
    const balStr = formatIndianNumber(row.balance);
    const descLines = doc.splitTextToSize(row.description, cols[2].width - 4);

    // Date | Reference | Description | Type | Debit | Credit | Closing Balance
    const cells = [row.date, row.reference, descLines[0] || '', row.type, debitStr, creditStr, balStr];

    x = 12;
    cols.forEach((col, ci) => {
      const tx = col.align === 'right' ? x + col.width - 2 : col.align === 'center' ? x + col.width / 2 : x + 2;
      doc.text(cells[ci], tx, currentY + 4, { align: col.align as any });
      doc.line(x + col.width, currentY, x + col.width, currentY + rowHeight);
      x += col.width;
    });

    currentY += rowHeight;
  });

  // Bottom border
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.5);
  doc.line(12, currentY, pageW - 12, currentY);

  return doc;
}
