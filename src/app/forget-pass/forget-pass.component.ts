import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service'; // تأكد من المسار صح

@Component({
  selector: 'app-forget-pass',
  templateUrl: './forget-pass.component.html',
  styleUrls: ['./forget-pass.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class ForgetPassComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  submitted = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    public router: Router,
    private authService: AuthService  // 👈 أضفت AuthService
  ) { }

  ngOnInit(): void {
    this.forgotPasswordForm = this.formBuilder.group({
      emailOrPhone: ['', [Validators.required, this.validateEmailOrPhone]]
    });
  }

  validateEmailOrPhone(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phonePattern = /^\+?\d{10,15}$/;

    if (!value) return null;
    if (emailPattern.test(value) || phonePattern.test(value)) return null;

    return { invalidFormat: true };
  }

  get f() { return this.forgotPasswordForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.forgotPasswordForm.invalid) return;

    this.isLoading = true;
    
    // 👈 تعطيل الفورم أثناء الإرسال
    this.forgotPasswordForm.disable();
    
    const emailOrPhone = this.forgotPasswordForm.getRawValue().emailOrPhone;
    
    console.log('📧 Sending OTP to:', emailOrPhone);

    // 👈 استخدام AuthService بدلاً من setTimeout
    this.authService.forgotPassword({ email: emailOrPhone }).subscribe({
      next: (response) => {
        console.log('✅ OTP sent successfully:', response);
        
        this.successMessage = response.message || 'OTP sent successfully! Check your email.';
        this.isLoading = false;
        
        // 👈 الانتقال لصفحة OTP بعد النجاح
        setTimeout(() => {
          this.router.navigate(['/otp-verification'], {
            queryParams: { contact: emailOrPhone }
          });
        }, 1500);
      },
      error: (error) => {
        console.error('❌ Failed to send OTP:', error);
        
        this.errorMessage = error.message || 'Failed to send OTP. Please try again.';
        this.isLoading = false;
        
        // 👈 إعادة تفعيل الفورم عند الخطأ
        this.forgotPasswordForm.enable();
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}