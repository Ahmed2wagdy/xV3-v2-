import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface PaymentIntentRequest {
  currency: string;
  amount?: number; // بالـ cents (مثال: 100 = $1.00، 5000 = $50.00)
  // ⚠️ إزالة paymentIntentId لتجنب خطأ 400
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

  /**
   * إنشاء Payment Intent جديد
   * ✅ لا نمرر paymentIntentId أبداً لتجنب Error 400
   */
  createPaymentIntent(request: PaymentIntentRequest): Observable<PaymentIntentResponse> {
    console.log('🔄 Creating NEW payment intent...', request);
    
    // تحضير البيانات - بدون paymentIntentId نهائياً
    const payload: any = {
      currency: request.currency || 'USD'
    };

    // إضافة المبلغ إذا كان موجود
    if (request.amount && request.amount > 0) {
      payload.amount = request.amount;
    }

    console.log('📤 Payment request payload (NEW):', payload);

    return this.http.post<PaymentIntentResponse>(
      `${this.apiUrl}/create-or-update-payment-intent`,
      payload,
      {
        headers: this.authService.getAuthHeaders()
      }
    ).pipe(
      tap((response) => {
        console.log('✅ NEW payment intent created successfully:', response);
      }),
      catchError((error) => {
        console.error('❌ Payment intent creation failed:', error);
        console.log('📊 Full error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error
        });
        
        // معالجة أخطاء Stripe المختلفة
        if (error.status === 400 && error.error?.error) {
          const stripeError = error.error.error;
          console.error('🔴 Stripe Error:', stripeError);
          
          // حلول للأخطاء الشائعة
          if (stripeError.includes('amount could not be updated')) {
            throw new Error('Payment session expired. Please try again with a new payment.');
          } else if (stripeError.includes('requires_payment_method')) {
            throw new Error('Payment method required. Please check your card details.');
          } else if (stripeError.includes('insufficient_funds')) {
            throw new Error('Insufficient funds. Please use a different payment method.');
          } else if (stripeError.includes('card_declined')) {
            throw new Error('Card declined. Please use a different payment method.');
          } else {
            throw new Error(stripeError);
          }
        }
        
        // أخطاء API أخرى
        let errorMessage = 'Payment initialization failed. Please try again.';
        
        if (error.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied. Please check your permissions.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.status === 0) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  /**
   * إنشاء payment intent للاختبار بمبلغ تجريبي ($1)
   */
  createTestPaymentIntent(): Observable<PaymentIntentResponse> {
    return this.createPaymentIntent({
      currency: 'USD',
      amount: 100 // $1.00 للاختبار
    });
  }

  /**
   * إنشاء payment intent بدون تحديد مبلغ (البكاند يحدد)
   */
  createDefaultPaymentIntent(): Observable<PaymentIntentResponse> {
    return this.createPaymentIntent({
      currency: 'USD'
      // لا نحدد amount - البكاند يحدده
    });
  }

  /**
   * إنشاء payment intent لرسوم العقارات
   */
  createPropertyListingPayment(amount: number = 5000): Observable<PaymentIntentResponse> {
    return this.createPaymentIntent({
      currency: 'USD',
      amount: amount // مبلغ بالـ cents (5000 = $50.00)
    });
  }
}