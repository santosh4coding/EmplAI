import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Ruler,
  Stethoscope,
  Pill,
  TestTube,
  Scan,
  ClipboardList,
  TrendingUp,
  History,
  BookOpen,
  Shield,
  Clock,
  Printer,
  Share2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RoleBasedLayout from "@/components/RoleBasedLayout";
import { User as UserType } from "@shared/schema";

interface Patient {
  id: number;
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  allergies: string[];
  chronicConditions: string[];
}

interface MedicalRecord {
  id: number;
  patientId: number;
  patientName: string;
  recordType: "consultation" | "lab-result" | "prescription" | "diagnosis" | "surgery" | "vaccination" | "imaging" | "discharge";
  title: string;
  description: string;
  doctorName: string;
  department: string;
  recordDate: string;
  chiefComplaint?: string;
  diagnosis?: string;
  prescription?: string;
  vitals?: {
    temperature: number;
    bloodPressure: string;
    heartRate: number;
    weight: number;
    height: number;
    oxygenSaturation: number;
  };
  icd10Codes?: string[];
  cptCodes?: string[];
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "completed" | "pending" | "cancelled";
  attachments?: string[];
  isConfidential: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LabResult {
  id: number;
  patientId: number;
  testName: string;
  category: string;
  results: any[];
  status: string;
  collectionDate: string;
  reportDate: string;
  criticalValues: boolean;
}

interface VitalSigns {
  id: number;
  patientId: number;
  temperature: number;
  bloodPressure: string;
  heartRate: number;
  weight: number;
  height: number;
  recordedAt: string;
}

export default function EMRDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [showVitalsDialog, setShowVitalsDialog] = useState(false);
  const [showLabDialog, setShowLabDialog] = useState(false);

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

  // Fetch patients
  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch medical records for selected patient
  const { data: records, isLoading: recordsLoading } = useQuery<MedicalRecord[]>({
    queryKey: ["/api/emr/records", selectedPatient?.id],
    retry: false,
    enabled: isAuthenticated && !!selectedPatient,
  });

  // Fetch lab results for selected patient
  const { data: labResults } = useQuery<LabResult[]>({
    queryKey: ["/api/emr/lab-results", selectedPatient?.id],
    retry: false,
    enabled: isAuthenticated && !!selectedPatient,
  });

  // Fetch vital signs for selected patient
  const { data: vitalSigns } = useQuery<VitalSigns[]>({
    queryKey: ["/api/emr/vital-signs", selectedPatient?.id],
    retry: false,
    enabled: isAuthenticated && !!selectedPatient,
  });

  // Create medical record mutation
  const createRecordMutation = useMutation({
    mutationFn: async (recordData: any) => {
      const response = await apiRequest("POST", "/api/emr/records", recordData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Medical record created successfully",
      });
      setShowNewRecord(false);
      queryClient.invalidateQueries({ queryKey: ["/api/emr/records"] });
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

  // Create vital signs mutation
  const createVitalsMutation = useMutation({
    mutationFn: async (vitalsData: any) => {
      const response = await apiRequest("POST", "/api/emr/vital-signs", vitalsData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vital signs recorded successfully",
      });
      setShowVitalsDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/emr/vital-signs"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record vital signs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredPatients = patients?.filter(patient => 
    patient.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const canCreateRecords = ["doctor", "nurse", "admin"].includes((user as UserType)?.role || "");

  if (isLoading) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </RoleBasedLayout>
    );
  }

  return (
    <RoleBasedLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">EMR Dashboard</h1>
            <p className="text-gray-600">Comprehensive Electronic Medical Records System</p>
          </div>
          
          {canCreateRecords && selectedPatient && (
            <div className="flex space-x-2">
              <Button onClick={() => setShowVitalsDialog(true)} variant="outline">
                <Heart className="h-4 w-4 mr-2" />
                Record Vitals
              </Button>
              <Button onClick={() => setShowNewRecord(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Record
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Search & Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Patient Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search patients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPatient?.id === patient.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <div className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {patient.patientId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {patient.email}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main EMR Content */}
          <div className="lg:col-span-3">
            {selectedPatient ? (
              <div className="space-y-6">
                {/* Patient Header */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold">
                            {selectedPatient.firstName} {selectedPatient.lastName}
                          </h2>
                          <p className="text-gray-600">
                            Patient ID: {selectedPatient.patientId} | 
                            DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString()} |
                            {selectedPatient.gender}
                          </p>
                          <p className="text-gray-600">
                            {selectedPatient.phone} | {selectedPatient.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Quick Alerts */}
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                          <span className="font-medium text-red-800">Allergies:</span>
                          <div className="ml-2 flex flex-wrap gap-1">
                            {selectedPatient.allergies.map((allergy, index) => (
                              <Badge key={index} variant="destructive" className="text-xs">
                                {allergy}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* EMR Navigation */}
                <div className="border-b">
                  <nav className="flex space-x-6">
                    {['overview', 'records', 'vitals', 'labs', 'imaging', 'medications'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                          activeTab === tab
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </nav>
                </div>

                {activeTab === 'overview' && (
                  <div className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            Total Records
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{records?.length || 0}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center">
                            <TestTube className="h-4 w-4 mr-2" />
                            Lab Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{labResults?.length || 0}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center">
                            <Heart className="h-4 w-4 mr-2" />
                            Vital Checks
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{vitalSigns?.length || 0}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recent Activity */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Clock className="h-5 w-5 mr-2" />
                          Recent Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {records?.slice(0, 5).map((record) => (
                            <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  record.recordType === 'consultation' ? 'bg-blue-500' :
                                  record.recordType === 'lab-result' ? 'bg-green-500' :
                                  record.recordType === 'prescription' ? 'bg-purple-500' :
                                  'bg-gray-500'
                                }`} />
                                <div>
                                  <div className="font-medium">{record.title}</div>
                                  <div className="text-sm text-gray-500">
                                    {record.doctorName} • {new Date(record.recordDate).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <Badge variant={record.severity === 'critical' ? 'destructive' : 'secondary'}>
                                {record.severity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="records" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Medical Records</h3>
                      <div className="flex space-x-2">
                        <Select defaultValue="all">
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="consultation">Consultation</SelectItem>
                            <SelectItem value="lab-result">Lab Result</SelectItem>
                            <SelectItem value="prescription">Prescription</SelectItem>
                            <SelectItem value="diagnosis">Diagnosis</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {records?.map((record) => (
                        <Card key={record.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge variant="outline">{record.recordType}</Badge>
                                  <Badge variant={record.severity === 'critical' ? 'destructive' : 'secondary'}>
                                    {record.severity}
                                  </Badge>
                                  {record.isConfidential && (
                                    <Badge variant="secondary">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Confidential
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-semibold text-lg">{record.title}</h4>
                                <p className="text-gray-600 mb-2">{record.description}</p>
                                
                                {record.chiefComplaint && (
                                  <div className="mb-2">
                                    <span className="font-medium">Chief Complaint: </span>
                                    <span className="text-gray-700">{record.chiefComplaint}</span>
                                  </div>
                                )}
                                
                                {record.diagnosis && (
                                  <div className="mb-2">
                                    <span className="font-medium">Diagnosis: </span>
                                    <span className="text-gray-700">{record.diagnosis}</span>
                                  </div>
                                )}

                                <div className="text-sm text-gray-500">
                                  Dr. {record.doctorName} • {record.department} • {new Date(record.recordDate).toLocaleDateString()}
                                </div>
                              </div>
                              
                              <div className="flex space-x-2 ml-4">
                                <Button variant="outline" size="sm">
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
                  </TabsContent>

                  <TabsContent value="vitals" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Heart className="h-5 w-5 mr-2" />
                          Vital Signs History
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {vitalSigns?.map((vital) => (
                            <div key={vital.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-2 text-red-500" />
                                <div>
                                  <div className="text-sm text-gray-500">Temperature</div>
                                  <div className="font-medium">{vital.temperature}°F</div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <Activity className="h-4 w-4 mr-2 text-blue-500" />
                                <div>
                                  <div className="text-sm text-gray-500">Blood Pressure</div>
                                  <div className="font-medium">{vital.bloodPressure}</div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <Heart className="h-4 w-4 mr-2 text-purple-500" />
                                <div>
                                  <div className="text-sm text-gray-500">Heart Rate</div>
                                  <div className="font-medium">{vital.heartRate} bpm</div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <Weight className="h-4 w-4 mr-2 text-green-500" />
                                <div>
                                  <div className="text-sm text-gray-500">Weight</div>
                                  <div className="font-medium">{vital.weight} kg</div>
                                </div>
                              </div>
                              <div className="col-span-2 md:col-span-4 text-sm text-gray-500">
                                Recorded: {new Date(vital.recordedAt).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="labs" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <TestTube className="h-5 w-5 mr-2" />
                          Laboratory Results
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {labResults?.map((lab) => (
                            <div key={lab.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold">{lab.testName}</h4>
                                  <div className="text-sm text-gray-500">{lab.category}</div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant={lab.criticalValues ? 'destructive' : 'secondary'}>
                                    {lab.status}
                                  </Badge>
                                  {lab.criticalValues && (
                                    <Badge variant="destructive">Critical</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                Collected: {new Date(lab.collectionDate).toLocaleDateString()} • 
                                Reported: {new Date(lab.reportDate).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="imaging" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Scan className="h-5 w-5 mr-2" />
                          Imaging Studies
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <Scan className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No imaging studies available</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="medications" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Pill className="h-5 w-5 mr-2" />
                          Current Medications
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No medications on file</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Patient</h3>
                  <p className="text-gray-600">
                    Choose a patient from the list to view their electronic medical records.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* New Medical Record Dialog */}
        <Dialog open={showNewRecord} onOpenChange={setShowNewRecord}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Medical Record</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const recordData = {
                patientId: selectedPatient?.id,
                recordType: formData.get("recordType"),
                title: formData.get("title"),
                description: formData.get("description"),
                chiefComplaint: formData.get("chiefComplaint"),
                diagnosis: formData.get("diagnosis"),
                prescription: formData.get("prescription"),
                severity: formData.get("severity"),
                department: formData.get("department"),
                recordDate: formData.get("recordDate"),
                isConfidential: formData.get("isConfidential") === "on",
              };
              createRecordMutation.mutate(recordData);
            }} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recordType">Record Type</Label>
                  <Select name="recordType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select record type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="diagnosis">Diagnosis</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="lab-result">Lab Result</SelectItem>
                      <SelectItem value="imaging">Imaging</SelectItem>
                      <SelectItem value="surgery">Surgery</SelectItem>
                      <SelectItem value="vaccination">Vaccination</SelectItem>
                      <SelectItem value="discharge">Discharge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select name="severity" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="Record title" required />
              </div>

              <div>
                <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                <Textarea 
                  id="chiefComplaint" 
                  name="chiefComplaint" 
                  placeholder="Patient's main concern or reason for visit"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Clinical Notes</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Detailed clinical notes and observations"
                  rows={4}
                  required 
                />
              </div>

              <div>
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Textarea 
                  id="diagnosis" 
                  name="diagnosis" 
                  placeholder="Clinical diagnosis and assessment"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="prescription">Treatment Plan</Label>
                <Textarea 
                  id="prescription" 
                  name="prescription" 
                  placeholder="Medications, procedures, and treatment recommendations"
                  rows={3}
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
                    type="datetime-local" 
                    defaultValue={new Date().toISOString().slice(0, 16)}
                    required 
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="isConfidential" 
                  name="isConfidential" 
                  className="rounded"
                />
                <Label htmlFor="isConfidential">Mark as confidential</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewRecord(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRecordMutation.isPending}
                >
                  {createRecordMutation.isPending ? "Creating..." : "Create Record"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Record Vitals Dialog */}
        <Dialog open={showVitalsDialog} onOpenChange={setShowVitalsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Vital Signs</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const vitalsData = {
                patientId: selectedPatient?.id,
                temperature: parseFloat(formData.get("temperature") as string),
                bloodPressureSystolic: parseInt(formData.get("systolic") as string),
                bloodPressureDiastolic: parseInt(formData.get("diastolic") as string),
                heartRate: parseInt(formData.get("heartRate") as string),
                respiratoryRate: parseInt(formData.get("respiratoryRate") as string),
                oxygenSaturation: parseFloat(formData.get("oxygenSaturation") as string),
                weight: parseFloat(formData.get("weight") as string),
                height: parseFloat(formData.get("height") as string),
                painScale: parseInt(formData.get("painScale") as string),
                notes: formData.get("notes"),
              };
              createVitalsMutation.mutate(vitalsData);
            }} className="space-y-4">
              
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
                  <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                  <Input 
                    id="heartRate" 
                    name="heartRate" 
                    type="number" 
                    placeholder="72" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="systolic">Systolic BP</Label>
                  <Input 
                    id="systolic" 
                    name="systolic" 
                    type="number" 
                    placeholder="120" 
                  />
                </div>
                <div>
                  <Label htmlFor="diastolic">Diastolic BP</Label>
                  <Input 
                    id="diastolic" 
                    name="diastolic" 
                    type="number" 
                    placeholder="80" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
                  <Input 
                    id="respiratoryRate" 
                    name="respiratoryRate" 
                    type="number" 
                    placeholder="16" 
                  />
                </div>
                <div>
                  <Label htmlFor="oxygenSaturation">Oxygen Saturation (%)</Label>
                  <Input 
                    id="oxygenSaturation" 
                    name="oxygenSaturation" 
                    type="number" 
                    step="0.1"
                    placeholder="98.5" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    step="0.1"
                    placeholder="175.0" 
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="painScale">Pain Scale (0-10)</Label>
                <Select name="painScale">
                  <SelectTrigger>
                    <SelectValue placeholder="Select pain level" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  placeholder="Additional observations or notes"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowVitalsDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createVitalsMutation.isPending}
                >
                  {createVitalsMutation.isPending ? "Recording..." : "Record Vitals"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleBasedLayout>
  );
}