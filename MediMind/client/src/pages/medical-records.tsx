import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Activity, 
  AlertCircle,
  Download,
  Eye,
  Edit,
  Upload,
  Heart,
  Thermometer,
  Weight,
  Ruler
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RoleBasedLayout from "@/components/RoleBasedLayout";
import { User as UserType } from "@shared/schema";

interface MedicalRecord {
  id: number;
  patientId: number;
  patientName: string;
  recordType: "consultation" | "lab-result" | "prescription" | "diagnosis" | "surgery" | "vaccination";
  title: string;
  description: string;
  doctorName: string;
  department: string;
  recordDate: string;
  attachments?: string[];
  vitals?: {
    temperature: number;
    bloodPressure: string;
    heartRate: number;
    weight: number;
    height: number;
  };
  status: "active" | "completed" | "pending" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

interface Patient {
  id: number;
  name: string;
  dateOfBirth: string;
  gender: string;
  contactNumber: string;
  email: string;
  emergencyContact: string;
  medicalHistory: string[];
  allergies: string[];
}

export default function MedicalRecords() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>("all");
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch patients (for doctor/nurse/admin views)
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    retry: false,
    enabled: isAuthenticated && ["doctor", "nurse", "admin", "front-desk"].includes((user as UserType)?.role || ""),
  });

  // Fetch medical records
  const { data: records, isLoading: recordsLoading } = useQuery<MedicalRecord[]>({
    queryKey: ["/api/medical-records", selectedPatient, recordTypeFilter],
    retry: false,
    enabled: isAuthenticated,
  });

  // Create record mutation
  const createRecordMutation = useMutation({
    mutationFn: async (recordData: any) => {
      const response = await apiRequest("POST", "/api/medical-records", recordData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Medical record created successfully",
      });
      setShowNewRecord(false);
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create medical record. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const getRecordTypeColor = (type: string) => {
    const colors = {
      "consultation": "bg-blue-100 text-blue-800",
      "lab-result": "bg-green-100 text-green-800",
      "prescription": "bg-purple-100 text-purple-800",
      "diagnosis": "bg-orange-100 text-orange-800",
      "surgery": "bg-red-100 text-red-800",
      "vaccination": "bg-teal-100 text-teal-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "active": "bg-green-100 text-green-800",
      "completed": "bg-blue-100 text-blue-800",
      "pending": "bg-yellow-100 text-yellow-800",
      "cancelled": "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const filteredRecords = records?.filter(record => {
    const matchesSearch = record.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.doctorName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = recordTypeFilter === "all" || record.recordType === recordTypeFilter;
    return matchesSearch && matchesType;
  }) || [];

  const canCreateRecords = ["doctor", "nurse", "admin"].includes((user as UserType).role);
  const canViewAllPatients = ["doctor", "nurse", "admin", "front-desk"].includes((user as UserType).role);

  return (
    <RoleBasedLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Medical Records</h1>
            <p className="text-gray-600">Comprehensive patient health records and history</p>
          </div>
          
          {canCreateRecords && (
            <Button onClick={() => setShowNewRecord(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Record
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="search">Search Records</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by patient, title, or doctor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {canViewAllPatients && (
            <div>
              <Label htmlFor="patient">Filter by Patient</Label>
              <Select value={selectedPatient?.toString() || "all"} onValueChange={(value) => setSelectedPatient(value === "all" ? null : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="All patients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  {patients?.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="recordType">Record Type</Label>
            <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="lab-result">Lab Result</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="diagnosis">Diagnosis</SelectItem>
                <SelectItem value="surgery">Surgery</SelectItem>
                <SelectItem value="vaccination">Vaccination</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Records
            </Button>
          </div>
        </div>

        {/* Records List */}
        {recordsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-24 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{record.title}</h3>
                          <Badge className={getRecordTypeColor(record.recordType)}>
                            {record.recordType.charAt(0).toUpperCase() + record.recordType.slice(1).replace('-', ' ')}
                          </Badge>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{record.description}</p>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {record.patientName}
                          </div>
                          <div className="flex items-center">
                            <Activity className="h-4 w-4 mr-1" />
                            Dr. {record.doctorName}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(record.recordDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {record.department}
                          </div>
                        </div>

                        {record.vitals && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">Vital Signs</h4>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                              <div className="flex items-center">
                                <Thermometer className="h-3 w-3 mr-1 text-red-500" />
                                {record.vitals.temperature}°F
                              </div>
                              <div className="flex items-center">
                                <Heart className="h-3 w-3 mr-1 text-red-500" />
                                {record.vitals.heartRate} BPM
                              </div>
                              <div className="flex items-center">
                                <Activity className="h-3 w-3 mr-1 text-blue-500" />
                                {record.vitals.bloodPressure}
                              </div>
                              <div className="flex items-center">
                                <Weight className="h-3 w-3 mr-1 text-green-500" />
                                {record.vitals.weight} kg
                              </div>
                              <div className="flex items-center">
                                <Ruler className="h-3 w-3 mr-1 text-purple-500" />
                                {record.vitals.height} cm
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRecord(record)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canCreateRecords && (
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No medical records found</h3>
              <p className="text-gray-600">
                {searchTerm || recordTypeFilter !== "all" || selectedPatient
                  ? "Try adjusting your search filters."
                  : "No medical records available."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* New Record Modal */}
        <Dialog open={showNewRecord} onOpenChange={setShowNewRecord}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Medical Record</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const vitals = {
                temperature: parseFloat(formData.get('temperature') as string) || 0,
                bloodPressure: formData.get('bloodPressure') as string || '',
                heartRate: parseInt(formData.get('heartRate') as string) || 0,
                weight: parseFloat(formData.get('weight') as string) || 0,
                height: parseFloat(formData.get('height') as string) || 0,
              };
              
              createRecordMutation.mutate({
                patientId: formData.get('patientId'),
                recordType: formData.get('recordType'),
                title: formData.get('title'),
                description: formData.get('description'),
                department: formData.get('department'),
                vitals: Object.values(vitals).some(v => v) ? vitals : undefined,
                recordDate: formData.get('recordDate'),
              });
            }}>
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Basic Information</h3>
                  {canViewAllPatients && (
                    <div>
                      <Label htmlFor="patientId">Patient</Label>
                      <Select name="patientId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients?.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              {patient.name} - {patient.dateOfBirth}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="recordType">Record Type</Label>
                    <Select name="recordType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select record type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="lab-result">Lab Result</SelectItem>
                        <SelectItem value="prescription">Prescription</SelectItem>
                        <SelectItem value="diagnosis">Diagnosis</SelectItem>
                        <SelectItem value="surgery">Surgery</SelectItem>
                        <SelectItem value="vaccination">Vaccination</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" placeholder="Record title" required />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      placeholder="Detailed description of the medical record"
                      rows={4}
                      required 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" name="department" placeholder="Department" required />
                    </div>
                    <div>
                      <Label htmlFor="recordDate">Record Date</Label>
                      <Input 
                        id="recordDate" 
                        name="recordDate" 
                        type="date" 
                        defaultValue={new Date().toISOString().split('T')[0]}
                        required 
                      />
                    </div>
                  </div>
                
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-medium mb-4">Vital Signs (Optional)</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="temperature">Temperature (°F)</Label>
                      <Input 
                        id="temperature" 
                        name="temperature" 
                        type="number" 
                        step="0.1"
                        placeholder="98.6" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="heartRate">Heart Rate (BPM)</Label>
                      <Input 
                        id="heartRate" 
                        name="heartRate" 
                        type="number"
                        placeholder="72" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="bloodPressure">Blood Pressure</Label>
                      <Input 
                        id="bloodPressure" 
                        name="bloodPressure" 
                        placeholder="120/80" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input 
                        id="weight" 
                        name="weight" 
                        type="number" 
                        step="0.1"
                        placeholder="70.5" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input 
                        id="height" 
                        name="height" 
                        type="number"
                        placeholder="175" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="attachments">Attachments</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Upload medical files, lab reports, or images</p>
                      <Button type="button" variant="outline" className="mt-2">
                        Choose Files
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
                
              <div className="flex space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowNewRecord(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRecordMutation.isPending}
                  className="flex-1"
                >
                  {createRecordMutation.isPending ? "Creating..." : "Create Record"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Record Detail Modal */}
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>{selectedRecord?.title}</span>
              </DialogTitle>
            </DialogHeader>
            
            {selectedRecord && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Patient</Label>
                    <p className="font-medium">{selectedRecord.patientName}</p>
                  </div>
                  <div>
                    <Label>Doctor</Label>
                    <p className="font-medium">Dr. {selectedRecord.doctorName}</p>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <p className="font-medium">{selectedRecord.department}</p>
                  </div>
                  <div>
                    <Label>Record Date</Label>
                    <p className="font-medium">{new Date(selectedRecord.recordDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm">{selectedRecord.description}</p>
                  </div>
                </div>
                
                {selectedRecord.vitals && (
                  <div>
                    <Label>Vital Signs</Label>
                    <div className="mt-2 grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Thermometer className="h-6 w-6 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Temperature</p>
                          <p className="text-lg font-semibold">{selectedRecord.vitals.temperature}°F</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Heart Rate</p>
                          <p className="text-lg font-semibold">{selectedRecord.vitals.heartRate} BPM</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Activity className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Blood Pressure</p>
                          <p className="text-lg font-semibold">{selectedRecord.vitals.bloodPressure}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleBasedLayout>
  );
}