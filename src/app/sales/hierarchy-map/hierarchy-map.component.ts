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
        person.employeeCode.toLowerCase().includes(term) ||
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
      'SSM': '#8b5cf6',
      'RSM': '#0d9488',
      'ASM': '#dc2626',
      'SALES_EXECUTIVE': '#059669'
    };
    const key = Object.keys(map).find(k => role.toUpperCase().includes(k));
    return key ? map[key] : '#6366f1';
  }

  getRoleShort(role: string): string {
    const map: Record<string, string> = {
      SSM: 'State Manager',
      RSM: 'Regional Manager',
      ASM: 'Area Manager',
      SALES_EXECUTIVE: 'Sales Executive'
    };
    return map[role] ?? role;
  }

  closeModal() {
    this.modalController.dismiss();
  }
}
