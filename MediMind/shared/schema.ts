import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  serial,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("patient"), // patient, doctor, nurse, front-desk, admin, super-admin, insurance, pharmacy, department-head, ssd
  department: varchar("department"),
  specialization: varchar("specialization"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Departments table
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Doctors table
export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  departmentId: integer("department_id").references(() => departments.id),
  licenseNumber: varchar("license_number"),
  specialization: varchar("specialization"),
  consultationFee: integer("consultation_fee"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Patients table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  patientId: varchar("patient_id").unique().notNull(),
  aadhaarNumber: varchar("aadhaar_number"),
  panNumber: varchar("pan_number"),
  phoneNumber: varchar("phone_number"),
  address: text("address"),
  emergencyContact: varchar("emergency_contact"),
  bloodGroup: varchar("blood_group"),
  dateOfBirth: timestamp("date_of_birth"),
  gender: varchar("gender"),
  insuranceProvider: varchar("insurance_provider"),
  insuranceNumber: varchar("insurance_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  departmentId: integer("department_id").references(() => departments.id),
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentType: varchar("appointment_type").default("consultation"), // consultation, follow-up, emergency
  status: varchar("status").default("scheduled"), // scheduled, in-progress, completed, cancelled
  notes: text("notes"),
  symptoms: text("symptoms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Queue management table
export const queueTokens = pgTable("queue_tokens", {
  id: serial("id").primaryKey(),
  tokenNumber: varchar("token_number").notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  departmentId: integer("department_id").references(() => departments.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  priority: integer("priority").default(1), // 1=normal, 2=urgent, 3=emergency
  status: varchar("status").default("waiting"), // waiting, called, in-progress, completed
  estimatedWaitTime: integer("estimated_wait_time"),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").defaultNow(),
  calledAt: timestamp("called_at"),
  completedAt: timestamp("completed_at"),
});

// Enhanced Medical records table with comprehensive EMR features
export const medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  recordType: varchar("record_type", { length: 50 }).notNull().default("consultation"), // consultation, lab-result, prescription, diagnosis, surgery, vaccination, imaging, discharge
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  diagnosis: text("diagnosis"),
  prescription: text("prescription"),
  labReports: jsonb("lab_reports"),
  vitals: jsonb("vitals"),
  attachments: jsonb("attachments"),
  status: varchar("status").default("active"), // active, completed, pending, cancelled
  recordDate: timestamp("record_date").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Enhanced EMR fields
  chiefComplaint: text("chief_complaint"),
  historyOfPresentIllness: text("history_of_present_illness"),
  pastMedicalHistory: jsonb("past_medical_history"),
  familyHistory: jsonb("family_history"),
  socialHistory: jsonb("social_history"),
  reviewOfSystems: jsonb("review_of_systems"),
  physicalExamination: jsonb("physical_examination"),
  assessmentAndPlan: text("assessment_and_plan"),
  followUpInstructions: text("follow_up_instructions"),
  icd10Codes: jsonb("icd10_codes"), // ICD-10 diagnosis codes
  cptCodes: jsonb("cpt_codes"), // CPT procedure codes
  severity: varchar("severity").default("low"), // low, medium, high, critical
  isConfidential: boolean("is_confidential").default(false),
  clinicalImpressions: text("clinical_impressions"),
});

// Lab results table for detailed lab data
export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  medicalRecordId: integer("medical_record_id").references(() => medicalRecords.id),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  labTestName: varchar("lab_test_name").notNull(),
  testCode: varchar("test_code"),
  category: varchar("category").notNull(), // hematology, biochemistry, microbiology, pathology
  specimen: varchar("specimen"), // blood, urine, saliva, tissue
  results: jsonb("results"), // Array of test components with values, ranges, status
  referenceRanges: jsonb("reference_ranges"),
  abnormalFlags: jsonb("abnormal_flags"),
  units: varchar("units"),
  methodology: varchar("methodology"),
  status: varchar("status").default("pending"), // pending, in-progress, completed, cancelled
  collectionDate: timestamp("collection_date"),
  reportDate: timestamp("report_date"),
  verifiedBy: varchar("verified_by"),
  criticalValues: boolean("critical_values").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Imaging studies table
export const imagingStudies = pgTable("imaging_studies", {
  id: serial("id").primaryKey(),
  medicalRecordId: integer("medical_record_id").references(() => medicalRecords.id),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  studyType: varchar("study_type").notNull(), // x-ray, ct, mri, ultrasound, mammography
  bodyPart: varchar("body_part"),
  indication: text("indication"),
  technique: text("technique"),
  findings: text("findings"),
  impression: text("impression"),
  recommendations: text("recommendations"),
  imageUrls: jsonb("image_urls"),
  dicomId: varchar("dicom_id"),
  radiologist: varchar("radiologist"),
  status: varchar("status").default("pending"), // pending, in-progress, completed, reported
  studyDate: timestamp("study_date"),
  reportDate: timestamp("report_date"),
  priority: varchar("priority").default("routine"), // stat, urgent, routine
  contrast: boolean("contrast").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Medications and prescriptions table
export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  medicalRecordId: integer("medical_record_id").references(() => medicalRecords.id),
  patientId: integer("patient_id").references(() => patients.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  medicationName: varchar("medication_name").notNull(),
  genericName: varchar("generic_name"),
  brandName: varchar("brand_name"),
  dosage: varchar("dosage").notNull(),
  frequency: varchar("frequency").notNull(),
  route: varchar("route").notNull(), // oral, injection, topical, inhalation
  duration: varchar("duration"),
  quantity: integer("quantity"),
  refills: integer("refills"),
  instructions: text("instructions"),
  indication: text("indication"),
  sideEffects: jsonb("side_effects"),
  contraindications: jsonb("contraindications"),
  interactions: jsonb("interactions"),
  status: varchar("status").default("active"), // active, discontinued, completed, on-hold
  prescribedDate: timestamp("prescribed_date").defaultNow(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  pharmacyNotes: text("pharmacy_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clinical notes and progress notes
export const clinicalNotes = pgTable("clinical_notes", {
  id: serial("id").primaryKey(),
  medicalRecordId: integer("medical_record_id").references(() => medicalRecords.id),
  patientId: integer("patient_id").references(() => patients.id),
  authorId: varchar("author_id").references(() => users.id),
  noteType: varchar("note_type").notNull(), // progress, consultation, discharge, admission
  subjective: text("subjective"), // SOAP format
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  content: text("content"),
  isAmended: boolean("is_amended").default(false),
  amendmentReason: text("amendment_reason"),
  originalNoteId: integer("original_note_id"),
  signedBy: varchar("signed_by"),
  signedAt: timestamp("signed_at"),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vital signs tracking
export const vitalSigns = pgTable("vital_signs", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  medicalRecordId: integer("medical_record_id").references(() => medicalRecords.id),
  recordedBy: varchar("recorded_by").references(() => users.id),
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  oxygenSaturation: decimal("oxygen_saturation", { precision: 5, scale: 2 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  height: decimal("height", { precision: 5, scale: 2 }),
  bmi: decimal("bmi", { precision: 4, scale: 1 }),
  painScale: integer("pain_scale"), // 0-10 scale
  glucoseLevel: integer("glucose_level"),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Allergies and adverse reactions
export const allergiesAndReactions = pgTable("allergies_and_reactions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  allergen: varchar("allergen").notNull(),
  allergenType: varchar("allergen_type").notNull(), // drug, food, environmental, other
  reaction: text("reaction").notNull(),
  severity: varchar("severity").notNull(), // mild, moderate, severe, life-threatening
  onsetDate: timestamp("onset_date"),
  status: varchar("status").default("active"), // active, inactive, resolved
  verifiedBy: varchar("verified_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Problem list for chronic conditions
export const problemList = pgTable("problem_list", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  problem: varchar("problem").notNull(),
  icd10Code: varchar("icd10_code"),
  status: varchar("status").default("active"), // active, inactive, resolved
  onsetDate: timestamp("onset_date"),
  resolvedDate: timestamp("resolved_date"),
  severity: varchar("severity"), // mild, moderate, severe
  managingPhysician: varchar("managing_physician").references(() => users.id),
  treatmentPlan: text("treatment_plan"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").default("info"), // info, warning, error, success
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Chat history table
export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  message: text("message").notNull(),
  response: text("response"),
  intent: varchar("intent"),
  confidence: integer("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type QueueToken = typeof queueTokens.$inferSelect;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type LabResult = typeof labResults.$inferSelect;
export type ImagingStudy = typeof imagingStudies.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type ClinicalNote = typeof clinicalNotes.$inferSelect;
export type VitalSigns = typeof vitalSigns.$inferSelect;
export type AllergyAndReaction = typeof allergiesAndReactions.$inferSelect;
export type Problem = typeof problemList.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ChatHistory = typeof chatHistory.$inferSelect;

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertDepartmentSchema = createInsertSchema(departments);
export const insertDoctorSchema = createInsertSchema(doctors);
export const insertPatientSchema = createInsertSchema(patients);
export const insertAppointmentSchema = createInsertSchema(appointments);
export const insertQueueTokenSchema = createInsertSchema(queueTokens);
export const insertMedicalRecordSchema = createInsertSchema(medicalRecords);
export const insertLabResultSchema = createInsertSchema(labResults);
export const insertImagingStudySchema = createInsertSchema(imagingStudies);
export const insertMedicationSchema = createInsertSchema(medications);
export const insertClinicalNoteSchema = createInsertSchema(clinicalNotes);
export const insertVitalSignsSchema = createInsertSchema(vitalSigns);
export const insertAllergySchema = createInsertSchema(allergiesAndReactions);
export const insertProblemSchema = createInsertSchema(problemList);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertChatHistorySchema = createInsertSchema(chatHistory);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type InsertQueueToken = z.infer<typeof insertQueueTokenSchema>;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type InsertImagingStudy = z.infer<typeof insertImagingStudySchema>;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type InsertClinicalNote = z.infer<typeof insertClinicalNoteSchema>;
export type InsertVitalSigns = z.infer<typeof insertVitalSignsSchema>;
export type InsertAllergy = z.infer<typeof insertAllergySchema>;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertChatHistory = z.infer<typeof insertChatHistorySchema>;

// HIPAA Compliance Tables

// Audit logs table for HIPAA compliance
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(), // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  resourceType: varchar("resource_type"), // medical-records, patients, appointments, etc.
  resourceId: varchar("resource_id"),
  patientId: integer("patient_id").references(() => patients.id),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id"),
  timestamp: timestamp("timestamp").defaultNow(),
  success: boolean("success").notNull(),
  details: jsonb("details"), // Additional context about the action
  riskLevel: varchar("risk_level").default("low"), // low, medium, high
});

// Patient consent records
export const patientConsents = pgTable("patient_consents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  consentType: varchar("consent_type").notNull(), // treatment, payment, operations, marketing, research
  granted: boolean("granted").notNull(),
  details: text("details"),
  recordedBy: varchar("recorded_by").references(() => users.id),
  recordedAt: timestamp("recorded_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  ipAddress: varchar("ip_address"),
  digitalSignature: text("digital_signature"),
});

// Data access logs for tracking PHI access
export const dataAccessLogs = pgTable("data_access_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  patientId: integer("patient_id").references(() => patients.id),
  dataType: varchar("data_type"), // medical-records, lab-results, imaging, etc.
  accessType: varchar("access_type"), // read, export, print, email
  purpose: varchar("purpose"), // treatment, payment, operations, research
  timestamp: timestamp("timestamp").defaultNow(),
  ipAddress: varchar("ip_address"),
  duration: integer("duration"), // seconds
  recordsAccessed: integer("records_accessed"),
});

// Security incidents and breach notifications
export const securityIncidents = pgTable("security_incidents", {
  id: serial("id").primaryKey(),
  incidentType: varchar("incident_type").notNull(), // breach, unauthorized_access, system_error
  severity: varchar("severity").notNull(), // low, medium, high, critical
  description: text("description").notNull(),
  affectedPatients: integer("affected_patients"),
  detectedAt: timestamp("detected_at").defaultNow(),
  reportedAt: timestamp("reported_at"),
  resolvedAt: timestamp("resolved_at"),
  reportedBy: varchar("reported_by").references(() => users.id),
  status: varchar("status").default("open"), // open, investigating, resolved, closed
  mitigationSteps: text("mitigation_steps"),
  notificationsSent: boolean("notifications_sent").default(false),
});

// Data retention tracking
export const dataRetentionLog = pgTable("data_retention_log", {
  id: serial("id").primaryKey(),
  recordType: varchar("record_type").notNull(),
  recordId: varchar("record_id").notNull(),
  createdAt: timestamp("created_at").notNull(),
  retentionPeriod: integer("retention_period"), // days
  scheduledDeletion: timestamp("scheduled_deletion"),
  status: varchar("status").default("active"), // active, archived, deleted
  lastReviewed: timestamp("last_reviewed"),
  legalHold: boolean("legal_hold").default(false),
});

// Business Associate Agreements tracking
export const businessAssociates = pgTable("business_associates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  services: text("services"), // Description of services provided
  agreementDate: timestamp("agreement_date"),
  expirationDate: timestamp("expiration_date"),
  status: varchar("status").default("active"), // active, expired, terminated
  complianceStatus: varchar("compliance_status").default("compliant"), // compliant, non-compliant, under_review
  lastAudit: timestamp("last_audit"),
  nextAudit: timestamp("next_audit"),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type PatientConsent = typeof patientConsents.$inferSelect;
export type DataAccessLog = typeof dataAccessLogs.$inferSelect;
export type SecurityIncident = typeof securityIncidents.$inferSelect;
export type DataRetentionLog = typeof dataRetentionLog.$inferSelect;
export type BusinessAssociate = typeof businessAssociates.$inferSelect;

export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertPatientConsentSchema = createInsertSchema(patientConsents);
export const insertDataAccessLogSchema = createInsertSchema(dataAccessLogs);
export const insertSecurityIncidentSchema = createInsertSchema(securityIncidents);
export const insertDataRetentionLogSchema = createInsertSchema(dataRetentionLog);
export const insertBusinessAssociateSchema = createInsertSchema(businessAssociates);

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type InsertPatientConsent = z.infer<typeof insertPatientConsentSchema>;
export type InsertDataAccessLog = z.infer<typeof insertDataAccessLogSchema>;
export type InsertSecurityIncident = z.infer<typeof insertSecurityIncidentSchema>;
export type InsertDataRetentionLog = z.infer<typeof insertDataRetentionLogSchema>;
export type InsertBusinessAssociate = z.infer<typeof insertBusinessAssociateSchema>;

// Payment and Billing Tables

// Payment transactions
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  transactionId: varchar("transaction_id").unique().notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  gateway: varchar("gateway").notNull(), // stripe, razorpay, paypal
  amount: integer("amount").notNull(), // Amount in cents
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: varchar("status").notNull(), // pending, succeeded, failed, refunded
  description: text("description"),
  fees: integer("fees"), // Gateway fees in cents
  customerId: varchar("customer_id"), // Gateway customer ID
  paymentMethodId: varchar("payment_method_id"),
  metadata: jsonb("metadata"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment refunds
export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => payments.id),
  refundId: varchar("refund_id").unique().notNull(),
  amount: integer("amount").notNull(), // Refund amount in cents
  reason: varchar("reason"), // duplicate, fraudulent, requested_by_customer
  status: varchar("status").notNull(), // pending, succeeded, failed
  processedBy: varchar("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscriptions for recurring payments
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  subscriptionId: varchar("subscription_id").unique().notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  gateway: varchar("gateway").notNull(),
  planId: varchar("plan_id").notNull(),
  status: varchar("status").notNull(), // active, canceled, past_due, trialing
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  planId: varchar("plan_id").unique().notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  amount: integer("amount").notNull(), // Amount in cents
  currency: varchar("currency", { length: 3 }).default("USD"),
  interval: varchar("interval").notNull(), // month, year
  intervalCount: integer("interval_count").default(1),
  trialPeriodDays: integer("trial_period_days"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bills and invoices
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  billNumber: varchar("bill_number").unique().notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  totalAmount: integer("total_amount").notNull(), // Total in cents
  taxAmount: integer("tax_amount").default(0),
  discountAmount: integer("discount_amount").default(0),
  paidAmount: integer("paid_amount").default(0),
  status: varchar("status").default("pending"), // pending, paid, partially_paid, overdue, cancelled
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bill line items
export const billItems = pgTable("bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").references(() => bills.id),
  description: varchar("description").notNull(),
  quantity: integer("quantity").default(1),
  unitPrice: integer("unit_price").notNull(), // Price in cents
  totalPrice: integer("total_price").notNull(), // Total for this item in cents
  category: varchar("category"), // consultation, procedure, medication, lab, etc.
  serviceCode: varchar("service_code"), // CPT codes, ICD codes, etc.
});

// Payment methods (stored securely)
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  gateway: varchar("gateway").notNull(),
  paymentMethodId: varchar("payment_method_id").notNull(),
  type: varchar("type").notNull(), // card, bank_account, wallet
  last4: varchar("last_4"), // Last 4 digits for cards
  brand: varchar("brand"), // visa, mastercard, amex, etc.
  expiryMonth: integer("expiry_month"),
  expiryYear: integer("expiry_year"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insurance claims
export const insuranceClaims = pgTable("insurance_claims", {
  id: serial("id").primaryKey(),
  claimNumber: varchar("claim_number").unique().notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  billId: integer("bill_id").references(() => bills.id),
  insuranceProvider: varchar("insurance_provider"),
  policyNumber: varchar("policy_number"),
  claimAmount: integer("claim_amount").notNull(),
  approvedAmount: integer("approved_amount"),
  status: varchar("status").default("submitted"), // submitted, processing, approved, denied, paid
  submittedAt: timestamp("submitted_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  notes: text("notes"),
});

export type Payment = typeof payments.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type BillItem = typeof billItems.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsuranceClaim = typeof insuranceClaims.$inferSelect;

export const insertPaymentSchema = createInsertSchema(payments);
export const insertRefundSchema = createInsertSchema(refunds);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);
export const insertBillSchema = createInsertSchema(bills);
export const insertBillItemSchema = createInsertSchema(billItems);
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods);
export const insertInsuranceClaimSchema = createInsertSchema(insuranceClaims);

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type InsertInsuranceClaim = z.infer<typeof insertInsuranceClaimSchema>;
