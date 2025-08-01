import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { 
  Shield, 
  Search, 
  Plus, 
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Users,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RoleBasedLayout from "@/components/RoleBasedLayout";

interface InsuranceClaim {
  id: number;
  claimId: string;
  patientName: string;
  policyNumber: string;
  provider: string;
  claimAmount: number;
  approvedAmount: number;
  status: "pending" | "approved" | "rejected" | "processing";
  submittedDate: string;
  serviceDate: string;
  diagnosis: string;
  treatment: string;
}

interface InsurancePolicy {
  id: number;
  policyNumber: string;
  patientName: string;
  provider: string;
  policyType: string;
  coverageAmount: number;
  deductible: number;
  copay: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "suspended";
}

export default function Insurance() {
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();

  // Mock insurance data
  const insuranceData = {
    claims: [
      {
        id: 1,
        claimId: "CLM001",
        patientName: "John Smith",
        policyNumber: "POL123456",
        provider: "HealthCare Plus",
        claimAmount: 5000,
        approvedAmount: 4500,
        status: "approved" as const,
        submittedDate: "2025-07-25",
        serviceDate: "2025-07-20",
        diagnosis: "Acute Appendicitis",
        treatment: "Appendectomy"
      },
      {
        id: 2,
        claimId: "CLM002",
        patientName: "Sarah Johnson",
        policyNumber: "POL789012",
        provider: "MediCare Shield",
        claimAmount: 2500,
        approvedAmount: 0,
        status: "pending" as const,
        submittedDate: "2025-07-30",
        serviceDate: "2025-07-28",
        diagnosis: "Hypertension",
        treatment: "Consultation & Medication"
      },
      {
        id: 3,
        claimId: "CLM003",
        patientName: "Mike Wilson",
        policyNumber: "POL345678",
        provider: "Universal Health",
        claimAmount: 8000,
        approvedAmount: 0,
        status: "processing" as const,
        submittedDate: "2025-07-29",
        serviceDate: "2025-07-26",
        diagnosis: "Fractured Femur",
        treatment: "Orthopedic Surgery"
      }
    ],
    policies: [
      {
        id: 1,
        policyNumber: "POL123456",
        patientName: "John Smith",
        provider: "HealthCare Plus",
        policyType: "Comprehensive",
        coverageAmount: 500000,
        deductible: 10000,
        copay: 20,
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        status: "active" as const
      },
      {
        id: 2,
        policyNumber: "POL789012",
        patientName: "Sarah Johnson",
        provider: "MediCare Shield",
        policyType: "Basic",
        coverageAmount: 200000,
        deductible: 5000,
        copay: 30,
        startDate: "2025-06-01",
        endDate: "2026-05-31",
        status: "active" as const
      },
      {
        id: 3,
        policyNumber: "POL345678",
        patientName: "Mike Wilson",
        provider: "Universal Health",
        policyType: "Premium",
        coverageAmount: 1000000,
        deductible: 15000,
        copay: 10,
        startDate: "2024-03-01",
        endDate: "2025-02-28",
        status: "expired" as const
      }
    ],
    stats: {
      totalClaims: 145,
      pendingClaims: 23,
      approvedClaims: 98,
      rejectedClaims: 24,
      totalClaimAmount: 2450000,
      approvedAmount: 2100000,
      activePolicies: 567,
      expiredPolicies: 45
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "active": return "bg-green-100 text-green-800";
      case "expired": return "bg-red-100 text-red-800";
      case "suspended": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "rejected": return <AlertCircle className="h-4 w-4" />;
      case "processing": return <Clock className="h-4 w-4" />;
      case "active": return <CheckCircle className="h-4 w-4" />;
      case "expired": return <AlertCircle className="h-4 w-4" />;
      case "suspended": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold">Insurance Management</h1>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Claim
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Claims</p>
                  <p className="text-2xl font-bold text-blue-600">{insuranceData.stats.totalClaims}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Claims</p>
                  <p className="text-2xl font-bold text-yellow-600">{insuranceData.stats.pendingClaims}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved Amount</p>
                  <p className="text-2xl font-bold text-green-600">₹{insuranceData.stats.approvedAmount.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Policies</p>
                  <p className="text-2xl font-bold text-purple-600">{insuranceData.stats.activePolicies}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Claims Management Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Insurance Claims</h2>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Insurance Claims</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search claims..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insuranceData.claims.map((claim) => (
                    <div key={claim.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Shield className="h-6 w-6 text-blue-600" />
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <h3 className="font-semibold text-lg">{claim.claimId}</h3>
                              <p className="text-sm text-gray-600">
                                Patient: {claim.patientName} | Policy: {claim.policyNumber}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Provider:</span>
                                <p className="font-medium">{claim.provider}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Diagnosis:</span>
                                <p className="font-medium">{claim.diagnosis}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Service Date:</span>
                                <p className="font-medium">{new Date(claim.serviceDate).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Treatment:</span>
                                <p className="font-medium">{claim.treatment}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-lg font-bold">₹{claim.claimAmount.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">Claimed</p>
                            {claim.approvedAmount > 0 && (
                              <p className="text-sm text-green-600">
                                Approved: ₹{claim.approvedAmount.toLocaleString()}
                              </p>
                            )}
                          </div>
                          
                          <Badge className={getStatusColor(claim.status)}>
                            {getStatusIcon(claim.status)}
                            <span className="ml-1">{claim.status}</span>
                          </Badge>
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                            {claim.status === "pending" && (
                              <Button size="sm">Process</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Policy Management Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Insurance Policies</h2>
            <Card>
              <CardHeader>
                <CardTitle>Insurance Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insuranceData.policies.map((policy) => (
                    <div key={policy.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Users className="h-6 w-6 text-green-600" />
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <h3 className="font-semibold text-lg">{policy.policyNumber}</h3>
                              <p className="text-sm text-gray-600">
                                Patient: {policy.patientName} | {policy.provider}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Type:</span>
                                <p className="font-medium">{policy.policyType}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Coverage:</span>
                                <p className="font-medium">₹{policy.coverageAmount.toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Deductible:</span>
                                <p className="font-medium">₹{policy.deductible.toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Copay:</span>
                                <p className="font-medium">{policy.copay}%</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                Valid: {new Date(policy.startDate).toLocaleDateString()} - {new Date(policy.endDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <Badge className={getStatusColor(policy.status)}>
                            {getStatusIcon(policy.status)}
                            <span className="ml-1">{policy.status}</span>
                          </Badge>
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              View Policy
                            </Button>
                            {policy.status === "expired" && (
                              <Button size="sm">Renew</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Pre-Authorization & Reports Section */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Pre-Authorization</h3>
                <p className="text-gray-500 mb-4">Manage treatment pre-authorization requests and approvals</p>
                <Button>New Pre-Auth Request</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Claims Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Approval Rate</span>
                    <span className="font-bold text-green-600">78.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Processing Time</span>
                    <span className="font-bold">3.2 days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Claims Value</span>
                    <span className="font-bold">₹{insuranceData.stats.totalClaimAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Policy Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Active Policies</span>
                    <span className="font-bold text-green-600">{insuranceData.stats.activePolicies}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Expired Policies</span>
                    <span className="font-bold text-red-600">{insuranceData.stats.expiredPolicies}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Renewal Rate</span>
                    <span className="font-bold">82.3%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleBasedLayout>
  );
}