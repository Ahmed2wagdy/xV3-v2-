import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PropertyService, Property } from '../services/property.service';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit, OnDestroy {
  favorites: Property[] = [];
  isLoading: boolean = true;
  isLoggedIn: boolean = false;
  isRemoving: boolean = false;
  
  private subscriptions: Subscription[] = [];
  
  constructor(
    private router: Router,
    private propertyService: PropertyService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (!this.isLoggedIn) {
      Swal.fire({
        icon: 'warning',
        title: 'Authentication Required',
        text: 'Please log in to access your favorites',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        this.router.navigate(['/log-in']);
      });
      return;
    }
    
    this.loadFavorites();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadFavorites(): void {
    this.isLoading = true;
    console.log('🔍 Loading user favorites...');
    
    const favSub = this.propertyService.getFavorites().subscribe({
      next: (favorites) => {
        console.log('✅ Favorites loaded successfully:', favorites);
        this.favorites = favorites;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading favorites:', error);
        this.isLoading = false;
        
        Swal.fire({
          icon: 'error',
          title: 'Failed to Load Favorites',
          text: 'Unable to load your favorite properties. Please try again.',
          confirmButtonColor: '#08227B'
        });
      }
    });
    
    this.subscriptions.push(favSub);
  }

  viewProperty(propertyId: number): void {
    console.log('🔍 Navigating to property details:', propertyId);
    this.router.navigate(['/property', propertyId]);
  }
  
  removeFromFavorites(propertyId: number): void {
    if (this.isRemoving) return;
    
    console.log('🔍 Removing property from favorites:', propertyId);
    
    Swal.fire({
      title: 'Remove from favorites?',
      text: 'This property will be removed from your favorites',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#08227B',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isRemoving = true;
        
        const removeSub = this.propertyService.removeFromFavorites(propertyId).subscribe({
          next: (response) => {
            console.log('✅ Property removed from favorites:', response);
            this.isRemoving = false;
            
            // Remove from local array immediately
            this.favorites = this.favorites.filter(property => property.propertyId !== propertyId);
            
            Swal.fire({
              position: 'top-end',
              icon: 'success',
              title: 'Removed from favorites',
              showConfirmButton: false,
              timer: 1500
            });
          },
          error: (error) => {
            console.error('❌ Error removing from favorites:', error);
            console.log('📊 Error details:', {
              status: error.status,
              statusText: error.statusText,
              message: error.message,
              error: error.error
            });
            
            this.isRemoving = false;
            
            // Check if it's actually a successful response that Angular is treating as error
            if (error.status === 200 || error.status === 0) {
              console.log('✅ Actually successful - removing from local array');
              
              // Remove from local array since the API call was actually successful
              this.favorites = this.favorites.filter(property => property.propertyId !== propertyId);
              
              Swal.fire({
                position: 'top-end',
                icon: 'success',
                title: 'Removed from favorites',
                showConfirmButton: false,
                timer: 1500
              });
              return;
            }
            
            let errorMessage = 'Unable to remove property from favorites.';
            
            if (error.status === 404) {
              // Handle 404 - property not in favorites
              console.log('⚠️ Property not found in favorites (404), removing from local list anyway');
              
              // Remove from local array since it's not in server anyway
              this.favorites = this.favorites.filter(property => property.propertyId !== propertyId);
              
              Swal.fire({
                position: 'top-end',
                icon: 'info',
                title: 'Property was already removed',
                text: 'This property was not in your favorites',
                showConfirmButton: false,
                timer: 2000
              });
              return; // Exit early, don't show error
            } else if (error.status === 401) {
              errorMessage = 'You need to be logged in to remove favorites.';
            } else if (error.status === 500) {
              errorMessage = 'Server error. Please try again later.';
            }
            
            Swal.fire({
              icon: 'error',
              title: 'Failed to Remove',
              text: errorMessage,
              confirmButtonColor: '#08227B'
            });
          }
        });
        
        this.subscriptions.push(removeSub);
      }
    });
  }
  
  // MISSING METHODS - Added below:
  
  goToDashboard(): void {
    this.router.navigate(['/home']);
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

  // Additional helper methods
  refreshFavorites(): void {
    this.loadFavorites();
  }
}