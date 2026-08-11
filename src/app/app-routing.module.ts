import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard'; // Import the guard
import { AclGuard } from './guards/acl.guard';
import { DashboardGuard } from './guards/dashboard.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'signup',
    loadChildren: () => import('./signup/signup.module').then(m => m.SignupPageModule)
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./forgot-password/forgot-password.module').then(m => m.ForgotPasswordPageModule)
  },
  {
    path: 'no-features',
    loadComponent: () => import('./no-features/no-features.page').then(m => m.NoFeaturesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardPageModule),
    canActivate: [AuthGuard, DashboardGuard] // Protected + DASHBOARD feature (web admins)
  },
  {
    path: 'master-inventory',
    loadChildren: () => import('./master-inventory/master-inventory.module').then(m => m.MasterInventoryPageModule),
    canActivate: [AuthGuard] // Protected route
  },
  {
    path: 'inward',
    loadComponent: () => import('./inward/inward.page').then(m => m.InwardPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'unit-master',
    loadChildren: () => import('./unit-master/unit-master.module').then(m => m.UnitMasterPageModule),
    canActivate: [AuthGuard] // Protected route
  },
  {
    path: 'accounts-master',
    loadChildren: () => import('./accounts/accounts-master/accounts-master.module').then(m => m.AccountsMasterPageModule),
    canActivate: [AuthGuard] // Protected route
  },
  {
    path: 'payment-request',
    loadComponent: () => import('./accounts/payment-request/payment-request.page').then(m => m.PaymentRequestPage),
    canActivate: [AuthGuard]
  },
  
  {
    path: 'feedback',
    loadChildren: () => import('./feedback/feedback.module').then(m => m.FeedbackPageModule),
    canActivate: [AuthGuard] // Protected route
  },
  {
    path: 'user-right',
    loadChildren: () => import('./user-right/user-right.module').then(m => m.UserRightPageModule),
    canActivate: [AuthGuard] // Protected route
  },
  {
    path: 'machine-inventory',
    loadChildren: () => import('./machine-inventory/machine-inventory.module').then( m => m.MachineInventoryPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'outward-inventory',
    loadComponent: () => import('./outward-inventory/outward-inventory.page').then(m => m.OutwardInventoryPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'hr-department',
    loadChildren: () => import('./hr-department/hr-department.module').then( m => m.HrDepartmentPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'hr-kra-kpi',
    loadComponent: () => import('./hr-kra-kpi/hr-kra-kpi.page').then(m => m.HrKraKpiPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'distributor',
    loadChildren: () => import('./distributor/distributor.module').then( m => m.DistributorPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'order-details',
    loadChildren: () => import('./order-details/order-details.module').then( m => m.OrderDetailsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'sales',
    loadChildren: () => import('./sales/sales.module').then(m => m.SalesPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'sales-distributor',
    loadChildren: () => import('./sales-distributor/sales-distributor.module').then(m => m.SalesDistributorPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'distributor-cart',
    loadChildren: () => import('./distributor-cart/distributor-cart.module').then(m => m.DistributorCartPageModule),
    canActivate: [AuthGuard]
  },
  {
      path: 'logistics',
    loadChildren: () => import('./logistics/logistics.module').then(m => m.LogisticsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'dispatch',
    loadChildren: () => import('./dispatch/dispatch.module').then(m => m.DispatchPageModule),
    canActivate: [AclGuard],
    data: { feature: 'DISPATCH' }
  },
  {
    path: 'complaints',
    loadComponent: () => import('./complaints/complaints.page').then(m => m.ComplaintsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'complaints-management',
    loadComponent: () => import('./complaints-management/complaints-management.page').then(m => m.ComplaintsManagementPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'complaint-resolution',
    loadComponent: () => import('./complaint-resolution/complaint-resolution.page').then(m => m.ComplaintResolutionPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'proforma-invoice',
    loadComponent: () => import('./proforma-invoice/proforma-invoice.page').then(m => m.ProformaInvoicePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'gdn',
    loadComponent: () => import('./gdn/gdn.page').then(m => m.GdnPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'pi-update',
    loadChildren: () => import('./pi-update/pi-update.module').then(m => m.PiUpdatePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'transaction-master',
    loadComponent: () => import('./transaction-master/transaction-master.page').then(m => m.TransactionMasterPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'hr-admin-approval',
    loadComponent: () => import('./hr-admin-approval/hr-admin-approval.page').then(m => m.HrAdminApprovalPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'transaction-cashbook',
    loadComponent: () => import('./transaction-cashbook/transaction-cashbook.page').then(m => m.TransactionCashbookPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/mis-dashboard',
    loadComponent: () => import('./reports/mis-dashboard/mis-dashboard.page').then(m => m.MisDashboardPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/inventory-reports',
    loadComponent: () => import('./reports/inventory-reports/inventory-reports.page').then(m => m.InventoryReportsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/stock-movement',
    loadComponent: () => import('./reports/stock-movement/stock-movement.page').then(m => m.StockMovementPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/batch-management',
    loadComponent: () => import('./reports/batch-management/batch-management.page').then(m => m.BatchManagementPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/production-reports',
    loadComponent: () => import('./reports/production-reports/production-reports.page').then(m => m.ProductionReportsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/sales-reports',
    loadComponent: () => import('./reports/sales-reports/sales-reports.page').then(m => m.SalesReportsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/receivables-collections',
    loadComponent: () => import('./reports/receivables-collections/receivables-collections.page').then(m => m.ReceivablesCollectionsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/sales-orders',
    loadComponent: () => import('./reports/sales-orders/sales-orders.page').then(m => m.SalesOrdersReportPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/dispatch-delivery',
    loadComponent: () => import('./reports/dispatch-delivery/dispatch-delivery.page').then(m => m.DispatchDeliveryReportPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/inventory-issues',
    loadComponent: () => import('./reports/inventory-issues/inventory-issues.page').then(m => m.InventoryIssuesReportPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/scrap-management',
    loadComponent: () => import('./reports/scrap-management/scrap-management.page').then(m => m.ScrapManagementReportPage),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    loadChildren: () => import('./not-found/not-found.module').then(m => m.NotFoundPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
