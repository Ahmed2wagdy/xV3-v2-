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
  @Input() paymentAmount = 50;
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
    console.log('🚀 PaymentComponent initialized');
    this.loadStripe();
  }

  ngAfterViewInit() {
    // مش نعمل initialize هنا، هنعمله لما الـ modal يفتح
  }

  ngOnChanges(changes: any) {
    // لما showPayment يتغير لـ true، نعمل initialize
    if (changes.showPayment && changes.showPayment.currentValue === true) {
      console.log('🔥 Payment modal opened, initializing Stripe...');
      setTimeout(() => {
        this.initializeStripeElements();
      }, 300); // انتظار للـ modal يظهر كامل
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
        console.log('✅ Stripe script loaded from external');
        this.stripeLoaded = true;
        this.initializeStripeElements();
      };
      script.onerror = () => {
        console.error('❌ Failed to load Stripe script');
        this.showError('Failed to load payment system. Please refresh the page.');
      };
      document.head.appendChild(script);
    } else {
      console.log('✅ Stripe already available');
      this.stripeLoaded = true;
      // أجل التهيئة شوية عشان الـ DOM يخلص
      setTimeout(() => this.initializeStripeElements(), 100);
    }
  }

  private initializeStripeElements() {
    this.initializationAttempts++;
    
    console.log(`🔄 Initializing Stripe Elements (Attempt ${this.initializationAttempts})...`);
    
    // تحقق من الشروط
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

    // تحقق من وجود الـ container
    const cardElementContainer = document.getElementById('card-element');
    if (!cardElementContainer) {
      console.log('⏭️ Card element container not found, will retry...');
      if (this.initializationAttempts < this.maxAttempts) {
        setTimeout(() => this.initializeStripeElements(), 300);
      }
      return;
    }

    try {
      // Initialize Stripe
      if (!this.stripe) {
        this.stripe = Stripe(this.stripePublishableKey);
        console.log('✅ Stripe instance created');
      }
      
      // Create Elements instance
      if (!this.elements) {
        this.elements = this.stripe.elements();
        console.log('✅ Elements instance created');
      }
      
      // Destroy existing card element if any
      this.destroyCardElement();
      
      // Create new card element
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
        hidePostalCode: true, // إخفاء ZIP code
        disableLink: true // إخفاء Save with Link
      });
      
      console.log('✅ Card element created');
      
      // Add event listeners
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
            console.log('❌ Card error:', event.error.message);
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
      
      // Mount the card element
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
        // محاولة إعادة التهيئة
        this.initializeStripeElements();
      }
      return;
    }

    this.isProcessing = true;
    this.clearErrors();

    try {
      console.log('🔄 Creating payment intent for $', this.paymentAmount);
      
      // 1. Create payment intent from backend
      const paymentIntentResponse = await this.paymentService.createPaymentIntent({
        currency: 'usd',
        amount: this.paymentAmount * 100 // Convert to cents
      }).toPromise();

      console.log('✅ Payment intent response:', paymentIntentResponse);

      if (!paymentIntentResponse?.clientSecret) {
        throw new Error('Failed to create payment intent - no client secret received');
      }

      console.log('🔄 Confirming payment with Stripe...');

      // 2. Confirm payment with Stripe
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
        this.showError(error.message || 'Payment failed. Please try again.');
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

        this.paymentSuccess.emit({
          paymentIntentId: paymentIntent.id,
          amount: this.paymentAmount,
          status: paymentIntent.status
        });
      } else {
        throw new Error(`Payment status: ${paymentIntent.status}`);
      }

    } catch (error: any) {
      console.error('❌ Payment error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.status === 401) {
        errorMessage = 'Please log in again to continue.';
      } else if (error.status === 400) {
        errorMessage = 'Invalid payment request. Please check your information.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
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

  // طريقة للإصلاح اليدوي
  retryInitialization() {
    console.log('🔄 Manual retry initialization...');
    this.isCardElementReady = false;
    this.initializationAttempts = 0;
    this.destroyCardElement();
    setTimeout(() => this.initializeStripeElements(), 100);
  }
}