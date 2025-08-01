import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  User,
  FileText,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RoleBasedLayout from "@/components/RoleBasedLayout";

interface Patient {
  id: number;
  patientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  emergencyContact: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  aadhaarNumber?: string;
  panNumber?: string;
  medicalHistory?: string;
  createdAt: string;
  lastVisit?: string;
}

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showPatientDetails, setShowPatientDetails] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/patients", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/stats/dashboard"] });
      toast({
        title: "Success",
        description: "Patient registered successfully!",
      });
      setShowNewPatient(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to register patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update patient mutation
  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/patients/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Patient updated successfully!",
      });
      setShowEditPatient(false);
      setSelectedPatient(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete patient mutation
  const deletePatientMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/patients/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/stats/dashboard"] });
      toast({
        title: "Success",
        description: "Patient deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    retry: false,
  });

  // Fetch patient statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/patients/stats/dashboard"],
    retry: false,
  });

  const filteredPatients = patients?.filter(patient => 
    patient.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patientId?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Handle patient registration form submission
  const handlePatientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Transform allergies from string to array
    const allergiesText = formData.get("allergies") as string;
    const allergiesArray = allergiesText ? allergiesText.split(",").map(a => a.trim()).filter(Boolean) : [];
    
    const patientData = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      dateOfBirth: formData.get("dateOfBirth"),
      gender: formData.get("gender"),
      address: formData.get("address"),
      emergencyContact: formData.get("emergencyContact"),
      emergencyPhone: formData.get("emergencyPhone"),
      allergies: allergiesArray,
      medicalHistory: formData.get("medicalHistory"),
      aadhaarNumber: formData.get("aadhaarNumber"),
      panNumber: formData.get("panNumber"),
    };

    createPatientMutation.mutate(patientData);
  };

  // Handle patient update form submission
  const handlePatientUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatient) return;
    
    const formData = new FormData(e.currentTarget);
    
    // Transform allergies from string to array
    const allergiesText = formData.get("allergies") as string;
    const allergiesArray = allergiesText ? allergiesText.split(",").map(a => a.trim()).filter(Boolean) : [];
    
    const patientData = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      dateOfBirth: formData.get("dateOfBirth"),
      gender: formData.get("gender"),
      address: formData.get("address"),
      emergencyContact: formData.get("emergencyContact"),
      emergencyPhone: formData.get("emergencyPhone"),
      allergies: allergiesArray,
      medicalHistory: formData.get("medicalHistory"),
      aadhaarNumber: formData.get("aadhaarNumber"),
      panNumber: formData.get("panNumber"),
    };

    updatePatientMutation.mutate({ id: selectedPatient.id, data: patientData });
  };

  // Handle patient deletion
  const handleDeletePatient = (patient: Patient) => {
    if (confirm(`Are you sure you want to delete patient ${patient.firstName} ${patient.lastName}?`)) {
      deletePatientMutation.mutate(patient.id);
    }
  };

  // View patient details
  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
  };

  // Edit patient
  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowEditPatient(true);
  };

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold">Patient Management</h1>
          </div>
          <Button 
            className="flex items-center"
            onClick={() => setShowNewPatient(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Patient
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-blue-600">{stats?.totalPatients || patients?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New This Month</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.newThisMonth || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-orange-600">{stats?.activeCases || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Visits</p>
                  <p className="text-2xl font-bold text-purple-600">{stats?.todaysVisits || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search patients by name, email, or patient ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient List */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-6">
                <div className="space-y-4">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No patients found</p>
                    </div>
                  ) : (
                    filteredPatients.map((patient) => (
                      <div key={patient.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-blue-600" />
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {patient.firstName} {patient.lastName}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Patient ID: {patient.patientId}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                  {patient.email}
                                </div>
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                  {patient.phone}
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                  DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                  {patient.gender}
                                </div>
                              </div>

                              {patient.allergies && patient.allergies.length > 0 && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">Allergies:</span>
                                  {patient.allergies.map((allergy, index) => (
                                    <Badge key={index} variant="destructive" className="text-xs">
                                      {allergy}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewPatient(patient)}>
                              View Details
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditPatient(patient)}>
                              Edit
                            </Button>
                            <Button size="sm">
                              Schedule Appointment
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Registration Dialog */}
        <Dialog open={showNewPatient} onOpenChange={setShowNewPatient}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Patient</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handlePatientSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" name="lastName" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" name="phone" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
                </div>
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select name="gender" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea id="address" name="address" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                  <Input id="emergencyContact" name="emergencyContact" />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                  <Input id="emergencyPhone" name="emergencyPhone" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                  <Input id="aadhaarNumber" name="aadhaarNumber" placeholder="1234-5678-9012" />
                </div>
                <div>
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input id="panNumber" name="panNumber" placeholder="ABCDE1234F" />
                </div>
              </div>

              <div>
                <Label htmlFor="allergies">Allergies (comma-separated)</Label>
                <Input 
                  id="allergies" 
                  name="allergies" 
                  placeholder="e.g., Penicillin, Peanuts, Shellfish"
                />
              </div>

              <div>
                <Label htmlFor="medicalHistory">Medical History</Label>
                <Textarea 
                  id="medicalHistory" 
                  name="medicalHistory" 
                  placeholder="Previous surgeries, chronic conditions, medications..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewPatient(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPatientMutation.isPending}
                >
                  {createPatientMutation.isPending ? "Registering..." : "Register Patient"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Patient Edit Dialog */}
        <Dialog open={showEditPatient} onOpenChange={setShowEditPatient}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Patient Information</DialogTitle>
            </DialogHeader>
            
            {selectedPatient && (
              <form onSubmit={handlePatientUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-firstName">First Name *</Label>
                    <Input 
                      id="edit-firstName" 
                      name="firstName" 
                      defaultValue={selectedPatient.firstName}
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-lastName">Last Name *</Label>
                    <Input 
                      id="edit-lastName" 
                      name="lastName" 
                      defaultValue={selectedPatient.lastName}
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input 
                      id="edit-email" 
                      name="email" 
                      type="email" 
                      defaultValue={selectedPatient.email}
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Phone *</Label>
                    <Input 
                      id="edit-phone" 
                      name="phone" 
                      defaultValue={selectedPatient.phone}
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-dateOfBirth">Date of Birth *</Label>
                    <Input 
                      id="edit-dateOfBirth" 
                      name="dateOfBirth" 
                      type="date" 
                      defaultValue={selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toISOString().split('T')[0] : ''}
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-gender">Gender *</Label>
                    <Select name="gender" defaultValue={selectedPatient.gender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-address">Address *</Label>
                  <Textarea 
                    id="edit-address" 
                    name="address" 
                    defaultValue={selectedPatient.address}
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-emergencyContact">Emergency Contact</Label>
                    <Input 
                      id="edit-emergencyContact" 
                      name="emergencyContact" 
                      defaultValue={selectedPatient.emergencyContact}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-emergencyPhone">Emergency Phone</Label>
                    <Input 
                      id="edit-emergencyPhone" 
                      name="emergencyPhone" 
                      defaultValue={selectedPatient.emergencyContact}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-aadhaarNumber">Aadhaar Number</Label>
                    <Input 
                      id="edit-aadhaarNumber" 
                      name="aadhaarNumber" 
                      placeholder="1234-5678-9012"
                      defaultValue={selectedPatient.aadhaarNumber || ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-panNumber">PAN Number</Label>
                    <Input 
                      id="edit-panNumber" 
                      name="panNumber" 
                      placeholder="ABCDE1234F"
                      defaultValue={selectedPatient.panNumber || ''}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-allergies">Allergies (comma-separated)</Label>
                  <Input 
                    id="edit-allergies" 
                    name="allergies" 
                    placeholder="e.g., Penicillin, Peanuts, Shellfish"
                    defaultValue={selectedPatient.allergies?.join(', ') || ''}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-medicalHistory">Medical History</Label>
                  <Textarea 
                    id="edit-medicalHistory" 
                    name="medicalHistory" 
                    placeholder="Previous surgeries, chronic conditions, medications..."
                    defaultValue={selectedPatient.medicalHistory || ''}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEditPatient(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updatePatientMutation.isPending}
                  >
                    {updatePatientMutation.isPending ? "Updating..." : "Update Patient"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Patient Details Dialog */}
        <Dialog open={showPatientDetails} onOpenChange={setShowPatientDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Patient Details</DialogTitle>
            </DialogHeader>
            
            {selectedPatient && (
              <div className="space-y-6">
                {/* Patient Header */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </h3>
                      <p className="text-gray-600">
                        Patient ID: {selectedPatient.patientId} | Age: {
                          selectedPatient.dateOfBirth 
                            ? new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()
                            : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleEditPatient(selectedPatient)}
                    >
                      Edit Patient
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeletePatient(selectedPatient)}
                    >
                      Delete Patient
                    </Button>
                  </div>
                </div>

                {/* Patient Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{selectedPatient.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{selectedPatient.phone}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{selectedPatient.address}</span>
                      </div>
                      {selectedPatient.emergencyContact && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-red-400" />
                          <span>Emergency: {selectedPatient.emergencyContact}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span>DOB: {selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : 'Not provided'}</span>
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Gender: {selectedPatient.gender || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Blood Group: {selectedPatient.bloodGroup || 'Not available'}</span>
                      </div>
                      {selectedPatient.aadhaarNumber && (
                        <div className="text-sm text-gray-600">
                          Aadhaar: {selectedPatient.aadhaarNumber}
                        </div>
                      )}
                      {selectedPatient.panNumber && (
                        <div className="text-sm text-gray-600">
                          PAN: {selectedPatient.panNumber}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Allergies and Medical History */}
                {(selectedPatient.allergies && selectedPatient.allergies.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">Allergies & Reactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedPatient.allergies.map((allergy, index) => (
                          <Badge key={index} variant="destructive">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Medical History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">
                      {selectedPatient.medicalHistory || 'No medical history available'}
                    </p>
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPatientDetails(false)}
                  >
                    Close
                  </Button>
                  <Button>
                    Schedule Appointment
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleBasedLayout>
  );
}