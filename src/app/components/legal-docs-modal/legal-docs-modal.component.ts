import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-legal-docs-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './legal-docs-modal.component.html',
  styleUrls: ['./legal-docs-modal.component.scss']
})
export class LegalDocsModalComponent {
  @Input() isOpen = false;
  @Input() docType: 'privacy' | 'terms' = 'privacy';
  @Input() title = '';
  @Output() didClose = new EventEmitter<void>();

  close(): void {
    this.didClose.emit();
  }
}
