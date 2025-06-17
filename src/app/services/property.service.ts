import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap, map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface PropertyResponse {
  $id?: string;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  data: {
    $id?: string;
    $values: Property[];
  };
}

export interface Property {
  propertyId: number;
  title: string;
  description: string;
  price: number;
  propertyType: string;
  size: number;
  bedrooms: number;
  bathrooms: number;
  street: string;
  city: string;
  governate: string;
  listedAt: string;
  propertyImages: string[];
  ownerInfo: OwnerInfo;
  internalAmenities: string[];
  externalAmenities: string[];
  accessibilityAmenities: string[];
  isFavorite?: boolean;
}

export interface OwnerInfo {
  $id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export interface PropertyFilters {
  pageIndex?: number;
  pageSize?: number;
  propertyType?: string;
  city?: string;
  governate?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  sortBy?: string;
  searchTerm?: string;
  internalAmenityIds?: number[];
  externalAmenityIds?: number[];
  accessibilityAmenityIds?: number[];
  userId?: number;
}

export interface Review {
  reviewId?: number;
  propertyId: number;
  userId?: string;
  userName?: string;
  rating: number;
  comment: string;
  reviewDate?: string;
}

export interface FavoriteProperty {
  $id?: string;
  propertyId: number;
  title: string;
  mainImageUrl: string;
  city: string;
  governate: string;
  price: number;
  listingType: string;
  addedToFavoritesAt: string;
}

export interface FavoritesResponse {
  $id?: string;
  $values: FavoriteProperty[];
}

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private apiUrl = 'http://digitalpropertyapi.runasp.net/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Get all properties with pagination and filters
  getProperties(filters?: PropertyFilters): Observable<{ pageIndex: number; pageSize: number; totalCount: number; data: Property[] }> {
    let params = new HttpParams();
    
    // Set default pagination if not provided
    const pageSize = filters?.pageSize || 12;
    const pageIndex = filters?.pageIndex || 1;
    
    params = params.set('PageSize', pageSize.toString());
    params = params.set('PageIndex', pageIndex.toString());
    
    if (filters) {
      if (filters.propertyType) params = params.set('PropertyType', filters.propertyType);
      if (filters.city) params = params.set('City', filters.city);
      if (filters.governate) params = params.set('Governate', filters.governate);
      if (filters.bedrooms) params = params.set('Bedrooms', filters.bedrooms.toString());
      if (filters.bathrooms) params = params.set('Bathrooms', filters.bathrooms.toString());
      if (filters.size) params = params.set('Size', filters.size.toString());
      if (filters.minPrice) params = params.set('MinPrice', filters.minPrice.toString());
      if (filters.maxPrice) params = params.set('MaxPrice', filters.maxPrice.toString());
      if (filters.sortBy) params = params.set('SortBy', filters.sortBy);
      if (filters.userId) params = params.set('UserId', filters.userId.toString());
      
      if (filters.internalAmenityIds) {
        filters.internalAmenityIds.forEach(id => {
          params = params.append('InternalAmenityIds', id.toString());
        });
      }
      if (filters.externalAmenityIds) {
        filters.externalAmenityIds.forEach(id => {
          params = params.append('ExternalAmenityIds', id.toString());
        });
      }
      if (filters.accessibilityAmenityIds) {
        filters.accessibilityAmenityIds.forEach(id => {
          params = params.append('AccessibilityAmenityIds', id.toString());
        });
      }
    }

    console.log('🔍 Fetching properties with params:', params.toString());

    return this.http.get<PropertyResponse>(`${this.apiUrl}/Properties/GetAll`, { 
      params,
      headers: new HttpHeaders({
        'Accept': '*/*'
      })
    }).pipe(
      tap((response) => {
        console.log('✅ Properties API raw response:', response);
      }),
      map((response: PropertyResponse) => {
        // Handle the response structure with $id and $values
        const properties = response.data?.$values || [];
        const formattedProperties = properties.map(property => this.formatProperty(property));
        
        console.log('✅ Formatted properties:', formattedProperties);
        
        return {
          pageIndex: response.pageIndex,
          pageSize: response.pageSize,
          totalCount: response.totalCount,
          data: formattedProperties
        };
      }),
      catchError((error) => {
        console.error('❌ Error loading properties:', error);
        // Return empty result instead of mock data
        return of({
          pageIndex: 1,
          pageSize: 12,
          totalCount: 0,
          data: []
        });
      })
    );
  }

  // Get property by ID - using GetAll with filter
  getPropertyById(id: number): Observable<Property> {
    console.log('🔍 Getting property by ID:', id);
    
    return this.getProperties({ pageSize: 1000 }).pipe(
      map((response) => {
        const property = response.data.find(p => p.propertyId === id);
        if (!property) {
          throw new Error(`Property with ID ${id} not found`);
        }
        return property;
      }),
      catchError((error) => {
        console.error('❌ Error loading property by ID:', error);
        throw error;
      })
    );
  }

  // Add property method
  addProperty(propertyData: FormData): Observable<any> {
    console.log('🚀 Creating property with real API...');
    
    // عرض محتويات FormData للتشخيص
    console.log('📦 FormData contents:');
    for (let pair of (propertyData as any).entries()) {
      console.log(`  ${pair[0]}:`, pair[1]);
    }
    
    return this.http.post(`${this.apiUrl}/Properties/Create`, propertyData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.getToken()}`
      })
    }).pipe(
      tap((response) => {
        console.log('✅ Property created successfully:', response);
      }),
      catchError((error) => {
        console.error('❌ Error adding property:', error);
        console.log('📊 Full error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
          error: error.error
        });
        
        let errorMessage = 'Failed to add property. Please try again.';
        
        if (error.status === 400) {
          console.log('🔍 Bad Request (400) - Validation or data issue');
          
          if (error.error && typeof error.error === 'object') {
            if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.errors) {
              const validationErrors = [];
              for (const field in error.error.errors) {
                if (error.error.errors[field] && Array.isArray(error.error.errors[field])) {
                  validationErrors.push(`${field}: ${error.error.errors[field].join(', ')}`);
                }
              }
              if (validationErrors.length > 0) {
                errorMessage = `Validation errors: ${validationErrors.join('; ')}`;
              }
            } else if (error.error.title) {
              errorMessage = error.error.title;
            }
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          } else {
            errorMessage = 'Invalid data format. Please check all required fields and try again.';
          }
        } else if (error.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to add properties.';
        } else if (error.status === 413) {
          errorMessage = 'File size too large. Please use smaller images (max 5MB each).';
        } else if (error.status === 415) {
          errorMessage = 'Unsupported file format. Please use JPG, PNG, or WebP images.';
        } else if (error.status === 422) {
          errorMessage = 'Invalid data format. Please check your form data.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        } else if (error.status === 502) {
          errorMessage = 'Server temporarily unavailable. Please try again in a few minutes.';
        } else if (error.status === 0) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        return throwError(() => ({
          status: error.status,
          error: { 
            message: errorMessage,
            originalError: error.error 
          },
          timestamp: new Date().toISOString()
        }));
      })
    );
  }

  // Update property
  updateProperty(id: number, propertyData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/Properties/Update/${id}`, propertyData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error updating property:', error);
        throw error;
      })
    );
  }

  // Delete property
  deleteProperty(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Properties/Delete/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error deleting property:', error);
        throw error;
      })
    );
  }

  // Add to favorites
  addToFavorites(propertyId: number): Observable<any> {
    console.log('Adding property to favorites:', propertyId);
    
    return this.http.post(`${this.apiUrl}/Favorites/${propertyId}`, {}, {
      headers: this.getAuthHeaders(),
      responseType: 'text'
    }).pipe(
      tap((response) => {
        console.log('Add to favorites response:', response);
      }),
      catchError((error) => {
        console.error('Error adding to favorites:', error);
        
        if (error.status === 200 || (error.error && typeof error.error === 'string' && error.error.includes('added'))) {
          console.log('Actually successful - treating as success');
          return of('Property added to favorites.');
        }
        
        throw error;
      })
    );
  }

  // Remove from favorites
  removeFromFavorites(propertyId: number): Observable<any> {
    console.log('Removing property from favorites:', propertyId);
    
    return this.http.delete(`${this.apiUrl}/Favorites/remove/${propertyId}`, {
      headers: this.getAuthHeaders(),
      responseType: 'text'
    }).pipe(
      tap((response) => {
        console.log('Remove from favorites response:', response);
      }),
      catchError((error) => {
        console.error('Error removing from favorites:', error);
        
        if (error.status === 200 || (error.error && typeof error.error === 'string' && error.error.includes('removed'))) {
          console.log('Actually successful - treating as success');
          return of('Property removed from favorites.');
        }
        
        throw error;
      })
    );
  }

  // Check if property is in favorites
  isPropertyInFavorites(propertyId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/Favorites/added/${propertyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((response) => {
        console.log(`✅ Property ${propertyId} is in favorites:`, response);
      }),
      catchError((error) => {
        console.error('❌ Error checking favorites:', error);
        return of(false);
      })
    );
  }

  // Get user favorites
  getFavorites(): Observable<Property[]> {
    return this.http.get<FavoritesResponse>(`${this.apiUrl}/Favorites`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((response) => {
        console.log('✅ Favorites API raw response:', response);
      }),
      map((response: FavoritesResponse) => {
        const favorites = response.$values || [];
        return favorites.map(fav => this.formatFavoriteToProperty(fav));
      }),
      catchError((error) => {
        console.error('❌ Error loading favorites:', error);
        return of([]);
      })
    );
  }

  // Get property reviews - Enhanced with mock data for development
  getPropertyReviews(propertyId: number): Observable<Review[]> {
    console.log('🔍 Getting reviews for property:', propertyId);
    
    // Mock reviews for development
    const mockReviews: Review[] = [
     
      
      
    ];
    
    console.log('📝 Returning mock reviews:', mockReviews);
    return of(mockReviews).pipe(delay(500));
  }

  // Add review - Enhanced with better error handling
  addReview(propertyId: number, review: { rating: number; comment: string }): Observable<any> {
    console.log('📝 Adding review for property:', propertyId, 'Review data:', review);
    
    // Get user data and extract proper userId
    const userData = this.authService.getUserData();
    console.log('👤 Current user data:', userData);
    
    // Try to get userId from different possible fields
    const userId = this.extractUserId(userData);
    console.log('🆔 Using userId:', userId);
    
    const reviewDto = {
      rating: review.rating,
      comment: review.comment
    };
    
    console.log('📤 Sending review request to:', `${this.apiUrl}/Reviews/${userId}/${propertyId}`);
    console.log('📦 Review payload:', reviewDto);
    
    return this.http.post(`${this.apiUrl}/Reviews/${userId}/${propertyId}`, reviewDto, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((response) => {
        console.log('✅ Review added successfully:', response);
      }),
      catchError((error) => {
        console.error('❌ Error adding review:', error);
        console.log('📊 Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
          error: error.error
        });
        
        let errorMessage = 'Failed to add review. Please try again.';
        
        if (error.status === 0) {
          errorMessage = 'Connection error. Please check your network and try again.';
          console.log('🌐 CORS or network error detected');
        } else if (error.status === 400) {
          errorMessage = 'Invalid review data. Please check your rating and comment.';
        } else if (error.status === 401) {
          errorMessage = 'Please log in again to submit a review.';
        } else if (error.status === 404) {
          errorMessage = 'Property not found or review endpoint unavailable.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. The review feature may be temporarily unavailable.';
          
          // For development: return a mock success response
          console.log('🔄 Server error - returning mock success for development');
          return of({
            success: true,
            message: 'Review submitted (mock response due to server error)',
            reviewId: Math.floor(Math.random() * 1000),
            isTemporary: true
          });
        }
        
        return throwError(() => ({
          status: error.status,
          error: { message: errorMessage }
        }));
      })
    );
  }

  // Helper method to extract user ID from various possible fields
  private extractUserId(userData: any): string {
    if (!userData) {
      console.log('⚠️ No user data available');
      return '1';
    }
    
    const possibleIds = [
      userData.userId,
      userData.id, 
      userData.user_id,
      userData.sub, // JWT standard claim
      userData.nameid, // .NET Identity claim
      userData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] // Full .NET claim
    ];
    
    for (const id of possibleIds) {
      if (id) {
        console.log('✅ Found user ID:', id);
        return String(id);
      }
    }
    
    console.log('⚠️ No user ID found in any field, using fallback');
    return '1';
  }

  updateReview(propertyId: number, reviewId: number, review: { rating: number; comment: string }): Observable<any> {
    const userData = this.authService.getUserData();
    const userId = this.extractUserId(userData);
    
    const reviewDto = {
      rating: review.rating,
      comment: review.comment
    };
    
    return this.http.put(`${this.apiUrl}/Reviews/${userId}/${reviewId}`, reviewDto, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error updating review:', error);
        throw error;
      })
    );
  }

  deleteReview(propertyId: number, reviewId: number): Observable<any> {
    const userData = this.authService.getUserData();
    const userId = this.extractUserId(userData);
    
    return this.http.delete(`${this.apiUrl}/Reviews/${userId}/${reviewId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error deleting review:', error);
        throw error;
      })
    );
  }

  // Helper methods
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': '*/*'
    });
  }

  private getToken(): string {
    return this.authService.getAuthHeaders().get('Authorization')?.replace('Bearer ', '') || '';
  }

  // Format property data for display
  formatProperty(property: any): Property {
    return {
      propertyId: property.propertyId || property.id,
      title: property.title || 'Property Title',
      description: property.description || 'No description available',
      price: property.price || 0,
      propertyType: property.propertyType || 'Unknown',
      size: property.size || 0,
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      street: property.street || '',
      city: property.city || '',
      governate: property.governate || '',
      listedAt: property.listedAt || property.createdAt || new Date().toISOString(),
      propertyImages: property.propertyImages?.$values || property.propertyImages || [],
      ownerInfo: property.ownerInfo || {
        firstName: 'Owner',
        lastName: 'Name',
        email: 'owner@email.com',
        phoneNumber: '+201234567890'
      },
      internalAmenities: property.internalAmenities?.$values || property.internalAmenities || [],
      externalAmenities: property.externalAmenities?.$values || property.externalAmenities || [],
      accessibilityAmenities: property.accessibilityAmenities?.$values || property.accessibilityAmenities || [],
      isFavorite: false
    };
  }

  // Convert favorite response to property format
  private formatFavoriteToProperty(favorite: FavoriteProperty): Property {
    return {
      propertyId: favorite.propertyId,
      title: favorite.title,
      description: 'Favorite property',
      price: favorite.price,
      propertyType: favorite.listingType || 'Property',
      size: 0,
      bedrooms: 0,
      bathrooms: 0,
      street: '',
      city: favorite.city,
      governate: favorite.governate,
      listedAt: favorite.addedToFavoritesAt,
      propertyImages: [favorite.mainImageUrl],
      ownerInfo: {
        firstName: 'Owner',
        lastName: 'Name',
        email: 'owner@email.com',
        phoneNumber: '+201234567890'
      },
      internalAmenities: [],
      externalAmenities: [],
      accessibilityAmenities: [],
      isFavorite: true
    };
  }

  // Search properties
  searchProperties(searchTerm: string, filters?: PropertyFilters): Observable<{ pageIndex: number; pageSize: number; totalCount: number; data: Property[] }> {
    const searchFilters = {
      ...filters,
      searchTerm: searchTerm,
      pageIndex: 1,
      pageSize: 20
    };
    return this.getProperties(searchFilters);
  }
  // إضافة هذا الـ method في PropertyService

// Get user's own properties
getUserProperties(): Observable<Property[]> {
  console.log('🔍 Fetching user properties...');
  
  return this.http.get<any>(`${this.apiUrl}/Properties/get-user-properties`, {
    headers: this.getAuthHeaders()
  }).pipe(
    tap((response) => {
      console.log('✅ User properties API raw response:', response);
    }),
    map((response: any) => {
      // Handle different possible response structures
      let properties: any[] = [];
      
      if (response) {
        if (response.$values) {
          // Response has $values wrapper
          properties = response.$values;
        } else if (response.data && response.data.$values) {
          // Response has data.$values wrapper
          properties = response.data.$values;
        } else if (Array.isArray(response)) {
          // Response is direct array
          properties = response;
        } else if (response.data && Array.isArray(response.data)) {
          // Response has data array
          properties = response.data;
        } else {
          console.log('⚠️ Unexpected response structure:', response);
          properties = [];
        }
      }
      
      const formattedProperties = properties.map(property => this.formatProperty(property));
      console.log('✅ Formatted user properties:', formattedProperties);
      
      return formattedProperties;
    }),
    catchError((error) => {
      console.error('❌ Error loading user properties:', error);
      
      if (error.status === 404) {
        console.log('📝 No properties found for user (404)');
        return of([]); // Return empty array if no properties found
      } else if (error.status === 401) {
        console.error('🔐 Authentication error - user needs to login');
        throw new Error('Please login again to view your properties.');
      } else if (error.status === 500) {
        console.error('🔥 Server error');
        throw new Error('Server error. Please try again later.');
      }
      
      throw new Error('Failed to load your properties. Please try again.');
    })
  );
}
}
