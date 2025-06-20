// app/filters/filters.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PropertyService } from '../services/property.service';

interface CityByGovernorate {
  [key: string]: string[];
}

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.css']
})
export class FiltersComponent implements OnInit {
  filtersForm!: FormGroup;
  
  // Property types - إضافة Chalet
  propertyTypes = ['All', 'Apartment', 'House', 'Villa', 'Chalet', 'Office', 'Commercial', 'Land'];
  
  // Listing types
  listingTypes = ['All', 'For Sale', 'For Rent', 'For Investment'];
  
  // Governorates
  governorates = [
    'Cairo', 'Alexandria', 'Giza', 'Qalyubia', 'Port Said',
    'Suez', 'Luxor', 'Dakahlia', 'Gharbia', 'Monufia',
    'Asyut', 'Ismailia', 'Fayyum', 'Sharqia', 'Aswan',
    'Damietta', 'Beheira', 'Minya', 'Beni Suef', 'Qena',
    'Sohag', 'Red Sea', 'South Sinai', 'North Sinai', 'Matrouh'
  ];
  
  // Cities by Governorate (Nested)
  citiesByGovernorate: CityByGovernorate = {
    'Cairo': ['Nasr City', 'Heliopolis', 'Maadi', 'Zamalek', 'New Cairo', 'October City', 
              'Shorouk City', 'Rehab City', 'Madinaty', 'Tagamo3', 'Katameya'],
    'Alexandria': ['Smouha', 'Stanley', 'Sidi Bishr', 'Miami', 'Montazah', 'San Stefano',
                   'Gleem', 'Roushdy', 'Cleopatra', 'Sporting'],
    'Giza': ['Dokki', 'Mohandessin', 'Haram', '6th of October', 'Sheikh Zayed', 
             'Smart Village', 'Beverly Hills', 'Hadayek October', 'Hadayek El Ahram'],
    'Dakahlia': ['Mansoura', 'Mit Ghamr', 'Talkha', 'Dekernes', 'Aga', 'Belqas'],
    'Gharbia': ['Tanta', 'El Mahalla El Kubra', 'Kafr El Zayat', 'Zifta', 'Samanoud'],
    'Red Sea': ['Hurghada', 'El Gouna', 'Sahl Hasheesh', 'Marsa Alam', 'Safaga', 'Makadi Bay'],
    'South Sinai': ['Sharm El Sheikh', 'Dahab', 'Nuweiba', 'Taba', 'Ras Sidr', 'Saint Catherine'],
    'North Sinai': ['El Arish', 'Sheikh Zuweid', 'Rafah', 'Bir al-Abd'],
    'Luxor': ['Luxor City', 'Karnak', 'West Bank', 'Al Bayadeya'],
    'Aswan': ['Aswan City', 'Edfu', 'Kom Ombo', 'Abu Simbel']
  };
  
  selectedGovernorate: string = '';
  availableCities: string[] = [];
  
  // Amenities lists
  internalAmenities = [
    'Air Conditioning', 'Central Heating', 'Balcony', 'Built-in Wardrobes',
    'Kitchen Appliances', 'Dishwasher', 'Internet', 'Cable TV', 'Furnished'
  ];
  
  externalAmenities = [
    'Parking', 'Garden', 'Swimming Pool', 'Gym', 'Security',
    'Elevator', 'Storage Room', 'Playground', 'BBQ Area'
  ];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private propertyService: PropertyService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    // Load any saved filters from sessionStorage
    this.loadSavedFilters();
  }

  initializeForm(): void {
    this.filtersForm = this.formBuilder.group({
      propertyType: ['All'],
      listingType: ['All'],
      minPrice: [''],
      maxPrice: [''],
      bedrooms: [''],
      bathrooms: [''],
      minSize: [''],
      maxSize: [''],
      governorate: [''],
      city: [''],
      amenities: [[]],
      yearBuilt: [''],
      furnished: [''],
      parking: [false],
      elevator: [false],
      security: [false],
      pool: [false],
      gym: [false],
      garden: [false]
    });

    // Listen to governorate changes
    this.filtersForm.get('governorate')?.valueChanges.subscribe(governorate => {
      this.onGovernorateChange(governorate);
    });
  }

  onGovernorateChange(governorate: string): void {
    this.selectedGovernorate = governorate;
    if (governorate && this.citiesByGovernorate[governorate]) {
      this.availableCities = this.citiesByGovernorate[governorate];
    } else {
      this.availableCities = [];
    }
    // Reset city selection
    this.filtersForm.patchValue({ city: '' });
  }

  onSubmit(): void {
    const filters = { ...this.filtersForm.value };
    
    // Clean up filters - remove empty values and 'All' selections
    Object.keys(filters).forEach(key => {
      if (!filters[key] || filters[key] === 'All' || 
          (Array.isArray(filters[key]) && filters[key].length === 0)) {
        delete filters[key];
      }
    });

    // Convert boolean amenities to array
    const amenityKeys = ['parking', 'elevator', 'security', 'pool', 'gym', 'garden'];
    const selectedAmenities: string[] = [];
    
    amenityKeys.forEach(key => {
      if (filters[key]) {
        selectedAmenities.push(key);
        delete filters[key];
      }
    });
    
    if (selectedAmenities.length > 0) {
      filters.amenities = selectedAmenities;
    }

    console.log('Applied filters:', filters);
    
    // Save filters to sessionStorage
    sessionStorage.setItem('propertyFilters', JSON.stringify(filters));
    
    // Navigate back to home with filters
    this.router.navigate(['/home'], { 
      queryParams: { filtered: 'true' }
    });
  }

  resetFilters(): void {
    this.filtersForm.reset({
      propertyType: 'All',
      listingType: 'All',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      minSize: '',
      maxSize: '',
      governorate: '',
      city: '',
      amenities: [],
      yearBuilt: '',
      furnished: '',
      parking: false,
      elevator: false,
      security: false,
      pool: false,
      gym: false,
      garden: false
    });
    this.availableCities = [];
    sessionStorage.removeItem('propertyFilters');
  }

  loadSavedFilters(): void {
    const savedFilters = sessionStorage.getItem('propertyFilters');
    if (savedFilters) {
      const filters = JSON.parse(savedFilters);
      
      // Handle amenities separately
      if (filters.amenities) {
        const amenityArray = filters.amenities;
        amenityArray.forEach((amenity: string) => {
          if (this.filtersForm.get(amenity)) {
            this.filtersForm.patchValue({ [amenity]: true });
          }
        });
        delete filters.amenities;
      }
      
      this.filtersForm.patchValue(filters);
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}