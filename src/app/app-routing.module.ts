import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard'; // Import the guard

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
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardPageModule),
    canActivate: [AuthGuard] // Protected route
  },
  {
    path: 'master-inventory',
    loadChildren: () => import('./master-inventory/master-inventory.module').then(m => m.MasterInventoryPageModule),
    canActivate: [AuthGuard] // Protected route
  },
  {
    path: 'complaints',
    loadChildren: () => import('./feedback/feedback.module').then(m => m.FeedbackPageModule),
    canActivate: [AuthGuard] // Protected route
  },
  {
    path: 'accounts-master',
    loadChildren: () => import('./accounts/accounts-master/accounts-master.module').then(m => m.AccountsMasterPageModule),
    canActivate: [AuthGuard] // Protected route
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
    loadChildren: () => import('./machine-inventory/machine-inventory.module').then( m => m.MachineInventoryPageModule)
  },
  {
    path: 'hr-department',
    loadChildren: () => import('./hr-department/hr-department.module').then( m => m.HrDepartmentPageModule)
  },  {
    path: 'distributor',
    loadChildren: () => import('./distributor/distributor.module').then( m => m.DistributorPageModule)
  },



];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
