import { Component, OnInit } from '@angular/core';
import { Router,RouterModule } from '@angular/router';
import { Auth } from '../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.page.html',
  styleUrls: ['./sidebar.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
})
export class SidebarPage implements OnInit {

  userRole: string | null = null;
  userName: string | null = null;

  constructor(private router: Router, private auth: Auth) { }

  ngOnInit() {
    // Initialize user data when component loads
    this.userRole = this.auth.getRoleType();
    this.userName = this.auth.getUsername();
  }

  logout() {
    console.log('Logout clicked');
    // Clear any auth data if necessary
    this.router.navigateByUrl('/login');
  }

}
