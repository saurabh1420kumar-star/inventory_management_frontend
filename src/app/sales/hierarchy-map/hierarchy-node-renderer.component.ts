import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface HierarchyNode {
  person: any;
  children: HierarchyNode[];
  isExpanded: boolean;
}

@Component({
  selector: 'app-hierarchy-node-renderer',
  templateUrl: './hierarchy-node-renderer.component.html',
  styleUrls: ['./hierarchy-node-renderer.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class HierarchyNodeRendererComponent {
  @Input() node!: HierarchyNode;
  @Input() level: number = 0;
  @Input() selectedPersonId: string | undefined;
  @Input() childIndex: number = 0;
  @Input() totalChildren: number = 0;

  @Output() selectPerson = new EventEmitter<any>();
  @Output() toggleNode = new EventEmitter<HierarchyNode>();

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
      'SSM': 'State Sales Manager',
      'RSM': 'Regional Sales Manager',
      'ASM': 'Area Sales Manager',
      'SALES_EXECUTIVE': 'Sales Executive'
    };
    const key = Object.keys(map).find(k => role.toUpperCase().includes(k));
    return key ? map[key] : role;
  }

  onSelectPerson() {
    this.selectPerson.emit(this.node.person);
  }

  onToggleNode() {
    this.toggleNode.emit(this.node);
  }

  isSelected(): boolean {
    if (!this.selectedPersonId) return false;
    return this.node.person.id?.toString() === this.selectedPersonId;
  }

  hasChildren(): boolean {
    return this.node.children && this.node.children.length > 0;
  }
}
