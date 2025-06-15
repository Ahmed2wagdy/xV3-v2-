import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PropertyService, Property, PropertyFilters } from '../services/property.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  properties: Property[] = [];
  filteredProperties: Property[] = [];
  selectedFilter: string = 'All';
  searchQuery: string = '';
  isLoggedIn: boolean = false;
  userName: string = 'Guest';
  showAlert: boolean = false;
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'info' = 'info';
  isLoading: boolean = true;
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 12;
  totalCount: number = 0;
  totalPages: number = 0;
  
  private subscriptions: Subscription[] = [];
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private propertyService: PropertyService
  ) { }

  ngOnInit(): void {
    // Subscribe to authentication state changes
    const authSub = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      if (user) {
        this.userName = this.authService.getUserFullName();
      } else {
        this.userName = 'Guest';
        this.router.navigate(['/log-in']);
      }
    });
    this.subscriptions.push(authSub);

    // Check initial authentication state
    this.isLoggedIn = this.authService.isLoggedIn();
    if (!this.isLoggedIn) {
      this.router.navigate(['/log-in']);
      return;
    }

    this.userName = this.authService.getUserFullName();
    this.loadProperties();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadProperties(filters?: PropertyFilters): void {
    this.isLoading = true;
    
    const searchFilters: PropertyFilters = {
      pageIndex: this.currentPage,
      pageSize: this.pageSize,
      ...filters
    };

    console.log('Loading properties with filters:', searchFilters);

    const propertySub = this.propertyService.getProperties(searchFilters).subscribe({
      next: (response) => {
        console.log('Properties loaded successfully:', response);
        
        this.properties = response.data;
        this.filteredProperties = [...this.properties];
        
        this.totalCount = response.totalCount;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);
        
        this.isLoading = false;
        
        if (this.isLoggedIn && this.properties.length > 0) {
          this.loadUserFavorites();
        }
      },
      error: (error) => {
        console.error('Error loading properties:', error);
        this.isLoading = false;
        this.showAlertMessage('Failed to load properties. Please try again.', 'error');
      }
    });
    this.subscriptions.push(propertySub);
  }

  loadUserFavorites(): void {
    console.log('Loading user favorites...');
    
    const favoriteChecks = this.properties.map(property => 
      this.propertyService.isPropertyInFavorites(property.propertyId)
    );

    if (favoriteChecks.length === 0) {
      return;
    }

    const favSub = forkJoin(favoriteChecks).subscribe({
      next: (favoriteStatuses) => {
        console.log('Favorite statuses loaded:', favoriteStatuses);
        
        this.properties.forEach((property, index) => {
          property.isFavorite = favoriteStatuses[index] || false;
        });
        
        this.filteredProperties = [...this.properties];
        console.log('Properties updated with favorite status');
      },
      error: (error) => {
        console.error('Error loading favorites:', error);
      }
    });
    this.subscriptions.push(favSub);
  }

  showAlertMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;
    
    setTimeout(() => {
      this.showAlert = false;
    }, 3000);
  }

  filterByType(type: string): void {
    this.selectedFilter = type;
    this.currentPage = 1;
    
    const filters: PropertyFilters = {};
    if (type !== 'All') {
      filters.propertyType = type;
    }
    
    this.loadProperties(filters);
  }

  searchProperties(): void {
    if (!this.searchQuery.trim()) {
      this.filterByType(this.selectedFilter);
      return;
    }
    
    this.currentPage = 1;
    const filters: PropertyFilters = {
      searchTerm: this.searchQuery.trim()
    };
    
    if (this.selectedFilter !== 'All') {
      filters.propertyType = this.selectedFilter;
    }
    
    this.loadProperties(filters);
  }

  toggleFavorite(propertyId: number): void {
    if (!this.isLoggedIn) {
      this.showAlertMessage('You need to login to add favorites', 'info');
      return;
    }
    
    const property = this.properties.find(p => p.propertyId === propertyId);
    if (!property) return;

    console.log('🔍 Toggling favorite for property:', propertyId, 'Current status:', property.isFavorite);

    // Store original state in case we need to revert
    const originalState = property.isFavorite;
    
    // Optimistically update UI immediately
    property.isFavorite = !property.isFavorite;
    
    // Update the filtered properties as well
    const filteredProperty = this.filteredProperties.find(p => p.propertyId === propertyId);
    if (filteredProperty) {
      filteredProperty.isFavorite = property.isFavorite;
    }

    // Force Angular change detection immediately
    setTimeout(() => {
      // This ensures the UI updates immediately
    }, 0);

    const action = property.isFavorite ? 'add' : 'remove';
    const apiCall = property.isFavorite 
      ? this.propertyService.addToFavorites(propertyId)
      : this.propertyService.removeFromFavorites(propertyId);

    const favSub = apiCall.subscribe({
      next: (response) => {
        console.log(`✅ ${action} favorite successful:`, response);
        
        const message = property.isFavorite ? 'Added to favorites' : 'Removed from favorites';
        this.showAlertMessage(message, 'success');
        
        // Ensure UI is up to date by triggering change detection
        this.properties = [...this.properties];
        this.filteredProperties = [...this.filteredProperties];
      },
      error: (error) => {
        console.error('❌ Error updating favorites:', error);
        
        // Handle 404 error gracefully for remove operations
        if (error.status === 404 && !property.isFavorite) {
          console.log('⚠️ Property was not in favorites (404), but UI updated correctly');
          this.showAlertMessage('Property removed from favorites', 'success');
          return;
        }
        
        // Revert the optimistic update on other errors
        property.isFavorite = originalState;
        if (filteredProperty) {
          filteredProperty.isFavorite = originalState;
        }
        
        // Force change detection
        this.properties = [...this.properties];
        this.filteredProperties = [...this.filteredProperties];
        
        let errorMessage = 'Failed to update favorites. Please try again.';
        if (error.status === 401) {
          errorMessage = 'You need to be logged in to manage favorites.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.showAlertMessage(errorMessage, 'error');
      }
    });
    this.subscriptions.push(favSub);
  }
  
  viewProperty(propertyId: number): void {
    this.router.navigate(['/property', propertyId]);
  }
  
  showLoginAlert(): void {
    this.showAlertMessage('You need to login to access this feature', 'info');
  }
  
  logout(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#08227B',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        this.showAlertMessage('You have been successfully logged out', 'success');
        this.router.navigate(['/log-in']);
      }
    });
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadProperties();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
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

  getPaginationArray(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  trackByPropertyId(index: number, property: Property): number {
    return property.propertyId;
  }

  Math = Math;

  getUserImageUrl(): string {
    return this.authService.getUserImageUrl();
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/apartment.avif';
  }

  // Additional utility methods
  refreshProperties(): void {
    this.currentPage = 1;
    this.loadProperties();
  }

  goToAddProperty(): void {
    this.router.navigate(['/add-property']);
  }

  goToFavorites(): void {
    this.router.navigate(['/favorites']);
  }

  goToChatBot(): void {
    this.router.navigate(['/chat-bot']);
  }

  getShortenedDescription(description: string, maxLength: number = 100): string {
    if (!description) return 'No description available';
    return description.length > maxLength 
      ? description.substring(0, maxLength) + '...' 
      : description;
  }

  formatListingDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Listed today';
    } else if (diffDays <= 7) {
      return `Listed ${diffDays} days ago`;
    } else {
      return `Listed on ${date.toLocaleDateString('en-EG')}`;
    }
  }

  isNewProperty(dateString: string): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }

  getPropertyStatusBadge(property: Property): string {
    if (this.isNewProperty(property.listedAt)) {
      return 'NEW';
    }
    if (property.isFavorite) {
      return 'FAVORITE';
    }
    return '';
  }

  getPropertyStatusBadgeClass(property: Property): string {
    if (this.isNewProperty(property.listedAt)) {
      return 'badge bg-success';
    }
    if (property.isFavorite) {
      return 'badge bg-danger';
    }
    return 'badge bg-secondary';
  }
}