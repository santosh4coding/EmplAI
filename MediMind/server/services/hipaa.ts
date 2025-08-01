import crypto from 'crypto';
import { db } from '../db';
import { storage } from '../storage';

// HIPAA Compliance Service
export class HIPAAService {
  private static instance: HIPAAService;
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
  }

  static getInstance(): HIPAAService {
    if (!HIPAAService.instance) {
      HIPAAService.instance = new HIPAAService();
    }
    return HIPAAService.instance;
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Data Encryption (AES-256-GCM)
  encryptPHI(data: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('PHI_DATA'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decryptPHI(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    try {
      const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
      decipher.setAAD(Buffer.from('PHI_DATA'));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt PHI data');
    }
  }

  // Audit Logging
  async logAccess(params: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    patientId?: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    details?: any;
  }) {
    const auditLog = {
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      patientId: params.patientId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      timestamp: new Date(),
      success: params.success,
      details: JSON.stringify(params.details || {}),
      sessionId: this.generateSessionId(params.userId)
    };

    // In production, this would insert into audit_logs table
    console.log('HIPAA Audit Log:', auditLog);
    return auditLog;
  }

  // Access Control Validation
  async validateAccess(userId: string, resourceType: string, resourceId: string, action: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) return false;

    // Role-based access control matrix
    const accessMatrix = {
      'patient': {
        'medical-records': ['read'],
        'appointments': ['read', 'create'],
        'profile': ['read', 'update']
      },
      'doctor': {
        'medical-records': ['read', 'create', 'update'],
        'appointments': ['read', 'create', 'update', 'delete'],
        'patients': ['read', 'create', 'update'],
        'prescriptions': ['read', 'create', 'update']
      },
      'nurse': {
        'medical-records': ['read', 'create'],
        'appointments': ['read', 'update'],
        'patients': ['read', 'update'],
        'vitals': ['read', 'create', 'update']
      },
      'admin': {
        'medical-records': ['read'],
        'appointments': ['read', 'create', 'update', 'delete'],
        'patients': ['read', 'create', 'update'],
        'users': ['read', 'create', 'update', 'delete'],
        'audit-logs': ['read']
      },
      'front-desk': {
        'appointments': ['read', 'create', 'update'],
        'patients': ['read', 'create', 'update'],
        'queue': ['read', 'create', 'update']
      }
    };

    const rolePermissions = accessMatrix[user.role as keyof typeof accessMatrix];
    if (!rolePermissions) return false;

    const resourcePermissions = rolePermissions[resourceType as keyof typeof rolePermissions];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(action);
  }

  // Data Anonymization
  anonymizeData(data: any, fields: string[]): any {
    const anonymized = { ...data };
    fields.forEach(field => {
      if (anonymized[field]) {
        if (typeof anonymized[field] === 'string') {
          anonymized[field] = this.hashString(anonymized[field]);
        } else {
          anonymized[field] = '[REDACTED]';
        }
      }
    });
    return anonymized;
  }

  private hashString(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 8) + '***';
  }

  // Breach Detection
  async detectPotentialBreach(params: {
    userId: string;
    action: string;
    resourceCount: number;
    timeWindow: number; // minutes
  }): Promise<{ isBreach: boolean; riskLevel: 'low' | 'medium' | 'high' }> {
    // Mock breach detection logic
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let isBreach = false;

    // Detect unusual access patterns
    if (params.resourceCount > 50 && params.timeWindow < 5) {
      riskLevel = 'high';
      isBreach = true;
    } else if (params.resourceCount > 20 && params.timeWindow < 10) {
      riskLevel = 'medium';
    } else if (params.resourceCount > 10 && params.timeWindow < 30) {
      riskLevel = 'low';
    }

    if (isBreach) {
      await this.triggerBreachAlert({
        userId: params.userId,
        riskLevel,
        details: `Unusual access pattern detected: ${params.resourceCount} resources accessed in ${params.timeWindow} minutes`
      });
    }

    return { isBreach, riskLevel };
  }

  private async triggerBreachAlert(params: {
    userId: string;
    riskLevel: string;
    details: string;
  }) {
    // In production, this would notify security team and compliance officers
    console.log('SECURITY ALERT - Potential HIPAA Breach:', params);
    
    // Log the security incident
    await this.logAccess({
      userId: params.userId,
      action: 'SECURITY_BREACH_DETECTED',
      resourceType: 'security',
      resourceId: 'breach_detection',
      ipAddress: 'system',
      userAgent: 'hipaa_service',
      success: true,
      details: params
    });
  }

  // Patient Consent Management
  async recordConsent(params: {
    patientId: string;
    consentType: 'treatment' | 'payment' | 'operations' | 'marketing' | 'research';
    granted: boolean;
    details?: string;
    userId: string;
  }) {
    const consent = {
      patientId: params.patientId,
      consentType: params.consentType,
      granted: params.granted,
      details: params.details,
      recordedBy: params.userId,
      timestamp: new Date(),
      ipAddress: 'system'
    };

    // Log consent record
    await this.logAccess({
      userId: params.userId,
      action: 'CONSENT_RECORDED',
      resourceType: 'consent',
      resourceId: `${params.patientId}_${params.consentType}`,
      patientId: params.patientId,
      ipAddress: 'system',
      userAgent: 'hipaa_service',
      success: true,
      details: consent
    });

    return consent;
  }

  // Data Retention Policy
  async checkDataRetention(recordType: string, createdDate: Date): Promise<{
    shouldRetain: boolean;
    daysRemaining: number;
    action: 'retain' | 'archive' | 'delete';
  }> {
    const retentionPolicies = {
      'medical-records': 7 * 365, // 7 years
      'appointments': 3 * 365,    // 3 years
      'audit-logs': 6 * 365,      // 6 years
      'prescriptions': 5 * 365,   // 5 years
      'lab-results': 7 * 365,     // 7 years
      'imaging': 10 * 365,        // 10 years
      'financial': 7 * 365        // 7 years
    };

    const retentionDays = retentionPolicies[recordType as keyof typeof retentionPolicies] || 365;
    const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = retentionDays - daysSinceCreation;

    let action: 'retain' | 'archive' | 'delete' = 'retain';
    let shouldRetain = true;

    if (daysRemaining <= 0) {
      action = 'delete';
      shouldRetain = false;
    } else if (daysRemaining <= 365) {
      action = 'archive';
    }

    return { shouldRetain, daysRemaining, action };
  }

  // Secure Session Management
  generateSessionId(userId: string): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    return crypto.createHash('sha256').update(`${userId}_${timestamp}_${random}`).digest('hex');
  }

  validateSessionSecurity(req: any): {
    isValid: boolean;
    securityLevel: 'low' | 'medium' | 'high';
    warnings: string[];
  } {
    const warnings: string[] = [];
    let securityLevel: 'low' | 'medium' | 'high' = 'high';

    // Check HTTPS
    if (!req.secure && req.get('X-Forwarded-Proto') !== 'https') {
      warnings.push('Connection not using HTTPS');
      securityLevel = 'low';
    }

    // Check User-Agent
    if (!req.get('user-agent')) {
      warnings.push('Missing User-Agent header');
      securityLevel = 'medium';
    }

    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
    suspiciousHeaders.forEach(header => {
      if (req.get(header)) {
        warnings.push(`Potentially proxied request detected: ${header}`);
        if (securityLevel === 'high') securityLevel = 'medium';
      }
    });

    return {
      isValid: securityLevel !== 'low',
      securityLevel,
      warnings
    };
  }
}

export const hipaaService = HIPAAService.getInstance();