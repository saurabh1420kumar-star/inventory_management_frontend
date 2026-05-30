import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { SidebarPage } from './sidebar/sidebar.page';
import { AclDirective } from './acl/acl.directive';
import { LogoLoaderComponent } from './shared/logo-loader/logo-loader.component';
import { LoadingInterceptor } from './interceptors/loading.interceptor';

// ⬇️ NEW COMPONENT
// import { LogoutComponent } from './logout/logout.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,

    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,

    SidebarPage,         // standalone component
    AclDirective,        // standalone directive
    LogoLoaderComponent, // global logo loader overlay
    // LogoutComponent // standalone logout component
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
