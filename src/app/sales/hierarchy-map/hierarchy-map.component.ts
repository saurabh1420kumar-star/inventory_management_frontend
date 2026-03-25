import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { SalesHierarchyService, SalesPerson } from '../../services/sales-hierarchy.service';
import { HierarchyNodeRendererComponent } from './hierarchy-node-renderer.component';

interface HierarchyNode {
  person: SalesPerson;
  children: HierarchyNode[];
  isExpanded: boolean;
}

@Component({
  selector: 'app-hierarchy-map',
  templateUrl: './hierarchy-map.component.html',
  styleUrls: ['./hierarchy-map.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, HierarchyNodeRendererComponent]
})
export class HierarchyMapComponent implements OnInit {
  salesPersons: SalesPerson[] = [];
  hierarchyTree: HierarchyNode[] = [];
  isLoading = true;
  selectedPerson: SalesPerson | null = null;
  searchTerm = '';
  searchResults: HierarchyNode[] = [];
  isSearching = false;



  constructor(
    private hierarchyService: SalesHierarchyService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.loadHierarchy();
  }

  loadHierarchy() {
    this.isLoading = true;
    this.hierarchyService.getAllSalesPersons().subscribe({
      next: (data) => {
        this.salesPersons = data;
        const treeFromService = this.hierarchyService.buildHierarchyTree(data);
        this.hierarchyTree = this.addIsExpandedToTree(treeFromService);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private addIsExpandedToTree(treeFromService: any[]): HierarchyNode[] {
    return treeFromService.map(node => this.addIsExpandedRecursive(node));
  }

  private addIsExpandedRecursive(node: any): HierarchyNode {
    return {
      person: node.person,
      children: node.children?.map((child: any) => this.addIsExpandedRecursive(child)) || [],
      isExpanded: true
    };
  }

  toggleExpanded(node: HierarchyNode) {
    node.isExpanded = !node.isExpanded;
  }

  selectPerson(person: SalesPerson) {
    this.selectedPerson = person;
  }

  searchHierarchy() {
    this.isSearching = true;
    const term = this.searchTerm.toLowerCase();
    
    if (!term.trim()) {
      this.isSearching = false;
      this.searchResults = [];
      return;
    }

    this.searchResults = this.flattenSearch(this.hierarchyTree, term);
  }

  private flattenSearch(nodes: HierarchyNode[], term: string): HierarchyNode[] {
    const results: HierarchyNode[] = [];

    const traverse = (node: HierarchyNode) => {
      const person = node.person;
      if (
        person.name.toLowerCase().includes(term) ||
        person.role.toLowerCase().includes(term) ||
        person.zone?.toLowerCase().includes(term) ||
        (person.employeeCode ?? person.employeeRollNo ?? '').toLowerCase().includes(term) ||
        person.phone?.toLowerCase().includes(term) ||
        person.email?.toLowerCase().includes(term)
      ) {
        results.push({
          ...node,
          isExpanded: true
        });
      }

      if (node.children?.length) {
        node.children.forEach(child => traverse(child));
      }
    };

    nodes.forEach(node => traverse(node));
    return results;
  }

  getDisplayHierarchy(): HierarchyNode[] {
    return this.isSearching ? this.searchResults : this.hierarchyTree;
  }

  clearSearch() {
    this.searchTerm = '';
    this.isSearching = false;
    this.searchResults = [];
  }

  getRoleColor(role: string): string {
    const map: Record<string, string> = {
      NATIONAL_SALES_MGR: '#7c3aed',
      STATE_SALES_MGR:    '#0ea5e9',
      ZONAL_SALES_MGR:    '#0d9488',
      REGIONAL_SALES_MGR: '#8b5cf6',
      AREA_SALES_MGR:     '#f59e0b',
      SALES_OFFICER:      '#f97316',
      SALES_EXECUTIVE:    '#10b981',
      // legacy mock values
      SSM: '#0ea5e9', RSM: '#8b5cf6', ASM: '#dc2626'
    };
    return map[role] ?? '#6366f1';
  }

  getRoleShort(role: string): string {
    const map: Record<string, string> = {
      NATIONAL_SALES_MGR: 'National Manager',
      STATE_SALES_MGR:    'State Manager',
      ZONAL_SALES_MGR:    'Zonal Manager',
      REGIONAL_SALES_MGR: 'Regional Manager',
      AREA_SALES_MGR:     'Area Manager',
      SALES_OFFICER:      'Sales Officer',
      SALES_EXECUTIVE:    'Sales Executive',
      SSM: 'State Manager', RSM: 'Regional Manager', ASM: 'Area Manager'
    };
    return map[role] ?? role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  closeModal() {
    this.modalController.dismiss();
  }
}
