import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Amenity {
  amenityId: number;
  name: string;
}

export interface AmenityResponse {
  $values: Amenity[];
}

export interface CreateAmenityRequest {
  name: string;
}

export interface CreateAmenityResponse {
  id: number;
  name: string;
  properties: {
    $values: any[];
  };
}

export type AmenityType = 'internal' | 'external' | 'accessibility';

@Injectable({
  providedIn: 'root'
})
export class AmenitiesService {
  private apiUrl = 'http://digitalpropertyapi.runasp.net/api/Amenties';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Get internal amenities
  getInternalAmenities(): Observable<Amenity[]> {
    return this.http.get<AmenityResponse>(`${this.apiUrl}/internal`)
      .pipe(
        map(response => response.$values || []),
        catchError((error) => {
          console.error('Error fetching internal amenities:', error);
          throw error;
        })
      );
  }

  // Get external amenities
  getExternalAmenities(): Observable<Amenity[]> {
    return this.http.get<AmenityResponse>(`${this.apiUrl}/external`)
      .pipe(
        map(response => response.$values || []),
        catchError((error) => {
          console.error('Error fetching external amenities:', error);
          throw error;
        })
      );
  }

  // Get accessibility amenities
  getAccessibilityAmenities(): Observable<Amenity[]> {
    return this.http.get<AmenityResponse>(`${this.apiUrl}/accessibility`)
      .pipe(
        map(response => response.$values || []),
        catchError((error) => {
          console.error('Error fetching accessibility amenities:', error);
          throw error;
        })
      );
  }

  // Get all amenities by type
  getAmenitiesByType(type: AmenityType): Observable<Amenity[]> {
    switch (type) {
      case 'internal':
        return this.getInternalAmenities();
      case 'external':
        return this.getExternalAmenities();
      case 'accessibility':
        return this.getAccessibilityAmenities();
      default:
        throw new Error(`Invalid amenity type: ${type}`);
    }
  }

  // Create internal amenity
  createInternalAmenity(request: CreateAmenityRequest): Observable<CreateAmenityResponse> {
    return this.http.post<CreateAmenityResponse>(`${this.apiUrl}/internal`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error creating internal amenity:', error);
        throw error;
      })
    );
  }

  // Create external amenity
  createExternalAmenity(request: CreateAmenityRequest): Observable<CreateAmenityResponse> {
    return this.http.post<CreateAmenityResponse>(`${this.apiUrl}/external`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error creating external amenity:', error);
        throw error;
      })
    );
  }

  // Create accessibility amenity
  createAccessibilityAmenity(request: CreateAmenityRequest): Observable<CreateAmenityResponse> {
    return this.http.post<CreateAmenityResponse>(`${this.apiUrl}/accessibility`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error creating accessibility amenity:', error);
        throw error;
      })
    );
  }

  // Create amenity by type
  createAmenityByType(type: AmenityType, request: CreateAmenityRequest): Observable<CreateAmenityResponse> {
    switch (type) {
      case 'internal':
        return this.createInternalAmenity(request);
      case 'external':
        return this.createExternalAmenity(request);
      case 'accessibility':
        return this.createAccessibilityAmenity(request);
      default:
        throw new Error(`Invalid amenity type: ${type}`);
    }
  }

  // Delete internal amenity
  deleteInternalAmenity(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/internal/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error deleting internal amenity:', error);
        throw error;
      })
    );
  }

  // Delete external amenity
  deleteExternalAmenity(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/external/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error deleting external amenity:', error);
        throw error;
      })
    );
  }

  // Delete accessibility amenity
  deleteAccessibilityAmenity(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/accessibility/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error deleting accessibility amenity:', error);
        throw error;
      })
    );
  }

  // Delete amenity by type
  deleteAmenityByType(type: AmenityType, id: number): Observable<any> {
    switch (type) {
      case 'internal':
        return this.deleteInternalAmenity(id);
      case 'external':
        return this.deleteExternalAmenity(id);
      case 'accessibility':
        return this.deleteAccessibilityAmenity(id);
      default:
        throw new Error(`Invalid amenity type: ${type}`);
    }
  }

  // Helper method to get auth headers
  private getAuthHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  // Get amenity type display name
  getAmenityTypeDisplayName(type: AmenityType): string {
    const displayNames = {
      'internal': 'Internal Amenities',
      'external': 'External Amenities',
      'accessibility': 'Accessibility Features'
    };
    return displayNames[type];
  }

 
}