import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// import { setupAuth, isDemoAuthenticated } from "./replitAuth";
import { setupDemoAuth, isDemoAuthenticated } from "./demoAuth";
import { processHospitalQuery, analyzePatientFeedback } from "./services/openai";
import { queueManager } from "./services/queue";
import { notificationManager } from "./services/notifications";
import { hipaaService } from "./services/hipaa";
import { paymentService } from "./services/payments";
import { insertPatientSchema, insertAppointmentSchema, insertQueueTokenSchema, insertMedicalRecordSchema, insertPaymentSchema, insertBillSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Security middleware
  app.use((req, res, next) => {
    // CORS handling
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS || '').split(',')
      : ['http://localhost:3000', 'http://localhost:5000'];
      
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin || '')) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Input sanitization
  app.use((req, res, next) => {
    function sanitize(obj: any): any {
      if (typeof obj === 'string') {
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      }
      if (Array.isArray(obj)) return obj.map(sanitize);
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitize(value);
        }
        return sanitized;
      }
      return obj;
    }
    
    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);
    next();
  });

  // Rate limiting (disabled for development, enabled for production)
  if (process.env.NODE_ENV === 'production') {
    const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
    app.use((req, res, next) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const maxRequests = 100;
      const windowMs = 15 * 60 * 1000; // 15 minutes
      
      if (rateLimitStore.has(key)) {
        const entry = rateLimitStore.get(key)!;
        if (now > entry.resetTime) {
          rateLimitStore.delete(key);
        }
      }
      
      let entry = rateLimitStore.get(key);
      if (!entry) {
        entry = { count: 0, resetTime: now + windowMs };
        rateLimitStore.set(key, entry);
      }
      
      entry.count++;
      
      if (entry.count > maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        });
      }
      
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - entry.count).toString(),
        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
      });
      
      next();
    });
  }

  // Auth middleware - using demo auth for development
  setupDemoAuth(app);

  // Auth routes are handled in demoAuth.ts

  // Signup route for role assignment (no authentication required)
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        email, 
        password, 
        role, 
        department, 
        licenseNumber, 
        specialization 
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password || !role) {
        return res.status(400).json({ 
          message: "Missing required fields" 
        });
      }

      // In a real system, you would:
      // 1. Hash the password
      // 2. Create user in authentication system
      // 3. Send verification email
      // For demo, we'll create a pending user record

      const userData = {
        id: `user_${Date.now()}`, // Generate temporary ID
        email,
        firstName,
        lastName,
        role,
        department: department || null,
        specialization: specialization || null,
        isActive: true
      };

      // Store user data (in production, this would be after email verification)
      const newUser = await storage.upsertUser(userData);

      // Log user creation for HIPAA compliance
      await hipaaService.logAccess({
        userId: 'system',
        action: 'USER_SIGNUP',
        resourceType: 'user',
        resourceId: newUser.id,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        success: true,
        details: {
          email,
          role,
          department,
          registrationMethod: 'self-signup'
        }
      });

      res.json({ 
        success: true, 
        message: "Account created successfully",
        userId: newUser.id 
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ 
        message: "Failed to create account. Please try again." 
      });
    }
  });

  // Admin-only endpoint to update user roles
  app.put('/api/admin/update-user-role', isDemoAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { targetUserId, role, department, specialization } = req.body;

      if (!role || !targetUserId) {
        return res.status(400).json({ message: "Role and target user ID are required" });
      }

      // Check if current user is admin or super-admin
      const adminUser = await storage.getUser(adminUserId);
      if (!adminUser || !["admin", "super-admin"].includes(adminUser.role)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Get target user
      let targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }

      // Prevent non-super-admin from modifying super-admin roles
      if (targetUser.role === 'super-admin' && adminUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Only super-admin can modify super-admin roles" });
      }

      // Prevent non-super-admin from assigning super-admin role
      if (role === 'super-admin' && adminUser.role !== 'super-admin') {
        return res.status(403).json({ message: "Only super-admin can assign super-admin role" });
      }

      const oldRole = targetUser.role;

      // Update user with new role and additional info
      const updatedUserData = {
        ...targetUser,
        role,
        department: department || targetUser.department,
        specialization: specialization || targetUser.specialization,
        updatedAt: new Date(),
      };

      const updatedUser = await storage.upsertUser(updatedUserData);

      // Log role update for HIPAA compliance
      await hipaaService.logAccess({
        userId: adminUserId,
        action: 'ADMIN_ROLE_UPDATE',
        resourceType: 'user',
        resourceId: updatedUser.id,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        success: true,
        details: {
          targetUserId,
          adminUserId,
          oldRole,
          newRole: role,
          department,
          specialization,
          adminRole: adminUser.role
        }
      });

      res.json({
        success: true,
        message: "User role updated successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Admin role update error:", error);
      res.status(500).json({ 
        message: "Failed to update user role. Please try again." 
      });
    }
  });

  // AI Assistant routes
  app.post('/api/ai/chat', isDemoAuthenticated, async (req: any, res) => {
    try {
      const { message } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const aiResponse = await processHospitalQuery(message, user?.role || 'patient');
      
      // Save chat history
      await storage.createChatHistory({
        userId,
        sessionId: `session_${Date.now()}`,
        message,
        response: aiResponse.message,
        intent: aiResponse.intent,
        confidence: Math.round((aiResponse.confidence || 0) * 100)
      });

      res.json(aiResponse);
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ message: "AI service unavailable" });
    }
  });

  // Department routes
  app.get('/api/departments', async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // Doctor routes
  app.get('/api/doctors', async (req, res) => {
    try {
      const { departmentId } = req.query;
      let doctors;
      
      if (departmentId) {
        doctors = await storage.getDoctorsByDepartment(parseInt(departmentId as string));
      } else {
        doctors = await storage.getDoctors();
      }
      
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  // Patient routes
  app.get('/api/patients', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Role-based access control
      if (!['doctor', 'nurse', 'front-desk', 'admin', 'super-admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { search } = req.query;
      let patients;
      
      if (search) {
        patients = await storage.searchPatients(search as string);
      } else {
        patients = await storage.getPatients();
      }
      
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.post('/api/patients', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Role-based access control
      if (!['front-desk', 'admin', 'super-admin', 'nurse'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Generate unique patient ID
      const timestamp = Date.now().toString();
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const generatedPatientId = `PAT${timestamp.slice(-6)}${randomSuffix}`;
      
      // Parse and validate the request body
      const requestData = {
        ...req.body,
        patientId: generatedPatientId,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        phoneNumber: req.body.phone || req.body.phoneNumber,
      };
      
      const patient = await storage.createPatient(requestData);
      res.json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  // Get patient by ID
  app.get('/api/patients/:id', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Role-based access control
      if (!['doctor', 'nurse', 'front-desk', 'admin', 'super-admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatientById(patientId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  // Update patient
  app.put('/api/patients/:id', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Role-based access control
      if (!['front-desk', 'admin', 'super-admin', 'nurse'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const patientId = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
        phoneNumber: req.body.phone || req.body.phoneNumber,
      };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      const patient = await storage.updatePatient(patientId, updateData);
      res.json(patient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ message: "Failed to update patient" });
    }
  });

  // Delete patient
  app.delete('/api/patients/:id', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Role-based access control
      if (!['admin', 'super-admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const patientId = parseInt(req.params.id);
      await storage.deletePatient(patientId);
      res.json({ message: "Patient deleted successfully" });
    } catch (error) {
      console.error("Error deleting patient:", error);
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Get patient statistics
  app.get('/api/patients/stats/dashboard', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Role-based access control
      if (!['doctor', 'nurse', 'front-desk', 'admin', 'super-admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getPatientStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching patient statistics:", error);
      res.status(500).json({ message: "Failed to fetch patient statistics" });
    }
  });

  // Appointment routes
  app.get('/api/appointments', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { patientId, doctorId } = req.query;
      
      let appointments: any[] = [];
      
      if (user?.role === 'patient') {
        const patient = await storage.getPatientByUserId(req.user.claims.sub);
        if (patient) {
          appointments = await storage.getAppointmentsByPatient(patient.id);
        } else {
          appointments = [];
        }
      } else if (patientId) {
        appointments = await storage.getAppointmentsByPatient(parseInt(patientId as string));
      } else if (doctorId) {
        appointments = await storage.getAppointmentsByDoctor(parseInt(doctorId as string));
      } else {
        appointments = await storage.getAppointments();
      }
      
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // Get doctor's appointments for a specific date
  app.get('/api/appointments/doctor/:doctorId/:date', isDemoAuthenticated, async (req: any, res) => {
    try {
      const { doctorId, date } = req.params;
      const appointments = await storage.getAppointmentsByDoctorAndDate(parseInt(doctorId), date);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching doctor appointments:", error);
      res.status(500).json({ message: "Failed to fetch doctor appointments" });
    }
  });

  app.post('/api/appointments', isDemoAuthenticated, async (req: any, res) => {
    try {
      // Transform the data before validation
      const transformedData = {
        ...req.body,
        doctorId: req.body.doctorId ? parseInt(req.body.doctorId) : undefined,
        patientId: req.body.patientId ? parseInt(req.body.patientId) : undefined,
        departmentId: req.body.departmentId ? parseInt(req.body.departmentId) : undefined,
        appointmentDate: req.body.appointmentDate ? new Date(req.body.appointmentDate) : undefined
      };
      
      const appointmentData = insertAppointmentSchema.parse(transformedData);
      const appointment = await storage.createAppointment(appointmentData);
      
      // Send confirmation notification
      const patient = await storage.getPatients();
      const patientData = patient.find(p => p.id === appointment.patientId);
      
      if (patientData?.userId) {
        await notificationManager.notifyAppointmentConfirmation(
          patientData.userId,
          {
            date: appointment.appointmentDate,
            doctor: "Dr. Smith", // In production, fetch doctor name
            token: "TBD"
          }
        );
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  // Doctors routes
  app.get('/api/doctors', isDemoAuthenticated, async (req: any, res) => {
    try {
      const doctors = await storage.getDoctors();
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/dashboard', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Only allow certain roles to access analytics
      if (!user || !["admin", "super-admin", "department-head", "front-desk"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mock analytics data for now
      const analytics = {
        todayAppointments: 12,
        totalPatients: 156,
        activeQueues: 3,
        activeDepartments: 8
      };
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Notifications routes
  app.get('/api/notifications', isDemoAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Mock notifications data for now
      const notifications = [
        {
          id: 1,
          title: "Appointment Reminder",
          message: "You have an appointment with Dr. Smith tomorrow at 10:00 AM",
          type: "reminder",
          isRead: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          title: "Test Results Ready",
          message: "Your blood test results are now available",
          type: "info",
          isRead: false,
          createdAt: new Date().toISOString()
        }
      ];
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Enhanced EMR Routes
  
  // Get EMR records for a patient
  app.get('/api/emr/records/:patientId', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { patientId } = req.params;
      
      // Role-based access control
      if (!['doctor', 'nurse', 'admin', 'super-admin'].includes(user?.role || '')) {
        if (user?.role === 'patient') {
          const patient = await storage.getPatientByUserId(req.user.claims.sub);
          if (!patient || patient.id !== parseInt(patientId)) {
            return res.status(403).json({ message: "Access denied" });
          }
        } else {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const records = await storage.getMedicalRecordsByPatient(parseInt(patientId));
      res.json(records);
    } catch (error) {
      console.error("Error fetching EMR records:", error);
      res.status(500).json({ message: "Failed to fetch EMR records" });
    }
  });

  // Create new EMR record
  app.post('/api/emr/records', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !["doctor", "nurse", "admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const recordData = {
        ...req.body,
        doctorId: user.role === 'doctor' ? await storage.getDoctorByUserId(user.id) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newRecord = await storage.createMedicalRecord(recordData);
      res.json(newRecord);
    } catch (error) {
      console.error("Error creating EMR record:", error);
      res.status(500).json({ message: "Failed to create EMR record" });
    }
  });

  // Get lab results for a patient
  app.get('/api/emr/lab-results/:patientId', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { patientId } = req.params;
      
      if (!['doctor', 'nurse', 'admin', 'super-admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const labResults = await storage.getLabResultsByPatient(parseInt(patientId));
      res.json(labResults);
    } catch (error) {
      console.error("Error fetching lab results:", error);
      res.status(500).json({ message: "Failed to fetch lab results" });
    }
  });

  // Get vital signs for a patient
  app.get('/api/emr/vital-signs/:patientId', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { patientId } = req.params;
      
      if (!['doctor', 'nurse', 'admin', 'super-admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const vitalSigns = await storage.getVitalSignsByPatient(parseInt(patientId));
      res.json(vitalSigns);
    } catch (error) {
      console.error("Error fetching vital signs:", error);
      res.status(500).json({ message: "Failed to fetch vital signs" });
    }
  });

  // Create vital signs record
  app.post('/api/emr/vital-signs', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !["doctor", "nurse", "admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const vitalsData = {
        ...req.body,
        recordedBy: user.id,
        recordedAt: new Date(),
        createdAt: new Date(),
      };

      const newVitals = await storage.createVitalSigns(vitalsData);
      res.json(newVitals);
    } catch (error) {
      console.error("Error creating vital signs:", error);
      res.status(500).json({ message: "Failed to create vital signs" });
    }
  });

  // Get medications for a patient
  app.get('/api/emr/medications/:patientId', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { patientId } = req.params;
      
      if (!['doctor', 'nurse', 'admin', 'super-admin', 'pharmacy'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const medications = await storage.getMedicationsByPatient(parseInt(patientId));
      res.json(medications);
    } catch (error) {
      console.error("Error fetching medications:", error);
      res.status(500).json({ message: "Failed to fetch medications" });
    }
  });

  // Get imaging studies for a patient
  app.get('/api/emr/imaging/:patientId', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { patientId } = req.params;
      
      if (!['doctor', 'nurse', 'admin', 'super-admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const imagingStudies = await storage.getImagingStudiesByPatient(parseInt(patientId));
      res.json(imagingStudies);
    } catch (error) {
      console.error("Error fetching imaging studies:", error);
      res.status(500).json({ message: "Failed to fetch imaging studies" });
    }
  });

  // Get patient allergies
  app.get('/api/emr/allergies/:patientId', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { patientId } = req.params;
      
      if (!['doctor', 'nurse', 'admin', 'super-admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const allergies = await storage.getAllergiesByPatient(parseInt(patientId));
      res.json(allergies);
    } catch (error) {
      console.error("Error fetching allergies:", error);
      res.status(500).json({ message: "Failed to fetch allergies" });
    }
  });

  // Get patient problem list
  app.get('/api/emr/problems/:patientId', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { patientId } = req.params;
      
      if (!['doctor', 'nurse', 'admin', 'super-admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const problems = await storage.getProblemsByPatient(parseInt(patientId));
      res.json(problems);
    } catch (error) {
      console.error("Error fetching problems:", error);
      res.status(500).json({ message: "Failed to fetch problems" });
    }
  });

  // Legacy Medical Records routes for backward compatibility
  app.get('/api/medical-records', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { patientId, recordType } = req.query;
      
      // Mock medical records data for now
      const mockRecords = [
        {
          id: 1,
          patientId: 1,
          patientName: "John Doe",
          recordType: "consultation",
          title: "Regular Checkup",
          description: "Patient came for routine health checkup. All vitals normal. Blood pressure slightly elevated.",
          doctorName: "Smith",
          department: "General Medicine",
          recordDate: "2025-07-30",
          vitals: {
            temperature: 98.6,
            bloodPressure: "130/85",
            heartRate: 72,
            weight: 70.5,
            height: 175
          },
          status: "completed",
          createdAt: "2025-07-30T10:00:00Z",
          updatedAt: "2025-07-30T10:30:00Z"
        },
        {
          id: 2,
          patientId: 1,
          patientName: "John Doe",
          recordType: "lab-result",
          title: "Blood Test Results",
          description: "Complete blood count and lipid profile. Cholesterol levels within normal range.",
          doctorName: "Johnson",
          department: "Laboratory",
          recordDate: "2025-07-29",
          status: "active",
          createdAt: "2025-07-29T14:00:00Z",
          updatedAt: "2025-07-29T14:00:00Z"
        },
        {
          id: 3,
          patientId: 2,
          patientName: "Jane Smith",
          recordType: "prescription",
          title: "Hypertension Medication",
          description: "Prescribed medication for high blood pressure management.",
          doctorName: "Brown",
          department: "Cardiology",
          recordDate: "2025-07-28",
          status: "active",
          createdAt: "2025-07-28T16:00:00Z",
          updatedAt: "2025-07-28T16:00:00Z"
        }
      ];

      let filteredRecords = mockRecords;
      
      if (user?.role === 'patient') {
        // For patients, only show their own records
        const patient = await storage.getPatientByUserId(req.user.claims.sub);
        if (patient) {
          filteredRecords = mockRecords.filter(r => r.patientId === patient.id);
        } else {
          filteredRecords = [];
        }
      } else if (patientId) {
        filteredRecords = mockRecords.filter(r => r.patientId === parseInt(patientId as string));
      }
      
      if (recordType && recordType !== 'all') {
        filteredRecords = filteredRecords.filter(r => r.recordType === recordType);
      }
      
      res.json(filteredRecords);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      res.status(500).json({ message: "Failed to fetch medical records" });
    }
  });

  app.post('/api/medical-records', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Only doctors, nurses, and admins can create medical records
      if (!user || !["doctor", "nurse", "admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mock creation - in production this would use insertMedicalRecordSchema
      const mockRecord = {
        id: Date.now(),
        patientId: parseInt(req.body.patientId),
        patientName: "Mock Patient",
        recordType: req.body.recordType,
        title: req.body.title,
        description: req.body.description,
        doctorName: user.firstName + " " + user.lastName,
        department: req.body.department,
        recordDate: req.body.recordDate,
        vitals: req.body.vitals,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.json(mockRecord);
    } catch (error) {
      console.error("Error creating medical record:", error);
      res.status(500).json({ message: "Failed to create medical record" });
    }
  });

  // User Settings routes
  app.get('/api/user/settings', isDemoAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Mock settings data
      const mockSettings = {
        profile: {
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          email: user?.email || "",
          phone: "",
          department: user?.department || "",
          specialization: user?.specialization || "",
          bio: "",
          profileImage: user?.profileImageUrl || "",
        },
        notifications: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          appointmentReminders: true,
          systemUpdates: true,
          marketingEmails: false,
        },
        preferences: {
          theme: "system",
          language: "en",
          timezone: "UTC",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12h",
        },
        security: {
          twoFactorEnabled: false,
          sessionTimeout: 30,
          loginAlerts: true,
        },
      };
      
      res.json(mockSettings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch('/api/user/settings/:section', isDemoAuthenticated, async (req: any, res) => {
    try {
      const { section } = req.params;
      const userId = req.user.claims.sub;
      
      // Mock update - in production this would update the database
      console.log(`Updating ${section} settings for user ${userId}:`, req.body);
      
      res.json({ message: "Settings updated successfully", section, data: req.body });
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.post('/api/user/change-password', isDemoAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.claims.sub;
      
      // Mock password change - in production this would verify current password and update
      console.log(`Password change requested for user ${userId}`);
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // HIPAA Compliance routes
  app.get('/api/hipaa/metrics', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Only allow admin, super-admin, and compliance officers
      if (!user || !["admin", "super-admin", "compliance-officer"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const metrics = {
        totalAudits: 1247,
        securityIncidents: 3,
        dataBreaches: 0,
        complianceScore: 98.5,
        lastAudit: "2025-07-15",
        certificationsActive: 4
      };

      await hipaaService.logAccess({
        userId: req.user.claims.sub,
        action: 'VIEW_COMPLIANCE_METRICS',
        resourceType: 'hipaa-metrics',
        resourceId: 'dashboard',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        success: true
      });

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching HIPAA metrics:", error);
      res.status(500).json({ message: "Failed to fetch compliance metrics" });
    }
  });

  app.get('/api/hipaa/audit-logs', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !["admin", "super-admin", "compliance-officer"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { timeRange, search } = req.query;

      // Mock audit logs
      const auditLogs = [
        {
          id: 1,
          userId: "user123",
          action: "READ",
          resourceType: "medical-records",
          resourceId: "mr_001",
          patientId: 101,
          ipAddress: "192.168.1.100",
          timestamp: "2025-07-31T15:30:00Z",
          success: true,
          details: { recordType: "consultation" },
          riskLevel: "low"
        },
        {
          id: 2,
          userId: "user456",
          action: "EXPORT",
          resourceType: "patient-data",
          resourceId: "batch_export_001",
          ipAddress: "192.168.1.101",
          timestamp: "2025-07-31T14:15:00Z",
          success: true,
          details: { recordCount: 25 },
          riskLevel: "medium"
        }
      ];

      await hipaaService.logAccess({
        userId: req.user.claims.sub,
        action: 'VIEW_AUDIT_LOGS',
        resourceType: 'audit-logs',
        resourceId: 'list',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        success: true,
        details: { timeRange, search }
      });

      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get('/api/hipaa/security-incidents', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !["admin", "super-admin", "compliance-officer"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const incidents = [
        {
          id: 1,
          incidentType: "unauthorized_access",
          severity: "medium",
          description: "Failed login attempts detected from suspicious IP address",
          affectedPatients: 0,
          detectedAt: "2025-07-30T10:00:00Z",
          status: "investigating",
          reportedBy: "security_system"
        }
      ];

      await hipaaService.logAccess({
        userId: req.user.claims.sub,
        action: 'VIEW_SECURITY_INCIDENTS',
        resourceType: 'security-incidents',
        resourceId: 'list',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        success: true
      });

      res.json(incidents);
    } catch (error) {
      console.error("Error fetching security incidents:", error);
      res.status(500).json({ message: "Failed to fetch security incidents" });
    }
  });

  app.post('/api/hipaa/security-incidents', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !["admin", "super-admin", "compliance-officer", "doctor", "nurse"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { incidentType, severity, description, affectedPatients } = req.body;

      const incident = {
        id: Date.now(),
        incidentType,
        severity,
        description,
        affectedPatients: parseInt(affectedPatients) || 0,
        detectedAt: new Date().toISOString(),
        status: "open",
        reportedBy: user.id
      };

      await hipaaService.logAccess({
        userId: req.user.claims.sub,
        action: 'CREATE_SECURITY_INCIDENT',
        resourceType: 'security-incidents',
        resourceId: incident.id.toString(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        success: true,
        details: incident
      });

      res.json(incident);
    } catch (error) {
      console.error("Error creating security incident:", error);
      res.status(500).json({ message: "Failed to report security incident" });
    }
  });

  // Enhanced route middleware for HIPAA logging
  app.use('/api/patients', async (req: any, res, next) => {
    const user = await storage.getUser(req.user?.claims?.sub);
    if (user && req.user) {
      await hipaaService.logAccess({
        userId: req.user.claims.sub,
        action: req.method,
        resourceType: 'patients',
        resourceId: req.params.id || 'collection',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        success: true
      });
    }
    next();
  });

  app.use('/api/medical-records', async (req: any, res, next) => {
    const user = await storage.getUser(req.user?.claims?.sub);
    if (user && req.user) {
      await hipaaService.logAccess({
        userId: req.user.claims.sub,
        action: req.method,
        resourceType: 'medical-records',
        resourceId: req.params.id || 'collection',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        success: true
      });
    }
    next();
  });

  // Billing and Payment routes
  app.get('/api/billing/bills', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { status, search } = req.query;
      
      // Mock bills data
      const mockBills = [
        {
          id: 1,
          billNumber: "INV-2025-001",
          patientName: "John Doe",
          totalAmount: 25000,
          paidAmount: 0,
          status: "pending",
          dueDate: "2025-08-15",
          createdAt: "2025-07-31",
          items: [
            {
              id: 1,
              description: "General Consultation",
              quantity: 1,
              unitPrice: 15000,
              totalPrice: 15000,
              category: "consultation"
            },
            {
              id: 2,
              description: "Blood Test - Complete Panel",
              quantity: 1,
              unitPrice: 10000,
              totalPrice: 10000,
              category: "lab"
            }
          ]
        },
        {
          id: 2,
          billNumber: "INV-2025-002",
          patientName: "Jane Smith",
          totalAmount: 45000,
          paidAmount: 45000,
          status: "paid",
          dueDate: "2025-08-10",
          createdAt: "2025-07-30",
          items: [
            {
              id: 3,
              description: "Cardiology Consultation",
              quantity: 1,
              unitPrice: 25000,
              totalPrice: 25000,
              category: "consultation"
            },
            {
              id: 4,
              description: "ECG Test",
              quantity: 1,
              unitPrice: 20000,
              totalPrice: 20000,
              category: "procedure"
            }
          ]
        }
      ];

      let filteredBills = mockBills;
      
      if (user?.role === 'patient') {
        // For patients, only show their own bills
        const patient = await storage.getPatientByUserId(req.user.claims.sub);
        if (patient) {
          // Filter bills by patient ID since patient schema doesn't have name field
          filteredBills = mockBills.filter(b => b.id === patient.id);
        } else {
          filteredBills = [];
        }
      }

      if (status && status !== 'all') {
        filteredBills = filteredBills.filter(b => b.status === status);
      }

      if (search) {
        filteredBills = filteredBills.filter(b => 
          b.patientName.toLowerCase().includes(search.toLowerCase()) ||
          b.billNumber.toLowerCase().includes(search.toLowerCase())
        );
      }

      res.json(filteredBills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res.status(500).json({ message: "Failed to fetch bills" });
    }
  });

  app.post('/api/billing/bills', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Only allow certain roles to create bills
      if (!user || !["admin", "front-desk", "doctor", "nurse"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { patientId, description, amount, dueDate } = req.body;

      const bill = {
        id: Date.now(),
        billNumber: `INV-2025-${String(Date.now()).slice(-6)}`,
        patientName: "Patient Name", // In production, fetch from patient ID
        totalAmount: Math.round(amount),
        paidAmount: 0,
        status: "pending",
        dueDate,
        createdAt: new Date().toISOString(),
        items: [{
          id: Date.now(),
          description,
          quantity: 1,
          unitPrice: Math.round(amount),
          totalPrice: Math.round(amount),
          category: "service"
        }]
      };

      res.json(bill);
    } catch (error) {
      console.error("Error creating bill:", error);
      res.status(500).json({ message: "Failed to create bill" });
    }
  });

  app.get('/api/billing/payments', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      const mockPayments = [
        {
          id: 1,
          transactionId: "pi_1234567890",
          patientName: "Jane Smith",
          amount: 45000,
          currency: "USD",
          status: "succeeded",
          gateway: "stripe",
          createdAt: "2025-07-30T14:30:00Z",
          description: "Payment for consultation and ECG test"
        }
      ];

      let filteredPayments = mockPayments;
      
      if (user?.role === 'patient') {
        // For patients, only show their own payments
        const patient = await storage.getPatientByUserId(req.user.claims.sub);
        if (patient) {
          // Filter payments by patient ID since patient schema doesn't have name field
          filteredPayments = mockPayments.filter(p => p.id === patient.id);
        } else {
          filteredPayments = [];
        }
      }

      res.json(filteredPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post('/api/billing/create-razorpay-order', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { billId, amount } = req.body;

      // Validate payment amount
      const validation = paymentService.validatePaymentAmount(amount / 100, 'INR');
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      const orderResult = await paymentService.processPayment({
        amount: amount / 100, // Convert from paise
        currency: 'INR',
        description: `Payment for bill #${billId}`,
        gateway: 'razorpay',
        userId: req.user.claims.sub,
        metadata: {
          billId,
          patientId: user?.id
        }
      });

      if (orderResult.clientSecret) {
        res.json({
          success: true,
          orderId: orderResult.clientSecret,
          amount: amount,
          currency: 'INR'
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: orderResult.error || "Failed to create order" 
        });
      }
    } catch (error: any) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Order creation failed" 
      });
    }
  });

  app.post('/api/billing/verify-razorpay-payment', isDemoAuthenticated, async (req: any, res) => {
    try {
      const { billId, orderId, paymentId, signature } = req.body;

      // In production, verify the signature using Razorpay's webhook signature verification
      // For demo purposes, we'll simulate successful verification
      const isValidSignature = true; // Would use actual verification logic

      if (isValidSignature) {
        // Log successful payment for HIPAA compliance
        await hipaaService.logAccess({
          userId: req.user.claims.sub,
          action: 'PAYMENT_VERIFIED',
          resourceType: 'payment',
          resourceId: paymentId,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent') || '',
          success: true,
          details: {
            billId,
            orderId,
            paymentId,
            gateway: 'razorpay'
          }
        });

        res.json({
          success: true,
          paymentId,
          status: 'captured'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid payment signature'
        });
      }
    } catch (error: any) {
      console.error("Error verifying Razorpay payment:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Payment verification failed" 
      });
    }
  });

  app.post('/api/billing/process-payment', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { billId, amount, paymentMethodId, gateway = 'stripe' } = req.body;

      // Validate payment amount
      const validation = paymentService.validatePaymentAmount(amount / 100, 'USD');
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const paymentResult = await paymentService.processPayment({
        amount: amount / 100, // Convert from cents
        currency: 'USD',
        description: `Payment for bill #${billId}`,
        paymentMethodId,
        gateway,
        userId: req.user.claims.sub,
        metadata: {
          billId,
          patientId: user?.id
        }
      });

      if (paymentResult.success) {
        // Log successful payment for HIPAA compliance
        await hipaaService.logAccess({
          userId: req.user.claims.sub,
          action: 'PAYMENT_PROCESSED',
          resourceType: 'payment',
          resourceId: paymentResult.transactionId,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent') || '',
          success: true,
          details: {
            billId,
            amount: paymentResult.amount,
            gateway: paymentResult.transactionId.startsWith('pi_') ? 'stripe' : gateway
          }
        });
      }

      res.json(paymentResult);
    } catch (error: any) {
      console.error("Error processing payment:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Payment processing failed" 
      });
    }
  });

  app.get('/api/billing/payment-methods', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Mock payment methods for demo
      const paymentMethods = [
        {
          id: 1,
          type: "card",
          last4: "4242",
          brand: "visa",
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true
        }
      ];

      res.json(paymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post('/api/billing/refund', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Only allow admin and authorized staff to process refunds
      if (!user || !["admin", "super-admin", "front-desk"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { transactionId, amount, reason, gateway } = req.body;

      const refundResult = await paymentService.refundPayment(
        transactionId,
        amount ? amount / 100 : undefined, // Convert from cents
        gateway,
        req.user.claims.sub
      );

      res.json(refundResult);
    } catch (error: any) {
      console.error("Error processing refund:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Refund processing failed" 
      });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Only allow admin and super-admin to access user management
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mock users data for demonstration
      const mockUsers = [
        {
          id: "1",
          email: "john.doctor@hospital.com",
          firstName: "John",
          lastName: "Smith",
          role: "doctor",
          department: "Cardiology",
          isActive: true,
          createdAt: "2025-01-15",
          lastLogin: "2025-07-31T10:30:00Z"
        },
        {
          id: "2",
          email: "sarah.nurse@hospital.com",
          firstName: "Sarah",
          lastName: "Johnson",
          role: "nurse",
          department: "Emergency",
          isActive: true,
          createdAt: "2025-02-01",
          lastLogin: "2025-07-31T09:15:00Z"
        },
        {
          id: "3",
          email: "mike.admin@hospital.com",
          firstName: "Mike",
          lastName: "Wilson",
          role: "admin",
          department: "Administration",
          isActive: true,
          createdAt: "2025-01-01",
          lastLogin: "2025-07-31T08:45:00Z"
        }
      ];

      res.json(mockUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { email, firstName, lastName, role, department } = req.body;

      // In production, this would create a real user
      const newUser = {
        id: Date.now().toString(),
        email,
        firstName,
        lastName,
        role,
        department,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null
      };

      // Log user creation for HIPAA compliance
      await hipaaService.logAccess({
        userId: req.user.claims.sub,
        action: 'USER_CREATED',
        resourceType: 'user',
        resourceId: newUser.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        success: true,
        details: {
          newUserEmail: email,
          newUserRole: role,
          department
        }
      });

      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/admin/users/:id', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Log user update for HIPAA compliance
      await hipaaService.logAccess({
        userId: req.user.claims.sub,
        action: 'USER_UPDATED',
        resourceType: 'user',
        resourceId: id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        success: true,
        details: updateData
      });

      res.json({ id, ...updateData, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get('/api/admin/departments', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mock departments data
      const mockDepartments = [
        {
          id: 1,
          name: "Cardiology",
          code: "CARD",
          description: "Heart and cardiovascular care",
          isActive: true,
          staffCount: 12,
          patientCount: 45
        },
        {
          id: 2,
          name: "Emergency",
          code: "EMER",
          description: "Emergency medical services",
          isActive: true,
          staffCount: 18,
          patientCount: 23
        },
        {
          id: 3,
          name: "Orthopedics",
          code: "ORTH",
          description: "Bone and joint care",
          isActive: true,
          staffCount: 8,
          patientCount: 31
        }
      ];

      res.json(mockDepartments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post('/api/admin/departments', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { name, code, description } = req.body;

      const newDepartment = {
        id: Date.now(),
        name,
        code: code.toUpperCase(),
        description,
        isActive: true,
        staffCount: 0,
        patientCount: 0
      };

      // Log department creation
      await hipaaService.logAccess({
        userId: req.user.claims.sub,
        action: 'DEPARTMENT_CREATED',
        resourceType: 'department',
        resourceId: newDepartment.id.toString(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || '',
        success: true,
        details: { name, code, description }
      });

      res.json(newDepartment);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  app.get('/api/admin/stats', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mock system statistics
      const stats = {
        totalUsers: 156,
        activeUsers: 142,
        totalPatients: 1248,
        totalDoctors: 34,
        totalAppointments: 89,
        systemUptime: "99.8%",
        storageUsed: "2.4 GB",
        lastBackup: "2025-07-31T02:00:00Z"
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });

  // Queue management routes
  app.get('/api/queue/status', async (req, res) => {
    try {
      const { departmentId } = req.query;
      const status = await queueManager.getQueueStatus(
        departmentId ? parseInt(departmentId as string) : undefined
      );
      res.json(status);
    } catch (error) {
      console.error("Error fetching queue status:", error);
      res.status(500).json({ message: "Failed to fetch queue status" });
    }
  });

  app.post('/api/queue/token', isDemoAuthenticated, async (req: any, res) => {
    try {
      const { patientId, departmentId, doctorId, priority = 1 } = req.body;
      
      const tokenNumber = await queueManager.generateToken(
        patientId,
        departmentId,
        doctorId,
        priority
      );
      
      res.json({ tokenNumber, message: "Token generated successfully" });
    } catch (error) {
      console.error("Error generating token:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  });

  app.post('/api/queue/call-next', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Only front desk, doctors, and nurses can call next token
      if (!['front-desk', 'doctor', 'nurse', 'admin'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { departmentId, doctorId } = req.body;
      const nextToken = await queueManager.callNextToken(departmentId, doctorId);
      
      res.json({ tokenNumber: nextToken });
    } catch (error) {
      console.error("Error calling next token:", error);
      res.status(500).json({ message: "Failed to call next token" });
    }
  });

  // Notifications routes
  app.get('/api/notifications', isDemoAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isDemoAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(parseInt(id));
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Feedback routes
  app.post('/api/feedback', isDemoAuthenticated, async (req: any, res) => {
    try {
      const { feedback } = req.body;
      const userId = req.user.claims.sub;
      
      const analysis = await analyzePatientFeedback(feedback);
      
      // Create notification for admin if high priority
      if (analysis.priority === 'high') {
        // Get all admin users and notify them
        // This would be implemented with actual admin user queries
        console.log("High priority feedback received:", analysis);
      }
      
      res.json({ 
        message: "Feedback received successfully",
        analysis 
      });
    } catch (error) {
      console.error("Error processing feedback:", error);
      res.status(500).json({ message: "Failed to process feedback" });
    }
  });

  // Get all medical records (admin/doctor view)
  app.get('/api/medical-records/all', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const userRole = user?.role || 'patient';
      const canViewAllRecords = ['doctor', 'nurse', 'admin', 'super-admin'].includes(userRole);
      
      if (!canViewAllRecords) {
        return res.status(403).json({ message: "Insufficient permissions to view all medical records" });
      }

      const records = await storage.getAllMedicalRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      res.status(500).json({ message: "Failed to fetch medical records" });
    }
  });

  // Medical records routes
  app.get('/api/medical-records/:patientId', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const { patientId } = req.params;
      
      // Role-based access control for medical records
      if (!['doctor', 'nurse', 'admin', 'super-admin'].includes(user?.role || '')) {
        // Patients can only access their own records
        if (user?.role === 'patient') {
          const patient = await storage.getPatientByUserId(req.user.claims.sub);
          if (!patient || patient.id !== parseInt(patientId)) {
            return res.status(403).json({ message: "Access denied" });
          }
        } else {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const records = await storage.getMedicalRecordsByPatient(parseInt(patientId));
      res.json(records);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      res.status(500).json({ message: "Failed to fetch medical records" });
    }
  });

  // Analytics and reporting routes
  app.get('/api/analytics/dashboard', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      
      // Only admin and super-admin can access analytics
      if (!['admin', 'super-admin', 'department-head'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const appointments = await storage.getAppointments();
      const queueTokens = await storage.getQueueTokens();
      const departments = await storage.getDepartments();
      
      const analytics = {
        todayAppointments: appointments.filter(a => {
          const today = new Date();
          const aptDate = new Date(a.appointmentDate);
          return aptDate.toDateString() === today.toDateString();
        }).length,
        totalPatients: (await storage.getPatients()).length,
        activeQueues: queueTokens.filter(q => q.status === 'waiting').length,
        activeDepartments: departments.length
      };
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Admin Dashboard API endpoints
  app.get('/api/admin/dashboard-stats', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Mock comprehensive dashboard statistics
      const stats = {
        systemOverview: {
          totalUsers: 156,
          activeUsers: 142,
          totalPatients: 1248,
          totalDoctors: 34,
          totalNurses: 67,
          totalStaff: 89,
          systemUptime: "99.8%",
          lastBackup: new Date().toISOString(),
          storageUsed: "2.4 GB",
          storageLimit: "10 GB"
        },
        userActivity: {
          todayLogins: 45,
          weeklyActive: 128,
          monthlyActive: 156,
          newRegistrations: 8,
          roleDistribution: {
            patient: 1020,
            doctor: 34,
            nurse: 67,
            "front-desk": 12,
            admin: 8,
            "super-admin": 2,
            insurance: 5,
            pharmacy: 4,
            "department-head": 3,
            ssd: 1
          }
        },
        operationalMetrics: {
          todayAppointments: 89,
          pendingAppointments: 23,
          completedAppointments: 156,
          cancelledAppointments: 12,
          queueLength: 15,
          averageWaitTime: "12 minutes",
          totalRevenue: 245000,
          monthlyRevenue: 1200000
        },
        securityMetrics: {
          failedLogins: 3,
          securityAlerts: 0,
          suspiciousActivity: 1,
          blockedIPs: 2,
          auditLogEntries: 1247
        },
        departmentStats: [
          { name: "Cardiology", patients: 45, staff: 12, occupancy: 78 },
          { name: "Emergency", patients: 23, staff: 18, occupancy: 92 },
          { name: "Orthopedics", patients: 31, staff: 8, occupancy: 65 },
          { name: "Pediatrics", patients: 28, staff: 10, occupancy: 70 },
          { name: "Neurology", patients: 19, staff: 6, occupancy: 55 }
        ]
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  app.get('/api/admin/users', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { role, search, page = 1, limit = 10 } = req.query;

      // Mock user data with pagination
      const mockUsers = [
        {
          id: "1",
          email: "john.doctor@hospital.com",
          firstName: "John",
          lastName: "Smith",
          role: "doctor",
          department: "Cardiology",
          specialization: "Interventional Cardiology",
          isActive: true,
          createdAt: "2025-01-15T10:00:00Z",
          lastLogin: "2025-07-31T10:30:00Z",
          loginCount: 145
        },
        {
          id: "2",
          email: "sarah.nurse@hospital.com",
          firstName: "Sarah",
          lastName: "Johnson",
          role: "nurse",
          department: "Emergency",
          isActive: true,
          createdAt: "2025-02-01T09:00:00Z",
          lastLogin: "2025-07-31T09:15:00Z",
          loginCount: 89
        },
        {
          id: "3",
          email: "mike.admin@hospital.com",
          firstName: "Mike",
          lastName: "Wilson",
          role: "admin",
          department: "Administration",
          isActive: true,
          createdAt: "2025-01-01T08:00:00Z",
          lastLogin: "2025-07-31T08:45:00Z",
          loginCount: 234
        },
        {
          id: "4",
          email: "patient@hospital.com",
          firstName: "Jane",
          lastName: "Doe",
          role: "patient",
          isActive: true,
          createdAt: "2025-07-31T12:00:00Z",
          lastLogin: "2025-07-31T12:00:00Z",
          loginCount: 1
        },
        {
          id: "5",
          email: "dr.emily@hospital.com",
          firstName: "Emily",
          lastName: "Chen",
          role: "doctor",
          department: "Neurology",
          specialization: "Neurological Surgery",
          isActive: true,
          createdAt: "2025-03-10T11:00:00Z",
          lastLogin: "2025-07-30T16:20:00Z",
          loginCount: 67
        }
      ];

      let filteredUsers = mockUsers;

      // Apply filters
      if (role && role !== 'all') {
        filteredUsers = filteredUsers.filter(u => u.role === role);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = filteredUsers.filter(u => 
          u.firstName.toLowerCase().includes(searchLower) ||
          u.lastName.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          (u.department && u.department.toLowerCase().includes(searchLower))
        );
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(startIndex, startIndex + parseInt(limit));

      res.json({
        users: paginatedUsers,
        totalCount: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/audit-logs', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const { page = 1, limit = 20, action, userId } = req.query;

      // Mock audit log data
      const mockLogs = [
        {
          id: 1,
          userId: "system",
          action: "USER_LOGIN",
          resourceType: "user",
          resourceId: "1",
          ipAddress: "192.168.1.100",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          timestamp: "2025-07-31T10:30:00Z",
          success: true,
          details: "User john.doctor@hospital.com logged in successfully"
        },
        {
          id: 2,
          userId: "3",
          action: "ROLE_UPDATED",
          resourceType: "user",
          resourceId: "4",
          ipAddress: "192.168.1.101",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          timestamp: "2025-07-31T09:45:00Z",
          success: true,
          details: "Role changed from patient to doctor by admin"
        },
        {
          id: 3,
          userId: "2",
          action: "PATIENT_ACCESS",
          resourceType: "patient",
          resourceId: "P001",
          ipAddress: "192.168.1.102",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          timestamp: "2025-07-31T09:15:00Z",
          success: true,
          details: "Accessed patient medical records"
        },
        {
          id: 4,
          userId: "unknown",
          action: "FAILED_LOGIN",
          resourceType: "user",
          resourceId: "unknown",
          ipAddress: "192.168.1.200",
          userAgent: "curl/7.68.0",
          timestamp: "2025-07-31T08:30:00Z",
          success: false,
          details: "Failed login attempt for non-existent user"
        }
      ];

      let filteredLogs = mockLogs;

      if (action) {
        filteredLogs = filteredLogs.filter(log => log.action === action);
      }

      if (userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === userId);
      }

      const startIndex = (page - 1) * limit;
      const paginatedLogs = filteredLogs.slice(startIndex, startIndex + parseInt(limit));

      res.json({
        logs: paginatedLogs,
        totalCount: filteredLogs.length,
        totalPages: Math.ceil(filteredLogs.length / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get('/api/admin/system-health', isDemoAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !["admin", "super-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const systemHealth = {
        overall: "healthy",
        services: [
          { name: "Database", status: "healthy", uptime: "99.9%", responseTime: "12ms" },
          { name: "Authentication", status: "healthy", uptime: "99.8%", responseTime: "25ms" },
          { name: "File Storage", status: "healthy", uptime: "99.7%", responseTime: "45ms" },
          { name: "Email Service", status: "warning", uptime: "98.5%", responseTime: "150ms" },
          { name: "Backup Service", status: "healthy", uptime: "99.9%", responseTime: "8ms" }
        ],
        metrics: {
          cpuUsage: 45,
          memoryUsage: 67,
          diskUsage: 23,
          networkLatency: 12
        },
        alerts: [
          {
            id: 1,
            level: "warning",
            message: "Email service response time is elevated",
            timestamp: "2025-07-31T09:00:00Z"
          }
        ]
      };

      res.json(systemHealth);
    } catch (error) {
      console.error("Error fetching system health:", error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Global error handler
  app.use((error: any, req: any, res: any, next: any) => {
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      timestamp: new Date().toISOString(),
    });

    // Handle validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: error.errors?.map((err: any) => ({
          field: err.path?.join('.'),
          message: err.message,
        })) || [],
      });
    }

    // Handle database errors
    if (error.message?.includes('duplicate key value')) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Resource already exists',
      });
    }

    if (error.message?.includes('foreign key constraint')) {
      return res.status(400).json({
        error: 'Invalid Reference',
        message: 'Referenced resource does not exist',
      });
    }

    // Handle operational errors
    if (error.statusCode && error.isOperational) {
      return res.status(error.statusCode).json({
        error: error.name || 'Error',
        message: error.message,
      });
    }

    // Handle unexpected errors
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : error.message,
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
