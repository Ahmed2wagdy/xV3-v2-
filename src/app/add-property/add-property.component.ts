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
  paymentAmount = 1; // $1 للاختبار
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
// استبدل propertyTypes بهذا
propertyTypes = ['Apartment', 'House', 'Villa', 'Chalet', 'Office', 'Commercial', 'Land'];  
  // Listing types - إضافة جديدة
  listingTypes = ['For Rent', 'For Sale', 'For Investment'];
  
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
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/log-in']);
      return;
    }

    this.initializeForm();
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
      // ✅ إضافة الحقول المطلوبة
      locationUrl: ['', [Validators.required, Validators.pattern('https?://.+')]],
      listingType: ['', Validators.required],
      internalAmenitiesIds: this.formBuilder.array([]),
      externalAmenitiesIds: this.formBuilder.array([]),
      accessibilityAmenitiesIds: this.formBuilder.array([])
    });
  }

  loadAmenities(): void {
    this.isLoading = true;
    
    const internalSub = this.amenitiesService.getInternalAmenities().subscribe({
      next: (amenities) => {
        this.internalAmenities = amenities.filter(a => a.name !== 'string');
        console.log('✅ Internal amenities loaded:', this.internalAmenities.length);
      },
      error: (error) => {
        console.error('❌ Error loading internal amenities:', error);
      }
    });
    
    const externalSub = this.amenitiesService.getExternalAmenities().subscribe({
      next: (amenities) => {
        this.externalAmenities = amenities.filter(a => a.name !== 'string');
        console.log('✅ External amenities loaded:', this.externalAmenities.length);
      },
      error: (error) => {
        console.error('❌ Error loading external amenities:', error);
      }
    });
    
    const accessibilitySub = this.amenitiesService.getAccessibilityAmenities().subscribe({
      next: (amenities) => {
        this.accessibilityAmenities = amenities.filter(a => a.name !== 'string');
        this.isLoading = false;
        console.log('✅ Accessibility amenities loaded:', this.accessibilityAmenities.length);
      },
      error: (error) => {
        console.error('❌ Error loading accessibility amenities:', error);
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
      console.log(`✅ Added ${type} amenity:`, amenityId);
    } else {
      const index = formArray.controls.findIndex(control => control.value === amenityId);
      if (index !== -1) {
        formArray.removeAt(index);
        console.log(`❌ Removed ${type} amenity:`, amenityId);
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

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviews.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    });

    console.log('✅ Selected', files.length, 'images');
  }

  // Remove image preview
  removeImage(index: number): void {
    this.imageFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
    console.log('❌ Removed image at index:', index);
  }

  // ✅ Generate Google Maps URL automatically
  generateLocationUrl(): void {
    const formValues = this.propertyForm.value;
    if (formValues.street && formValues.city && formValues.governate) {
      const address = `${formValues.street}, ${formValues.city}, ${formValues.governate}, Egypt`;
      const encodedAddress = encodeURIComponent(address);
      const googleMapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
      
      this.propertyForm.patchValue({
        locationUrl: googleMapsUrl
      });
      
      console.log('✅ Generated location URL:', googleMapsUrl);
    }
  }

  // Show payment modal
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

    console.log('🔥 Opening payment modal for $', this.paymentAmount, '...');
    this.showPaymentModal = true;
    
    setTimeout(() => {
      console.log('🔥 Payment modal is now visible');
    }, 300);
  }

  // Handle payment success
  onPaymentSuccess(paymentData: any): void {
    console.log('✅ Payment completed successfully:', paymentData);
    this.paymentCompleted = true;
    this.paymentData = paymentData;
    this.showPaymentModal = false;
    
    Swal.fire({
      icon: 'success',
      title: 'Payment Successful!',
      text: 'Now creating your property listing...',
      timer: 2000,
      showConfirmButton: false
    });
    
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

    // تحضير FormData
    const formData = new FormData();
    const formValues = this.propertyForm.value;

    // ✅ إضافة جميع الحقول المطلوبة بالأسماء الصحيحة
    formData.append('Title', formValues.title);
    formData.append('Description', formValues.description);
    formData.append('Price', formValues.price.toString());
    formData.append('PropertyType', formValues.propertyType);
    formData.append('Size', formValues.size.toString());
    formData.append('Bedrooms', formValues.bedrooms.toString());
    formData.append('Bathrooms', formValues.bathrooms.toString());
    formData.append('Street', formValues.street);
    formData.append('City', formValues.city);
    formData.append('Governate', formValues.governate);
    formData.append('LocationUrl', formValues.locationUrl); // ✅ مطلوب
    formData.append('ListingType', formValues.listingType); // ✅ مطلوب

    // إضافة المرافق
    formValues.internalAmenitiesIds.forEach((id: number, index: number) => {
      formData.append(`InternalAmenityIds[${index}]`, id.toString());
    });
    formValues.externalAmenitiesIds.forEach((id: number, index: number) => {
      formData.append(`ExternalAmenityIds[${index}]`, id.toString());
    });
    formValues.accessibilityAmenitiesIds.forEach((id: number, index: number) => {
      formData.append(`AccessibilityAmenityIds[${index}]`, id.toString());
    });

    // إضافة الصور
    this.imageFiles.forEach((file) => {
      formData.append(`Images`, file);
    });

    // إضافة بيانات الدفع
    if (this.paymentData) {
      formData.append('paymentIntentId', this.paymentData.paymentIntentId);
      if (this.paymentData.amount) {
        formData.append('paymentAmount', this.paymentData.amount.toString());
      }
    }

    console.log('📤 Sending property data with all required fields');

    const submitSub = this.propertyService.addProperty(formData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        console.log('✅ Property created successfully:', response);
        
        Swal.fire({
          icon: 'success',
          title: 'Property Listed Successfully!',
          text: 'Your property has been listed successfully and payment has been processed!',
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
        } else if (error.message) {
          errorMessage = error.message;
        }

        const paymentNote = this.paymentData ? 
          '\n\nNote: Your payment was processed successfully. Please contact support with your payment ID if needed.' : '';

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

  // Submit form (opens payment modal)
  onSubmit(): void {
    this.showPayment();
  }

  // Scroll to first error field
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

  // Go back to home with confirmation
  goBack(): void {
    if (this.propertyForm.dirty && !this.isSubmitting) {
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