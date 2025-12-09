import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';



interface StatCard {
  label: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: string;
}

interface InventoryItem {
  name: string;
  value: number;
}

interface Order {
  id: string;
  product: string;
  quantity: number;
  status: string;
  amount: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ]
})

export class DashboardPage  {

  currentUser = {
    name: 'John Doe',
    email: 'john.doe@nexus.com',
    role: 'Admin',
  };

  statsCards: StatCard[] = [
    {
      label: 'Total Products',
      value: '12,485',
      change: '+12.5%',
      changeType: 'up',
      icon: 'cube-outline',
    },
    {
      label: 'Total Orders',
      value: '1,842',
      change: '+8.2%',
      changeType: 'up',
      icon: 'cart-outline',
    },
    {
      label: 'Total Revenue',
      value: '$284,520',
      change: '-3.1%',
      changeType: 'down',
      icon: 'trending-down-outline',
    },
    {
      label: 'Active Users',
      value: '2,458',
      change: '+5.8%',
      changeType: 'up',
      icon: 'people-outline',
    },
  ];

  inventoryData: InventoryItem[] = [
    { name: 'Electronics', value: 400 },
    { name: 'Clothing', value: 300 },
    { name: 'Food', value: 200 },
    { name: 'Others', value: 100 },
  ];

  recentOrders: Order[] = [
    {
      id: 'ORD-001',
      product: 'Laptop Dell XPS',
      quantity: 5,
      status: 'Delivered',
      amount: '$4,500',
    },
    {
      id: 'ORD-002',
      product: 'Office Chairs',
      quantity: 20,
      status: 'In Transit',
      amount: '$2,400',
    },
    {
      id: 'ORD-003',
      product: 'Printer Paper',
      quantity: 100,
      status: 'Pending',
      amount: '$350',
    },
    {
      id: 'ORD-004',
      product: 'USB Cables',
      quantity: 50,
      status: 'Delivered',
      amount: '$125',
    },
  ];

  constructor(private router: Router) {}

  logout() {
    // TODO: clear auth state if using a service
    this.router.navigateByUrl('/login');
  }

  getStatusChipClass(status: string): string {
    switch (status) {
      case 'Delivered':
        return 'status-chip delivered';
      case 'In Transit':
        return 'status-chip transit';
      case 'Pending':
        return 'status-chip pending';
      default:
        return 'status-chip';
    }
  }
}

