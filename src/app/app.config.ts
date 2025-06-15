import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { CookieService } from 'ngx-cookie-service';
import { AuthService } from './services/auth.service';
import { PropertyService } from './services/property.service';
import { AmenitiesService } from './services/amenities.service';
import { PaymentService } from './services/payment.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    CookieService,
    AuthService,
    PropertyService,
    AmenitiesService,
    PaymentService
  ]
};
