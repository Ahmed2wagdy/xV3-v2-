import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  $id?: string;
  token: string;
  email: string;
  displayName: string;
  status?: string;
  message?: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  city: string;
  birthOfDate: string;
  password: string;
  confirmPassword: string;
  isTermsAccepted: boolean;
}

export interface SignupResponse {
  $id?: string;
  status: string;
  message: string;
  userId?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  $id?: string;
  status: string;
  message: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  $id?: string;
  status: string;
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  $id?: string;
  status: string;
  message: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface ResendOtpResponse {
  $id?: string;
  status: string;
  message: string;
}

export interface ResendEmailConfirmationOtpRequest {
  email: string;
}

export interface ResendEmailConfirmationOtpResponse {
  $id?: string;
  status: string;
  message: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  city?: string;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://digitalpropertyapi.runasp.net/api/Authentication';
  private userApiUrl = 'http://digitalpropertyapi.runasp.net/api/User';
  
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {
    const token = this.cookieService.get('token');
    if (token) {
      this.loadUserFromStorage();
    }
  }

  // Login method
  login(credentials: LoginRequest): Observable<LoginResponse> {
    const loginDto = {
      email: credentials.email,
      password: credentials.password
    };

    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, loginDto, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': '*/*'
      })
    }).pipe(
      tap((response: LoginResponse) => {
        console.log('Login response:', response);
        
        if (response.status === 'Error') {
          throw new Error(response.message || 'Login failed');
        }
        
        if (response.token) {
          this.cookieService.set('token', response.token, 7);
          
          const nameParts = response.displayName?.split(' ') || ['User'];
          const userData = {
            email: response.email,
            firstName: nameParts[0] || 'User',
            lastName: nameParts.slice(1).join(' ') || '',
            displayName: response.displayName,
            token: response.token
          };
          
          localStorage.setItem('userData', JSON.stringify(userData));
          this.currentUserSubject.next(userData);
        }
      }),
      catchError((error) => {
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.status === 401) {
          errorMessage = 'Invalid email or password.';
        } else if (error.status === 404) {
          errorMessage = 'Login service is temporarily unavailable.';
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  // Sign up method
  signup(userData: SignupRequest): Observable<SignupResponse> {
    const userDto = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      city: userData.city,
      birthOfDate: userData.birthOfDate,
      password: userData.password,
      confirmPassword: userData.confirmPassword,
      isTermsAccepted: userData.isTermsAccepted
    };

    return this.http.post<SignupResponse>(`${this.apiUrl}/signup`, userDto, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': '*/*'
      })
    }).pipe(
      tap((response) => {
        console.log('Signup response:', response);
        
        if (response.status === 'Error') {
          throw new Error(response.message || 'Signup failed');
        }
      }),
      catchError((error) => {
        console.error('Signup error:', error);
        
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.status === 409) {
          errorMessage = 'An account with this email already exists.';
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  // Forgot password method
  forgotPassword(request: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    const emailDto = { email: request.email };
    
    console.log('Sending forgot password request:', emailDto);
    
    return this.http.post<ForgotPasswordResponse>(`${this.apiUrl}/forgot-password`, emailDto, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': '*/*'
      })
    }).pipe(
      tap((response) => {
        console.log('Forgot password raw response:', response);
      }),
      map((response: any) => {
        return {
          status: response.status || 'Success',
          message: response.message || 'OTP sent successfully for password reset.'
        } as ForgotPasswordResponse;
      }),
      catchError((error) => {
        console.error('Forgot password error:', error);
        let errorMessage = 'Failed to send reset email. Please try again.';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 404) {
          errorMessage = 'Email not found. Please check your email address.';
        } else if (error.status === 400) {
          errorMessage = 'Invalid email format.';
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  // Verify OTP method
  verifyOtp(request: VerifyOtpRequest): Observable<VerifyOtpResponse> {
    const otpDto = {
      email: request.email,
      otp: request.otp
    };
    
    return this.http.post<VerifyOtpResponse>(`${this.apiUrl}/verify-otp`, otpDto, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': '*/*'
      })
    }).pipe(
      map((response: any) => {
        return {
          status: response.status || 'Success',
          message: response.message || 'OTP verified successfully.'
        } as VerifyOtpResponse;
      }),
      catchError((error) => {
        console.error('Verify OTP error:', error);
        let errorMessage = 'Invalid OTP. Please try again.';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  // Reset password method
  resetPassword(request: ResetPasswordRequest): Observable<ResetPasswordResponse> {
    const resetDto = {
      email: request.email,
      newPassword: request.newPassword,
      confirmPassword: request.confirmPassword
    };
    
    return this.http.post<ResetPasswordResponse>(`${this.apiUrl}/reset-password`, resetDto, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': '*/*'
      })
    }).pipe(
      map((response: any) => {
        return {
          status: response.status || 'Success',
          message: response.message || 'Password reset successfully.'
        } as ResetPasswordResponse;
      }),
      catchError((error) => {
        console.error('Reset password error:', error);
        let errorMessage = 'Failed to reset password. Please try again.';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  // Resend OTP for forgot password
  resendOtp(request: ResendOtpRequest): Observable<ResendOtpResponse> {
    const emailDto = { email: request.email };
    
    return this.http.post<ResendOtpResponse>(`${this.apiUrl}/resend-otp`, emailDto, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': '*/*'
      })
    }).pipe(
      map((response: any) => {
        return {
          status: response.status || 'Success',
          message: response.message || 'OTP resent successfully.'
        } as ResendOtpResponse;
      }),
      catchError((error) => {
        console.error('Resend OTP error:', error);
        let errorMessage = 'Failed to resend OTP. Please try again.';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  // Resend email confirmation OTP for signup verification
  resendEmailConfirmationOtp(request: ResendEmailConfirmationOtpRequest): Observable<ResendEmailConfirmationOtpResponse> {
    const emailDto = { email: request.email };
    
    return this.http.post<ResendEmailConfirmationOtpResponse>(`${this.apiUrl}/resend-email-confirmation-otp`, emailDto, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': '*/*'
      })
    }).pipe(
      map((response: any) => {
        return {
          status: response.status || 'Success',
          message: response.message || 'Email confirmation OTP resent successfully.'
        } as ResendEmailConfirmationOtpResponse;
      }),
      catchError((error) => {
        console.error('Resend email confirmation OTP error:', error);
        let errorMessage = 'Failed to resend confirmation OTP. Please try again.';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  // Change password method
  changePassword(request: ChangePasswordRequest): Observable<any> {
    const changePasswordDto = {
      oldPassword: request.oldPassword,
      newPassword: request.newPassword,
      confirmNewPassword: request.confirmNewPassword
    };
    
    return this.http.put(`${this.userApiUrl}/ChangePassword`, changePasswordDto, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Change password error:', error);
        let errorMessage = 'Failed to change password. Please try again.';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          errorMessage = 'Current password is incorrect.';
        }
        
        throw new Error(errorMessage);
      })
    );
  }

  // Get user profile
  getUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.userApiUrl}/GetUser`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((profile) => {
        const userData = {
          userId: profile.userId,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phoneNumber: profile.phoneNumber,
          city: profile.city,
          imageUrl: profile.imageUrl
        };
        localStorage.setItem('userData', JSON.stringify(userData));
        this.currentUserSubject.next(userData);
      }),
      catchError((error) => {
        console.error('Get user profile error:', error);
        throw error;
      })
    );
  }

  // Update user profile
  updateUserProfile(formData: FormData): Observable<any> {
    return this.http.put(`${this.userApiUrl}/Update`, formData, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.getToken()}`
      })
    }).pipe(
      tap((response) => {
        this.getUserProfile().subscribe();
      }),
      catchError((error) => {
        console.error('Update user profile error:', error);
        throw error;
      })
    );
  }

  // Logout method
  logout(): void {
    this.cookieService.delete('token');
    this.cookieService.delete('userId');
    localStorage.removeItem('userData');
    this.currentUserSubject.next(null);
  }

  // Get current user
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!this.cookieService.get('token');
  }

  // Get auth headers for authenticated requests
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Get token
  private getToken(): string {
    return this.cookieService.get('token') || '';
  }

  // Load user data from storage
  private loadUserFromStorage(): void {
    const userDataString = localStorage.getItem('userData');
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        this.currentUserSubject.next(userData);
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        localStorage.removeItem('userData');
        this.logout();
      }
    }
  }

  // Get user data from localStorage
  getUserData(): any {
    const userDataString = localStorage.getItem('userData');
    if (userDataString) {
      try {
        return JSON.parse(userDataString);
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
    return null;
  }

  // Get user image URL
  getUserImageUrl(): string {
    const userData = this.getUserData();
    return userData?.imageUrl || 'assets/images/profile.jpeg';
  }

  // Get user full name
  getUserFullName(): string {
    const userData = this.getUserData();
    if (userData) {
      if (userData.displayName) {
        return userData.displayName;
      }
      return `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    }
    return 'Guest';
  }
}