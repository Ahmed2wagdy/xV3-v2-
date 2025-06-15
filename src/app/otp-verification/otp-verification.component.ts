import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AuthService, VerifyOtpRequest, ResendOtpRequest, ResendEmailConfirmationOtpRequest } from '../services/auth.service';

@Component({
  selector: 'app-otp-verification',
  templateUrl: './otp-verification.component.html',
  styleUrls: ['./otp-verification.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class OtpVerificationComponent implements OnInit, OnDestroy {
  @ViewChild('digit1') digit1!: ElementRef;
  @ViewChild('digit2') digit2!: ElementRef;
  @ViewChild('digit3') digit3!: ElementRef;
  @ViewChild('digit4') digit4!: ElementRef;
  @ViewChild('digit5') digit5!: ElementRef;
  @ViewChild('digit6') digit6!: ElementRef;
  
  otpForm!: FormGroup;
  email: string = '';
  otpType: string = ''; // 'signup' or 'forgot-password'
  otpError: string = '';
  countdown: number = 60;
  isLoading: boolean = false;
  isResending: boolean = false;
  countdownSubscription?: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Initialize form with 6 digits
    this.otpForm = this.formBuilder.group({
      digit1: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      digit2: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      digit3: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      digit4: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      digit5: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      digit6: ['', [Validators.required, Validators.pattern('^[0-9]$')]]
    });

    // Get email and type from route parameters
    this.route.queryParams.subscribe(params => {
      this.email = params['contact'] || params['email'] || '';
      this.otpType = params['type'] || 'forgot-password'; // default to forgot-password
      
      if (!this.email) {
        // No email provided, redirect based on type
        if (this.otpType === 'signup') {
          this.router.navigate(['/sign-up']);
        } else {
          this.router.navigate(['/forget-pass']);
        }
      }
    });

    this.startCountdown();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.digit1) {
        this.digit1.nativeElement.focus();
      }
    }, 0);
  }

  ngOnDestroy() {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  startCountdown() {
    this.countdown = 60;
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
    
    this.countdownSubscription = interval(1000)
      .pipe(take(60))
      .subscribe(() => {
        this.countdown--;
        if (this.countdown === 0) {
          if (this.countdownSubscription) {
            this.countdownSubscription.unsubscribe();
          }
        }
      });
  }

  moveToNext(event: any, nextIndex: number) {
    const input = event.target;
    const value = input.value;
    
    if (value.length === 1) {
      // Move focus to the next input
      if (nextIndex > 0 && nextIndex <= 6) {
        const nextInput = this.getDigitElementByIndex(nextIndex);
        if (nextInput) {
          nextInput.nativeElement.focus();
        }
      }
    } else if (value.length === 0 && event.key === 'Backspace') {
      // Move focus to the previous input on backspace
      const prevIndex = nextIndex - 2;
      if (prevIndex >= 1 && prevIndex <= 6) {
        const prevInput = this.getDigitElementByIndex(prevIndex);
        if (prevInput) {
          prevInput.nativeElement.focus();
        }
      }
    }
    
    // Clear any previous errors
    this.otpError = '';
  }
  
  getDigitElementByIndex(index: number): ElementRef | null {
    switch (index) {
      case 1: return this.digit1;
      case 2: return this.digit2;
      case 3: return this.digit3;
      case 4: return this.digit4;
      case 5: return this.digit5;
      case 6: return this.digit6;
      default: return null;
    }
  }

  isOtpComplete(): boolean {
    const { digit1, digit2, digit3, digit4, digit5, digit6 } = this.otpForm.value;
    return !!digit1 && !!digit2 && !!digit3 && !!digit4 && !!digit5 && !!digit6;
  }

  resendOtp() {
    if (this.countdown === 0 && !this.isResending) {
      this.isResending = true;
      
      // Use the correct resend endpoint based on OTP type
      const resendObservable = this.otpType === 'signup' 
        ? this.authService.resendEmailConfirmationOtp({ email: this.email } as ResendEmailConfirmationOtpRequest)
        : this.authService.resendOtp({ email: this.email } as ResendOtpRequest);

      resendObservable.subscribe({
        next: (response) => {
          this.isResending = false;
          this.startCountdown();
          Swal.fire({
            icon: 'success',
            title: 'OTP Resent',
            text: 'A new OTP has been sent to your email.',
            showConfirmButton: false,
            timer: 2000
          });
        },
        error: (error) => {
          this.isResending = false;
          console.error('Resend OTP error:', error);
          Swal.fire({
            icon: 'error',
            title: 'Resend Failed',
            text: 'Failed to resend OTP. Please try again.',
            confirmButtonColor: '#08227B'
          });
        }
      });
    }
  }

  onSubmit(): void {
    if (this.otpForm.invalid || !this.isOtpComplete()) {
      this.otpError = 'Please enter all 6 digits';
      return;
    }

    this.isLoading = true;
    this.otpError = '';

    const { digit1, digit2, digit3, digit4, digit5, digit6 } = this.otpForm.value;
    const otp = `${digit1}${digit2}${digit3}${digit4}${digit5}${digit6}`;
    
    // Prepare verify OTP request
    const verifyRequest: VerifyOtpRequest = {
      email: this.email,
      otp: otp
    };

    // Call verify OTP API
    this.authService.verifyOtp(verifyRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.status === 'Success') {
          if (this.otpType === 'signup') {
            // For signup verification
            Swal.fire({
              icon: 'success',
              title: 'Account Verified',
              text: 'Your account has been verified successfully! You can now log in.',
              confirmButtonColor: '#08227B'
            }).then(() => {
              // Navigate to login page
              this.router.navigate(['/log-in']);
            });
          } else {
            // For password reset verification
            Swal.fire({
              icon: 'success',
              title: 'OTP Verified',
              text: 'OTP verified successfully! You can now reset your password.',
              confirmButtonColor: '#08227B'
            }).then(() => {
              // Navigate to reset password page
              this.router.navigate(['/reset-password'], { 
                queryParams: { email: this.email, verified: 'true' } 
              });
            });
          }
        } else {
          this.otpError = response.message || 'Invalid OTP. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Verify OTP error:', error);
        
        let errorMessage = 'Invalid OTP. Please try again.';
        if (error.message) {
          errorMessage = error.message;
        } else if (error.status === 400) {
          errorMessage = 'Invalid OTP format or expired OTP.';
        }
        
        this.otpError = errorMessage;
      }
    });
  }

  // Clear form and start over
  clearForm(): void {
    this.otpForm.reset();
    this.otpError = '';
    if (this.digit1) {
      this.digit1.nativeElement.focus();
    }
  }

  // Go back to previous page
  goBack(): void {
    if (this.otpType === 'signup') {
      this.router.navigate(['/sign-up']);
    } else {
      this.router.navigate(['/forget-pass']);
    }
  }

  // Get page title based on type
  getPageTitle(): string {
    return this.otpType === 'signup' ? 'Verify Your Account' : 'Enter OTP';
  }

  // Get page subtitle based on type
  getPageSubtitle(): string {
    if (this.otpType === 'signup') {
      return 'Enter the 6-digit verification code we sent to your email to activate your account';
    } else {
      return 'Enter the 6-digit OTP code we just sent you on your registered Email/Phone number';
    }
  }
}