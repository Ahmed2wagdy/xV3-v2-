import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

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

  constructor(
    private formBuilder: FormBuilder,
    public router: Router
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

    if (this.forgotPasswordForm.invalid) return;

    this.isLoading = true;
    setTimeout(() => {
      console.log('Form submitted', this.forgotPasswordForm.value);
      this.router.navigate(['/otp-verification'], {
        queryParams: { contact: this.forgotPasswordForm.value.emailOrPhone }
      });
      this.isLoading = false;
    }, 2000);
  }

  // ✅ أضفناها لحل الخطأ
  goHome(): void {
    this.router.navigate(['/home']);
  }
}
