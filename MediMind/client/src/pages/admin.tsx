import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Activity, 
  Building, 
  Settings, 
  UserPlus, 
  Search,
  TrendingUp,
  Shield,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
  Save,
  Download,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { User as UserType } from "@shared/schema";
import RoleBasedLayout from "@/components/RoleBasedLayout";
import { UserRoleManager } from "@/components/UserRoleManager";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AuditLogViewer } from "@/components/AuditLogViewer";

interface SystemUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  staffCount: number;
  patientCount: number;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  systemUptime: string;
  storageUsed: string;
  lastBackup: string;
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

export default function Admin() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showCreateUser, setShowCreateUser] = useState(false);

  // Check admin access
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

    if (user && !["admin", "super-admin"].includes((user as UserType).role)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Mock data for demonstration
  const mockUsers: SystemUser[] = [
    {
      id: "1",
      email: "john.doctor@hospital.com",
      firstName: "John",
      lastName: "Smith",
      role: "doctor",
      department: "Cardiology",
      isActive: true,
      createdAt: "2025-01-15",
      lastLogin: "2025-07-31T10:30:00Z"
    },
    {
      id: "2",
      email: "sarah.nurse@hospital.com",
      firstName: "Sarah",
      lastName: "Johnson",
      role: "nurse",
      department: "Emergency",
      isActive: true,
      createdAt: "2025-02-01",
      lastLogin: "2025-07-31T09:15:00Z"
    },
    {
      id: "3",
      email: "mike.admin@hospital.com",
      firstName: "Mike",
      lastName: "Wilson",
      role: "admin",
      department: "Administration",
      isActive: true,
      createdAt: "2025-01-01",
      lastLogin: "2025-07-31T08:45:00Z"
    },
    {
      id: "4",
      email: "patient@hospital.com",
      firstName: "Jane",
      lastName: "Doe",
      role: "patient",
      isActive: true,
      createdAt: "2025-07-31",
      lastLogin: "2025-07-31T12:00:00Z"
    }
  ];

  const mockDepartments: Department[] = [
    {
      id: 1,
      name: "Cardiology",
      code: "CARD",
      description: "Heart and cardiovascular care",
      isActive: true,
      staffCount: 12,
      patientCount: 45
    },
    {
      id: 2,
      name: "Emergency",
      code: "EMER",
      description: "Emergency medical services",
      isActive: true,
      staffCount: 18,
      patientCount: 23
    },
    {
      id: 3,
      name: "Orthopedics",
      code: "ORTH",
      description: "Bone and joint care",
      isActive: true,
      staffCount: 8,
      patientCount: 31
    }
  ];

  const mockStats: SystemStats = {
    totalUsers: 156,
    activeUsers: 142,
    totalPatients: 1248,
    totalDoctors: 34,
    totalAppointments: 89,
    systemUptime: "99.8%",
    storageUsed: "2.4 GB",
    lastBackup: "2025-07-31T02:00:00Z"
  };

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Show loading or access denied states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!["admin", "super-admin"].includes((user as UserType).role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-xl text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              You don't have permission to access the admin panel.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Only administrators and super-administrators can access this area.
            </p>
            <Button onClick={() => window.location.href = "/"}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <RoleBasedLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">System Administration</h1>
              <p className="text-gray-600">Manage users, departments, and system settings</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-600">{mockStats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{mockStats.activeUsers}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-purple-600">{mockStats.totalPatients}</p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Uptime</p>
                  <p className="text-2xl font-bold text-green-600">{mockStats.systemUptime}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Dashboard Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>System Dashboard</span>
          </h2>
          <AdminDashboard />
        </div>

        {/* Audit Logs Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Audit Logs</span>
          </h2>
          <AuditLogViewer />
        </div>

        {/* User Management Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>User Management</span>
          </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex gap-4 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="front-desk">Front Desk</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super-admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>

            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>System Users ({filteredUsers.length})</span>
                  <Badge variant="outline">{(user as UserType).role} access</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.map((sysUser) => (
                    <div key={sysUser.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {sysUser.firstName.charAt(0)}{sysUser.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{sysUser.firstName} {sysUser.lastName}</p>
                            {!sysUser.isActive && (
                              <Badge variant="destructive" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{sysUser.email}</p>
                          {sysUser.department && (
                            <p className="text-xs text-gray-400">{sysUser.department}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <UserRoleManager
                          user={{
                            id: sysUser.id,
                            name: `${sysUser.firstName} ${sysUser.lastName}`,
                            email: sysUser.email,
                            role: sysUser.role,
                            department: sysUser.department
                          }}
                          currentUserRole={(user as UserType).role}
                          onSuccess={() => {
                            toast({
                              title: "Role Updated",
                              description: `${sysUser.firstName} ${sysUser.lastName}'s role has been updated.`,
                            });
                          }}
                        />
                        <div className="text-right text-xs text-gray-500">
                          <p>Created: {new Date(sysUser.createdAt).toLocaleDateString()}</p>
                          {sysUser.lastLogin && (
                            <p>Last login: {new Date(sysUser.lastLogin).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Departments Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Department Management</span>
          </h2>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Hospital Departments</h2>
              <Button>
                <Building className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockDepartments.map((dept) => (
                <Card key={dept.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{dept.name}</span>
                      <Badge variant="outline">{dept.code}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{dept.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Staff</p>
                        <p className="font-semibold text-blue-600">{dept.staffCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Patients</p>
                        <p className="font-semibold text-green-600">{dept.patientCount}</p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </div>

        {/* System Settings Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>System Settings</span>
          </h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Storage Used</p>
                    <p className="font-semibold">{mockStats.storageUsed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Backup</p>
                    <p className="font-semibold">{new Date(mockStats.lastBackup).toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button className="mr-2">
                    <Save className="h-4 w-4 mr-2" />
                    Backup Now
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    System Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Analytics Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>System Analytics</span>
          </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-blue-600">{mockStats.totalUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Doctors</p>
                      <p className="text-2xl font-bold text-green-600">{mockStats.totalDoctors}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Patients</p>
                      <p className="text-2xl font-bold text-purple-600">{mockStats.totalPatients}</p>
                    </div>
                    <Activity className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Departments</p>
                      <p className="text-2xl font-bold text-orange-600">{mockDepartments.length}</p>
                    </div>
                    <Building className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">New user registered</p>
                      <p className="text-xs text-gray-500">Jane Doe joined as patient - 2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Edit className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Role updated</p>
                      <p className="text-xs text-gray-500">John Smith role changed to doctor - 5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Save className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">System backup completed</p>
                      <p className="text-xs text-gray-500">Automated backup successful - 1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </RoleBasedLayout>
  );
}