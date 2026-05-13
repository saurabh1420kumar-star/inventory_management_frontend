import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface KraEntry {
  id: number;
  assignmentId?: number;
  kraName: string;
  kraWeight: number;
  targetValue: number;
  achievedValue?: number;
  description: string;
  salesPersonName?: string;
  salesPersonId?: number;
  status: 'ACTIVE' | 'PENDING';
}

interface AssignmentResponse {
  id: number;
  employeeId: number;
  employeeName: string;
  designation: string;
  roleName: string;
  kpiId: number;
  kpiCode: string;
  kpiName: string;
  targetValue?: number;
  achievedValue?: number;
  weightage?: number;
  scorePercentage?: number;
  weightedScore?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  remarks?: string;
  assignedBy?: number;
  createdAt?: string;
  updatedAt?: string;
  kpiMaster?: {
    id: number;
    kpiCode: string;
    kpiName: string;
    description?: string;
    kpiCategory: string;
    measurementUnit: string;
    defaultWeightage?: number;
    frequency: string;
    isActive?: boolean;
    createdBy?: number;
    createdAt?: string;
    updatedAt?: string;
  };
}

interface CreateKraRequest {
  kpiName: string;
  description?: string;
  kpiCategory: string;
  measurementUnit: string;
  defaultWeightage: number;
  frequency?: string;
  isActive?: boolean;
}

interface KraAssignmentRequest {
  employeeName: string;
  employeeId: number;
  designation: string;
  roleName: string;
  assignments: Array<{
    kpiId: number;
    targetValue: number;
    weightage: number;
  }>;
  startDate: string;
  endDate: string;
  remarks?: string;
}

interface KraAssignmentUpdateRequest {
  employeeName: string;
  employeeId: number;
  designation: string;
  roleName: string;
  kpiId: number;
  targetValue: number;
  weightage: number;
  startDate: string;
  endDate: string;
  remarks?: string;
}

interface SalesPerson {
  id: number;
  name: string;
  active: boolean;
  role?: string;
  designation?: string;
  phone?: string;
}

interface KraMasterResponse {
  id: number;
  kpiCode: string;
  kpiName: string;
  description?: string;
  kpiCategory: string;
  measurementUnit: string;
  defaultWeightage: number;
  frequency: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-hr-kra-kpi',
  templateUrl: './hr-kra-kpi.page.html',
  styleUrls: ['./hr-kra-kpi.page.scss'],
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule, IonicModule, HttpClientModule],
})
export class HrKraKpiPage implements OnInit {
  // Create KRA form state
  showCreateKraForm = false;
  kraNameInput = '';
  kraWeightInput: number | null = null;
  measurementUnitInput = 'AMOUNT';
  frequencyInput = 'WEEKLY';
  isLoadingCreateKra = false;
  showSuccessModal = false;
  successMessage = '';
  isSuccessModal = true;

  // Assign KRA form state
  showAssignKraForm = false;
  selectedSalesPerson: SalesPerson | null = null;
  selectedSalesPersonDisplay = '';
  selectedKras: string[] = [];
  kraTargets: Record<string, number | null> = {};
  kraWeightages: Record<string, number | null> = {};
  assignmentStartDate = this.getTodayDate();
  assignmentEndDate = this.get90DaysFromToday();
  isLoadingAssignKra = false;
  isEditingAssignment = false;
  editingAssignmentId: number | null = null;
  editingAssignmentKpiId: number | null = null;

  salesPersons: SalesPerson[] = [];
  measurementUnits: string[] = ['AMOUNT', 'PERCENTAGE', 'COUNT', 'HOURS', 'DAYS'];
  frequencies: string[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

  currentPage = 1;
  itemsPerPage = 5;
  salesPersonSearchQuery = '';
  selectedListSalesPerson: SalesPerson | null = null;
  showSalesPersonSearchDropdown = false;

  // Multi-select state
  selectedListSalesPersons: SalesPerson[] = [];
  isMouseOverDropdown = false;

  // Filter state
  showFiltersModal = false;
  kraListFilters = {
    kraQuery: '',
    status: 'ALL' as 'ALL' | 'ACTIVE' | 'PENDING',
    targetMin: null as number | null,
    targetMax: null as number | null,
  };

  // Export state
  showExportModal = false;

  kraEntries: KraEntry[] = [];
  kraMasterList: KraMasterResponse[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadSalesPersons();
    this.loadKraMasterList();
    this.loadAllAssignments();
  }

  loadSalesPersons(): void {
    this.http.get<SalesPerson[]>('https://api.imsnectarorigin.com/api/sales-hierarchy/list').subscribe({
      next: (response: SalesPerson[]) => {
        if (response && Array.isArray(response)) {
          this.salesPersons = response.filter((person) => person.active && person.name);
        }
      },
      error: (error) => {
        console.error('Error loading sales persons:', error);
      },
    });
  }

  loadKraMasterList(): void {
    this.http.get<KraMasterResponse[]>('https://api.imsnectarorigin.com/api/admin/kra-kpi/master').subscribe({
      next: (response: KraMasterResponse[]) => {
        if (response && Array.isArray(response)) {
          this.kraMasterList = response.filter((kra) => kra.isActive);
        }
      },
      error: (error) => {
        console.error('Error loading KRA master list:', error);
      },
    });
  }

  loadAllAssignments(): void {
    this.http.get<AssignmentResponse[]>('https://api.imsnectarorigin.com/api/admin/kra-kpi/report/all-assignments').subscribe({
      next: (response: AssignmentResponse[]) => {
        if (response && Array.isArray(response)) {
          this.kraEntries = response.map((assignment, index) => ({
            id: assignment.kpiId,
            assignmentId: assignment.id,
            kraName: assignment.kpiName,
            kraWeight: assignment.kpiMaster?.defaultWeightage || assignment.weightage || 0,
            targetValue: assignment.targetValue || 0,
            achievedValue: assignment.achievedValue || 0,
            description: `Assigned to: ${assignment.employeeName}`,
            salesPersonName: assignment.employeeName,
            salesPersonId: assignment.employeeId,
            status: 'ACTIVE',
          }));
          this.currentPage = 1;
        }
      },
      error: (error) => {
        console.error('Error loading all assignments:', error);
      },
    });
  }

  get filteredKraEntries(): KraEntry[] {
    return this.kraEntries.filter((entry) => {
      const name = (entry.salesPersonName || this.getSalesPersonName(entry.description) || '').toLowerCase();

      // Multi-select filter: if salespersons are selected, filter by them
      if (this.selectedListSalesPersons.length > 0) {
        const isSelectedPerson = this.selectedListSalesPersons.some((person) => name === person.name.toLowerCase());
        if (!isSelectedPerson) {
          return false;
        }
      }

      // Single search filter (legacy, fallback if no multi-select)
      if (this.selectedListSalesPerson && this.selectedListSalesPersons.length === 0) {
        return name === this.selectedListSalesPerson.name.trim().toLowerCase();
      }

      // Status filter
      if (this.kraListFilters.status !== 'ALL' && entry.status !== this.kraListFilters.status) {
        return false;
      }

      // Target range filter
      if (this.kraListFilters.targetMin !== null && entry.targetValue < this.kraListFilters.targetMin) {
        return false;
      }
      if (this.kraListFilters.targetMax !== null && entry.targetValue > this.kraListFilters.targetMax) {
        return false;
      }

      // KRA query filter
      if (this.kraListFilters.kraQuery.trim().length > 0) {
        const kraQuery = this.kraListFilters.kraQuery.trim().toLowerCase();
        if (!entry.kraName.toLowerCase().includes(kraQuery)) {
          return false;
        }
      }

      return true;
    });
  }

  get filteredSalesPersons(): SalesPerson[] {
    const query = this.salesPersonSearchQuery.trim().toLowerCase();
    let result = this.salesPersons;

    // Exclude already-selected salespersons
    result = result.filter((person) => !this.selectedListSalesPersons.some((sp) => sp.id === person.id));

    if (!query) {
      return result.slice(0, 8);
    }
    return result.filter((person) => person.name.toLowerCase().includes(query)).slice(0, 8);
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.kraListFilters.kraQuery.trim().length > 0) count++;
    if (this.kraListFilters.status !== 'ALL') count++;
    if (this.kraListFilters.targetMin !== null) count++;
    if (this.kraListFilters.targetMax !== null) count++;
    return count;
  }

  get paginatedEntries(): KraEntry[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredKraEntries.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredKraEntries.length / this.itemsPerPage));
  }

  get startRecord(): number {
    if (!this.filteredKraEntries.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredKraEntries.length);
  }

  get kraOptions(): string[] {
    return Array.from(new Set(this.kraMasterList.map((kra) => kra.kpiName.trim()).filter((name) => name.length > 0)));
  }

  getSalesPersonName(description: string): string {
    if (description.startsWith('Assigned to: ')) {
      return description.replace('Assigned to: ', '').trim();
    }
    return '-';
  }

  get canCreateKra(): boolean {
    return (
      this.kraNameInput.trim().length > 0 &&
      this.kraWeightInput !== null &&
      this.kraWeightInput !== undefined &&
      this.kraWeightInput > 0 &&
      this.kraWeightInput <= 100
    );
  }

  get canAssignKra(): boolean {
    if (!this.selectedSalesPerson || !this.selectedKras.length) {
      return false;
    }
    return this.selectedKras.every((kra) => {
      const target = this.kraTargets[kra];
      return target !== null && target !== undefined && !Number.isNaN(target);
    });
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  get90DaysFromToday(): string {
    const date = new Date();
    date.setDate(date.getDate() + 90);
    return date.toISOString().split('T')[0];
  }

  openCreateKraForm(): void {
    this.showCreateKraForm = true;
    this.kraNameInput = '';
    this.kraWeightInput = null;
    this.measurementUnitInput = 'AMOUNT';
    this.frequencyInput = 'WEEKLY';
  }

  closeCreateKraForm(): void {
    this.showCreateKraForm = false;
    this.kraNameInput = '';
    this.kraWeightInput = null;
    this.measurementUnitInput = 'AMOUNT';
    this.frequencyInput = 'WEEKLY';
  }

  openAssignKraForm(): void {
    this.showAssignKraForm = true;
    this.resetAssignmentForm();
  }

  closeAssignKraForm(): void {
    this.showAssignKraForm = false;
    this.resetAssignmentForm();
  }

  createKra(): void {
    if (!this.canCreateKra) {
      return;
    }

    this.isLoadingCreateKra = true;

    const payload: CreateKraRequest = {
      kpiName: this.kraNameInput.trim(),
      kpiCategory: 'KRA',
      measurementUnit: this.measurementUnitInput,
      defaultWeightage: this.kraWeightInput as number,
      frequency: this.frequencyInput,
      isActive: true,
    };

    this.http.post('https://api.imsnectarorigin.com/api/admin/kra-kpi/create', payload).subscribe({
      next: (response: any) => {
        console.log('KRA created successfully:', response);

        const newEntry: KraEntry = {
          id: response.id || Date.now(),
          kraName: this.kraNameInput.trim(),
          kraWeight: this.kraWeightInput as number,
          targetValue: 0,
          description: `${this.measurementUnitInput} - Master KRA`,
          status: 'ACTIVE',
        };

        this.kraEntries.unshift(newEntry);
        this.closeCreateKraForm();
        this.currentPage = 1;
        this.isLoadingCreateKra = false;

        this.isSuccessModal = true;
        this.successMessage = 'KRA created successfully!';
        this.showSuccessModal = true;
      },
      error: (error) => {
        console.error('Error creating KRA:', error);
        this.isLoadingCreateKra = false;

        let errorMessage = 'Failed to create KRA. Please check the console for details.';

        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error && error.error.defaultWeightage) {
          errorMessage = error.error.defaultWeightage;
        } else if (error.error && error.error.error) {
          errorMessage = error.error.error;
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        }

        // Show error in modal instead of alert
        this.isSuccessModal = false;
        this.successMessage = errorMessage;
        this.showSuccessModal = true;
      },
    });
  }

  onKraToggle(kra: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedKras.includes(kra)) {
        this.selectedKras = [...this.selectedKras, kra];
      }
      if (this.kraTargets[kra] === undefined) {
        this.kraTargets[kra] = null;
      }
      return;
    }

    this.selectedKras = this.selectedKras.filter((name) => name !== kra);
    delete this.kraTargets[kra];
  }

  isKraSelected(kra: string): boolean {
    return this.selectedKras.includes(kra);
  }

  assignKraEntries(): void {
    if (!this.canAssignKra || !this.selectedSalesPerson) {
      return;
    }

    this.isLoadingAssignKra = true;

    // If editing, call update endpoint instead
    if (this.isEditingAssignment && this.editingAssignmentId && this.editingAssignmentKpiId) {
      this.updateAssignment();
      return;
    }

    // Build assignments array with kpiIds from kraMasterList
    const assignments = this.selectedKras
      .map((kraName) => {
        const kra = this.kraMasterList.find((entry) => entry.kpiName === kraName);
        return {
          kpiId: kra?.id || 0,
          targetValue: this.kraTargets[kraName] || 0,
          weightage: kra?.defaultWeightage || 0,
        };
      })
      .filter((assignment) => assignment.kpiId > 0);

    const payload: KraAssignmentRequest = {
      employeeName: this.selectedSalesPerson.name,
      employeeId: this.selectedSalesPerson.id,
      designation: this.selectedSalesPerson.designation || 'Sales Person',
      roleName: this.selectedSalesPerson.role || 'Sales',
      assignments,
      startDate: this.assignmentStartDate,
      endDate: this.assignmentEndDate,
      remarks: '',
    };

    this.http.post('https://api.imsnectarorigin.com/api/admin/kra-kpi/assign/bulk', payload).subscribe({
      next: (response: any) => {
        console.log('KRA assignments created successfully:', response);

        // Update UI to reflect assignments
        this.selectedKras.forEach((kraName, index) => {
          const targetValue = this.kraTargets[kraName] as number;
          const existingIndex = this.kraEntries.findIndex(
            (entry) => entry.kraName.trim().toLowerCase() === kraName.trim().toLowerCase()
          );

          if (existingIndex >= 0) {
            this.kraEntries[existingIndex] = {
              ...this.kraEntries[existingIndex],
              targetValue,
              description: `Assigned to: ${this.selectedSalesPerson?.name}`,
              salesPersonName: this.selectedSalesPerson?.name,
              salesPersonId: this.selectedSalesPerson?.id,
              status: 'ACTIVE',
            };
          } else {
            this.kraEntries.unshift({
              id: Date.now() + index,
              kraName,
              kraWeight: 0,
              targetValue,
              description: `Assigned to: ${this.selectedSalesPerson?.name}`,
              salesPersonName: this.selectedSalesPerson?.name,
              salesPersonId: this.selectedSalesPerson?.id,
              status: 'ACTIVE',
            });
          }
        });

        this.currentPage = 1;
        this.isLoadingAssignKra = false;
        this.isSuccessModal = true;
        this.successMessage = `KRA assignments created successfully for ${this.selectedSalesPerson?.name}!`;
        this.showSuccessModal = true;
        this.resetAssignmentForm();
        this.showAssignKraForm = false;
      },
      error: (error) => {
        console.error('Error assigning KRA:', error);
        this.isLoadingAssignKra = false;

        let errorMessage = 'Failed to assign KRA. Please try again.';
        
        // Extract error message from various possible locations
        if (error.error && error.error.error) {
          errorMessage = error.error.error;
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        }

        // Show error in modal instead of alert
        this.isSuccessModal = false;
        this.successMessage = errorMessage;
        this.showSuccessModal = true;
      },
    });
  }

  updateAssignment(): void {
    if (!this.selectedSalesPerson || !this.editingAssignmentId || !this.editingAssignmentKpiId) {
      return;
    }

    const kraName = this.selectedKras[0];
    const targetValue = this.kraTargets[kraName] || 0;
    const weightage = this.kraWeightages[kraName] || 0;

    const payload: KraAssignmentUpdateRequest = {
      employeeName: this.selectedSalesPerson.name,
      employeeId: this.selectedSalesPerson.id,
      designation: this.selectedSalesPerson.designation || 'Sales Person',
      roleName: this.selectedSalesPerson.role || 'Sales',
      kpiId: this.editingAssignmentKpiId,
      targetValue,
      weightage,
      startDate: this.assignmentStartDate,
      endDate: this.assignmentEndDate,
      remarks: '',
    };

    this.http
      .put(`https://api.imsnectarorigin.com/api/admin/kra-kpi/assign/${this.editingAssignmentId}`, payload)
      .subscribe({
        next: (response: any) => {
          console.log('KRA assignment updated successfully:', response);

          // Update UI
          const existingIndex = this.kraEntries.findIndex(
            (entry) => entry.assignmentId === this.editingAssignmentId
          );
          if (existingIndex >= 0) {
            this.kraEntries[existingIndex] = {
              ...this.kraEntries[existingIndex],
              targetValue,
              kraWeight: weightage,
              description: `Assigned to: ${this.selectedSalesPerson?.name}`,
              salesPersonName: this.selectedSalesPerson?.name,
              salesPersonId: this.selectedSalesPerson?.id,
              status: 'ACTIVE',
            };
          }

          this.isLoadingAssignKra = false;
          this.isSuccessModal = true;
          this.successMessage = `KRA assignment updated successfully for ${this.selectedSalesPerson?.name}!`;
          this.showSuccessModal = true;
          this.resetAssignmentForm();
          this.showAssignKraForm = false;
        },
        error: (error) => {
          console.error('Error updating KRA assignment:', error);
          this.isLoadingAssignKra = false;

          let errorMessage = 'Failed to update KRA assignment. Please try again.';
          if (error.error && error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          }

          // Show error in modal
          this.isSuccessModal = false;
          this.successMessage = errorMessage;
          this.showSuccessModal = true;
        },
      });
  }

  editEntry(entry: KraEntry): void {
    this.showAssignKraForm = true;
    const salesPersonName = entry.description.startsWith('Assigned to: ')
      ? entry.description.replace('Assigned to: ', '').trim()
      : '';
    this.selectedSalesPerson = this.salesPersons.find((person) => person.name === salesPersonName) || null;
    this.selectedSalesPersonDisplay = salesPersonName;
    this.selectedKras = [entry.kraName];
    this.kraTargets = {
      [entry.kraName]: entry.targetValue,
    };
    this.kraWeightages = {
      [entry.kraName]: entry.kraWeight,
    };

    // Set editing mode if this is an assignment
    if (entry.assignmentId && entry.assignmentId > 0) {
      this.isEditingAssignment = true;
      this.editingAssignmentId = entry.assignmentId;
      this.editingAssignmentKpiId = entry.id;
    }
  }

  deleteEntry(entry: KraEntry): void {
    // Determine if this is an assignment or master KRA
    const isAssignment = entry.assignmentId !== undefined && entry.assignmentId > 0;
    const idToDelete = isAssignment ? entry.assignmentId : entry.id;
    const apiEndpoint = isAssignment
      ? `https://api.imsnectarorigin.com/api/admin/kra-kpi/assign/${idToDelete}`
      : `https://api.imsnectarorigin.com/api/admin/kra-kpi/${idToDelete}`;

    // Call backend API to delete
    this.http.delete(apiEndpoint).subscribe({
      next: (response: any) => {
        console.log('KRA deleted successfully:', response);

        // Remove from local array
        this.kraEntries = this.kraEntries.filter((e) => {
          if (isAssignment) {
            return (e.assignmentId || e.id) !== idToDelete;
          } else {
            return e.id !== idToDelete;
          }
        });

        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
        }

        // Show success message
        const messageType = isAssignment ? 'KRA assignment' : 'KRA';
        this.isSuccessModal = true;
        this.successMessage = `${messageType} deleted successfully!`;
        this.showSuccessModal = true;
      },
      error: (error) => {
        console.error('Error deleting KRA:', error);

        let errorMessage = 'Failed to delete KRA. Please try again.';

        if (error.error && error.error.error) {
          errorMessage = error.error.error;
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        }

        // Show error in modal
        this.isSuccessModal = false;
        this.successMessage = errorMessage;
        this.showSuccessModal = true;
      },
    });
  }

  onSalesPersonSearchInput(): void {
    this.selectedListSalesPerson = null;
    this.showSalesPersonSearchDropdown = true;
    this.currentPage = 1;
  }

  onSalesPersonSearchFocus(): void {
    this.showSalesPersonSearchDropdown = true;
  }

  onSalesPersonSearchBlur(): void {
    if (!this.isMouseOverDropdown) {
      setTimeout(() => {
        if (!this.isMouseOverDropdown) {
          this.showSalesPersonSearchDropdown = false;
        }
      }, 150);
    }
  }

  selectListSalesPerson(person: SalesPerson): void {
    this.selectedListSalesPerson = person;
    this.salesPersonSearchQuery = person.name;
    this.showSalesPersonSearchDropdown = false;
    this.currentPage = 1;
  }

  clearSalesPersonSearch(): void {
    this.salesPersonSearchQuery = '';
    this.selectedListSalesPerson = null;
    this.showSalesPersonSearchDropdown = false;
    this.currentPage = 1;
  }

  // Multi-select methods
  onDropdownMouseEnter(): void {
    this.isMouseOverDropdown = true;
  }

  onDropdownMouseLeave(): void {
    this.isMouseOverDropdown = false;
  }

  selectListSalesPersonMulti(person: SalesPerson): void {
    if (!this.selectedListSalesPersons.some((p) => p.id === person.id)) {
      this.selectedListSalesPersons = [...this.selectedListSalesPersons, person];
    }
    this.salesPersonSearchQuery = '';
    this.isMouseOverDropdown = false;
    this.showSalesPersonSearchDropdown = false;
    this.currentPage = 1;
  }

  removeSelectedSalesPerson(personId: number): void {
    this.selectedListSalesPersons = this.selectedListSalesPersons.filter((p) => p.id !== personId);
    this.currentPage = 1;
  }

  // Filter methods
  openFiltersModal(): void {
    this.showFiltersModal = true;
  }

  closeFiltersModal(): void {
    this.showFiltersModal = false;
  }

  applyKraFilters(): void {
    this.currentPage = 1;
    this.closeFiltersModal();
  }

  resetKraFilters(): void {
    this.kraListFilters = {
      kraQuery: '',
      status: 'ALL',
      targetMin: null,
      targetMax: null,
    };
    this.currentPage = 1;
  }

  // Export methods
  openExportModal(): void {
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  exportAsExcel(): void {
    try {
      const rows = this.filteredKraEntries.map((entry) => ({
        KRA: entry.kraName,
        'Sales Person': entry.salesPersonName || this.getSalesPersonName(entry.description),
        'Achieved': entry.achievedValue || 0,
        'Target': entry.targetValue,
        'Target Summary': `${entry.achievedValue || 0} / ${entry.targetValue}`,
        Status: entry.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'KRA List');

      // Add column widths for better formatting
      const colWidths = [
        { wch: 25 }, // KRA
        { wch: 20 }, // Sales Person
        { wch: 12 }, // Achieved
        { wch: 12 }, // Target
        { wch: 15 }, // Target Summary
        { wch: 12 }, // Status
      ];
      worksheet['!cols'] = colWidths;

      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      this.downloadBlob(blob, `kra-management-${this.getDownloadStamp()}.xlsx`);
      this.showExportModal = false;
    } catch (error) {
      console.error('Error exporting Excel:', error);
    }
  }

  exportAsPdf(): void {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const rows = this.filteredKraEntries.map((entry) => [
        entry.kraName,
        entry.salesPersonName || this.getSalesPersonName(entry.description),
        String(entry.achievedValue || 0),
        String(entry.targetValue),
        `${entry.achievedValue || 0} / ${entry.targetValue}`,
        entry.status,
      ]);

      doc.setFontSize(16);
      doc.setTextColor(15, 118, 110);
      doc.text('KRA Management Report', 14, 16);

      autoTable(doc, {
        startY: 28,
        head: [['KRA', 'Sales Person', 'Achieved', 'Target', 'Target Summary', 'Status']],
        body: rows,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          textColor: [50, 50, 50],
        },
        alternateRowStyles: {
          fillColor: [240, 248, 255],
        },
        margin: { top: 28, right: 14, bottom: 14, left: 14 },
      });

      doc.save(`kra-management-${this.getDownloadStamp()}.pdf`);
      this.showExportModal = false;
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }

  private getDownloadStamp(): string {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace(/:/g, '-');
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  private resetAssignmentForm(): void {
    this.selectedSalesPerson = null;
    this.selectedSalesPersonDisplay = '';
    this.selectedKras = [];
    this.kraTargets = {};
    this.kraWeightages = {};
    this.assignmentStartDate = this.getTodayDate();
    this.assignmentEndDate = this.get90DaysFromToday();
    this.isEditingAssignment = false;
    this.editingAssignmentId = null;
    this.editingAssignmentKpiId = null;
  }

  onSalesPersonChange(event: any): void {
    const selectedName = event.target.value;
    this.selectedSalesPerson = this.salesPersons.find((person) => person.name === selectedName) || null;
    this.selectedSalesPersonDisplay = selectedName;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.isSuccessModal = true;
  }
}

