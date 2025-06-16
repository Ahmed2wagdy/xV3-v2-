import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, OnDestroy, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../services/payment.service';
import Swal from 'sweetalert2';

declare var Stripe: any;

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() showPayment = false;
  @Input() paymentAmount = 1; // $1 للاختبار (أو 50 للإنتاج)
  @Output() paymentSuccess = new EventEmitter<any>();
  @Output() paymentCancel = new EventEmitter<void>();

  // Public properties for template
  isProcessing = false;
  isCardElementReady = false;
  stripeLoaded = false;

  // Private Stripe properties
  private stripe: any;
  private elements: any;
  private cardElement: any;
  private initializationAttempts = 0;
  private maxAttempts = 5;

  // Stripe Publishable Key
  private readonly stripePublishableKey = 'pk_test_51RXPxIRHB8EWOr5UtIiT6dVRn7j68SFzmO6kKiJpfLoh58o9kj5h3kb8QTpvnhaqLOVPB5ladvNBHHrQrR2Q9XdH00Q2gtWAQ5';

  constructor(private paymentService: PaymentService) {}

  ngOnInit() {
    console.log('🚀 PaymentComponent initialized with amount:', this.paymentAmount);
    this.loadStripe();
  }

  ngAfterViewInit() {
    // سنقوم بالتهيئة عند فتح الـ modal
  }

  ngOnChanges(changes: any) {
    // عند فتح نافذة الدفع، نقوم بتهيئة Stripe
    if (changes.showPayment && changes.showPayment.currentValue === true) {
      console.log('🔥 Payment modal opened, initializing Stripe...');
      setTimeout(() => {
        this.initializeStripeElements();
      }, 300);
    }
  }

  ngOnDestroy() {
    this.destroyCardElement();
  }

  private destroyCardElement() {
    if (this.cardElement) {
      try {
        this.cardElement.unmount();
        this.cardElement.destroy();
        this.cardElement = null;
        console.log('🗑️ Card element destroyed');
      } catch (error) {
        console.log('Card element already destroyed');
      }
    }
  }

  private loadStripe() {
    console.log('🔄 Loading Stripe...');
    
    if (typeof Stripe === 'undefined') {
      console.log('📦 Stripe not found, loading script...');
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => {
        console.log('✅ Stripe script loaded successfully');
        this.stripeLoaded = true;
        if (this.showPayment) {
          this.initializeStripeElements();
        }
      };
      script.onerror = () => {
        console.error('❌ Failed to load Stripe script');
        this.showError('Failed to load payment system. Please refresh the page.');
      };
      document.head.appendChild(script);
    } else {
      console.log('✅ Stripe already available');
      this.stripeLoaded = true;
      if (this.showPayment) {
        setTimeout(() => this.initializeStripeElements(), 100);
      }
    }
  }

  private initializeStripeElements() {
    this.initializationAttempts++;
    
    console.log(`🔄 Initializing Stripe Elements (Attempt ${this.initializationAttempts})...`);
    
    // فحص الشروط المطلوبة
    if (!this.showPayment) {
      console.log('⏭️ Payment modal not shown, skipping initialization');
      return;
    }
    
    if (typeof Stripe === 'undefined') {
      console.log('⏭️ Stripe not loaded yet, will retry...');
      if (this.initializationAttempts < this.maxAttempts) {
        setTimeout(() => this.initializeStripeElements(), 500);
      }
      return;
    }

    if (this.isCardElementReady) {
      console.log('⏭️ Card element already ready');
      return;
    }

    // فحص وجود الـ container
    const cardElementContainer = document.getElementById('card-element');
    if (!cardElementContainer) {
      console.log('⏭️ Card element container not found, will retry...');
      if (this.initializationAttempts < this.maxAttempts) {
        setTimeout(() => this.initializeStripeElements(), 300);
      }
      return;
    }

    try {
      // تهيئة Stripe
      if (!this.stripe) {
        this.stripe = Stripe(this.stripePublishableKey);
        console.log('✅ Stripe instance created');
      }
      
      // إنشاء Elements instance
      if (!this.elements) {
        this.elements = this.stripe.elements();
        console.log('✅ Elements instance created');
      }
      
      // حذف أي card element موجود
      this.destroyCardElement();
      
      // إنشاء card element جديد
      this.cardElement = this.elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            lineHeight: '24px',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#dc3545',
            iconColor: '#dc3545'
          },
          complete: {
            color: '#28a745',
            iconColor: '#28a745'
          }
        },
        hidePostalCode: true,
        disableLink: true
      });
      
      console.log('✅ Card element created');
      
      // إضافة event listeners
      this.cardElement.on('ready', () => {
        console.log('✅ Card element is ready and interactive');
        this.isCardElementReady = true;
      });
      
      this.cardElement.on('change', (event: any) => {
        console.log('🔄 Card element changed:', event);
        const displayError = document.getElementById('card-errors');
        if (displayError) {
          if (event.error) {
            displayError.textContent = event.error.message;
            console.log('❌ Card validation error:', event.error.message);
          } else {
            displayError.textContent = '';
          }
        }
      });

      this.cardElement.on('focus', () => {
        console.log('👆 Card element focused');
      });

      this.cardElement.on('blur', () => {
        console.log('👆 Card element blurred');
      });
      
      // ربط card element بالـ DOM
      console.log('📌 Mounting card element...');
      this.cardElement.mount('#card-element');
      console.log('✅ Card element mounted successfully');
      
    } catch (error) {
      console.error('❌ Error initializing Stripe:', error);
      this.showError('Failed to initialize payment system. Please refresh the page.');
    }
  }

  async handlePayment() {
    if (!this.stripe || !this.cardElement || this.isProcessing) {
      console.log('❌ Payment blocked:', { 
        stripe: !!this.stripe, 
        cardElement: !!this.cardElement, 
        isProcessing: this.isProcessing 
      });
      
      if (!this.cardElement) {
        this.showError('Payment system not ready. Please wait a moment and try again.');
        this.initializeStripeElements();
      }
      return;
    }

    this.isProcessing = true;
    this.clearErrors();

    try {
      console.log('🔄 Creating payment intent for $', this.paymentAmount);
      
      // 1. إنشاء Payment Intent من البكاند (بدون paymentIntentId لتجنب Error 400)
      const paymentRequest = {
        currency: 'USD',
        amount: this.paymentAmount * 100 // تحويل إلى cents
      };

      console.log('📤 Sending payment request:', paymentRequest);

      const paymentIntentResponse = await this.paymentService.createPaymentIntent(paymentRequest).toPromise();

      console.log('✅ Payment intent response:', paymentIntentResponse);

      if (!paymentIntentResponse?.clientSecret) {
        throw new Error('Failed to create payment intent - no client secret received');
      }

      console.log('🔄 Confirming payment with Stripe...');

      // 2. تأكيد الدفع مع Stripe
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(
        paymentIntentResponse.clientSecret,
        {
          payment_method: {
            card: this.cardElement,
            billing_details: {
              name: 'Property Owner'
            },
          }
        }
      );

      if (error) {
        console.error('❌ Payment confirmation error:', error);
        
        // معالجة أخطاء Stripe المختلفة
        let userMessage = error.message || 'Payment failed. Please try again.';
        
        if (error.code === 'card_declined') {
          userMessage = 'Your card was declined. Please try a different payment method.';
        } else if (error.code === 'insufficient_funds') {
          userMessage = 'Insufficient funds. Please use a different payment method.';
        } else if (error.code === 'expired_card') {
          userMessage = 'Your card has expired. Please use a different payment method.';
        } else if (error.code === 'incorrect_cvc') {
          userMessage = 'Incorrect security code. Please check your card details.';
        }
        
        this.showError(userMessage);
      } else if (paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded:', paymentIntent);
        
        await Swal.fire({
          icon: 'success',
          title: 'Payment Successful!',
          text: 'Your payment has been processed successfully.',
          confirmButtonColor: '#08227B',
          timer: 3000,
          showConfirmButton: true
        });

        // إرسال البيانات للمكون الأب
        this.paymentSuccess.emit({
          paymentIntentId: paymentIntent.id,
          amount: this.paymentAmount,
          status: paymentIntent.status,
          clientSecret: paymentIntentResponse.clientSecret
        });
      } else {
        console.log('⚠️ Unexpected payment status:', paymentIntent.status);
        throw new Error(`Unexpected payment status: ${paymentIntent.status}`);
      }

    } catch (error: any) {
      console.error('❌ Payment error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      // معالجة أخطاء محددة
      if (error.message) {
        if (error.message.includes('Payment already processed')) {
          errorMessage = 'This payment was already processed. Please create a new payment.';
        } else if (error.message.includes('Authentication failed')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (error.message.includes('Payment method required')) {
          errorMessage = 'Please check your card details and try again.';
        } else if (error.message.includes('Network error')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      } else if (error.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.status === 400) {
        errorMessage = 'Invalid payment request. Please check your information.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      this.showError(errorMessage);
    } finally {
      this.isProcessing = false;
    }
  }

  private showError(message: string) {
    const errorDiv = document.getElementById('card-errors');
    if (errorDiv) {
      errorDiv.textContent = message;
    }
    
    Swal.fire({
      icon: 'error',
      title: 'Payment Failed',
      text: message,
      confirmButtonColor: '#08227B'
    });
  }

  private clearErrors() {
    const errorDiv = document.getElementById('card-errors');
    if (errorDiv) {
      errorDiv.textContent = '';
    }
  }

  cancelPayment() {
    console.log('❌ Payment cancelled by user');
    this.paymentCancel.emit();
  }

  // إعادة المحاولة اليدوية
  retryInitialization() {
    console.log('🔄 Manual retry initialization...');
    this.isCardElementReady = false;
    this.initializationAttempts = 0;
    this.destroyCardElement();
    setTimeout(() => this.initializeStripeElements(), 100);
  }
}