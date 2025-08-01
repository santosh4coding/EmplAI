import { z } from 'zod';

// Common validation utilities for production
export const ValidationSchemas = {
  // Email validation
  email: z.string().email('Invalid email format'),
  
  // Phone number validation (supports international formats)
  phoneNumber: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number'),
  
  // Password validation (minimum security requirements)
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  // Date validation
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Role validation
  userRole: z.enum(['patient', 'doctor', 'nurse', 'front-desk', 'admin', 'super-admin', 'insurance', 'pharmacy', 'department-head', 'ssd']),
  
  // Department codes
  departmentCode: z.string().min(2).max(10).toUpperCase(),
  
  // Medical record types
  recordType: z.enum(['consultation', 'lab-result', 'prescription', 'diagnosis', 'surgery', 'vaccination']),
  
  // Payment status
  paymentStatus: z.enum(['pending', 'succeeded', 'failed', 'refunded']),
  
  // Queue status
  queueStatus: z.enum(['waiting', 'called', 'in-progress', 'completed']),
  
  // Appointment status
  appointmentStatus: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']),
  
  // Pagination parameters
  paginationParams: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
};

// Sanitization utilities
export class DataSanitizer {
  static sanitizeString(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  static validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const sanitized = this.sanitizeObject(data);
    return schema.parse(sanitized);
  }
}

// Common validation errors
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}