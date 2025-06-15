import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { PropertyService } from '../services/property.service';
import { AmenitiesService, Amenity, AmenityType } from '../services/amenities.service';
import { AuthService } from '../services/auth.service';
import { PaymentComponent } from '../payment/payment.component';

@Component({
  selector: 'app-add-property',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaymentComponent],
  templateUrl: './add-property.component.html',
  styleUrls: ['./add-property.component.css']
})
export class AddPropertyComponent implements OnInit, OnDestroy {
  propertyForm!: FormGroup;
  submitted = false;
  isLoading = false;
  isSubmitting = false;
  
  // Payment related
  showPaymentModal = false;
  paymentAmount = 50; // Property listing fee in USD
  paymentCompleted = false;
  paymentData: any = null;
  
  // Amenities data
  internalAmenities: Amenity[] = [];
  externalAmenities: Amenity[] = [];
  accessibilityAmenities: Amenity[] = [];
  
  // Image preview
  imageFiles: File[] = [];
  imagePreviews: string[] = [];
  
  // Property types
  propertyTypes = ['Apartment', 'House', 'Villa', 'Office', 'Commercial', 'Land'];
  
  // Egyptian cities
  cities = [
    'Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said',
    'Suez', 'Luxor', 'Mansoura', 'El Mahalla El Kubra', 'Tanta',
    'Asyut', 'Ismailia', 'Fayyum', 'Zagazig', 'Aswan',
    'Damietta', 'Damanhur', 'Minya', 'Beni Suef', 'Qena',
    'Sohag', 'Hurghada', 'Sharm El Sheikh'
  ];
  
  // Governorates
  governorates = [
    'Cairo', 'Alexandria', 'Giza', 'Qalyubia', 'Port Said',
    'Suez', 'Luxor', 'Dakahlia', 'Gharbia', 'Monufia',
    'Asyut', 'Ismailia', 'Fayyum', 'Sharqia', 'Aswan',
    'Damietta', 'Beheira', 'Minya', 'Beni Suef', 'Qena',
    'Sohag', 'Red Sea', 'South Sinai', 'North Sinai', 'Matrouh'
  ];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private propertyService: PropertyService,
    private amenitiesService: AmenitiesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check authentication
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/log-in']);
      return;
    }

    // Initialize form
    this.initializeForm();
    
    // Load amenities
    this.loadAmenities();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initializeForm(): void {
    this.propertyForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      price: ['', [Validators.required, Validators.min(1)]],
      propertyType: ['', Validators.required],
      size: ['', [Validators.required, Validators.min(1)]],
      bedrooms: ['', [Validators.required, Validators.min(0)]],
      bathrooms: ['', [Validators.required, Validators.min(1)]],
      street: ['', Validators.required],
      city: ['', Validators.required],
      governate: ['', Validators.required],
      internalAmenitiesIds: this.formBuilder.array([]),
      externalAmenitiesIds: this.formBuilder.array([]),
      accessibilityAmenitiesIds: this.formBuilder.array([])
    });
  }

  loadAmenities(): void {
    this.isLoading = true;
    
    // Load internal amenities
    const internalSub = this.amenitiesService.getInternalAmenities().subscribe({
      next: (amenities) => {
        this.internalAmenities = amenities.filter(a => a.name !== 'string');
      },
      error: (error) => {
        console.error('Error loading internal amenities:', error);
      }
    });
    
    // Load external amenities
    const externalSub = this.amenitiesService.getExternalAmenities().subscribe({
      next: (amenities) => {
        this.externalAmenities = amenities.filter(a => a.name !== 'string');
      },
      error: (error) => {
        console.error('Error loading external amenities:', error);
      }
    });
    
    // Load accessibility amenities
    const accessibilitySub = this.amenitiesService.getAccessibilityAmenities().subscribe({
      next: (amenities) => {
        this.accessibilityAmenities = amenities.filter(a => a.name !== 'string');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading accessibility amenities:', error);
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(internalSub, externalSub, accessibilitySub);
  }

  // Getter for form controls
  get f() { return this.propertyForm.controls; }
  
  // Get FormArray for amenities
  getAmenitiesFormArray(type: string): FormArray {
    return this.propertyForm.get(`${type}AmenitiesIds`) as FormArray;
  }

  // Handle amenity checkbox change
  onAmenityChange(event: any, amenityId: number, type: 'internal' | 'external' | 'accessibility'): void {
    const formArray = this.getAmenitiesFormArray(type);
    
    if (event.target.checked) {
      formArray.push(this.formBuilder.control(amenityId));
    } else {
      const index = formArray.controls.findIndex(control => control.value === amenityId);
      if (index !== -1) {
        formArray.removeAt(index);
      }
    }
  }

  // Handle image file selection
  onImageFilesSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    
    if (files.length > 10) {
      Swal.fire({
        icon: 'warning',
        title: 'Too Many Images',
        text: 'You can upload maximum 10 images',
        confirmButtonColor: '#08227B'
      });
      return;
    }

    this.imageFiles = files;
    this.imagePreviews = [];

    // Generate previews
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviews.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Remove image preview
  removeImage(index: number): void {
    this.imageFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  // Show payment modal - UPDATED VERSION
  showPayment(): void {
    if (this.propertyForm.invalid) {
      this.submitted = true;
      this.scrollToFirstError();
      return;
    }

    if (this.imageFiles.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Images Required',
        text: 'Please select at least one image for your property',
        confirmButtonColor: '#08227B'
      });
      return;
    }

    console.log('🔥 Opening payment modal...');
    this.showPaymentModal = true;
    
    // ⭐ إضافة دي - انتظار للـ modal يظهر وبعدين trigger للـ Stripe initialization
    setTimeout(() => {
      console.log('🔥 Payment modal is now visible, ready for Stripe initialization');
      // الـ PaymentComponent هيستقبل الـ showPayment = true ويعمل initialize تلقائياً
    }, 300);
  }

  // Handle payment success
  onPaymentSuccess(paymentData: any): void {
    console.log('✅ Payment completed successfully:', paymentData);
    this.paymentCompleted = true;
    this.paymentData = paymentData;
    this.showPaymentModal = false;
    
    // Now submit the property
    this.submitProperty();
  }

  // Handle payment cancellation
  onPaymentCancel(): void {
    console.log('❌ Payment cancelled by user');
    this.showPaymentModal = false;
  }

  // Submit property after payment
  submitProperty(): void {
    this.isSubmitting = true;
    console.log('🚀 Submitting property to API...');

    // Prepare form data
    const formData = new FormData();
    const formValues = this.propertyForm.value;

    // Add basic property data
    Object.keys(formValues).forEach(key => {
      if (key.includes('AmenitiesIds')) {
        // Handle amenities arrays
        const amenityIds = formValues[key];
        amenityIds.forEach((id: number, index: number) => {
          formData.append(`${key}[${index}]`, id.toString());
        });
      } else {
        formData.append(key, formValues[key]);
      }
    });

    // Add images
    this.imageFiles.forEach((file, index) => {
      formData.append(`images`, file);
    });

    // Add payment information
    if (this.paymentData) {
      formData.append('paymentIntentId', this.paymentData.paymentIntentId);
      formData.append('paymentAmount', this.paymentData.amount.toString());
    }

    console.log('📤 Sending form data:', {
      propertyData: formValues,
      imageCount: this.imageFiles.length,
      paymentData: this.paymentData
    });

    // Submit to API
    const submitSub = this.propertyService.addProperty(formData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        console.log('✅ Property created successfully:', response);
        
        // تحديد نوع الرسالة حسب الاستجابة
        const isRealAPI = !response.message?.includes('Mock');
        const title = isRealAPI ? 'Property Listed Successfully' : 'Payment Processed Successfully';
        const text = isRealAPI 
          ? 'Your property has been listed successfully and payment has been processed!'
          : 'Your payment was processed successfully! The property listing is being processed.';
        
        Swal.fire({
          icon: 'success',
          title: title,
          text: text,
          confirmButtonColor: '#08227B'
        }).then(() => {
          this.router.navigate(['/home']);
        });
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('❌ Error adding property:', error);
        
        let errorMessage = 'Failed to add property. Please try again.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }

        // إضافة معلومات عن الدفع إذا كان نجح
        const paymentNote = this.paymentData ? 
          '\n\nNote: Your payment was processed successfully. Please contact support if needed.' : '';

        Swal.fire({
          icon: 'error',
          title: 'Error Adding Property',
          text: errorMessage + paymentNote,
          confirmButtonColor: '#08227B',
          footer: this.paymentData ? 
            `<small>Payment ID: ${this.paymentData.paymentIntentId}</small>` : ''
        });
      }
    });

    this.subscriptions.push(submitSub);
  }

  // Submit form (now opens payment modal)
  onSubmit(): void {
    this.showPayment();
  }

  // Scroll to first error
  scrollToFirstError(): void {
    const firstErrorField = Object.keys(this.propertyForm.controls).find(
      key => this.propertyForm.get(key)?.invalid
    );
    
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }
  }

  // Go back to home
  goBack(): void {
    if (this.propertyForm.dirty) {
      Swal.fire({
        title: 'Discard Changes?',
        text: 'You have unsaved changes. Are you sure you want to leave?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#08227B',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, discard changes'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/home']);
        }
      });
    } else {
      this.router.navigate(['/home']);
    }
  }

  // Check if amenity is selected
  isAmenitySelected(amenityId: number, type: 'internal' | 'external' | 'accessibility'): boolean {
    const formArray = this.getAmenitiesFormArray(type);
    return formArray.controls.some(control => control.value === amenityId);
  }
}