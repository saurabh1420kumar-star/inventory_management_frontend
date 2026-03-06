import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  cubeOutline,
  carOutline,
  checkmarkCircle,
  closeCircle,
  timeOutline,
  calendarOutline,
  businessOutline,
  chevronDownOutline,
  chevronUpOutline,
  locationOutline,
  callOutline,
  mailOutline,
  personOutline,
  navigateOutline,
  documentTextOutline,
  receiptOutline,
  cartOutline,
  cashOutline,
  checkmarkDoneCircleOutline,
  airplaneOutline,
  mapOutline,
  layersOutline,
  swapHorizontalOutline,
  alertCircleOutline,
  refreshOutline,
  ellipseOutline,
  downloadOutline,
  printOutline,
  shieldCheckmarkOutline,
  clipboardOutline,
  flagOutline,
  bicycleOutline,
  trainOutline,
  boatOutline,
  analyticsOutline
} from 'ionicons/icons';

// ---- Interfaces ----

export interface ShipmentContact {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface ShipmentTimeline {
  label: string;
  status: 'completed' | 'in-progress' | 'pending';
  date?: string;
  location?: string;
  remarks?: string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  orderNumber: string;
  distributorName: string;
  origin: string;
  destination: string;
  shipmentDate: string;
  expectedDelivery: string;
  actualDelivery?: string;
  status: 'in-transit' | 'delivered' | 'pending' | 'delayed' | 'returned';
  transportMode: 'road' | 'rail' | 'air' | 'sea';
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  totalWeight: string;
  totalPackages: number;
  trackingTimeline: ShipmentTimeline[];
  logisticsContact: ShipmentContact;
  totalAmount: number;
  gdnNumber?: string;
  expanded?: boolean;
}

@Component({
  selector: 'app-logistics',
  templateUrl: './logistics.page.html',
  styleUrls: ['./logistics.page.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
  ],
  standalone: true,
})
export class LogisticsPage implements OnInit {
  shipments: Shipment[] = [];
  filteredShipments: Shipment[] = [];
  searchQuery: string = '';
  filterStatus: string = 'all';

  // Stats
  totalShipments: number = 0;
  inTransitCount: number = 0;
  deliveredCount: number = 0;
  pendingCount: number = 0;
  delayedCount: number = 0;

  constructor() {
    addIcons({
      'search-outline': searchOutline,
      'cube-outline': cubeOutline,
      'car-outline': carOutline,
      'checkmark-circle': checkmarkCircle,
      'close-circle': closeCircle,
      'time-outline': timeOutline,
      'calendar-outline': calendarOutline,
      'business-outline': businessOutline,
      'chevron-down-outline': chevronDownOutline,
      'chevron-up-outline': chevronUpOutline,
      'location-outline': locationOutline,
      'call-outline': callOutline,
      'mail-outline': mailOutline,
      'person-outline': personOutline,
      'navigate-outline': navigateOutline,
      'document-text-outline': documentTextOutline,
      'receipt-outline': receiptOutline,
      'cart-outline': cartOutline,
      'cash-outline': cashOutline,
      'checkmark-done-circle-outline': checkmarkDoneCircleOutline,
      'airplane-outline': airplaneOutline,
      'map-outline': mapOutline,
      'layers-outline': layersOutline,
      'swap-horizontal-outline': swapHorizontalOutline,
      'alert-circle-outline': alertCircleOutline,
      'refresh-outline': refreshOutline,
      'ellipse-outline': ellipseOutline,
      'download-outline': downloadOutline,
      'print-outline': printOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline,
      'clipboard-outline': clipboardOutline,
      'flag-outline': flagOutline,
      'bicycle-outline': bicycleOutline,
      'train-outline': trainOutline,
      'boat-outline': boatOutline,
      'analytics-outline': analyticsOutline
    });
  }

  ngOnInit() {
    this.loadShipments();
    this.updateStats();
  }

  loadShipments() {
    this.shipments = [
      {
        id: '1',
        shipmentNumber: 'SHP-2026-001',
        orderNumber: 'ORD-2026-001',
        distributorName: 'test-5 created',
        origin: 'Nectar Warehouse, Noida, UP',
        destination: 'test-5 Distribution Center, Gurugram, HR',
        shipmentDate: '2026-02-20',
        expectedDelivery: '2026-02-24',
        status: 'in-transit',
        transportMode: 'road',
        vehicleNumber: 'UP-14-AT-2345',
        driverName: 'Ramesh Yadav',
        driverPhone: '+91 98123 45678',
        totalWeight: '450 kg',
        totalPackages: 12,
        totalAmount: 45000,
        gdnNumber: 'GDN-2026-001',
        trackingTimeline: [
          { label: 'Shipment Created', status: 'completed', date: '2026-02-20', location: 'Nectar Warehouse, Noida', remarks: 'Shipment packed and sealed' },
          { label: 'Dispatched from Warehouse', status: 'completed', date: '2026-02-20', location: 'Noida, UP', remarks: 'Loaded on vehicle UP-14-AT-2345' },
          { label: 'In Transit - Hub 1', status: 'completed', date: '2026-02-21', location: 'Delhi NCR Hub', remarks: 'Passed through Delhi sorting center' },
          { label: 'In Transit - En Route', status: 'in-progress', date: '2026-02-22', location: 'NH-48 Highway', remarks: 'Currently moving towards destination' },
          { label: 'Out for Delivery', status: 'pending', location: 'Gurugram, HR' },
          { label: 'Delivered', status: 'pending', location: 'test-5 Distribution Center' },
        ],
        logisticsContact: {
          name: 'Suresh Kumar',
          role: 'Logistics Head',
          phone: '+91 65432 10987',
          email: 'suresh.kumar@nectar.com'
        },
        expanded: true
      },
      {
        id: '2',
        shipmentNumber: 'SHP-2026-002',
        orderNumber: 'ORD-2026-003',
        distributorName: 'test-3-edited',
        origin: 'Nectar Warehouse, Noida, UP',
        destination: 'test-3 Hub, Bangalore, KA',
        shipmentDate: '2026-02-07',
        expectedDelivery: '2026-02-12',
        actualDelivery: '2026-02-12',
        status: 'delivered',
        transportMode: 'road',
        vehicleNumber: 'KA-01-MH-7890',
        driverName: 'Manoj Singh',
        driverPhone: '+91 87654 32109',
        totalWeight: '780 kg',
        totalPackages: 24,
        totalAmount: 78000,
        gdnNumber: 'GDN-2026-003',
        trackingTimeline: [
          { label: 'Shipment Created', status: 'completed', date: '2026-02-07', location: 'Nectar Warehouse, Noida', remarks: 'Shipment packed and sealed' },
          { label: 'Dispatched from Warehouse', status: 'completed', date: '2026-02-07', location: 'Noida, UP', remarks: 'Loaded on vehicle KA-01-MH-7890' },
          { label: 'In Transit - Hub 1', status: 'completed', date: '2026-02-08', location: 'Nagpur Hub', remarks: 'Transit hub checkpoint' },
          { label: 'In Transit - Hub 2', status: 'completed', date: '2026-02-10', location: 'Hyderabad Hub', remarks: 'Transit hub checkpoint' },
          { label: 'Out for Delivery', status: 'completed', date: '2026-02-12', location: 'Bangalore, KA', remarks: 'Out for final delivery' },
          { label: 'Delivered', status: 'completed', date: '2026-02-12', location: 'test-3 Hub, Bangalore', remarks: 'Received by distributor. POD collected.' },
        ],
        logisticsContact: {
          name: 'Suresh Kumar',
          role: 'Logistics Head',
          phone: '+91 65432 10987',
          email: 'suresh.kumar@nectar.com'
        },
        expanded: false
      },
      {
        id: '3',
        shipmentNumber: 'SHP-2026-003',
        orderNumber: 'ORD-2026-004',
        distributorName: 'Metro Supplies Pvt Ltd',
        origin: 'Nectar Warehouse, Noida, UP',
        destination: 'Metro Main Warehouse, Mumbai, MH',
        shipmentDate: '2026-02-25',
        expectedDelivery: '2026-03-01',
        status: 'pending',
        transportMode: 'rail',
        totalWeight: '1200 kg',
        totalPackages: 36,
        totalAmount: 125000,
        gdnNumber: 'GDN-2026-004',
        trackingTimeline: [
          { label: 'Shipment Created', status: 'completed', date: '2026-02-25', location: 'Nectar Warehouse, Noida', remarks: 'Goods packed. Awaiting rail booking.' },
          { label: 'Dispatched from Warehouse', status: 'pending', location: 'Noida, UP' },
          { label: 'In Transit', status: 'pending', location: 'En Route' },
          { label: 'Arrived at Destination Hub', status: 'pending', location: 'Mumbai, MH' },
          { label: 'Out for Delivery', status: 'pending', location: 'Mumbai, MH' },
          { label: 'Delivered', status: 'pending', location: 'Metro Main Warehouse' },
        ],
        logisticsContact: {
          name: 'Suresh Kumar',
          role: 'Logistics Head',
          phone: '+91 65432 10987',
          email: 'suresh.kumar@nectar.com'
        },
        expanded: false
      },
      {
        id: '4',
        shipmentNumber: 'SHP-2026-004',
        orderNumber: 'ORD-2026-005',
        distributorName: 'Southern Traders',
        origin: 'Nectar Warehouse, Noida, UP',
        destination: 'Southern Traders, Chennai, TN',
        shipmentDate: '2026-02-18',
        expectedDelivery: '2026-02-23',
        status: 'delayed',
        transportMode: 'road',
        vehicleNumber: 'TN-02-BK-4567',
        driverName: 'Vijay Kumar',
        driverPhone: '+91 76543 21098',
        totalWeight: '340 kg',
        totalPackages: 8,
        totalAmount: 54000,
        gdnNumber: 'GDN-2026-005',
        trackingTimeline: [
          { label: 'Shipment Created', status: 'completed', date: '2026-02-18', location: 'Nectar Warehouse, Noida', remarks: 'Shipment packed and sealed' },
          { label: 'Dispatched from Warehouse', status: 'completed', date: '2026-02-18', location: 'Noida, UP', remarks: 'Loaded on vehicle TN-02-BK-4567' },
          { label: 'In Transit - Hub 1', status: 'completed', date: '2026-02-19', location: 'Hyderabad Hub', remarks: 'Transit hub checkpoint' },
          { label: 'In Transit - Delayed', status: 'in-progress', date: '2026-02-22', location: 'Near Vellore, TN', remarks: 'Vehicle breakdown. Awaiting replacement vehicle. ETA delayed by 2 days.' },
          { label: 'Out for Delivery', status: 'pending', location: 'Chennai, TN' },
          { label: 'Delivered', status: 'pending', location: 'Southern Traders, Chennai' },
        ],
        logisticsContact: {
          name: 'Suresh Kumar',
          role: 'Logistics Head',
          phone: '+91 65432 10987',
          email: 'suresh.kumar@nectar.com'
        },
        expanded: false
      }
    ];
    this.filteredShipments = [...this.shipments];
  }

  updateStats() {
    this.totalShipments = this.shipments.length;
    this.inTransitCount = this.shipments.filter(s => s.status === 'in-transit').length;
    this.deliveredCount = this.shipments.filter(s => s.status === 'delivered').length;
    this.pendingCount = this.shipments.filter(s => s.status === 'pending').length;
    this.delayedCount = this.shipments.filter(s => s.status === 'delayed').length;
  }

  onSearchChange(event: any) {
    this.searchQuery = event.target.value?.toLowerCase() || '';
    this.applyFilters();
  }

  onFilterChange(status: string) {
    this.filterStatus = status;
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.shipments];

    if (this.searchQuery) {
      filtered = filtered.filter(s =>
        s.shipmentNumber.toLowerCase().includes(this.searchQuery) ||
        s.orderNumber.toLowerCase().includes(this.searchQuery) ||
        s.distributorName.toLowerCase().includes(this.searchQuery) ||
        s.destination.toLowerCase().includes(this.searchQuery)
      );
    }

    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === this.filterStatus);
    }

    this.filteredShipments = filtered;
  }

  toggleShipment(shipment: Shipment) {
    shipment.expanded = !shipment.expanded;
  }

  getStatusLabel(status: string): string {
    const map: { [key: string]: string } = {
      'in-transit': 'In Transit',
      'delivered': 'Delivered',
      'pending': 'Pending',
      'delayed': 'Delayed',
      'returned': 'Returned'
    };
    return map[status] || status;
  }

  getStatusShortLabel(status: string): string {
    const map: { [key: string]: string } = {
      'in-transit': 'Transit',
      'delivered': 'Done',
      'pending': 'Pending',
      'delayed': 'Delayed',
      'returned': 'Return'
    };
    return map[status] || status;
  }

  getTransportIcon(mode: string): string {
    const map: { [key: string]: string } = {
      'road': 'car-outline',
      'rail': 'train-outline',
      'air': 'airplane-outline',
      'sea': 'boat-outline'
    };
    return map[mode] || 'cube-outline';
  }

  getTransportLabel(mode: string): string {
    const map: { [key: string]: string } = {
      'road': 'Road Transport',
      'rail': 'Rail Transport',
      'air': 'Air Freight',
      'sea': 'Sea Freight'
    };
    return map[mode] || mode;
  }

  getTimelineIcon(step: ShipmentTimeline): string {
    switch (step.status) {
      case 'completed': return 'checkmark-circle';
      case 'in-progress': return 'time-outline';
      default: return 'ellipse-outline';
    }
  }

  getProgressPercentage(shipment: Shipment): number {
    const completed = shipment.trackingTimeline.filter(t => t.status === 'completed').length;
    return Math.round((completed / shipment.trackingTimeline.length) * 100);
  }

  getCompletedSteps(shipment: Shipment): number {
    return shipment.trackingTimeline.filter(t => t.status === 'completed').length;
  }

  handleRefresh() {
    this.loadShipments();
    this.updateStats();
    this.applyFilters();
  }

  onDownloadGDN(shipment: Shipment) {
    console.log(`Downloading GDN for shipment ${shipment.shipmentNumber}`);
  }

  onPrintWaybill(shipment: Shipment) {
    console.log(`Printing waybill for shipment ${shipment.shipmentNumber}`);
  }
}
