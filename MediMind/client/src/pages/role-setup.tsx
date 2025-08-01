import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Hospital, UserCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { User as UserType } from "@shared/schema";

const roleUpdateSchema = z.object({
  role: z.enum([
    "patient", 
    "doctor", 
    "nurse", 
    "front-desk", 
    "admin", 
    "super-admin", 
    "insurance", 
    "pharmacy", 
    "department-head", 
    "ssd"
  ]),
  department: z.string().optional(),
  specialization: z.string().optional(),
});

type RoleUpdateFormData = z.infer<typeof roleUpdateSchema>;

const roleDescriptions = {
  "patient": "Book appointments, view medical records, manage billing",
  "doctor": "Manage patients, create prescriptions, view medical records",
  "nurse": "Patient care, queue management, assist doctors",
  "front-desk": "Patient registration, appointment scheduling, basic billing",
  "admin": "User management, system administration, financial oversight",
  "super-admin": "Full system control, security management, compliance",
  "insurance": "Claims processing, policy verification, approvals",
  "pharmacy": "Prescription management, drug inventory, dispensing",
  "department-head": "Department oversight, staff management, resource allocation",
  "ssd": "Security monitoring, audit reviews, incident response"
};

const roleColors = {
  "patient": "bg-blue-100 text-blue-800",
  "doctor": "bg-green-100 text-green-800",
  "nurse": "bg-pink-100 text-pink-800",
  "front-desk": "bg-yellow-100 text-yellow-800",
  "admin": "bg-purple-100 text-purple-800",
  "super-admin": "bg-red-100 text-red-800",
  "insurance": "bg-orange-100 text-orange-800",
  "pharmacy": "bg-teal-100 text-teal-800",
  "department-head": "bg-indigo-100 text-indigo-800",
  "ssd": "bg-gray-100 text-gray-800"
};

export default function RoleSetup() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("");

  const form = useForm<RoleUpdateFormData>({
    resolver: zodResolver(roleUpdateSchema),
    defaultValues: {
      role: "patient",
      department: "",
      specialization: "",
    },
  });

  const roleUpdateMutation = useMutation({
    mutationFn: async (data: RoleUpdateFormData) => {
      const response = await apiRequest("PUT", "/api/auth/update-role", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Role Updated Successfully",
        description: "Your role has been updated. Redirecting to dashboard...",
      });
      
      // Invalidate user query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoleUpdateFormData) => {
    roleUpdateMutation.mutate(data);
  };

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

  // If user already has a non-patient role, redirect to dashboard
  if (user && (user as UserType).role !== 'patient') {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Hospital className="h-12 w-12 text-blue-600 mr-4" />
            <h1 className="text-3xl font-bold text-gray-800">MediDesk Pro</h1>
          </div>
          <p className="text-gray-600">Complete your profile setup</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <UserCheck className="h-6 w-6 mr-2 text-blue-600" />
              Select Your Role
            </CardTitle>
            <p className="text-gray-600">
              Choose your role in the hospital system to access the appropriate features and permissions.
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Role Selection */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role in Hospital System</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedRole(value);
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="front-desk">Front Desk Staff</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="super-admin">Super Administrator</SelectItem>
                          <SelectItem value="insurance">Insurance Staff</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy Staff</SelectItem>
                          <SelectItem value="department-head">Department Head</SelectItem>
                          <SelectItem value="ssd">Security Department</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role Description */}
                {selectedRole && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Badge className={roleColors[selectedRole as keyof typeof roleColors]}>
                        {selectedRole.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {roleDescriptions[selectedRole as keyof typeof roleDescriptions]}
                    </p>
                  </div>
                )}

                {/* Additional Fields for Specific Roles */}
                {(selectedRole === "doctor" || selectedRole === "nurse" || selectedRole === "department-head" || selectedRole === "front-desk") && (
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Cardiology, Emergency, Administration" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedRole === "doctor" && (
                  <FormField
                    control={form.control}
                    name="specialization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialization</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Cardiologist, Surgeon, General Practitioner" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Your role determines what features and data you can access in the system. 
                    Contact your system administrator if you need role changes later.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={roleUpdateMutation.isPending}
                >
                  {roleUpdateMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Updating Role...
                    </div>
                  ) : (
                    <>
                      Continue to Dashboard
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}