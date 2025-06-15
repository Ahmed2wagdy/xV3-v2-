import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

export const authGuard: CanActivateFn = (route, state) => {
  const cookieService = inject(CookieService);
  const router = inject(Router);
  
  const token = cookieService.get('token');
  
  if (token) {
    return true;
  }
  
  // Show alert and redirect to login
  alert('Authentication Required. Please log in to access this page');
  router.navigate(['/log-in'], { queryParams: { returnUrl: state.url } });
  
  return false;
};