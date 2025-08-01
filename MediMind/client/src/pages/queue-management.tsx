import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Users, 
  QrCode, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Timer,
  Building,
  User,
  Phone
} from "lucide-react";
import RoleBasedLayout from "@/components/RoleBasedLayout";

interface QueueToken {
  id: number;
  tokenNumber: string;
  patientId: string;
  patientName: string;
  department: string;
  priority: "low" | "normal" | "high" | "emergency";
  status: "waiting" | "called" | "in-progress" | "completed" | "missed";
  estimatedWaitTime: string;
  createdAt: string;
  phone?: string;
}

export default function QueueManagement() {

  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Mock queue data
  const queueData = {
    overview: {
      totalInQueue: 45,
      averageWaitTime: "15 minutes",
      completedToday: 234,
      missedTokens: 8
    },
    departments: [
      { name: "Emergency", waiting: 12, inProgress: 3, avgWait: "5 min" },
      { name: "Cardiology", waiting: 8, inProgress: 2, avgWait: "20 min" },
      { name: "Orthopedics", waiting: 15, inProgress: 1, avgWait: "25 min" },
      { name: "Pediatrics", waiting: 6, inProgress: 2, avgWait: "10 min" },
      { name: "Neurology", waiting: 4, inProgress: 1, avgWait: "30 min" }
    ],
    currentQueue: [
      {
        id: 1,
        tokenNumber: "E001",
        patientId: "P12345",
        patientName: "John Smith",
        department: "Emergency",
        priority: "emergency" as const,
        status: "in-progress" as const,
        estimatedWaitTime: "Now",
        createdAt: "2025-07-31T10:30:00Z",
        phone: "+91 98765 43210"
      },
      {
        id: 2,
        tokenNumber: "C002",
        patientId: "P12346",
        patientName: "Sarah Johnson",
        department: "Cardiology",
        priority: "high" as const,
        status: "called" as const,
        estimatedWaitTime: "2 minutes",
        createdAt: "2025-07-31T10:15:00Z",
        phone: "+91 98765 43211"
      },
      {
        id: 3,
        tokenNumber: "O003",
        patientId: "P12347",
        patientName: "Mike Wilson",
        department: "Orthopedics",
        priority: "normal" as const,
        status: "waiting" as const,
        estimatedWaitTime: "15 minutes",
        createdAt: "2025-07-31T10:00:00Z",
        phone: "+91 98765 43212"
      },
      {
        id: 4,
        tokenNumber: "P004",
        patientId: "P12348",
        patientName: "Emma Davis",
        department: "Pediatrics",
        priority: "normal" as const,
        status: "waiting" as const,
        estimatedWaitTime: "20 minutes",
        createdAt: "2025-07-31T09:45:00Z",
        phone: "+91 98765 43213"
      },
      {
        id: 5,
        tokenNumber: "N005",
        patientId: "P12349",
        patientName: "Robert Brown",
        department: "Neurology",
        priority: "low" as const,
        status: "waiting" as const,
        estimatedWaitTime: "35 minutes",
        createdAt: "2025-07-31T09:30:00Z",
        phone: "+91 98765 43214"
      }
    ]
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "emergency": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "normal": return "bg-blue-100 text-blue-800";
      case "low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-progress": return "bg-green-100 text-green-800";
      case "called": return "bg-yellow-100 text-yellow-800";
      case "waiting": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "missed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in-progress": return <CheckCircle className="h-4 w-4" />;
      case "called": return <AlertCircle className="h-4 w-4" />;
      case "waiting": return <Clock className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "missed": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold">Queue Management</h1>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button className="flex items-center">
              <QrCode className="h-4 w-4 mr-2" />
              Generate Token
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total in Queue</p>
                  <p className="text-2xl font-bold text-blue-600">{queueData.overview.totalInQueue}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
                  <p className="text-2xl font-bold text-orange-600">{queueData.overview.averageWaitTime}</p>
                </div>
                <Timer className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold text-green-600">{queueData.overview.completedToday}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Missed Tokens</p>
                  <p className="text-2xl font-bold text-red-600">{queueData.overview.missedTokens}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Overview Section */}
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Department Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {queueData.departments.map((dept) => (
                      <div key={dept.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Building className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{dept.name}</p>
                            <p className="text-sm text-gray-600">Avg: {dept.avgWait}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-600">{dept.waiting}</p>
                            <p className="text-xs text-gray-600">Waiting</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">{dept.inProgress}</p>
                            <p className="text-xs text-gray-600">In Progress</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Queue Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Queue Efficiency</span>
                        <span className="text-sm text-gray-600">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Patient Satisfaction</span>
                        <span className="text-sm text-gray-600">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">On-Time Performance</span>
                        <span className="text-sm text-gray-600">78%</span>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
        </div>

        {/* Departments Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Department Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {queueData.departments.map((dept) => (
                <Card key={dept.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      {dept.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{dept.waiting}</p>
                          <p className="text-sm text-gray-600">Waiting</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{dept.inProgress}</p>
                          <p className="text-sm text-gray-600">In Progress</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">Average Wait: {dept.avgWait}</p>
                      </div>
                      <Button className="w-full">
                        View Department Queue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </div>

        {/* Live Queue Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Live Queue Status</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Live Queue Status</span>
                  <Badge variant="outline" className="text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Live Updates
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {queueData.currentQueue.map((token) => (
                    <div key={token.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="font-bold text-blue-600">{token.tokenNumber}</span>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold">{token.patientName}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Patient ID: {token.patientId}</span>
                            <span className="flex items-center">
                              <Building className="h-3 w-3 mr-1" />
                              {token.department}
                            </span>
                            {token.phone && (
                              <span className="flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {token.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">{token.estimatedWaitTime}</p>
                          <p className="text-sm text-gray-600">Est. wait</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(token.priority)}>
                            {token.priority}
                          </Badge>
                          <Badge className={getStatusColor(token.status)}>
                            {getStatusIcon(token.status)}
                            <span className="ml-1">{token.status}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex space-x-2">
                          {token.status === "waiting" && (
                            <Button size="sm">Call Next</Button>
                          )}
                          {token.status === "called" && (
                            <Button size="sm" variant="outline">Mark Complete</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </RoleBasedLayout>
  );
}