import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Activity, 
  Building, 
  Shield,
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  UserCheck,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick
} from "lucide-react";

interface DashboardStats {
  systemOverview: {
    totalUsers: number;
    activeUsers: number;
    totalPatients: number;
    totalDoctors: number;
    totalNurses: number;
    totalStaff: number;
    systemUptime: string;
    lastBackup: string;
    storageUsed: string;
    storageLimit: string;
  };
  userActivity: {
    todayLogins: number;
    weeklyActive: number;
    monthlyActive: number;
    newRegistrations: number;
    roleDistribution: Record<string, number>;
  };
  operationalMetrics: {
    todayAppointments: number;
    pendingAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    queueLength: number;
    averageWaitTime: string;
    totalRevenue: number;
    monthlyRevenue: number;
  };
  securityMetrics: {
    failedLogins: number;
    securityAlerts: number;
    suspiciousActivity: number;
    blockedIPs: number;
    auditLogEntries: number;
  };
  departmentStats: Array<{
    name: string;
    patients: number;
    staff: number;
    occupancy: number;
  }>;
}

interface SystemHealth {
  overall: string;
  services: Array<{
    name: string;
    status: string;
    uptime: string;
    responseTime: string;
  }>;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  alerts: Array<{
    id: number;
    level: string;
    message: string;
    timestamp: string;
  }>;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard-stats"],
    retry: false,
  });

  const { data: systemHealth, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ["/api/admin/system-health"],
    retry: false,
  });

  if (statsLoading || healthLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-600";
      case "warning": return "text-yellow-600";
      case "critical": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy": return "bg-green-100 text-green-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      case "critical": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-blue-600">{dashboardStats?.systemOverview.totalUsers}</p>
                    <p className="text-xs text-green-600">+{dashboardStats?.userActivity.newRegistrations} this week</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Today</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardStats?.userActivity.todayLogins}</p>
                    <p className="text-xs text-gray-500">{dashboardStats?.userActivity.weeklyActive} this week</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">₹{dashboardStats?.operationalMetrics.monthlyRevenue.toLocaleString()}</p>
                    <p className="text-xs text-green-600">+12.5% from last month</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Uptime</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardStats?.systemOverview.systemUptime}</p>
                    <p className="text-xs text-gray-500">Last 30 days</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Role Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Role Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {dashboardStats?.userActivity.roleDistribution && Object.entries(dashboardStats.userActivity.roleDistribution).map(([role, count]) => (
                  <div key={role} className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{count}</p>
                    <p className="text-sm text-gray-600 capitalize">{role.replace('-', ' ')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Department Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardStats?.departmentStats.map((dept) => (
                  <div key={dept.name} className="p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">{dept.name}</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Patients:</span>
                        <span className="font-medium">{dept.patients}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Staff:</span>
                        <span className="font-medium">{dept.staff}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Occupancy:</span>
                          <span className="font-medium">{dept.occupancy}%</span>
                        </div>
                        <Progress value={dept.occupancy} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-blue-600">{dashboardStats?.systemOverview.totalUsers}</p>
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
                    <p className="text-2xl font-bold text-green-600">{dashboardStats?.systemOverview.activeUsers}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">New This Week</p>
                    <p className="text-2xl font-bold text-purple-600">{dashboardStats?.userActivity.newRegistrations}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Activity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{dashboardStats?.userActivity.todayLogins}</p>
                  <p className="text-sm text-gray-600">Today's Logins</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{dashboardStats?.userActivity.weeklyActive}</p>
                  <p className="text-sm text-gray-600">Weekly Active</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{dashboardStats?.userActivity.monthlyActive}</p>
                  <p className="text-sm text-gray-600">Monthly Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                    <p className="text-2xl font-bold text-blue-600">{dashboardStats?.operationalMetrics.todayAppointments}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Queue Length</p>
                    <p className="text-2xl font-bold text-orange-600">{dashboardStats?.operationalMetrics.queueLength}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardStats?.operationalMetrics.averageWaitTime}</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">₹{dashboardStats?.operationalMetrics.totalRevenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Appointment Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{dashboardStats?.operationalMetrics.completedAppointments}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600">{dashboardStats?.operationalMetrics.pendingAppointments}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{dashboardStats?.operationalMetrics.cancelledAppointments}</p>
                  <p className="text-sm text-gray-600">Cancelled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Failed Logins</p>
                    <p className="text-2xl font-bold text-red-600">{dashboardStats?.securityMetrics.failedLogins}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Security Alerts</p>
                    <p className="text-2xl font-bold text-yellow-600">{dashboardStats?.securityMetrics.securityAlerts}</p>
                  </div>
                  <Shield className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Blocked IPs</p>
                    <p className="text-2xl font-bold text-blue-600">{dashboardStats?.securityMetrics.blockedIPs}</p>
                  </div>
                  <Server className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Audit Entries</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardStats?.securityMetrics.auditLogEntries}</p>
                  </div>
                  <Database className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-6">
          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">CPU Usage</span>
                  <Cpu className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-blue-600">{systemHealth?.metrics.cpuUsage}%</p>
                  <Progress value={systemHealth?.metrics.cpuUsage} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Memory Usage</span>
                  <MemoryStick className="h-4 w-4 text-green-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-green-600">{systemHealth?.metrics.memoryUsage}%</p>
                  <Progress value={systemHealth?.metrics.memoryUsage} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Disk Usage</span>
                  <HardDrive className="h-4 w-4 text-purple-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-purple-600">{systemHealth?.metrics.diskUsage}%</p>
                  <Progress value={systemHealth?.metrics.diskUsage} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Network Latency</span>
                  <Wifi className="h-4 w-4 text-orange-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-orange-600">{systemHealth?.metrics.networkLatency}ms</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemHealth?.services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${service.status === 'healthy' ? 'bg-green-500' : service.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusBadge(service.status)}>
                        {service.status}
                      </Badge>
                      <span className="text-sm text-gray-600">Uptime: {service.uptime}</span>
                      <span className="text-sm text-gray-600">Response: {service.responseTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Alerts */}
          {systemHealth?.alerts && systemHealth.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemHealth.alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium text-yellow-800">{alert.message}</p>
                        <p className="text-xs text-yellow-600 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {alert.level}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}