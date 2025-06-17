import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PropertyService, Property } from '../services/property.service';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-my-properties',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './my-properties.component.html',
  styleUrls: ['./my-properties.component.css']
})
export class MyPropertiesComponent implements OnInit, OnDestroy {
  myProperties: Property[] = [];
  isLoading = true;
  isUpdating = false;
  isDeleting = false;
  showEditModal = false;
  editForm!: FormGroup;
  selectedProperty?: Property;
  
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
    private router: Router,
    private propertyService: PropertyService,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    // Check authentication
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/log-in']);
      return;
    }

    this.initializeEditForm();
    this.loadMyProperties();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initializeEditForm(): void {
    this.editForm = this.formBuilder.group({
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
      locationUrl: [''],
      listingType: ['For Sale']
    });
  }

  loadMyProperties(): void {
    this.isLoading = true;
    console.log('🔍 Loading user properties...');
    
    const propertiesSub = this.propertyService.getUserProperties().subscribe({
      next: (properties) => {
        console.log('✅ User properties loaded:', properties);
        this.myProperties = properties;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading user properties:', error);
        this.isLoading = false;
        
        // Show error message
        Swal.fire({
          icon: 'error',
          title: 'Failed to Load Properties',
          text: 'Unable to load your properties. Please try again.',
          confirmButtonColor: '#08227B'
        });
      }
    });
    
    this.subscriptions.push(propertiesSub);
  }

  viewProperty(propertyId: number): void {
    this.router.navigate(['/property', propertyId]);
  }

  editProperty(property: Property): void {
    this.selectedProperty = property;
    
    // Populate the form with property data
    this.editForm.patchValue({
      title: property.title,
      description: property.description,
      price: property.price,
      propertyType: property.propertyType,
      size: property.size,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      street: property.street,
      city: property.city,
      governate: property.governate,
      locationUrl: '', // API doesn't return this field
      listingType: 'For Sale' // Default value
    });
    
    this.showEditModal = true;
  }

  onUpdateProperty(): void {
    if (this.editForm.invalid || !this.selectedProperty) {
      Object.keys(this.editForm.controls).forEach(key => {
        this.editForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isUpdating = true;
    
    const updateData = {
      ...this.editForm.value,
      userId: this.authService.getUserData()?.userId || 1
    };

    console.log('🔄 Updating property:', this.selectedProperty.propertyId, updateData);

    const updateSub = this.propertyService.updateProperty(this.selectedProperty.propertyId, updateData).subscribe({
      next: (response) => {
        console.log('✅ Property updated successfully:', response);
        this.isUpdating = false;
        this.showEditModal = false;
        
        Swal.fire({
          icon: 'success',
          title: 'Property Updated',
          text: 'Your property has been updated successfully!',
          showConfirmButton: false,
          timer: 1500
        });
        
        // Reload properties
        this.loadMyProperties();
      },
      error: (error) => {
        console.error('❌ Error updating property:', error);
        this.isUpdating = false;
        
        let errorMessage = 'Failed to update property. Please try again.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'Property not found or you do not have permission to edit it.';
        } else if (error.status === 401) {
          errorMessage = 'You need to be logged in to edit properties.';
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

  deleteProperty(property: Property): void {
    Swal.fire({
      title: 'Delete Property?',
      text: `Are you sure you want to delete "${property.title}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.performDelete(property);
      }
    });
  }

  private performDelete(property: Property): void {
    this.isDeleting = true;
    console.log('🗑️ Deleting property:', property.propertyId);

    const deleteSub = this.propertyService.deleteProperty(property.propertyId).subscribe({
      next: (response) => {
        console.log('✅ Property deleted successfully:', response);
        this.isDeleting = false;
        
        // Remove from local array
        this.myProperties = this.myProperties.filter(p => p.propertyId !== property.propertyId);
        
        Swal.fire({
          icon: 'success',
          title: 'Property Deleted',
          text: 'Your property has been deleted successfully.',
          showConfirmButton: false,
          timer: 1500
        });
      },
      error: (error) => {
        console.error('❌ Error deleting property:', error);
        this.isDeleting = false;
        
        let errorMessage = 'Failed to delete property. Please try again.';
        if (error.status === 404) {
          errorMessage = 'Property not found or already deleted.';
        } else if (error.status === 401) {
          errorMessage = 'You do not have permission to delete this property.';
        }

        Swal.fire({
          icon: 'error',
          title: 'Delete Failed',
          text: errorMessage,
          confirmButtonColor: '#08227B'
        });
      }
    });

    this.subscriptions.push(deleteSub);
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedProperty = undefined;
    this.editForm.reset();
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  goToAddProperty(): void {
    this.router.navigate(['/add-property']);
  }

  // Helper methods
  getFirstImage(property: Property): string {
    if (property.propertyImages && property.propertyImages.length > 0) {
      return property.propertyImages[0];
    }
    return 'assets/images/apartment.avif';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(price);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/apartment.avif';
  }

  trackByPropertyId(index: number, property: Property): number {
    return property.propertyId;
  }

  // Getter for form controls
  get f() { return this.editForm.controls; }
}