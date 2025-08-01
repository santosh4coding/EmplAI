import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";  
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { User as UserType } from "@shared/schema";
import RoleBasedLayout from "@/components/RoleBasedLayout";
import { 
  Calendar, 
  Users, 
  Activity, 
  Clock,
  AlertTriangle,
  Hospital,
  FileText,
  CreditCard,
  Bell,
  ShieldCheck
} from "lucide-react";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
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

  // Mock data for dashboard
  const dashboardData = {
    appointments: 12,
    patients: 45,
    consultations: 8,
    records: 156,
    alerts: 2,
    checkins: 23,
    billing: 5,
    totalUsers: 89,
    systemActivity: 142,
    securityAlerts: 0,
    revenue: "₹45,000"
  };

  const notifications = [
    {
      id: 1,
      title: "Appointment Reminder",
      message: "You have 3 appointments scheduled for today",
      timestamp: "2025-07-31T10:00:00Z"
    },
    {
      id: 2,
      title: "System Update",
      message: "System maintenance scheduled for tonight",
      timestamp: "2025-07-31T09:30:00Z"
    }
  ];

  const queueStatus = [
    { id: 1, patientName: "John Doe", waitTime: 15 },
    { id: 2, patientName: "Jane Smith", waitTime: 8 }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const typedUser = user as UserType;

  // Show message for users with patient role (waiting for admin role assignment)
  if (typedUser.role === 'patient' && !typedUser.department) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Hospital className="h-12 w-12 text-blue-600 mr-4" />
              <div>
                <CardTitle className="text-2xl">Welcome to MediDesk Pro</CardTitle>
                <p className="text-gray-600 mt-2">Account Setup Required</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Account Pending Role Assignment</AlertTitle>
              <AlertDescription className="mt-2">
                Your account has been created successfully, but you need an administrator to assign your role and permissions before you can access the system features.
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Current Account Status:</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-blue-800">Name:</span>
                  <span className="font-medium">{typedUser.firstName} {typedUser.lastName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-800">Email:</span>
                  <span className="font-medium">{typedUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-800">Current Role:</span>
                  <Badge className="bg-gray-100 text-gray-800">Pending Assignment</Badge>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-900 mb-2">What happens next?</h3>
              <ul className="text-yellow-800 space-y-1 text-sm">
                <li>• A system administrator will review your account</li>
                <li>• Your role will be assigned based on your position in the hospital</li>
                <li>• You'll receive access to features appropriate for your role</li>
                <li>• You may need to log out and back in after role assignment</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">Need immediate access?</h3>
              <p className="text-green-800 text-sm mb-3">
                Contact your system administrator or IT department to expedite your role assignment.
              </p>
              <div className="text-sm text-green-700">
                <p><strong>Administrator roles that can help:</strong></p>
                <p>• Hospital Administrator</p>
                <p>• IT Support</p>
                <p>• System Super Administrator</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="flex items-center"
              >
                <Activity className="h-4 w-4 mr-2" />
                Check Status Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Role-specific dashboard content
  const getDashboardCards = () => {
    const role = typedUser.role;
    const commonCards = [
      {
        title: "Today's Appointments",
        value: dashboardData?.appointments || "0",
        icon: Calendar,
        color: "text-blue-600"
      },
      {
        title: "Active Patients",
        value: dashboardData?.patients || "0", 
        icon: Users,
        color: "text-green-600"
      }
    ];

    switch (role) {
      case 'doctor':
        return [
          ...commonCards,
          {
            title: "Pending Consultations",
            value: dashboardData?.consultations || "0",
            icon: Activity,
            color: "text-orange-600"
          },
          {
            title: "Medical Records",
            value: dashboardData?.records || "0",
            icon: FileText,
            color: "text-purple-600"
          }
        ];
      
      case 'nurse':
        return [
          ...commonCards,
          {
            title: "Queue Status",
            value: queueStatus?.length || "0",
            icon: Clock,
            color: "text-orange-600"
          },
          {
            title: "Emergency Alerts",
            value: dashboardData?.alerts || "0",
            icon: AlertTriangle,
            color: "text-red-600"
          }
        ];
      
      case 'front-desk':
        return [
          ...commonCards,
          {
            title: "Today's Check-ins",
            value: dashboardData?.checkins || "0",
            icon: Clock,
            color: "text-orange-600"
          },
          {
            title: "Billing Pending",
            value: dashboardData?.billing || "0",
            icon: CreditCard,
            color: "text-purple-600"
          }
        ];
      
      case 'admin':
      case 'super-admin':
        return [
          {
            title: "Total Users",
            value: dashboardData?.totalUsers || "0",
            icon: Users,
            color: "text-blue-600"
          },
          {
            title: "System Activity",
            value: dashboardData?.systemActivity || "0",
            icon: Activity,
            color: "text-green-600"
          },
          {
            title: "Security Alerts",
            value: dashboardData?.securityAlerts || "0", 
            icon: AlertTriangle,
            color: "text-red-600"
          },
          {
            title: "Daily Revenue",
            value: dashboardData?.revenue || "₹0",
            icon: CreditCard,
            color: "text-purple-600"
          }
        ];
      
      default:
        return commonCards;
    }
  };

  return (
    <RoleBasedLayout>
      <div className="p-6">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {typedUser.firstName}!
          </h1>
          <p className="text-gray-600 mt-2">
            {typedUser.role.replace('-', ' ').toUpperCase()} Dashboard
            {typedUser.department && ` • ${typedUser.department}`}
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {getDashboardCards().map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Notifications */}
        {notifications && notifications.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notification, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Bell className="h-4 w-4 text-blue-600 mt-1" />
                    <div>
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-gray-600 text-sm">{notification.message}</p>
                      <p className="text-gray-500 text-xs mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {typedUser.role === 'patient' && (
                <>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Calendar className="h-6 w-6 mb-2" />
                    Book Appointment
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <FileText className="h-6 w-6 mb-2" />
                    View Records
                  </Button>
                </>
              )}
              
              {['doctor', 'nurse'].includes(typedUser.role) && (
                <>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    Patient Queue
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <FileText className="h-6 w-6 mb-2" />
                    Medical Records
                  </Button>
                </>
              )}
              
              {typedUser.role === 'front-desk' && (
                <>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    Check-in Patient
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Calendar className="h-6 w-6 mb-2" />
                    Schedule Appointment
                  </Button>
                </>
              )}
              
              {['admin', 'super-admin'].includes(typedUser.role) && (
                <>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    Manage Users
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Activity className="h-6 w-6 mb-2" />
                    System Reports
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleBasedLayout>
  );
}