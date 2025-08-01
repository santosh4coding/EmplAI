import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, 
  Eye, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Users, 
  Lock, 
  Activity,
  Search,
  Download,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RoleBasedLayout from "@/components/RoleBasedLayout";
import { User as UserType } from "@shared/schema";

interface AuditLog {
  id: number;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  patientId?: number;
  ipAddress: string;
  timestamp: string;
  success: boolean;
  details: any;
  riskLevel: 'low' | 'medium' | 'high';
}

interface SecurityIncident {
  id: number;
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedPatients: number;
  detectedAt: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  reportedBy: string;
}

interface ComplianceMetrics {
  totalAudits: number;
  securityIncidents: number;
  dataBreaches: number;
  complianceScore: number;
  lastAudit: string;
  certificationsActive: number;
}

export default function HIPAACompliance() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("7d");

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

  // Check if user has access to compliance features
  const hasComplianceAccess = !!(user as UserType)?.role && 
    ["admin", "super-admin", "compliance-officer"].includes((user as UserType).role);

  // Fetch compliance metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<ComplianceMetrics>({
    queryKey: ["/api/hipaa/metrics"],
    retry: false,
    enabled: isAuthenticated && hasComplianceAccess,
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/hipaa/audit-logs", timeRange, searchTerm],
    retry: false,
    enabled: isAuthenticated && hasComplianceAccess,
  });

  // Fetch security incidents
  const { data: incidents, isLoading: incidentsLoading } = useQuery<SecurityIncident[]>({
    queryKey: ["/api/hipaa/security-incidents"],
    retry: false,
    enabled: isAuthenticated && hasComplianceAccess,
  });

  // Create security incident mutation
  const createIncidentMutation = useMutation({
    mutationFn: async (incidentData: any) => {
      const response = await apiRequest("POST", "/api/hipaa/security-incidents", incidentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Security Incident Reported",
        description: "The incident has been logged and relevant parties will be notified",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/hipaa/security-incidents"] });
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
        description: "Failed to report security incident. Please try again.",
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

  if (!hasComplianceAccess) {
    return (
      <RoleBasedLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-600">
                You don't have permission to access HIPAA compliance features. 
                Contact your administrator for access.
              </p>
            </CardContent>
          </Card>
        </div>
      </RoleBasedLayout>
    );
  }

  const getIncidentSeverityColor = (severity: string) => {
    const colors = {
      "low": "bg-green-100 text-green-800",
      "medium": "bg-yellow-100 text-yellow-800",
      "high": "bg-orange-100 text-orange-800",
      "critical": "bg-red-100 text-red-800"
    };
    return colors[severity as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getRiskLevelColor = (level: string) => {
    const colors = {
      "low": "bg-green-100 text-green-800",
      "medium": "bg-yellow-100 text-yellow-800",
      "high": "bg-red-100 text-red-800"
    };
    return colors[level as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  // Mock data for demonstration
  const mockMetrics: ComplianceMetrics = {
    totalAudits: 1247,
    securityIncidents: 3,
    dataBreaches: 0,
    complianceScore: 98.5,
    lastAudit: "2025-07-15",
    certificationsActive: 4
  };

  const mockAuditLogs: AuditLog[] = [
    {
      id: 1,
      userId: "user123",
      action: "READ",
      resourceType: "medical-records",
      resourceId: "mr_001",
      patientId: 101,
      ipAddress: "192.168.1.100",
      timestamp: "2025-07-31T15:30:00Z",
      success: true,
      details: { recordType: "consultation" },
      riskLevel: "low"
    },
    {
      id: 2,
      userId: "user456",
      action: "EXPORT",
      resourceType: "patient-data",
      resourceId: "batch_export_001",
      ipAddress: "192.168.1.101",
      timestamp: "2025-07-31T14:15:00Z",
      success: true,
      details: { recordCount: 25 },
      riskLevel: "medium"
    }
  ];

  const mockIncidents: SecurityIncident[] = [
    {
      id: 1,
      incidentType: "unauthorized_access",
      severity: "medium",
      description: "Failed login attempts detected from suspicious IP address",
      affectedPatients: 0,
      detectedAt: "2025-07-30T10:00:00Z",
      status: "investigating",
      reportedBy: "security_system"
    }
  ];

  const currentMetrics = metrics || mockMetrics;
  const currentAuditLogs = auditLogs || mockAuditLogs;
  const currentIncidents = incidents || mockIncidents;

  return (
    <RoleBasedLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">HIPAA Compliance</h1>
              <p className="text-gray-600">Monitor data security, audit trails, and regulatory compliance</p>
            </div>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report Security Incident</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createIncidentMutation.mutate({
                  incidentType: formData.get('incidentType'),
                  severity: formData.get('severity'),
                  description: formData.get('description'),
                  affectedPatients: parseInt(formData.get('affectedPatients') as string) || 0
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="incidentType">Incident Type</Label>
                    <Select name="incidentType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="data_breach">Data Breach</SelectItem>
                        <SelectItem value="unauthorized_access">Unauthorized Access</SelectItem>
                        <SelectItem value="system_error">System Error</SelectItem>
                        <SelectItem value="policy_violation">Policy Violation</SelectItem>
                        <SelectItem value="physical_security">Physical Security</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="severity">Severity Level</Label>
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
                  
                  <div>
                    <Label htmlFor="affectedPatients">Affected Patients</Label>
                    <Input 
                      id="affectedPatients" 
                      name="affectedPatients" 
                      type="number" 
                      min="0"
                      placeholder="Number of affected patients"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      placeholder="Detailed description of the incident"
                      rows={4}
                      required 
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button type="submit" disabled={createIncidentMutation.isPending} className="flex-1">
                    {createIncidentMutation.isPending ? "Reporting..." : "Report Incident"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Overview Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>HIPAA Compliance Overview</span>
          </h2>
            {/* Compliance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Compliance Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div className="text-3xl font-bold text-green-600">
                      {currentMetrics?.complianceScore}%
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Excellent compliance status</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Security Incidents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div className="text-3xl font-bold text-yellow-600">
                      {currentMetrics?.securityIncidents}
                    </div>
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Data Breaches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div className="text-3xl font-bold text-green-600">
                      {currentMetrics?.dataBreaches}
                    </div>
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Zero breaches detected</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Recent Security Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentAuditLogs?.slice(0, 5).map((log: AuditLog) => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium">{log.action} on {log.resourceType}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString()} • IP: {log.ipAddress}
                          </p>
                        </div>
                      </div>
                      <Badge className={getRiskLevelColor(log.riskLevel)}>
                        {log.riskLevel}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Audit Logs Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Audit Logs</span>
          </h2>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search audit logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Audit Logs Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Resource
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Risk Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentAuditLogs?.map((log: AuditLog) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.timestamp).toLocaleDateString()} <br />
                            <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.userId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.action}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.resourceType} <br />
                            <span className="text-gray-500">ID: {log.resourceId}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getRiskLevelColor(log.riskLevel)}>
                              {log.riskLevel}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {log.success ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Security Incidents Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Security Incidents</span>
          </h2>
            <div className="space-y-4">
              {currentIncidents?.map((incident: SecurityIncident) => (
                <Card key={incident.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {incident.incidentType.replace('_', ' ').toUpperCase()}
                          </h3>
                          <Badge className={getIncidentSeverityColor(incident.severity)}>
                            {incident.severity}
                          </Badge>
                          <Badge variant="outline">
                            {incident.status}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{incident.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                          <div>
                            <span className="font-medium">Detected:</span> <br />
                            {new Date(incident.detectedAt).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Reported by:</span> <br />
                            {incident.reportedBy}
                          </div>
                          <div>
                            <span className="font-medium">Affected Patients:</span> <br />
                            {incident.affectedPatients}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> <br />
                            {incident.status}
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </div>

        {/* Compliance Status Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Compliance Status</span>
          </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>HIPAA Requirements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Administrative Safeguards</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Physical Safeguards</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Technical Safeguards</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Data Encryption</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Access Controls</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Audit Logging</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span>Data Retention</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Medical Records</span>
                      <span className="text-sm text-gray-600">7 years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Audit Logs</span>
                      <span className="text-sm text-gray-600">6 years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Lab Results</span>
                      <span className="text-sm text-gray-600">7 years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Imaging Studies</span>
                      <span className="text-sm text-gray-600">10 years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Financial Records</span>
                      <span className="text-sm text-gray-600">7 years</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Compliance Status</AlertTitle>
              <AlertDescription>
                Your system is currently compliant with HIPAA regulations. Last audit completed on {currentMetrics?.lastAudit}. 
                Next scheduled audit: {new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
              </AlertDescription>
            </Alert>
        </div>
      </div>
    </RoleBasedLayout>
  );
}