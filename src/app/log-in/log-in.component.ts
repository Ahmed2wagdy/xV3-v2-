import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { AuthService, LoginRequest } from '../services/auth.service';

@Component({
  selector: 'app-log-in',
  templateUrl: './log-in.component.html',
  styleUrls: ['./log-in.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class LogInComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  showPassword = false;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    public router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
      return;
    }
    
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  // Getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;

    // Stop if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.loginForm.disable(); // 🔥 Disable form during submission

    // Prepare login request
    const loginRequest: LoginRequest = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    // Call the login API
    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.loginForm.enable(); // 🔥 Re-enable form
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: 'Login Successful',
          text: 'Welcome back!',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          // Navigate to home page after successful login
          this.router.navigate(['/home']);
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.loginForm.enable(); // 🔥 Re-enable form on error
        console.error('Login error:', error);
        
        // Handle different types of errors
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.status === 400) {
          errorMessage = 'Invalid email or password.';
        } else if (error.status === 401) {
          errorMessage = 'Invalid credentials. Please check your email and password.';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }

        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: errorMessage,
          confirmButtonColor: '#08227B'
        });
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  loginWithGoogle(): void {
    // Google login implementation will be added later
    Swal.fire({
      icon: 'info',
      title: 'Coming Soon',
      text: 'Google login will be available in a future update.',
      confirmButtonColor: '#08227B'
    });
  }
}