import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookOutline, calendarOutline, downloadOutline,
  documentOutline, documentTextOutline, refreshOutline, closeOutline,
  printOutline, filterOutline, eyeOutline, layersOutline,
  walletOutline, trendingUpOutline, trendingDownOutline, cashOutline,
  chevronForwardOutline, checkmarkCircleOutline, barChartOutline,
} from 'ionicons/icons';

import { TransactionService, CashbookSummary, CashbookEntry, TransactionVoucher } from '../services/transaction.service';
import { amountToWords } from '../shared/utils/amount-to-words';
import { drawCompanyLetterhead, drawTitleChip, BRAND_NAVY, BRAND_AMBER } from '../shared/utils/voucher-pdf';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Workbook } from 'exceljs';

export interface CashbookRow {
  label: string;
  amount: number | null;
  isSubHeader: boolean;
  isBold: boolean;
  isHighlighted: boolean;
  isTotal: boolean;
}

// The canonical order of ledger names on each side
const LEFT_STRUCTURE: Array<{ label: string; key: string; isSubHeader?: boolean; isBold?: boolean; isTotal?: boolean }> = [
  { label: 'Direct Expense',           key: '__DIRECT_EXPENSE',   isSubHeader: true },
  { label: 'Wages',                    key: 'Wages' },
  { label: 'Spare Parts',              key: 'Spare Parts' },
  { label: 'Unloading Charge',         key: 'Unloading Charge' },
  { label: 'Loading Charge',           key: 'Loading Charge' },
  { label: 'Freight Outward',          key: 'Freight Outward' },
  { label: 'Tea',                      key: 'Tea' },
  { label: 'Stationery',               key: 'Stationery' },
  { label: 'Indirect Expense',         key: '__INDIRECT_EXPENSE', isSubHeader: true },
  { label: 'Fooding Exp',              key: 'Fooding Exp' },
  { label: 'Maintenance Machinery',    key: 'Maintenance Machinery' },
  { label: 'Maintenance Electricity',  key: 'Maintenance Electricity' },
  { label: 'Freight Inward',           key: 'Freight Inward' },
  { label: 'Courier Exp',              key: 'Courier Exp' },
  { label: 'Office Maintenance',       key: 'Office Maintenance' },
  { label: 'MIS Expense',              key: 'MIS Expense' },
  { label: 'Closing Balance',          key: '__CLOSING',          isBold: true },
  { label: 'Total',                    key: '__TOTAL_LEFT',       isBold: true, isTotal: true },
];

const RIGHT_STRUCTURE: Array<{ label: string; key: string; isSubHeader?: boolean; isBold?: boolean; isTotal?: boolean; isHighlighted?: boolean }> = [
  { label: 'Opening Balance',    key: '__OPENING',          isBold: true },
  { label: 'Direct Income',      key: '__DIRECT_INCOME',    isSubHeader: true },
  { label: 'Sale From Scrap',    key: 'Sale From Scrap' },
  { label: 'Received From HO',  key: 'Received From HO',   isHighlighted: true },
  { label: 'Other Receive',      key: 'Other Receive' },
  { label: 'Indirect Income',   key: '__INDIRECT_INCOME',  isSubHeader: true },
  { label: 'Total',              key: '__TOTAL_RIGHT',      isBold: true, isTotal: true },
];

@Component({
  selector: 'app-transaction-cashbook',
  templateUrl: './transaction-cashbook.page.html',
  styleUrls: ['./transaction-cashbook.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class TransactionCashbookPage implements OnInit {
  fromDate = '';
  toDate = '';
  isLoading = false;
  summary: CashbookSummary | null = null;

  leftRows: CashbookRow[] = [];
  rightRows: CashbookRow[] = [];
  leftTotal = 0;
  rightTotal = 0;

  showExportModal = false;

  // Filter by ledger type, direct/indirect group, and specific ledger
  filterLedgerType: 'INCOME' | 'EXPENSE' | '' = '';
  filterUnderGroup: 'DIRECT' | 'INDIRECT' | '' = '';
  filterLedgerName = '';
  filteredLedgers: { label: string; type: 'INCOME' | 'EXPENSE'; underGroup: string }[] = [];

  showDetailModal = false;
  detailLedgerName = '';
  detailFromDate = '';
  detailToDate = '';
  detailVouchers: TransactionVoucher[] = [];
  isLoadingDetail = false;

  // Detail modal view: transaction list vs. monthly chart
  detailTab: 'list' | 'chart' = 'list';
  // Per-month aggregation of the filtered vouchers (built in loadDetailVouchers)
  monthlyData: { key: string; label: string; total: number; cash: number; upi: number }[] = [];
  monthlyMax = 1;

  // Company logo preloaded as data URL for branded PDF letterheads.
  logoDataUrl: string | null = null;

  constructor(private transactionSvc: TransactionService) {
    addIcons({ bookOutline, calendarOutline, downloadOutline, documentOutline, documentTextOutline, refreshOutline, closeOutline, printOutline, filterOutline, eyeOutline, layersOutline, walletOutline, trendingUpOutline, trendingDownOutline, cashOutline, chevronForwardOutline, checkmarkCircleOutline, barChartOutline });
  }

  ngOnInit() {
    const now = new Date();
    this.toDate = now.toISOString().split('T')[0];
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate = firstOfMonth.toISOString().split('T')[0];
    this.loadCashbook();
    this.preloadLogo();
  }

  // Preload the company logo as a base64 data URL for branded PDF letterheads.
  private preloadLogo() {
    fetch('assets/images/nectar.jpeg')
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .then(dataUrl => { this.logoDataUrl = dataUrl; })
      .catch(() => { this.logoDataUrl = null; });
  }

  loadCashbook() {
    this.isLoading = true;
    this.transactionSvc.getCashbookSummary(this.fromDate, this.toDate).subscribe({
      next: (data) => {
        this.summary = data;
        this.buildCashbookRows();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  buildCashbookRows() {
    if (!this.summary) return;

    const entryMap = new Map<string, number>();
    for (const e of this.summary.entries) {
      entryMap.set(e.ledgerName, (entryMap.get(e.ledgerName) ?? 0) + e.amount);
    }

    this.buildFilteredLedgersList();

    // ── LEFT (Expenditure) ──────────────────────────────────────────
    const leftRows: CashbookRow[] = [];
    let leftRunningTotal = 0;
    let currentHeaderHasChildren = false;
    let pendingHeader: CashbookRow | null = null;

    for (const def of LEFT_STRUCTURE) {
      if (def.isSubHeader) {
        pendingHeader = { label: def.label, amount: null, isSubHeader: true, isBold: false, isHighlighted: false, isTotal: false };
        currentHeaderHasChildren = false;
        continue;
      }
      if (def.key === '__CLOSING') {
        leftRows.push({ label: 'Closing Balance', amount: this.summary!.closingBalance, isSubHeader: false, isBold: true, isHighlighted: false, isTotal: false });
        leftRunningTotal += this.summary!.closingBalance;
        continue;
      }
      if (def.key === '__TOTAL_LEFT') {
        this.leftTotal = leftRunningTotal;
        leftRows.push({ label: 'Total', amount: leftRunningTotal, isSubHeader: false, isBold: true, isHighlighted: false, isTotal: true });
        continue;
      }

      const amount = entryMap.get(def.key) ?? 0;
      if (amount === 0) continue;

      // Flush pending header before first non-zero child
      if (pendingHeader && !currentHeaderHasChildren) {
        leftRows.push(pendingHeader);
        currentHeaderHasChildren = true;
      }
      leftRows.push({ label: def.label, amount, isSubHeader: false, isBold: !!def.isBold, isHighlighted: false, isTotal: false });
      leftRunningTotal += amount;
    }
    this.leftRows = leftRows;

    // ── RIGHT (Income) ──────────────────────────────────────────────
    const rightRows: CashbookRow[] = [];
    let rightRunningTotal = 0;
    let rPendingHeader: CashbookRow | null = null;
    let rHasChildren = false;

    for (const def of RIGHT_STRUCTURE) {
      if (def.isSubHeader) {
        rPendingHeader = { label: def.label, amount: null, isSubHeader: true, isBold: false, isHighlighted: false, isTotal: false };
        rHasChildren = false;
        continue;
      }
      if (def.key === '__OPENING') {
        rightRows.push({ label: 'Opening Balance', amount: this.summary!.openingBalance, isSubHeader: false, isBold: true, isHighlighted: false, isTotal: false });
        rightRunningTotal += this.summary!.openingBalance;
        continue;
      }
      if (def.key === '__TOTAL_RIGHT') {
        this.rightTotal = rightRunningTotal;
        rightRows.push({ label: 'Total', amount: rightRunningTotal, isSubHeader: false, isBold: true, isHighlighted: false, isTotal: true });
        continue;
      }

      const amount = entryMap.get(def.key) ?? 0;
      if (amount === 0) continue;

      if (rPendingHeader && !rHasChildren) {
        rightRows.push(rPendingHeader);
        rHasChildren = true;
      }
      rightRows.push({ label: def.label, amount, isSubHeader: false, isBold: !!def.isBold, isHighlighted: !!def.isHighlighted, isTotal: false });
      rightRunningTotal += amount;
    }
    this.rightTotal = rightRunningTotal;
    this.rightRows = rightRows;
  }

  // ── Export ─────────────────────────────────────────────────────────
  exportAsPdf() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    const margin = 12;
    const midX = pageW / 2;
    const colW = midX - margin - 6;
    const amtColW = 28;
    const labelColW = colW - amtColW;
    const rowH = 7;

    // Branded letterhead
    let y = drawCompanyLetterhead(doc, this.logoDataUrl, pageW);

    // Title chip + period
    drawTitleChip(doc, margin, y, 'CASH BOOK STATEMENT');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(110, 116, 132);
    doc.text(`${this.formatDate(this.fromDate)}  to  ${this.formatDate(this.toDate)}`, pageW - margin, y + 5, { align: 'right' });
    y += 13;

    // Column headers (outlined navy band, no dark fill)
    const tableTop = y;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, midX - margin - 4, 7, 'FD');
    doc.rect(midX + 4, y, pageW - margin - (midX + 4), 7, 'FD');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
    doc.text('Expenditure', margin + 2, y + 4.8);
    doc.text('Amount (Rs.)', margin + labelColW, y + 4.8, { align: 'right' });
    doc.text('Income', midX + 6, y + 4.8);
    doc.text('Amount (Rs.)', midX + 4 + labelColW, y + 4.8, { align: 'right' });
    y += 11;

    const maxLen = Math.max(this.leftRows.length, this.rightRows.length);

    for (let i = 0; i < maxLen; i++) {
      if (y > 190) {
        doc.addPage();
        y = 15;
      }

      const lRow = this.leftRows[i];
      const rRow = this.rightRows[i];

      // Left row
      if (lRow) {
        if (lRow.isSubHeader) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y - 4, midX - margin - 4, rowH - 1, 'F');
          doc.setTextColor(50, 50, 50);
          doc.text(lRow.label, margin + 2, y);
        } else {
          doc.setFont('helvetica', lRow.isBold || lRow.isTotal ? 'bold' : 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(lRow.isTotal ? 10 : 50, lRow.isTotal ? 10 : 50, lRow.isTotal ? 10 : 50);
          if (lRow.isTotal) {
            doc.setDrawColor(80, 80, 80);
            doc.line(margin, y - 4, midX - margin - 4, y - 4);
          }
          doc.text(lRow.label, margin + 2, y);
          if (lRow.amount !== null) {
            doc.text(lRow.amount.toLocaleString('en-IN'), margin + labelColW, y, { align: 'right' });
          }
          if (lRow.isTotal) {
            doc.line(margin, y + 1.5, midX - margin - 4, y + 1.5);
          }
        }
      }

      // Right row
      if (rRow) {
        const rx = midX + 4;
        if (rRow.isSubHeader) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setFillColor(241, 245, 249);
          doc.rect(rx, y - 4, colW, rowH - 1, 'F');
          doc.setTextColor(50, 50, 50);
          doc.text(rRow.label, rx + 2, y);
        } else {
          doc.setFont('helvetica', rRow.isBold || rRow.isTotal ? 'bold' : 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(rRow.isTotal ? 10 : 50, rRow.isTotal ? 10 : 50, rRow.isTotal ? 10 : 50);
          if (rRow.isHighlighted) {
            doc.setFillColor(255, 251, 235);
            doc.rect(rx, y - 4, colW, rowH - 1, 'F');
          }
          if (rRow.isTotal) {
            doc.setDrawColor(80, 80, 80);
            doc.line(rx, y - 4, pageW - margin, y - 4);
          }
          doc.text(rRow.label, rx + 2, y);
          if (rRow.amount !== null) {
            doc.text(rRow.amount.toLocaleString('en-IN'), rx + labelColW, y, { align: 'right' });
          }
          if (rRow.isTotal) {
            doc.line(rx, y + 1.5, pageW - margin, y + 1.5);
          }
        }
      }

      y += rowH;
    }

    // Center divider line (from the top of the column band to the last row)
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(midX, tableTop, midX, y);

    window.open(String(doc.output('bloburi')), '_blank');
    this.showExportModal = false;
  }

  async exportAsExcel() {
    const wb = new Workbook();
    wb.creator = 'Nectar Origin';
    const navy = 'FF1A2863';
    const period = `${this.formatDate(this.fromDate)} to ${this.formatDate(this.toDate)}`;

    // ── Cashbook sheet (two-column statement) ───────────────────────
    const ws = wb.addWorksheet('Cashbook');
    ws.columns = [{ width: 32 }, { width: 16 }, { width: 32 }, { width: 16 }];
    const title = ws.addRow(['NECTAR ORIGIN PRIVATE LIMITED — Cashbook', '', period, '']);
    title.font = { bold: true, size: 12, color: { argb: navy } };
    ws.addRow([]);
    const head = ws.addRow(['Expenditure', 'Amount (Rs.)', 'Income', 'Amount (Rs.)']);
    head.eachCell(c => {
      c.font = { bold: true, color: { argb: navy } };
      c.border = { bottom: { style: 'thin', color: { argb: navy } } };
    });
    const maxLen = Math.max(this.leftRows.length, this.rightRows.length);
    for (let i = 0; i < maxLen; i++) {
      const l = this.leftRows[i];
      const r = this.rightRows[i];
      const row = ws.addRow([
        l ? l.label : '',
        l && l.amount !== null && !l.isSubHeader ? l.amount : '',
        r ? r.label : '',
        r && r.amount !== null && !r.isSubHeader ? r.amount : '',
      ]);
      row.getCell(2).numFmt = '#,##0';
      row.getCell(4).numFmt = '#,##0';
      if (l && (l.isSubHeader || l.isBold || l.isTotal)) row.getCell(1).font = { bold: true };
      if (r && (r.isSubHeader || r.isBold || r.isTotal)) row.getCell(3).font = { bold: true };
    }

    // ── Analysis sheet (calculations + embedded chart image) ────────
    if (this.summary) {
      const a = wb.addWorksheet('Analysis');
      a.columns = [{ width: 38 }, { width: 16 }, { width: 12 }];
      const expenses = this.summary.entries.filter(e => e.ledgerType === 'EXPENSE').sort((x, y) => y.amount - x.amount);
      const incomes = this.summary.entries.filter(e => e.ledgerType === 'INCOME').sort((x, y) => y.amount - x.amount);
      const totalExpense = expenses.reduce((t, e) => t + e.amount, 0);
      const totalIncome = incomes.reduce((t, e) => t + e.amount, 0);

      const big = (label: string) => { const r = a.addRow([label]); r.font = { bold: true, size: 12, color: { argb: navy } }; };
      const kv = (k: string, v: number) => { const r = a.addRow([k, v]); r.getCell(2).numFmt = '#,##0'; };

      big('CASH BOOK ANALYSIS');
      a.addRow([`Period : ${period}`]);
      a.addRow([]);
      const sh = a.addRow(['SUMMARY', 'Amount (Rs.)']); sh.font = { bold: true, color: { argb: navy } };
      kv('Opening Balance', this.summary.openingBalance);
      kv('Total Income', totalIncome);
      kv('Total Expense', totalExpense);
      kv('Net Movement (Income − Expense)', totalIncome - totalExpense);
      kv('Closing Balance', this.summary.closingBalance);
      a.addRow([]);

      const eh = a.addRow(['EXPENSE BREAKDOWN', 'Amount (Rs.)', '% of Total']); eh.font = { bold: true, color: { argb: navy } };
      for (const e of expenses) {
        const r = a.addRow([e.ledgerName, e.amount, totalExpense ? e.amount / totalExpense : 0]);
        r.getCell(2).numFmt = '#,##0'; r.getCell(3).numFmt = '0.0%';
      }
      a.addRow([]);
      const ih = a.addRow(['INCOME BREAKDOWN', 'Amount (Rs.)', '% of Total']); ih.font = { bold: true, color: { argb: navy } };
      for (const e of incomes) {
        const r = a.addRow([e.ledgerName, e.amount, totalIncome ? e.amount / totalIncome : 0]);
        r.getCell(2).numFmt = '#,##0'; r.getCell(3).numFmt = '0.0%';
      }
      a.addRow([]);
      big('CHART');
      const chartRow = a.rowCount; // 0-indexed anchor for the image (next free row)

      const chart = this.buildChartImage(expenses, incomes, totalExpense, totalIncome);
      if (chart) {
        const imgId = wb.addImage({ base64: chart.base64, extension: 'png' });
        a.addImage(imgId, { tl: { col: 0, row: chartRow }, ext: { width: chart.width, height: chart.height } });
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const stamp = new Date().toISOString().slice(0, 10);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cashbook-${stamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
    this.showExportModal = false;
  }

  // Render a bar chart (Income vs Expense + per-head breakdowns) to a PNG and
  // return its raw base64 + display dimensions for embedding into Excel.
  private buildChartImage(
    expenses: CashbookEntry[], incomes: CashbookEntry[], totalExpense: number, totalIncome: number,
  ): { base64: string; width: number; height: number } | null {
    const sections = [
      { title: 'Income vs Expense', items: [
        { label: 'Income', value: totalIncome, color: '#10b981' },
        { label: 'Expense', value: totalExpense, color: '#ef4444' },
      ] },
      { title: 'Expense Breakdown', items: expenses.map(e => ({ label: e.ledgerName, value: e.amount, color: '#f87171' })) },
      { title: 'Income Breakdown', items: incomes.map(e => ({ label: e.ledgerName, value: e.amount, color: '#34d399' })) },
    ];

    const W = 760;
    const rowH = 24;
    const labelW = 190;
    const barMaxW = W - labelW - 120;
    const top = 64;
    let rowsCount = 0;
    for (const s of sections) rowsCount += s.items.length;
    const H = top + sections.length * 22 + rowsCount * rowH + sections.length * 10 + 16;

    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#1a2863'; ctx.font = 'bold 20px Arial';
    ctx.fillText('Cash Book — Calculation Chart', 16, 28);
    ctx.fillStyle = '#64748b'; ctx.font = '12px Arial';
    ctx.fillText(`${this.formatDate(this.fromDate)} to ${this.formatDate(this.toDate)}`, 16, 46);

    let y = top;
    for (const s of sections) {
      const maxV = Math.max(...s.items.map(i => i.value), 1);
      ctx.fillStyle = '#1a2863'; ctx.font = 'bold 13px Arial';
      ctx.fillText(s.title, 16, y + 4);
      y += 20;
      for (const it of s.items) {
        ctx.fillStyle = '#334155'; ctx.font = '12px Arial';
        ctx.fillText(this.truncateLabel(it.label, 26), 16, y + 4);
        const bw = it.value > 0 ? Math.max((it.value / maxV) * barMaxW, 2) : 0;
        if (bw > 0) { ctx.fillStyle = it.color; this.roundRectPath(ctx, labelW, y - 8, bw, 13, 3); ctx.fill(); }
        ctx.fillStyle = '#0f172a'; ctx.font = 'bold 11px Arial';
        ctx.fillText('Rs. ' + it.value.toLocaleString('en-IN'), labelW + bw + 6, y + 2);
        y += rowH;
      }
      y += 10;
    }

    const dataUrl = canvas.toDataURL('image/png');
    return { base64: dataUrl.split(',')[1], width: W, height: H };
  }

  private truncateLabel(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  private roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  formatCurrency(n: number): string {
    return n.toLocaleString('en-IN');
  }

  // Period totals for the summary stat cards (exclude opening/closing balances)
  get totalIncome(): number {
    return this.rightTotal - (this.summary?.openingBalance ?? 0);
  }

  get totalExpense(): number {
    return this.leftTotal - (this.summary?.closingBalance ?? 0);
  }

  // ── Ledger Type / Group Filter ─────────────────────────────────────
  onLedgerTypeChange() {
    this.filterUnderGroup = '';
    this.filterLedgerName = '';
    this.buildFilteredLedgersList();
  }

  onUnderGroupChange() {
    this.filterLedgerName = '';
    this.buildFilteredLedgersList();
  }

  buildFilteredLedgersList() {
    if (!this.summary) return;

    const entryMap = new Map<string, { type: 'INCOME' | 'EXPENSE'; underGroup: string }>();
    for (const e of this.summary.entries) {
      entryMap.set(e.ledgerName, { type: e.ledgerType as 'INCOME' | 'EXPENSE', underGroup: e.underGroup });
    }

    const ledgers: { label: string; type: 'INCOME' | 'EXPENSE'; underGroup: string }[] = [];
    for (const [name, info] of entryMap.entries()) {
      if (this.filterLedgerType && info.type !== this.filterLedgerType) continue;
      if (this.filterUnderGroup && !info.underGroup.startsWith(this.filterUnderGroup)) continue;
      ledgers.push({ label: name, type: info.type, underGroup: info.underGroup });
    }
    this.filteredLedgers = ledgers.sort((a, b) => a.label.localeCompare(b.label));
  }

  // ── Ledger Detail Breakdown ────────────────────────────────────────
  openDetailModal(ledgerName: string) {
    this.detailLedgerName = ledgerName;
    this.detailFromDate = this.fromDate;
    this.detailToDate = this.toDate;
    this.detailTab = 'list';
    this.showDetailModal = true;
    this.loadDetailVouchers();
  }

  loadDetailVouchers() {
    this.isLoadingDetail = true;
    this.transactionSvc.getVouchersByLedger(this.detailLedgerName).subscribe({
      next: (vouchers) => {
        // Filter vouchers by the modal's own date range
        const from = new Date(this.detailFromDate);
        const to = new Date(this.detailToDate);
        const filtered = vouchers.filter(v => {
          const vDate = new Date(v.date);
          return vDate >= from && vDate <= to;
        });
        this.detailVouchers = filtered;
        this.buildMonthlyData();
        this.isLoadingDetail = false;
      },
      error: () => { this.isLoadingDetail = false; },
    });
  }

  // Group the filtered vouchers by calendar month (CASH / UPI split) for the chart tab.
  private buildMonthlyData() {
    const map = new Map<string, { label: string; total: number; cash: number; upi: number }>();
    for (const v of this.detailVouchers) {
      const d = new Date(v.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!map.has(key)) map.set(key, { label, total: 0, cash: 0, upi: 0 });
      const m = map.get(key)!;
      m.total += v.amount;
      if (v.paymentMode === 'CASH') m.cash += v.amount; else m.upi += v.amount;
    }
    this.monthlyData = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, val]) => ({ key, ...val }));
    this.monthlyMax = Math.max(...this.monthlyData.map(m => m.total), 1);
  }

  // Conic-gradient pie for the CASH vs UPI payment-mode split.
  get donutGradient(): string {
    const cash = this.getCashTotal();
    const upi = this.getUpiTotal();
    const total = cash + upi;
    if (total === 0) return 'conic-gradient(#e2e8f0 0 100%)';
    const cashPct = (cash / total) * 100;
    return `conic-gradient(#f59e0b 0 ${cashPct}%, #6366f1 ${cashPct}% 100%)`;
  }

  getCashPct(): number {
    const total = this.getCashTotal() + this.getUpiTotal();
    return total ? Math.round((this.getCashTotal() / total) * 100) : 0;
  }

  getUpiPct(): number {
    const total = this.getCashTotal() + this.getUpiTotal();
    return total ? Math.round((this.getUpiTotal() / total) * 100) : 0;
  }

  getTotalForDetail(): number {
    return this.detailVouchers.reduce((sum, v) => sum + v.amount, 0);
  }

  getCashCount(): number {
    return this.detailVouchers.filter(v => v.paymentMode === 'CASH').length;
  }

  getUpiCount(): number {
    return this.detailVouchers.filter(v => v.paymentMode === 'UPI').length;
  }

  getCashTotal(): number {
    return this.detailVouchers
      .filter(v => v.paymentMode === 'CASH')
      .reduce((sum, v) => sum + v.amount, 0);
  }

  getUpiTotal(): number {
    return this.detailVouchers
      .filter(v => v.paymentMode === 'UPI')
      .reduce((sum, v) => sum + v.amount, 0);
  }

  exportDetailAsPdf() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;

    // Branded letterhead
    let y = drawCompanyLetterhead(doc, this.logoDataUrl, pageW);

    // Title chip + date range
    drawTitleChip(doc, 14, y, 'LEDGER STATEMENT');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(110, 116, 132);
    doc.text(`${this.formatDate(this.detailFromDate)}  to  ${this.formatDate(this.detailToDate)}`, pageW - 14, y + 5, { align: 'right' });
    y += 13;

    // Ledger name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(BRAND_NAVY[0], BRAND_NAVY[1], BRAND_NAVY[2]);
    doc.text(this.detailLedgerName, 14, y);
    y += 5;

    // Summary cards (Total / Cash / UPI)
    const total = this.getTotalForDetail();
    const cashTotal = this.getCashTotal();
    const upiTotal = this.getUpiTotal();
    const cardW = (pageW - 28 - 8) / 3;
    const cardH = 18;
    const cards: Array<{ label: string; value: string; fill: [number, number, number]; text: [number, number, number] }> = [
      { label: 'TOTAL AMOUNT', value: `Rs. ${total.toLocaleString('en-IN')}`, fill: [240, 244, 250], text: BRAND_NAVY },
      { label: `CASH (${this.getCashCount()})`, value: `Rs. ${cashTotal.toLocaleString('en-IN')}`, fill: BRAND_AMBER, text: [180, 120, 10] },
      { label: `UPI (${this.getUpiCount()})`, value: `Rs. ${upiTotal.toLocaleString('en-IN')}`, fill: [233, 234, 250], text: [70, 70, 165] },
    ];
    cards.forEach((c, i) => {
      const cx = 14 + i * (cardW + 4);
      doc.setFillColor(c.fill[0], c.fill[1], c.fill[2]);
      doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(120, 125, 140);
      doc.text(c.label, cx + 4, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(c.text[0], c.text[1], c.text[2]);
      doc.text(c.value, cx + 4, y + 14);
    });
    y += cardH + 8;

    // Transaction table
    autoTable(doc, {
      startY: y,
      head: [['Voucher No.', 'Date', 'Mode', 'Amount (Rs.)', 'Narration']],
      body: this.detailVouchers.map(v => [
        v.voucherNo,
        this.formatDate(v.date),
        v.paymentMode,
        v.amount.toLocaleString('en-IN'),
        v.narration,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: BRAND_NAVY, fontStyle: 'bold', fontSize: 9, lineColor: BRAND_NAVY, lineWidth: 0.3 },
      bodyStyles: { textColor: [45, 50, 70], fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    window.open(String(doc.output('bloburi')), '_blank');
  }

  exportDetailAsExcel() {
    const rows: any[] = [
      { 'Ledger': `${this.detailLedgerName} — Payment Breakdown`, 'Mode': '', 'Amount (₹)': '', 'Narration': '' },
      { 'Ledger': '', 'Mode': '', 'Amount (₹)': '', 'Narration': '' },
    ];

    const total = this.getTotalForDetail();
    const cashTotal = this.getCashTotal();
    const upiTotal = this.getUpiTotal();
    rows.push({
      'Ledger': 'Summary',
      'Mode': '',
      'Amount (₹)': total,
      'Narration': '',
    });
    rows.push({
      'Ledger': `CASH (${this.getCashCount()} txn)`,
      'Mode': 'CASH',
      'Amount (₹)': cashTotal,
      'Narration': '',
    });
    rows.push({
      'Ledger': `UPI (${this.getUpiCount()} txn)`,
      'Mode': 'UPI',
      'Amount (₹)': upiTotal,
      'Narration': '',
    });
    rows.push({ 'Ledger': '', 'Mode': '', 'Amount (₹)': '', 'Narration': '' });

    for (const v of this.detailVouchers) {
      rows.push({
        'Ledger': v.voucherNo,
        'Mode': v.paymentMode,
        'Amount (₹)': v.amount,
        'Narration': v.narration,
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 40 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, this.detailLedgerName);

    const stamp = new Date().toISOString().slice(0, 10);
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.detailLedgerName}-${stamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }
}
