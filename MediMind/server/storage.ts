import {
  users,
  departments,
  doctors,
  patients,
  appointments,
  queueTokens,
  medicalRecords,
  labResults,
  imagingStudies,
  medications,
  clinicalNotes,
  vitalSigns,
  allergiesAndReactions,
  problemList,
  notifications,
  chatHistory,
  type User,
  type UpsertUser,
  type Department,
  type Doctor,
  type Patient,
  type Appointment,
  type QueueToken,
  type MedicalRecord,
  type LabResult,
  type ImagingStudy,
  type Medication,
  type ClinicalNote,
  type VitalSigns,
  type AllergyAndReaction,
  type Problem,
  type Notification,
  type ChatHistory,
  type InsertDepartment,
  type InsertDoctor,
  type InsertPatient,
  type InsertAppointment,
  type InsertQueueToken,
  type InsertMedicalRecord,
  type InsertLabResult,
  type InsertImagingStudy,
  type InsertMedication,
  type InsertClinicalNote,
  type InsertVitalSigns,
  type InsertAllergy,
  type InsertProblem,
  type InsertNotification,
  type InsertChatHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, like, count, or } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail?(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Department operations
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  
  // Doctor operations
  getDoctors(): Promise<Doctor[]>;
  getDoctorsByDepartment(departmentId: number): Promise<Doctor[]>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  
  // Patient operations
  getPatients(): Promise<Patient[]>;
  getPatientByUserId(userId: string): Promise<Patient | undefined>;
  getPatientByPatientId(patientId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  searchPatients(query: string): Promise<Patient[]>;
  
  // Appointment operations
  getAppointments(): Promise<Appointment[]>;
  getAppointmentsByPatient(patientId: number): Promise<Appointment[]>;
  getAppointmentsByDoctor(doctorId: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string): Promise<Appointment>;
  
  // Queue operations
  getQueueTokens(): Promise<QueueToken[]>;
  getActiveQueueByDepartment(departmentId: number): Promise<QueueToken[]>;
  createQueueToken(token: InsertQueueToken): Promise<QueueToken>;
  updateQueueTokenStatus(id: number, status: string): Promise<QueueToken>;
  
  // Medical records
  getMedicalRecordsByPatient(patientId: number): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  
  // Notifications
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Chat history
  getChatHistory(userId: string): Promise<ChatHistory[]>;
  createChatHistory(chat: InsertChatHistory): Promise<ChatHistory>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Department operations
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).where(eq(departments.isActive, true));
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDept] = await db.insert(departments).values(department).returning();
    return newDept;
  }

  // Doctor operations
  async getDoctors(): Promise<Doctor[]> {
    return await db.select().from(doctors).where(eq(doctors.isAvailable, true));
  }

  async getDoctorsByDepartment(departmentId: number): Promise<Doctor[]> {
    return await db
      .select()
      .from(doctors)
      .where(and(eq(doctors.departmentId, departmentId), eq(doctors.isAvailable, true)));
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [newDoctor] = await db.insert(doctors).values(doctor).returning();
    return newDoctor;
  }

  async getDoctorByUserId(userId: string): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return doctor;
  }

  // Patient operations
  async getPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async getPatientByUserId(userId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, userId));
    return patient;
  }

  async getPatientByPatientId(patientId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.patientId, patientId));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async searchPatients(query: string): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(
        or(
          like(patients.patientId, `%${query}%`),
          like(patients.aadhaarNumber, `%${query}%`),
          like(patients.phoneNumber, `%${query}%`),
          like(patients.emergencyContact, `%${query}%`)
        )
      )
      .orderBy(desc(patients.createdAt));
  }

  async updatePatient(id: number, patientData: Partial<InsertPatient>): Promise<Patient> {
    const [updatedPatient] = await db
      .update(patients)
      .set(patientData)
      .where(eq(patients.id, id))
      .returning();
    return updatedPatient;
  }

  async deletePatient(id: number): Promise<void> {
    await db.delete(patients).where(eq(patients.id, id));
  }

  async getPatientById(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getPatientStatistics(): Promise<{
    totalPatients: number;
    newThisMonth: number;
    activeCases: number;
    todaysVisits: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const [totalPatients] = await db
      .select({ count: count() })
      .from(patients);

    const [newThisMonth] = await db
      .select({ count: count() })
      .from(patients)
      .where(gte(patients.createdAt, startOfMonth));

    const [activeCases] = await db
      .select({ count: count() })
      .from(appointments)
      .where(eq(appointments.status, "scheduled"));

    const [todaysVisits] = await db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, startOfDay),
          lte(appointments.appointmentDate, endOfDay),
          eq(appointments.status, "completed")
        )
      );

    return {
      totalPatients: totalPatients.count,
      newThisMonth: newThisMonth.count,
      activeCases: activeCases.count,
      todaysVisits: todaysVisits.count,
    };
  }

  // Appointment operations
  async getAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.appointmentDate));
  }

  async getAppointmentsByPatient(patientId: number): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.appointmentDate));
  }

  async getAppointmentsByDoctor(doctorId: number): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.doctorId, doctorId))
      .orderBy(desc(appointments.appointmentDate));
  }

  async getAppointmentsByDoctorAndDate(doctorId: number, date: string): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          gte(appointments.appointmentDate, startOfDay),
          lte(appointments.appointmentDate, endOfDay)
        )
      )
      .orderBy(appointments.appointmentDate);
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment> {
    const [updated] = await db
      .update(appointments)
      .set({ status })
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  // Queue operations
  async getQueueTokens(): Promise<QueueToken[]> {
    return await db.select().from(queueTokens).orderBy(desc(queueTokens.createdAt));
  }

  async getActiveQueueByDepartment(departmentId: number): Promise<QueueToken[]> {
    return await db
      .select()
      .from(queueTokens)
      .where(
        and(
          eq(queueTokens.departmentId, departmentId),
          eq(queueTokens.status, "waiting")
        )
      )
      .orderBy(queueTokens.priority, queueTokens.createdAt);
  }

  async createQueueToken(token: InsertQueueToken): Promise<QueueToken> {
    const [newToken] = await db.insert(queueTokens).values(token).returning();
    return newToken;
  }

  async updateQueueTokenStatus(id: number, status: string): Promise<QueueToken> {
    const updateData: any = { status };
    if (status === "called") {
      updateData.calledAt = new Date();
    } else if (status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(queueTokens)
      .set(updateData)
      .where(eq(queueTokens.id, id))
      .returning();
    return updated;
  }

  // Medical records
  async getMedicalRecordsByPatient(patientId: number): Promise<MedicalRecord[]> {
    return await db
      .select()
      .from(medicalRecords)
      .where(eq(medicalRecords.patientId, patientId))
      .orderBy(desc(medicalRecords.createdAt));
  }

  async getAllMedicalRecords(): Promise<MedicalRecord[]> {
    return await db
      .select()
      .from(medicalRecords)
      .orderBy(desc(medicalRecords.createdAt));
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const [newRecord] = await db.insert(medicalRecords).values(record).returning();
    return newRecord;
  }

  // Lab Results
  async getLabResultsByPatient(patientId: number): Promise<LabResult[]> {
    return await db
      .select()
      .from(labResults)
      .where(eq(labResults.patientId, patientId))
      .orderBy(desc(labResults.createdAt));
  }

  async createLabResult(labResult: InsertLabResult): Promise<LabResult> {
    const [newResult] = await db.insert(labResults).values(labResult).returning();
    return newResult;
  }

  // Imaging Studies
  async getImagingStudiesByPatient(patientId: number): Promise<ImagingStudy[]> {
    return await db
      .select()
      .from(imagingStudies)
      .where(eq(imagingStudies.patientId, patientId))
      .orderBy(desc(imagingStudies.createdAt));
  }

  async createImagingStudy(study: InsertImagingStudy): Promise<ImagingStudy> {
    const [newStudy] = await db.insert(imagingStudies).values(study).returning();
    return newStudy;
  }

  // Medications
  async getMedicationsByPatient(patientId: number): Promise<Medication[]> {
    return await db
      .select()
      .from(medications)
      .where(eq(medications.patientId, patientId))
      .orderBy(desc(medications.createdAt));
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const [newMedication] = await db.insert(medications).values(medication).returning();
    return newMedication;
  }

  // Clinical Notes
  async getClinicalNotesByPatient(patientId: number): Promise<ClinicalNote[]> {
    return await db
      .select()
      .from(clinicalNotes)
      .where(eq(clinicalNotes.patientId, patientId))
      .orderBy(desc(clinicalNotes.createdAt));
  }

  async createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote> {
    const [newNote] = await db.insert(clinicalNotes).values(note).returning();
    return newNote;
  }

  // Vital Signs
  async getVitalSignsByPatient(patientId: number): Promise<VitalSigns[]> {
    return await db
      .select()
      .from(vitalSigns)
      .where(eq(vitalSigns.patientId, patientId))
      .orderBy(desc(vitalSigns.recordedAt));
  }

  async createVitalSigns(vitals: InsertVitalSigns): Promise<VitalSigns> {
    const [newVitals] = await db.insert(vitalSigns).values(vitals).returning();
    return newVitals;
  }

  // Allergies and Reactions
  async getAllergiesByPatient(patientId: number): Promise<AllergyAndReaction[]> {
    return await db
      .select()
      .from(allergiesAndReactions)
      .where(eq(allergiesAndReactions.patientId, patientId))
      .orderBy(desc(allergiesAndReactions.createdAt));
  }

  async createAllergy(allergy: InsertAllergy): Promise<AllergyAndReaction> {
    const [newAllergy] = await db.insert(allergiesAndReactions).values(allergy).returning();
    return newAllergy;
  }

  // Problem List
  async getProblemsByPatient(patientId: number): Promise<Problem[]> {
    return await db
      .select()
      .from(problemList)
      .where(eq(problemList.patientId, patientId))
      .orderBy(desc(problemList.createdAt));
  }

  async createProblem(problem: InsertProblem): Promise<Problem> {
    const [newProblem] = await db.insert(problemList).values(problem).returning();
    return newProblem;
  }

  // Notifications
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  // Chat history
  async getChatHistory(userId: string): Promise<ChatHistory[]> {
    return await db
      .select()
      .from(chatHistory)
      .where(eq(chatHistory.userId, userId))
      .orderBy(desc(chatHistory.createdAt));
  }

  async createChatHistory(chat: InsertChatHistory): Promise<ChatHistory> {
    const [newChat] = await db.insert(chatHistory).values(chat).returning();
    return newChat;
  }
}

export const storage = new DatabaseStorage();
