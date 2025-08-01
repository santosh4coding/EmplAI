import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, MapPin, Plus, Edit, Trash2, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RoleBasedLayout from "@/components/RoleBasedLayout";
import { User as UserType } from "@shared/schema";

interface Appointment {
  id: number;
  patientName: string;
  doctorName: string;
  department: string;
  appointmentDate: string;
  appointmentTime: string;
  status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled";
  notes?: string;
  consultationRoom?: string;
  createdAt: string;
}

interface Doctor {
  id: number;
  name: string;
  specialization: string;
  department: string;
  isAvailable: boolean;
}

export default function Appointments() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [showDoctorCalendar, setShowDoctorCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Fetch appointments
  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", selectedDate, searchTerm],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch available doctors
  const { data: doctors } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch doctor's appointments for calendar view
  const { data: doctorAppointments } = useQuery<Appointment[]>({
    queryKey: [`/api/appointments/doctor/${selectedDoctorId}/${calendarDate}`],
    retry: false,
    enabled: Boolean(isAuthenticated && selectedDoctorId && showDoctorCalendar),
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment created successfully",
      });
      setShowNewAppointment(false);
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
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
        description: "Failed to create appointment. Please try again.",
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

  const getStatusColor = (status: string) => {
    const colors = {
      "scheduled": "bg-blue-100 text-blue-800",
      "confirmed": "bg-green-100 text-green-800",
      "in-progress": "bg-yellow-100 text-yellow-800",
      "completed": "bg-gray-100 text-gray-800",
      "cancelled": "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAppointments = appointments?.filter(apt => 
    apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.department.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <RoleBasedLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Appointments</h1>
            <p className="text-gray-600">Manage patient appointments and schedules</p>
          </div>
          
          {((user as UserType).role === "front-desk" || (user as UserType).role === "admin" || (user as UserType).role === "doctor") && (
            <Button onClick={() => setShowNewAppointment(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="search">Search Appointments</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by patient, doctor, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="date">Filter by Date</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Appointments List */}
        {appointmentsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{appointment.patientName}</h3>
                        <p className="text-sm text-gray-600">Dr. {appointment.doctorName}</p>
                        <p className="text-sm text-gray-500">{appointment.department}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(appointment.appointmentDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTime(appointment.appointmentTime)}
                        </div>
                        {appointment.consultationRoom && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-1" />
                            Room {appointment.consultationRoom}
                          </div>
                        )}
                      </div>
                      
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </Badge>
                      
                      {((user as UserType).role === "front-desk" || (user as UserType).role === "admin") && (
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {appointment.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{appointment.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedDate !== new Date().toISOString().split('T')[0] 
                  ? "Try adjusting your search or date filter." 
                  : "No appointments scheduled for today."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* New Appointment Modal */}
        <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createAppointmentMutation.mutate({
                patientName: formData.get('patientName'),
                doctorId: formData.get('doctorId'),
                appointmentDate: formData.get('appointmentDate'),
                appointmentTime: formData.get('appointmentTime'),
                notes: formData.get('notes')
              });
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patientName">Patient Name</Label>
                  <Input id="patientName" name="patientName" required />
                </div>
                
                <div>
                  <Label htmlFor="doctorId">Doctor</Label>
                  <div className="flex space-x-2">
                    <Select 
                      name="doctorId" 
                      required 
                      onValueChange={(value) => setSelectedDoctorId(value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors?.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id.toString()}>
                            Dr. {doctor.name} - {doctor.specialization}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedDoctorId && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowDoctorCalendar(true)}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        View Schedule
                      </Button>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="appointmentDate">Date</Label>
                  <Input 
                    id="appointmentDate" 
                    name="appointmentDate" 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="appointmentTime">Time</Label>
                  <Input id="appointmentTime" name="appointmentTime" type="time" required />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input id="notes" name="notes" placeholder="Additional notes..." />
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowNewAppointment(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAppointmentMutation.isPending}
                    className="flex-1"
                  >
                    {createAppointmentMutation.isPending ? "Creating..." : "Create Appointment"}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Doctor Calendar Modal */}
        <Dialog open={showDoctorCalendar} onOpenChange={setShowDoctorCalendar}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Doctor's Schedule - {doctors?.find(d => d.id.toString() === selectedDoctorId)?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div>
                  <Label htmlFor="calendarDate">Select Date</Label>
                  <Input
                    id="calendarDate"
                    type="date"
                    value={calendarDate}
                    onChange={(e) => setCalendarDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setCalendarDate(new Date().toISOString().split('T')[0])}
                >
                  Today
                </Button>
              </div>

              {/* Time Slots Grid */}
              <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                {generateTimeSlots().map((timeSlot) => {
                  const isBooked = doctorAppointments?.some(apt => 
                    formatTime(apt.appointmentTime) === timeSlot
                  );
                  const bookedAppointment = doctorAppointments?.find(apt => 
                    formatTime(apt.appointmentTime) === timeSlot
                  );
                  
                  return (
                    <Card 
                      key={timeSlot} 
                      className={`cursor-pointer transition-colors ${
                        isBooked 
                          ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                          : 'bg-green-50 border-green-200 hover:bg-green-100'
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="text-center">
                          <div className="font-medium text-sm">{timeSlot}</div>
                          <div className={`text-xs mt-1 ${
                            isBooked ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {isBooked ? 'Booked' : 'Available'}
                          </div>
                          {isBooked && bookedAppointment && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {bookedAppointment.patientName}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
                    Available
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-100 border border-red-200 rounded mr-2"></div>
                    Booked
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDoctorCalendar(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleBasedLayout>
  );
}

// Helper function to generate time slots
function generateTimeSlots() {
  const slots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
}