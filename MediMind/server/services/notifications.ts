import { storage } from "../storage";

export interface NotificationService {
  sendSMS(phoneNumber: string, message: string): Promise<boolean>;
  sendEmail(email: string, subject: string, message: string): Promise<boolean>;
  sendWhatsApp(phoneNumber: string, message: string): Promise<boolean>;
}

export class MockNotificationService implements NotificationService {
  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    // Mock Twilio integration
    console.log(`SMS to ${phoneNumber}: ${message}`);
    
    // In production, integrate with Twilio:
    // const twilio = require('twilio')(accountSid, authToken);
    // await twilio.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber
    // });
    
    return true;
  }

  async sendEmail(email: string, subject: string, message: string): Promise<boolean> {
    // Mock email integration
    console.log(`Email to ${email}: ${subject} - ${message}`);
    
    // In production, integrate with SMTP/Gmail:
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransporter({...});
    // await transporter.sendMail({ to: email, subject, text: message });
    
    return true;
  }

  async sendWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
    // Mock WhatsApp integration via Twilio
    console.log(`WhatsApp to ${phoneNumber}: ${message}`);
    
    // In production:
    // await twilio.messages.create({
    //   body: message,
    //   from: 'whatsapp:+14155238886',
    //   to: `whatsapp:${phoneNumber}`
    // });
    
    return true;
  }
}

export class NotificationManager {
  private service: NotificationService;

  constructor() {
    this.service = new MockNotificationService();
  }

  async notifyAppointmentConfirmation(
    userId: string,
    appointmentDetails: any
  ): Promise<void> {
    const message = `Your appointment is confirmed for ${appointmentDetails.date} with ${appointmentDetails.doctor}. Token: ${appointmentDetails.token}`;
    
    await storage.createNotification({
      userId,
      title: "Appointment Confirmed",
      message,
      type: "success"
    });

    // Send SMS/WhatsApp notification if phone number available
    // const patient = await storage.getPatientByUserId(userId);
    // if (patient?.phoneNumber) {
    //   await this.service.sendSMS(patient.phoneNumber, message);
    // }
  }

  async notifyQueueUpdate(
    userId: string,
    tokenNumber: string,
    estimatedWaitTime: number
  ): Promise<void> {
    const message = `Token ${tokenNumber}: Estimated wait time is ${estimatedWaitTime} minutes. You're next in line!`;
    
    await storage.createNotification({
      userId,
      title: "Queue Update",
      message,
      type: "info"
    });
  }

  async notifyEmergency(
    userIds: string[],
    emergencyType: string,
    details: string
  ): Promise<void> {
    const message = `Emergency Alert: ${emergencyType} - ${details}`;
    
    for (const userId of userIds) {
      await storage.createNotification({
        userId,
        title: "Emergency Alert",
        message,
        type: "error"
      });
    }
  }

  async notifyPaymentDue(
    userId: string,
    amount: number,
    dueDate: string
  ): Promise<void> {
    const message = `Payment of ₹${amount} is due by ${dueDate}. Please complete payment to avoid service interruption.`;
    
    await storage.createNotification({
      userId,
      title: "Payment Due",
      message,
      type: "warning"
    });
  }
}

export const notificationManager = new NotificationManager();
