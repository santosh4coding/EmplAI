import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";
import { 
  Home, 
  Users, 
  Calendar, 
  Activity, 
  Settings, 
  LogOut, 
  User,
  Stethoscope,
  Pill,
  FileText,
  Shield,
  UserCheck,
  Building2,
  CreditCard,
  HeadphonesIcon
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { User as UserType } from "@shared/schema";

interface RoleBasedLayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  path: string;
  label: string;
  icon: ReactNode;
  roles: string[];
}

const navigationItems: NavigationItem[] = [
  {
    path: "/",
    label: "Dashboard",
    icon: <Home className="h-4 w-4" />,
    roles: ["patient", "doctor", "nurse", "front-desk", "admin", "super-admin", "insurance", "pharmacy", "department-head", "ssd"]
  },
  {
    path: "/patients",
    label: "Patients",
    icon: <Users className="h-4 w-4" />,
    roles: ["doctor", "nurse", "front-desk", "admin", "super-admin", "department-head"]
  },
  {
    path: "/appointments",
    label: "Appointments",
    icon: <Calendar className="h-4 w-4" />,
    roles: ["patient", "doctor", "nurse", "front-desk", "admin", "super-admin", "department-head"]
  },
  {
    path: "/queue-management",
    label: "Queue Management",
    icon: <Activity className="h-4 w-4" />,
    roles: ["front-desk", "nurse", "admin", "super-admin", "department-head"]
  },
  {
    path: "/medical-records",
    label: "Medical Records",
    icon: <FileText className="h-4 w-4" />,
    roles: ["patient", "doctor", "nurse", "admin", "super-admin", "department-head"]
  },
  {
    path: "/emr-dashboard",
    label: "EMR Dashboard",
    icon: <Stethoscope className="h-4 w-4" />,
    roles: ["doctor", "nurse", "admin", "super-admin", "department-head"]
  },
  {
    path: "/pharmacy",
    label: "Pharmacy",
    icon: <Pill className="h-4 w-4" />,
    roles: ["pharmacy", "doctor", "admin", "super-admin"]
  },
  {
    path: "/insurance",
    label: "Insurance",
    icon: <CreditCard className="h-4 w-4" />,
    roles: ["insurance", "front-desk", "admin", "super-admin"]
  },
  {
    path: "/administration",
    label: "Administration",
    icon: <Building2 className="h-4 w-4" />,
    roles: ["admin", "super-admin", "department-head"]
  },
  {
    path: "/support",
    label: "Support",
    icon: <HeadphonesIcon className="h-4 w-4" />,
    roles: ["ssd", "admin", "super-admin"]
  },
  {
    path: "/security",
    label: "Security",
    icon: <Shield className="h-4 w-4" />,
    roles: ["super-admin"]
  },
  {
    path: "/admin",
    label: "Administration",
    icon: <UserCheck className="h-4 w-4" />,
    roles: ["admin", "super-admin"]
  },
  {
    path: "/settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
    roles: ["patient", "doctor", "nurse", "front-desk", "admin", "super-admin", "insurance", "pharmacy", "department-head", "ssd"]
  }
];

const getRoleDisplayName = (role: string) => {
  const roleMap: Record<string, string> = {
    "patient": "Patient",
    "doctor": "Doctor",
    "nurse": "Nurse",
    "front-desk": "Front Desk",
    "admin": "Administrator",
    "super-admin": "Super Admin",
    "insurance": "Insurance",
    "pharmacy": "Pharmacy",
    "department-head": "Department Head",
    "ssd": "System Support"
  };
  return roleMap[role] || role;
};

const getRoleColor = (role: string) => {
  const colorMap: Record<string, string> = {
    "patient": "bg-blue-500",
    "doctor": "bg-green-600",
    "nurse": "bg-purple-500",
    "front-desk": "bg-orange-500",
    "admin": "bg-red-600",
    "super-admin": "bg-gray-800",
    "insurance": "bg-yellow-600",
    "pharmacy": "bg-teal-600",
    "department-head": "bg-indigo-600",
    "ssd": "bg-pink-600"
  };
  return colorMap[role] || "bg-gray-500";
};

export default function RoleBasedLayout({ children }: RoleBasedLayoutProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      // Clear the query cache
      queryClient.clear();
      // Redirect to logout endpoint
      window.location.href = "/api/logout";
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect anyway
      window.location.href = "/api/logout";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Access Required</h2>
            <p className="text-gray-600 mb-6">Please log in to access the hospital management system.</p>
            <Button onClick={() => window.location.href = "/api/login"}>
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = (user as UserType)?.role || "";
  const allowedNavItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Stethoscope className="h-8 w-8 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">MediDesk Pro</h1>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {(user as UserType)?.firstName} {(user as UserType)?.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {(user as UserType)?.email}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={`${getRoleColor(userRole)} text-white`}>
                  {getRoleDisplayName(userRole)}
                </Badge>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="p-4 space-y-2">
            {allowedNavItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      isActive 
                        ? "bg-green-600 text-white hover:bg-green-700" 
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}