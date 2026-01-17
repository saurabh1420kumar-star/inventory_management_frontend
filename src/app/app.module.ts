import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { SidebarPage } from './sidebar/sidebar.page';
import { AclDirective } from './acl/acl.directive';

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

    SidebarPage,    // standalone component
    AclDirective,   // standalone directive
    // LogoutComponent // standalone logout component
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
