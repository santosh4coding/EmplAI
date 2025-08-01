import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, User, Phone, Calendar, MapPin, Edit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth: string;
  address?: string;
  emergencyContact?: string;
  medicalRecordNumber: string;
  createdAt: string;
}

export default function PatientSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Search patients
  const { data: patients, isLoading, refetch } = useQuery<Patient[]>({
    queryKey: ["/api/patients", searchTerm],
    enabled: searchTerm.length >= 2,
  });

  const handleSearch = () => {
    if (searchTerm.length >= 2) {
      refetch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Search</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex space-x-2">
            <Input
              placeholder="Search by name, phone, or medical record number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch}
              disabled={searchTerm.length < 2}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Results */}
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          )}

          {patients && patients.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          MRN: {patient.medicalRecordNumber}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        Age: {calculateAge(patient.dateOfBirth)}
                      </Badge>
                      <p className="text-sm text-gray-600">{patient.phone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchTerm.length >= 2 && patients && patients.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No patients found matching your search</p>
            </div>
          )}

          {searchTerm.length < 2 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Enter at least 2 characters to search for patients</p>
            </div>
          )}
        </div>

        {/* Patient Details Dialog */}
        {selectedPatient && (
          <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Patient Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Patient Header */}
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h3>
                    <p className="text-gray-600">
                      MRN: {selectedPatient.medicalRecordNumber}
                    </p>
                    <Badge variant="outline">
                      Age: {calculateAge(selectedPatient.dateOfBirth)}
                    </Badge>
                  </div>
                </div>

                {/* Patient Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Phone:</span>
                      <span>{selectedPatient.phone}</span>
                    </div>
                    
                    {selectedPatient.email && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Email:</span>
                        <span>{selectedPatient.email}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Date of Birth:</span>
                      <span>{formatDate(selectedPatient.dateOfBirth)}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedPatient.address && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                        <div>
                          <span className="font-medium">Address:</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {selectedPatient.address}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {selectedPatient.emergencyContact && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Emergency Contact:</span>
                        <span>{selectedPatient.emergencyContact}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Registered:</span>
                      <span>{formatDate(selectedPatient.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-4 border-t border-gray-200">
                  <Button variant="outline" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Patient
                  </Button>
                  <Button className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Appointment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}