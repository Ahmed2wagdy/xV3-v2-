import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { AuthService, SignupRequest } from '../services/auth.service';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class SignUpComponent implements OnInit {
  signupForm!: FormGroup;
  submitted = false;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
      return;
    }
    
    this.signupForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      countryCode: ['+20', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,11}$')]],
      city: ['', Validators.required],
      dob: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Getter for easy access to form fields
  get f() { return this.signupForm.controls; }

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

  onSubmit(): void {
    this.submitted = true;

    // Stop if form is invalid
    if (this.signupForm.invalid) {
      // Find and focus on the first invalid field
      const firstInvalidField = Object.keys(this.signupForm.controls).find(
        key => this.signupForm.get(key)?.invalid
      );
      
      if (firstInvalidField) {
        const element = document.getElementById(firstInvalidField);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    this.isLoading = true;
    this.signupForm.disable(); // 🔥 Disable form during submission

    // Prepare signup request according to API structure
    const formValues = this.signupForm.value;
    const signupRequest: SignupRequest = {
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      email: formValues.email,
      phoneNumber: `${formValues.countryCode}${formValues.phone}`,
      city: formValues.city,
      birthOfDate: formValues.dob,
      password: formValues.password,
      confirmPassword: formValues.confirmPassword,
      isTermsAccepted: formValues.terms
    };

    // Call the signup API
    this.authService.signup(signupRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.signupForm.enable(); // 🔥 Re-enable form
        
        // Show success message and redirect to OTP verification
        Swal.fire({
          icon: 'success',
          title: 'Registration Successful',
          text: 'Account created successfully! Please check your email for the OTP verification code.',
          confirmButtonColor: '#08227B',
          confirmButtonText: 'Continue to Verification'
        }).then(() => {
          // Navigate to OTP verification page with the email
          this.router.navigate(['/otp-verification'], { 
            queryParams: { 
              email: formValues.email,
              type: 'signup'
            } 
          });
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.signupForm.enable(); // 🔥 Re-enable form on error
        console.error('Signup error:', error);
        
        // Handle different types of errors
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.status === 400) {
          // Handle validation errors
          if (error.error && error.error.errors) {
            const validationErrors = error.error.errors;
            const errorMessages = [];
            
            // Extract validation error messages
            for (const field in validationErrors) {
              if (validationErrors[field] && Array.isArray(validationErrors[field])) {
                errorMessages.push(...validationErrors[field]);
              }
            }
            
            if (errorMessages.length > 0) {
              errorMessage = errorMessages.join('\n');
            }
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
        } else if (error.status === 409) {
          errorMessage = 'An account with this email already exists.';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        }

        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: errorMessage,
          confirmButtonColor: '#08227B'
        });
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  signupWithGoogle(): void {
    // Google signup implementation will be added later
    Swal.fire({
      icon: 'info',
      title: 'Coming Soon',
      text: 'Google signup will be available in a future update.',
      confirmButtonColor: '#08227B'
    });
  }

  goToHome(): void {
    this.router.navigate(['/log-in']);
  }
}