import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Edit, Save, Shield, AlertTriangle } from "lucide-react";

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

interface UserRoleManagerProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    specialization?: string;
  };
  currentUserRole: string;
  onSuccess?: () => void;
}

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

export function UserRoleManager({ user, currentUserRole, onSuccess }: UserRoleManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<RoleUpdateFormData>({
    resolver: zodResolver(roleUpdateSchema),
    defaultValues: {
      role: user.role as any,
      department: user.department || "",
      specialization: user.specialization || "",
    },
  });

  const selectedRole = form.watch("role");

  const roleUpdateMutation = useMutation({
    mutationFn: async (data: RoleUpdateFormData) => {
      const response = await apiRequest("PUT", "/api/admin/update-user-role", {
        targetUserId: user.id,
        ...data
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Role Updated Successfully",
        description: `${user.name}'s role has been updated to ${data.user.role}.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoleUpdateFormData) => {
    roleUpdateMutation.mutate(data);
  };

  // Check if current user can modify this user's role
  const canModifyRole = () => {
    if (currentUserRole === 'super-admin') return true;
    if (currentUserRole === 'admin' && user.role !== 'super-admin') return true;
    return false;
  };

  // Get available roles based on current user's permissions
  const getAvailableRoles = () => {
    const allRoles = [
      "patient", "doctor", "nurse", "front-desk", 
      "admin", "insurance", "pharmacy", "department-head", "ssd"
    ];
    
    if (currentUserRole === 'super-admin') {
      return [...allRoles, "super-admin"];
    }
    
    return allRoles;
  };

  if (!canModifyRole()) {
    return (
      <Badge className={roleColors[user.role as keyof typeof roleColors] || "bg-gray-100 text-gray-800"}>
        {user.role}
      </Badge>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-1">
          <Edit className="h-3 w-3" />
          <Badge className={roleColors[user.role as keyof typeof roleColors] || "bg-gray-100 text-gray-800"}>
            {user.role}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            Update User Role
          </DialogTitle>
          <DialogDescription>
            Change the role and permissions for {user.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Role Selection */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getAvailableRoles().map((role) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center space-x-2">
                            <Badge className={roleColors[role as keyof typeof roleColors]} variant="outline">
                              {role.replace('-', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Description */}
            {selectedRole && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  {roleDescriptions[selectedRole as keyof typeof roleDescriptions]}
                </p>
              </div>
            )}

            {/* Department field for relevant roles */}
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

            {/* Specialization field for doctors */}
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

            {/* Warning for role changes */}
            {selectedRole !== user.role && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Role Change Warning</p>
                  <p className="text-yellow-700">
                    This will change the user's access permissions immediately. 
                    The user may need to log out and back in to see the changes.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={roleUpdateMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={roleUpdateMutation.isPending}
              >
                {roleUpdateMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Update Role
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}