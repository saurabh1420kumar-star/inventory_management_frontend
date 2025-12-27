import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  // {
  //   path: 'home',
  //   loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  // },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'signup',
    loadChildren: () => import('./signup/signup.module').then( m => m.SignupPageModule)
  },
 
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then( m => m.DashboardPageModule)
  },
  {
    path: 'pending-approvals',
    loadChildren: () => import('./pending-approvals/pending-approvals.module').then( m => m.PendingApprovalsPageModule)

  },
  {
    path: 'master-inventory',
    loadChildren: () => import('./master-inventory/master-inventory.module').then( m => m.MasterInventoryPageModule)
  },  {
    path: 'accounts-master',
    loadChildren: () => import('./accounts/accounts-master/accounts-master.module').then( m => m.AccountsMasterPageModule)
  },
  {
    path: 'sidebar',
    loadChildren: () => import('./sidebar/sidebar.module').then( m => m.SidebarPageModule)
  }

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
