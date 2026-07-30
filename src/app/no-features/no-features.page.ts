import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-no-features',
  templateUrl: './no-features.page.html',
  styleUrls: ['./no-features.page.scss'],
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class NoFeaturesPage {
  username: string | null = null;
  roleType: string | null = null;

  constructor(private auth: Auth) {
    this.username = this.auth.getUsername();
    this.roleType = this.auth.getRoleType();
  }
}
