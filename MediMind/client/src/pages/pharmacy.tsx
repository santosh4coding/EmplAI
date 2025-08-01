import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { 
  Pill, 
  Search, 
  Plus, 
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  ShoppingCart,
  Truck,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RoleBasedLayout from "@/components/RoleBasedLayout";

interface Medication {
  id: number;
  name: string;
  genericName: string;
  dosage: string;
  form: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  price: number;
  status: "available" | "low-stock" | "out-of-stock" | "expired";
}

interface Prescription {
  id: number;
  prescriptionId: string;
  patientName: string;
  doctorName: string;
  medications: Array<{
    name: string;
    dosage: string;
    quantity: number;
    instructions: string;
  }>;
  status: "pending" | "prepared" | "dispensed" | "cancelled";
  createdAt: string;
  total: number;
}

export default function Pharmacy() {
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();

  // Mock pharmacy data
  const pharmacyData = {
    inventory: [
      {
        id: 1,
        name: "Paracetamol",
        genericName: "Acetaminophen",
        dosage: "500mg",
        form: "Tablet",
        manufacturer: "ABC Pharma",
        batchNumber: "PAR001",
        expiryDate: "2025-12-31",
        quantity: 500,
        price: 2.50,
        status: "available" as const
      },
      {
        id: 2,
        name: "Amoxicillin",
        genericName: "Amoxicillin",
        dosage: "250mg",
        form: "Capsule",
        manufacturer: "XYZ Medicines",
        batchNumber: "AMX002",
        expiryDate: "2025-08-15",
        quantity: 50,
        price: 15.00,
        status: "low-stock" as const
      },
      {
        id: 3,
        name: "Lisinopril",
        genericName: "Lisinopril",
        dosage: "10mg",
        form: "Tablet",
        manufacturer: "MediCorp",
        batchNumber: "LIS003",
        expiryDate: "2024-06-30",
        quantity: 0,
        price: 8.75,
        status: "expired" as const
      }
    ],
    prescriptions: [
      {
        id: 1,
        prescriptionId: "RX001",
        patientName: "John Smith",
        doctorName: "Dr. Sarah Wilson",
        medications: [
          {
            name: "Paracetamol 500mg",
            dosage: "500mg",
            quantity: 30,
            instructions: "Take 1 tablet every 6 hours as needed"
          },
          {
            name: "Amoxicillin 250mg",
            dosage: "250mg",
            quantity: 21,
            instructions: "Take 1 capsule 3 times daily for 7 days"
          }
        ],
        status: "pending" as const,
        createdAt: "2025-07-31T10:30:00Z",
        total: 390.00
      },
      {
        id: 2,
        prescriptionId: "RX002",
        patientName: "Mary Johnson",
        doctorName: "Dr. Michael Chen",
        medications: [
          {
            name: "Lisinopril 10mg",
            dosage: "10mg",
            quantity: 30,
            instructions: "Take 1 tablet daily in the morning"
          }
        ],
        status: "prepared" as const,
        createdAt: "2025-07-31T09:15:00Z",
        total: 262.50
      }
    ],
    stats: {
      totalMedications: 1250,
      lowStockItems: 25,
      expiredItems: 8,
      pendingPrescriptions: 15,
      todayDispensed: 89,
      monthlyRevenue: 125000
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-800";
      case "low-stock": return "bg-yellow-100 text-yellow-800";
      case "out-of-stock": return "bg-red-100 text-red-800";
      case "expired": return "bg-gray-100 text-gray-800";
      case "pending": return "bg-blue-100 text-blue-800";
      case "prepared": return "bg-yellow-100 text-yellow-800";
      case "dispensed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available": return <CheckCircle className="h-4 w-4" />;
      case "low-stock": return <AlertCircle className="h-4 w-4" />;
      case "out-of-stock": return <AlertCircle className="h-4 w-4" />;
      case "expired": return <AlertCircle className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "prepared": return <Package className="h-4 w-4" />;
      case "dispensed": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Pill className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold">Pharmacy Management</h1>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Medication
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{pharmacyData.stats.totalMedications}</p>
                <p className="text-xs text-gray-600">Total Items</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{pharmacyData.stats.lowStockItems}</p>
                <p className="text-xs text-gray-600">Low Stock</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{pharmacyData.stats.expiredItems}</p>
                <p className="text-xs text-gray-600">Expired</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{pharmacyData.stats.pendingPrescriptions}</p>
                <p className="text-xs text-gray-600">Pending RX</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{pharmacyData.stats.todayDispensed}</p>
                <p className="text-xs text-gray-600">Dispensed Today</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <ShoppingCart className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">₹{pharmacyData.stats.monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Monthly Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Medication Inventory</h2>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Medication Inventory</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search medications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pharmacyData.inventory.map((medication) => (
                    <div key={medication.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Pill className="h-6 w-6 text-blue-600" />
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <h3 className="font-semibold text-lg">{medication.name}</h3>
                              <p className="text-sm text-gray-600">
                                Generic: {medication.genericName} | {medication.dosage} {medication.form}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Manufacturer:</span>
                                <p className="font-medium">{medication.manufacturer}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Batch:</span>
                                <p className="font-medium">{medication.batchNumber}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Expiry:</span>
                                <p className="font-medium">{new Date(medication.expiryDate).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Price:</span>
                                <p className="font-medium">₹{medication.price}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{medication.quantity}</p>
                            <p className="text-sm text-gray-600">In Stock</p>
                          </div>
                          
                          <Badge className={getStatusColor(medication.status)}>
                            {getStatusIcon(medication.status)}
                            <span className="ml-1">{medication.status.replace('-', ' ')}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Prescriptions Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Prescription Management</h2>
            <Card>
              <CardHeader>
                <CardTitle>Prescription Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pharmacyData.prescriptions.map((prescription) => (
                    <div key={prescription.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <FileText className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{prescription.prescriptionId}</h3>
                              <p className="text-sm text-gray-600">
                                Patient: {prescription.patientName} | Doctor: {prescription.doctorName}
                              </p>
                            </div>
                          </div>
                          
                          <div className="ml-14">
                            <h4 className="font-medium mb-2">Medications:</h4>
                            <div className="space-y-1">
                              {prescription.medications.map((med, index) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium">{med.name}</span> - 
                                  Qty: {med.quantity} - {med.instructions}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-lg font-bold">₹{prescription.total}</p>
                            <p className="text-sm text-gray-600">Total</p>
                          </div>
                          
                          <Badge className={getStatusColor(prescription.status)}>
                            {getStatusIcon(prescription.status)}
                            <span className="ml-1">{prescription.status}</span>
                          </Badge>
                          
                          <div className="flex space-x-2">
                            {prescription.status === "pending" && (
                              <Button size="sm">Prepare</Button>
                            )}
                            {prescription.status === "prepared" && (
                              <Button size="sm">Dispense</Button>
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

        {/* Purchase Orders & Reports Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Truck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Purchase Orders</h3>
              <p className="text-gray-500 mb-4">Manage medication purchase orders and supplier relationships</p>
              <Button>Create New Order</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Pharmacy Reports</h3>
              <p className="text-gray-500 mb-4">Generate inventory reports, sales analytics, and compliance documents</p>
              <Button>Generate Report</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleBasedLayout>
  );
}