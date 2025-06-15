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
    const propertySub = this.propertyService.getPropertyById(propertyId).subscribe({
      next: (property) => {
        this.property = this.propertyService.formatProperty(property);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading property:', error);
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

  loadReviews(propertyId: number): void {
    const reviewsSub = this.propertyService.getPropertyReviews(propertyId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        // Reviews are optional, so we don't show error to user
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
    }
  }

  nextImage(): void {
    if (this.property && this.property.propertyImages.length > 0) {
      this.currentImageIndex = this.currentImageIndex < this.property.propertyImages.length - 1 
        ? this.currentImageIndex + 1 
        : 0;
    }
  }

  selectImage(index: number): void {
    this.currentImageIndex = index;
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
      return;
    }

    this.isSubmittingReview = true;
    const reviewData = {
      rating: this.reviewForm.value.rating,
      comment: this.reviewForm.value.comment
    };

    const reviewSub = this.propertyService.addReview(this.property.propertyId, reviewData).subscribe({
      next: (response) => {
        this.isSubmittingReview = false;
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
        console.error('Error adding review:', error);
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

    if (!this.property) return;

    const action = this.property.isFavorite ? 'remove' : 'add';
    const apiCall = this.property.isFavorite 
      ? this.propertyService.removeFromFavorites(this.property.propertyId)
      : this.propertyService.addToFavorites(this.property.propertyId);

    const favSub = apiCall.subscribe({
      next: () => {
        this.property!.isFavorite = !this.property!.isFavorite;
        const message = this.property!.isFavorite ? 'Added to favorites' : 'Removed from favorites';
        Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: message,
          showConfirmButton: false,
          timer: 1500
        });
      },
      error: (error) => {
        console.error('Error updating favorites:', error);
        Swal.fire({
          icon: 'error',
          title: 'Failed to update favorites',
          text: 'Please try again.',
          confirmButtonColor: '#08227B'
        });
      }
    });
    this.subscriptions.push(favSub);
  }

  // Contact owner
  contactOwner(): void {
    if (!this.property) return;

    const phoneNumber = this.property.ownerInfo.phoneNumber;
    const message = `Hello, I'm interested in your property: ${this.property.title}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  }

  // Helper methods
  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
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
}