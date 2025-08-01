import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Shield, 
  User, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface AuditLog {
  id: number;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
  details: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export function AuditLogViewer() {
  const [currentPage, setCurrentPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: auditData, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ["/api/admin/audit-logs", currentPage, actionFilter, userFilter],
    retry: false,
  });

  const getActionBadge = (action: string, success: boolean) => {
    if (!success) {
      return "bg-red-100 text-red-800";
    }
    
    switch (action) {
      case "USER_LOGIN":
        return "bg-green-100 text-green-800";
      case "ROLE_UPDATED":
        return "bg-blue-100 text-blue-800";
      case "PATIENT_ACCESS":
        return "bg-purple-100 text-purple-800";
      case "FAILED_LOGIN":
        return "bg-red-100 text-red-800";
      case "USER_SIGNUP":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionIcon = (action: string, success: boolean) => {
    if (!success) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    
    switch (action) {
      case "USER_LOGIN":
        return <CheckCircle className="h-4 w-4" />;
      case "ROLE_UPDATED":
        return <User className="h-4 w-4" />;
      case "PATIENT_ACCESS":
        return <Shield className="h-4 w-4" />;
      case "FAILED_LOGIN":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-2xl font-bold">Audit Logs</h2>
        </div>
        <Badge variant="outline" className="text-sm">
          {auditData?.totalCount} total entries
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="USER_LOGIN">User Login</SelectItem>
                <SelectItem value="ROLE_UPDATED">Role Updated</SelectItem>
                <SelectItem value="PATIENT_ACCESS">Patient Access</SelectItem>
                <SelectItem value="FAILED_LOGIN">Failed Login</SelectItem>
                <SelectItem value="USER_SIGNUP">User Signup</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by User ID"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditData?.logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(log.action, log.success)}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={getActionBadge(log.action, log.success)}>
                        {formatAction(log.action)}
                      </Badge>
                      {!log.success && (
                        <Badge variant="destructive" className="text-xs">
                          Failed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{log.details}</p>
                    <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                      <span><strong>User:</strong> {log.userId}</span>
                      <span><strong>Resource:</strong> {log.resourceType}</span>
                      <span><strong>IP:</strong> {log.ipAddress}</span>
                      <span><strong>ID:</strong> {log.resourceId}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {auditData && auditData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-500">
                Page {auditData.currentPage} of {auditData.totalPages} 
                ({auditData.totalCount} total entries)
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= auditData.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}