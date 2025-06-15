import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, UserProfile } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  currentUser: UserProfile | null = null;
  isLoading = false;
  isUpdatingProfile = false;
  isChangingPassword = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  showEditModal = false;
  showPasswordModal = false;
  isDarkMode = false;
  isImageDeleted = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Load dark mode preference
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    this.applyTheme();
  }

  ngOnInit(): void {
    // Check authentication
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/log-in']);
      return;
    }

    this.initializeForms();
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initializeForms(): void {
    this.profileForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.pattern('^[+]?[0-9]{10,15}$')],
      city: ['']
    });

    this.passwordForm = this.formBuilder.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword');
    const confirmPassword = group.get('confirmNewPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    
    return null;
  }

  loadUserProfile(): void {
    this.isLoading = true;
    
    const profileSub = this.authService.getUserProfile().subscribe({
      next: (profile: UserProfile) => {
        this.currentUser = profile;
        this.profileForm.patchValue({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phoneNumber: profile.phoneNumber,
          city: profile.city
        });
        this.imagePreview = profile.imageUrl || null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error Loading Profile',
          text: 'Failed to load your profile information.',
          confirmButtonColor: '#08227B'
        });
      }
    });
    
    this.subscriptions.push(profileSub);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid File Type',
          text: 'Please select a valid image file.',
          confirmButtonColor: '#08227B'
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'File Too Large',
          text: 'Please select an image smaller than 5MB.',
          confirmButtonColor: '#08227B'
        });
        return;
      }

      this.selectedFile = file;
      this.isImageDeleted = false;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeProfileImage(): void {
    Swal.fire({
      title: 'Remove Profile Picture',
      text: 'Are you sure you want to remove your profile picture?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.selectedFile = null;
        this.imagePreview = null;
        this.isImageDeleted = true;
        
        // Clear file input
        const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }
    });
  }

  onUpdateProfile(): void {
    if (this.profileForm.invalid) {
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isUpdatingProfile = true;

    // Prepare form data
    const formData = new FormData();
    const formValues = this.profileForm.value;
    
    // Add required fields
    formData.append('FirstName', formValues.firstName);
    formData.append('LastName', formValues.lastName);
    formData.append('Email', formValues.email);
    
    // Add optional fields
    if (formValues.phoneNumber) {
      formData.append('PhoneNumber', formValues.phoneNumber);
    } else {
      formData.append('PhoneNumber', '');
    }
    
    if (formValues.city) {
      formData.append('City', formValues.city);
    } else {
      formData.append('City', '');
    }

    // Handle image updates
    if (this.selectedFile) {
      // New image selected
      formData.append('Image', this.selectedFile);
    } else if (this.isImageDeleted) {
      // Image was deleted - send empty string or null
      formData.append('ImageUrl', '');
    } else if (this.currentUser?.imageUrl) {
      // Keep existing image
      formData.append('ImageUrl', this.currentUser.imageUrl);
    } else {
      // No image
      formData.append('ImageUrl', '');
    }

    const updateSub = this.authService.updateUserProfile(formData).subscribe({
      next: (response) => {
        this.isUpdatingProfile = false;
        this.showEditModal = false;
        Swal.fire({
          icon: 'success',
          title: 'Profile Updated',
          text: 'Your profile has been updated successfully!',
          showConfirmButton: false,
          timer: 1500
        });
        this.selectedFile = null;
        this.isImageDeleted = false;
        // Reload profile to get updated data
        this.loadUserProfile();
      },
      error: (error) => {
        this.isUpdatingProfile = false;
        console.error('Error updating profile:', error);
        
        let errorMessage = 'Failed to update profile. Please try again.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        }

        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: errorMessage,
          confirmButtonColor: '#08227B'
        });
      }
    });

    this.subscriptions.push(updateSub);
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      Object.keys(this.passwordForm.controls).forEach(key => {
        this.passwordForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isChangingPassword = true;

    const passwordData = {
      oldPassword: this.passwordForm.value.oldPassword,
      newPassword: this.passwordForm.value.newPassword,
      confirmNewPassword: this.passwordForm.value.confirmNewPassword
    };

    const passwordSub = this.authService.changePassword(passwordData).subscribe({
      next: (response) => {
        this.isChangingPassword = false;
        this.showPasswordModal = false;
        this.passwordForm.reset();
        Swal.fire({
          icon: 'success',
          title: 'Password Changed',
          text: 'Your password has been changed successfully!',
          showConfirmButton: false,
          timer: 1500
        });
      },
      error: (error) => {
        this.isChangingPassword = false;
        console.error('Error changing password:', error);
        
        let errorMessage = 'Failed to change password. Please try again.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          errorMessage = 'Current password is incorrect.';
        }

        Swal.fire({
          icon: 'error',
          title: 'Password Change Failed',
          text: errorMessage,
          confirmButtonColor: '#08227B'
        });
      }
    });

    this.subscriptions.push(passwordSub);
  }

  getUserImageUrl(): string {
    // Always return unkown.png as base (matching the actual filename)
    return 'assets/images/unkown.png';
  }

  getUserActualImageUrl(): string {
    if (this.isImageDeleted) {
      return '';
    }
    if (this.imagePreview) {
      return this.imagePreview;
    }
    if (this.currentUser?.imageUrl) {
      return this.currentUser.imageUrl;
    }
    return '';
  }

  hasUserImage(): boolean {
    return !this.isImageDeleted && (!!this.imagePreview || !!this.currentUser?.imageUrl);
  }

  getUserFullName(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }
    return 'User Name';
  }

  logout(): void {
    Swal.fire({
      title: 'Sign Out',
      text: 'Are you sure you want to sign out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#08227B',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, sign out',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        this.router.navigate(['/log-in']);
      }
    });
  }

  deleteAccount(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Your account will be permanently deleted and cannot be recovered!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#08227B',
      confirmButtonText: 'Yes, delete account',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        // Show second confirmation
        Swal.fire({
          title: 'Final Confirmation',
          text: 'This action cannot be undone. Do you want to continue?',
          icon: 'error',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Delete Permanently',
          cancelButtonText: 'Cancel'
        }).then((finalResult) => {
          if (finalResult.isConfirmed) {
            // Call delete account API (would need to be implemented)
            Swal.fire({
              icon: 'info',
              title: 'Coming Soon',
              text: 'Account deletion feature will be available soon.',
              confirmButtonColor: '#08227B'
            });
          }
        });
      }
    });
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    this.applyTheme();
  }

  private applyTheme(): void {
    if (this.isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  openEditModal(): void {
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedFile = null;
    this.isImageDeleted = false;
    this.imagePreview = this.currentUser?.imageUrl || null;
    
    // Clear file input
    const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  openPasswordModal(): void {
    this.showPasswordModal = true;
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    this.passwordForm.reset();
  }

  navigateToAddProperty(): void {
    this.router.navigate(['/add-property']);
  }

  showAboutUs(): void {
    Swal.fire({
      title: 'About Us',
      html: `
        <div style="text-align: left;">
          <h5>X-Rental Property Platform</h5>
          <p>We are a leading property rental platform in Egypt, helping property owners and tenants connect easily and securely.</p>
          
          <h6>Our Mission</h6>
          <p>To simplify the property rental process and make it accessible for everyone.</p>
          
          <h6>Contact Us</h6>
          <p>
            📧 Email: info@x-rental.com<br>
            📞 Phone: +20 123 456 7890<br>
            🌐 Website: www.x-rental.com
          </p>
        </div>
      `,
      confirmButtonColor: '#08227B',
      confirmButtonText: 'Close'
    });
  }
}