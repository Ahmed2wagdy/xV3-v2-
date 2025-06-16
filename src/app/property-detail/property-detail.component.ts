import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PropertyService, Property, Review } from '../services/property.service';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './property-detail.component.html',
  styleUrls: ['./property-detail.component.css']
})
export class PropertyDetailComponent implements OnInit, OnDestroy {
  property?: Property;
  reviews: Review[] = [];
  reviewForm!: FormGroup;
  currentImageIndex = 0;
  isLoading = true;
  isSubmittingReview = false;
  isLoggedIn = false;
  isFavoriteLoading = false;
  currentUser: any;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.reviewForm = this.formBuilder.group({
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    // Check authentication status
    this.isLoggedIn = this.authService.isLoggedIn();
    this.currentUser = this.authService.getUserData();

    // Subscribe to authentication changes
    const authSub = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.currentUser = user;
    });
    this.subscriptions.push(authSub);

    // Get property ID from route
    const routeSub = this.route.params.subscribe(params => {
      const propertyId = +params['id'];
      if (propertyId) {
        this.loadProperty(propertyId);
        this.loadReviews(propertyId);
      }
    });
    this.subscriptions.push(routeSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadProperty(propertyId: number): void {
    this.isLoading = true;
    console.log('🔍 Loading property with ID:', propertyId);
    
    const propertySub = this.propertyService.getPropertyById(propertyId).subscribe({
      next: (property) => {
        console.log('✅ Property loaded:', property);
        this.property = this.propertyService.formatProperty(property);
        
        // Log images for debugging
        console.log('🖼️ Property images:', this.property.propertyImages);
        
        // Load favorite status if user is logged in
        if (this.isLoggedIn && this.property) {
          this.loadFavoriteStatus(this.property.propertyId);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading property:', error);
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Property Not Found',
          text: 'The property you are looking for could not be found.',
          confirmButtonColor: '#08227B'
        }).then(() => {
          this.router.navigate(['/home']);
        });
      }
    });
    this.subscriptions.push(propertySub);
  }

  loadFavoriteStatus(propertyId: number): void {
    if (!this.isLoggedIn || !this.property) return;
    
    console.log('🔍 Checking favorite status for property:', propertyId);
    
    const favSub = this.propertyService.isPropertyInFavorites(propertyId).subscribe({
      next: (isFavorite) => {
        console.log('✅ Favorite status loaded:', isFavorite);
        if (this.property) {
          this.property.isFavorite = isFavorite;
        }
      },
      error: (error) => {
        console.error('❌ Error checking favorite status:', error);
        if (this.property) {
          this.property.isFavorite = false;
        }
      }
    });
    this.subscriptions.push(favSub);
  }

  loadReviews(propertyId: number): void {
    const reviewsSub = this.propertyService.getPropertyReviews(propertyId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        console.log('✅ Reviews loaded:', reviews);
      },
      error: (error) => {
        console.error('❌ Error loading reviews:', error);
      }
    });
    this.subscriptions.push(reviewsSub);
  }

  // Image carousel methods
  previousImage(): void {
    if (this.property && this.property.propertyImages.length > 0) {
      this.currentImageIndex = this.currentImageIndex > 0 
        ? this.currentImageIndex - 1 
        : this.property.propertyImages.length - 1;
      console.log('⬅️ Previous image, current index:', this.currentImageIndex);
    }
  }

  nextImage(): void {
    if (this.property && this.property.propertyImages.length > 0) {
      this.currentImageIndex = this.currentImageIndex < this.property.propertyImages.length - 1 
        ? this.currentImageIndex + 1 
        : 0;
      console.log('➡️ Next image, current index:', this.currentImageIndex);
    }
  }

  selectImage(index: number): void {
    this.currentImageIndex = index;
    console.log('🖼️ Selected image index:', index);
  }

  getCurrentImageUrl(): string {
    if (this.property && this.property.propertyImages.length > 0) {
      return this.property.propertyImages[this.currentImageIndex] || 'assets/images/apartment.avif';
    }
    return 'assets/images/apartment.avif';
  }

  onImageError(event: any): void {
    console.log('❌ Image failed to load, using fallback');
    event.target.src = 'assets/images/apartment.avif';
  }

  // Review methods
  submitReview(): void {
    if (!this.isLoggedIn) {
      Swal.fire({
        icon: 'warning',
        title: 'Login Required',
        text: 'Please log in to leave a review.',
        confirmButtonColor: '#08227B'
      });
      return;
    }

    if (this.reviewForm.invalid || !this.property) {
      Object.keys(this.reviewForm.controls).forEach(key => {
        this.reviewForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmittingReview = true;
    this.reviewForm.disable(); // 🔥 Disable form during submission

    const reviewData = {
      rating: this.reviewForm.value.rating,
      comment: this.reviewForm.value.comment
    };

    console.log('📝 Submitting review:', reviewData);

    const reviewSub = this.propertyService.addReview(this.property.propertyId, reviewData).subscribe({
      next: (response) => {
        this.isSubmittingReview = false;
        this.reviewForm.enable(); // 🔥 Re-enable form
        console.log('✅ Review added successfully:', response);
        
        Swal.fire({
          icon: 'success',
          title: 'Review Added',
          text: 'Your review has been added successfully!',
          showConfirmButton: false,
          timer: 1500
        });
        
        // Reset form and reload reviews
        this.reviewForm.reset({ rating: 5, comment: '' });
        this.loadReviews(this.property!.propertyId);
      },
      error: (error) => {
        this.isSubmittingReview = false;
        this.reviewForm.enable(); // 🔥 Re-enable form on error
        console.error('❌ Error adding review:', error);
        Swal.fire({
          icon: 'error',
          title: 'Review Failed',
          text: 'Failed to add your review. Please try again.',
          confirmButtonColor: '#08227B'
        });
      }
    });
    this.subscriptions.push(reviewSub);
  }

  // Favorite methods
  toggleFavorite(): void {
    if (!this.isLoggedIn) {
      Swal.fire({
        icon: 'warning',
        title: 'Login Required',
        text: 'Please log in to add properties to favorites.',
        confirmButtonColor: '#08227B'
      });
      return;
    }

    if (!this.property || this.isFavoriteLoading) return;

    console.log('❤️ Toggling favorite for property:', this.property.propertyId, 'Current status:', this.property.isFavorite);

    this.isFavoriteLoading = true;
    
    const originalState = this.property.isFavorite;
    this.property.isFavorite = !this.property.isFavorite;

    const action = this.property.isFavorite ? 'add' : 'remove';
    const apiCall = this.property.isFavorite 
      ? this.propertyService.addToFavorites(this.property.propertyId)
      : this.propertyService.removeFromFavorites(this.property.propertyId);

    const favSub = apiCall.subscribe({
      next: (response) => {
        this.isFavoriteLoading = false;
        console.log(`✅ ${action} favorite successful:`, response);
        
        const message = this.property!.isFavorite ? 'Added to favorites' : 'Removed from favorites';
        const icon = this.property!.isFavorite ? 'success' : 'info';
        
        Swal.fire({
          position: 'top-end',
          icon: icon,
          title: message,
          showConfirmButton: false,
          timer: 1500
        });
      },
      error: (error) => {
        this.isFavoriteLoading = false;
        console.error('❌ Error updating favorites:', error);
        
        if (error.status === 404 && !this.property!.isFavorite) {
          console.log('⚠️ Property was not in favorites (404), but UI updated correctly');
          Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: 'Removed from favorites',
            showConfirmButton: false,
            timer: 1500
          });
          return;
        }
        
        if (error.status === 200 || error.status === 0) {
          console.log('✅ Actually successful - keeping optimistic update');
          const message = this.property!.isFavorite ? 'Added to favorites' : 'Removed from favorites';
          Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: message,
            showConfirmButton: false,
            timer: 1500
          });
          return;
        }
        
        this.property!.isFavorite = originalState;
        
        let errorMessage = 'Failed to update favorites. Please try again.';
        if (error.status === 401) {
          errorMessage = 'You need to be logged in to manage favorites.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Failed to update favorites',
          text: errorMessage,
          confirmButtonColor: '#08227B'
        });
      }
    });
    this.subscriptions.push(favSub);
  }

  contactOwner(): void {
    if (!this.property) return;

    const phoneNumber = this.property.ownerInfo.phoneNumber;
    const message = `Hello, I'm interested in your property: ${this.property.title}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    console.log('📱 Opening WhatsApp:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
  }

  getStarArray(count: number): boolean[] {
    return Array(count).fill(true);
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
      month: 'long',
      day: 'numeric'
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  debugImages(): void {
    console.log('🐛 Debug Images:');
    console.log('Property:', this.property);
    console.log('Images array:', this.property?.propertyImages);
    console.log('Current image index:', this.currentImageIndex);
    console.log('Current image URL:', this.getCurrentImageUrl());
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}