import { storage } from "../storage";
import { type InsertQueueToken } from "@shared/schema";

export interface QueueStatus {
  departmentId: number;
  departmentName: string;
  currentToken: string;
  waitingCount: number;
  averageWaitTime: number;
  estimatedWaitTime: number;
}

export class QueueManager {
  async generateToken(
    patientId: number,
    departmentId: number,
    doctorId?: number,
    priority: number = 1
  ): Promise<string> {
    // Generate token number based on department code and sequence
    const tokenPrefix = await this.getDepartmentPrefix(departmentId);
    const sequence = await this.getNextSequence(departmentId);
    const tokenNumber = `${tokenPrefix}${sequence.toString().padStart(3, '0')}`;

    // Create QR code data
    const qrData = JSON.stringify({
      token: tokenNumber,
      patientId,
      departmentId,
      timestamp: new Date().toISOString()
    });

    const tokenData: InsertQueueToken = {
      tokenNumber,
      patientId,
      departmentId,
      doctorId,
      priority,
      qrCode: qrData,
      estimatedWaitTime: await this.calculateWaitTime(departmentId, priority)
    };

    await storage.createQueueToken(tokenData);
    return tokenNumber;
  }

  async getQueueStatus(departmentId?: number): Promise<QueueStatus[]> {
    const departments = await storage.getDepartments();
    const statusList: QueueStatus[] = [];

    for (const dept of departments) {
      if (departmentId && dept.id !== departmentId) continue;

      const activeQueue = await storage.getActiveQueueByDepartment(dept.id);
      const waitingCount = activeQueue.length;
      const averageWaitTime = await this.calculateAverageWaitTime(dept.id);
      
      statusList.push({
        departmentId: dept.id,
        departmentName: dept.name,
        currentToken: activeQueue[0]?.tokenNumber || "None",
        waitingCount,
        averageWaitTime,
        estimatedWaitTime: waitingCount * averageWaitTime
      });
    }

    return statusList;
  }

  async callNextToken(departmentId: number, doctorId?: number): Promise<string | null> {
    const queue = await storage.getActiveQueueByDepartment(departmentId);
    
    if (queue.length === 0) return null;

    const nextToken = queue[0];
    await storage.updateQueueTokenStatus(nextToken.id, "called");

    // Create notification for patient
    if (nextToken.patientId) {
      const patient = await storage.getPatients();
      const patientData = patient.find(p => p.id === nextToken.patientId);
      
      if (patientData?.userId) {
        await storage.createNotification({
          userId: patientData.userId,
          title: "Your Turn!",
          message: `Token ${nextToken.tokenNumber} is now being called. Please proceed to the consultation room.`,
          type: "info"
        });
      }
    }

    return nextToken.tokenNumber;
  }

  private async getDepartmentPrefix(departmentId: number): Promise<string> {
    const departments = await storage.getDepartments();
    const dept = departments.find(d => d.id === departmentId);
    return dept?.code || "GEN";
  }

  private async getNextSequence(departmentId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTokens = await storage.getQueueTokens();
    const deptTokensToday = todayTokens.filter(t => 
      t.departmentId === departmentId && 
      t.createdAt && 
      new Date(t.createdAt) >= today
    );
    
    return deptTokensToday.length + 1;
  }

  private async calculateWaitTime(departmentId: number, priority: number): Promise<number> {
    const baseWaitTime = 15; // 15 minutes base
    const priorityMultiplier = priority === 3 ? 0.5 : priority === 2 ? 0.7 : 1;
    const queueLength = (await storage.getActiveQueueByDepartment(departmentId)).length;
    
    return Math.round(baseWaitTime * priorityMultiplier * (queueLength + 1));
  }

  private async calculateAverageWaitTime(departmentId: number): Promise<number> {
    // Simple calculation - in production this would analyze historical data
    const queueLength = (await storage.getActiveQueueByDepartment(departmentId)).length;
    return Math.max(10, 15 - queueLength); // Decrease wait time as queue shortens
  }
}

export const queueManager = new QueueManager();
