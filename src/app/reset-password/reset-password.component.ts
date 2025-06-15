import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { AuthService, ResetPasswordRequest } from '../services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  submitted = false;
  email: string = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  isVerified = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.resetForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });

    // Get email and verification status from route parameters
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || params['contact'] || '';
      this.isVerified = params['verified'] === 'true';
      
      if (!this.email) {
        // No email provided, redirect to forgot password
        this.router.navigate(['/forget-pass']);
        return;
      }
      
      if (!this.isVerified) {
        // Email not verified, redirect to OTP verification
        this.router.navigate(['/otp-verification'], { 
          queryParams: { email: this.email } 
        });
      }
    });
  }

  // Custom validator for password matching
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ matching: true });
      return { matching: true };
    }
    return null;
  }

  // Getter for easy access to form fields
  get f() { return this.resetForm.controls; }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    this.submitted = true;

    // Stop if form is invalid
    if (this.resetForm.invalid) {
      return;
    }

    this.isLoading = true;

    // Prepare reset password request
    const resetRequest: ResetPasswordRequest = {
      email: this.email,
      newPassword: this.resetForm.value.password,
      confirmPassword: this.resetForm.value.confirmPassword
    };

    // Call reset password API
    this.authService.resetPassword(resetRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.status === 'Success') {
          Swal.fire({
            icon: 'success',
            title: 'Password Reset Successful',
            text: 'Your password has been reset successfully! You can now log in with your new password.',
            confirmButtonColor: '#08227B'
          }).then(() => {
            // Navigate to login page
            this.router.navigate(['/log-in']);
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Reset Failed',
            text: response.message || 'Failed to reset password. Please try again.',
            confirmButtonColor: '#08227B'
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Reset password error:', error);
        
        let errorMessage = 'Failed to reset password. Please try again.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          errorMessage = 'Invalid email or password format.';
        } else if (error.status === 404) {
          errorMessage = 'Email not found or verification expired.';
        }

        Swal.fire({
          icon: 'error',
          title: 'Reset Failed',
          text: errorMessage,
          confirmButtonColor: '#08227B'
        });
      }
    });
  }

  // Go back to OTP verification
  goBack(): void {
    this.router.navigate(['/otp-verification'], { 
      queryParams: { email: this.email } 
    });
  }

  // Go to login page
  goToLogin(): void {
    this.router.navigate(['/log-in']);
  }
}