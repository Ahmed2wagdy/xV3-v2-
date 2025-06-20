import { Routes } from '@angular/router';
import { 
  LogInComponent,
  ForgetPassComponent,
  OtpVerificationComponent,
  ResetPasswordComponent,
  HomeComponent
} from './index';
import { SignUpComponent } from './sign-up/sign-up.component';
import { AddPropertyComponent } from './add-property/add-property.component';
import { FavoritesComponent } from './favorites/favorites.component';
import { ChatBotComponent } from './chat-bot/chat-bot.component';
import { PropertyDetailComponent } from './property-detail/property-detail.component';
import { ProfileComponent } from './profile/profile.component';
import { authGuard } from './guards/auth.guard';
import { AboutUsComponent } from './about-us/about-us.component';
import { MyPropertiesComponent } from './my-properties/my-properties.component'; // إضافة هذا
import { FiltersComponent } from './filters/filters.component';

export const routes: Routes = [
  // Default route redirects to login
  { path: '', redirectTo: '/log-in', pathMatch: 'full' },
  
  // Authentication routes
  { path: 'log-in', component: LogInComponent },
  { path: 'sign-up', component: SignUpComponent },
  { path: 'forget-pass', component: ForgetPassComponent },
  { path: 'otp-verification', component: OtpVerificationComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  
  // Protected routes
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'property/:id', component: PropertyDetailComponent, canActivate: [authGuard] },
  { path: 'add-property', component: AddPropertyComponent, canActivate: [authGuard] },
  { path: 'favorites', component: FavoritesComponent, canActivate: [authGuard] },
  { path: 'chat-bot', component: ChatBotComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'about-us', component: AboutUsComponent , canActivate: [authGuard] },
  {path:'my-properties',component:MyPropertiesComponent , canActivate: [authGuard]},
  {path: 'filters', component: FiltersComponent, canActivate: [authGuard]},
  // Wildcard route
  { path: '**', redirectTo: '/log-in' }
];