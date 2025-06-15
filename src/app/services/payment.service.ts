import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface PaymentIntentRequest {
  currency: string;
  amount?: number; // سنت (مثال: 5000 = $50.00)
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = 'http://digitalpropertyapi.runasp.net/api/Payment';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  createPaymentIntent(request: PaymentIntentRequest): Observable<PaymentIntentResponse> {
    // 🚨 TEMPORARY: Mock response for testing
    // احذف الكومنت لما الـ API يشتغل
    /*
    return of({
      clientSecret: 'pi_mock_1234567890_secret_test',
      paymentIntentId: 'pi_mock_1234567890'
    }).pipe(delay(1000));
    */
    
    // الـ API الحقيقي
    return this.http.post<PaymentIntentResponse>(
      `${this.apiUrl}/create-or-update-payment-intent`,
      {
        currency: request.currency,
        amount: request.amount || 0 // $50.00 in cents
      },
      {
        headers: this.authService.getAuthHeaders()
      }
    );
  }
}