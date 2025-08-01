import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// Razorpay integration instead of Stripe
// import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
// import { loadStripe } from '@stripe/stripe-js';
import { 
  CreditCard, 
  DollarSign, 
  Receipt, 
  RefreshCw, 
  Download, 
  Eye, 
  Plus,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RoleBasedLayout from "@/components/RoleBasedLayout";
import { User as UserType } from "@shared/schema";

// Razorpay configuration
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface Bill {
  id: number;
  billNumber: string;
  patientName: string;
  totalAmount: number;
  paidAmount: number;
  status: 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  dueDate: string;
  createdAt: string;
  items: BillItem[];
}

interface BillItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

interface Payment {
  id: number;
  transactionId: string;
  patientName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  gateway: string;
  createdAt: string;
  description: string;
}

interface PaymentMethod {
  id: number;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

// Razorpay Payment Form Component
const RazorpayPaymentForm = ({ billId, amount, onSuccess }: { 
  billId: number; 
  amount: number; 
  onSuccess: () => void; 
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    loadRazorpayScript().then((loaded) => {
      setIsScriptLoaded(!!loaded);
    });
  }, []);

  const handlePayment = async () => {
    if (!isScriptLoaded) {
      toast({
        title: "Payment Error",
        description: "Payment system is not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create order on backend
      const response = await apiRequest('POST', '/api/billing/create-razorpay-order', {
        billId,
        amount,
      });

      const orderData = await response.json();

      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Configure Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mock', // Mock key for demo
        amount: amount, // Amount in paise
        currency: 'INR',
        name: 'MediDesk Pro',
        description: `Payment for Bill #${billId}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            const verifyResponse = await apiRequest('POST', '/api/billing/verify-razorpay-payment', {
              billId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            const verifyResult = await verifyResponse.json();

            if (verifyResult.success) {
              toast({
                title: "Payment Successful",
                description: "Your payment has been processed successfully",
              });
              onSuccess();
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error: any) {
            toast({
              title: "Payment Verification Failed",
              description: error.message || "Payment could not be verified",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: 'Patient Name',
          email: 'patient@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "An error occurred while processing your payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Razorpay Payment</h3>
        <p className="text-gray-600">Secure payment processing with Razorpay</p>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Payment Method</span>
          <span className="font-medium">Razorpay (UPI, Cards, Wallets)</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-600">Amount</span>
          <span className="text-xl font-bold">₹{(amount / 100).toFixed(2)}</span>
        </div>
      </div>

      <Button 
        onClick={handlePayment}
        disabled={!isScriptLoaded || isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Pay with Razorpay
          </>
        )}
      </Button>

      {!isScriptLoaded && (
        <p className="text-sm text-gray-500 text-center">Loading payment system...</p>
      )}
    </div>
  );
};

export default function Billing() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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

  // Fetch bills
  const { data: bills, isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ["/api/billing/bills", statusFilter, searchTerm],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch payments
  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/billing/payments"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch payment methods
  const { data: paymentMethods } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/billing/payment-methods"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async (billData: any) => {
      const response = await apiRequest("POST", "/api/billing/bills", billData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bill Created",
        description: "New bill has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/bills"] });
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
        description: "Failed to create bill. Please try again.",
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

  const getStatusColor = (status: string) => {
    const colors = {
      "pending": "bg-yellow-100 text-yellow-800",
      "paid": "bg-green-100 text-green-800",
      "partially_paid": "bg-blue-100 text-blue-800",
      "overdue": "bg-red-100 text-red-800",
      "cancelled": "bg-gray-100 text-gray-800",
      "succeeded": "bg-green-100 text-green-800",
      "failed": "bg-red-100 text-red-800",
      "refunded": "bg-purple-100 text-purple-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'succeeded':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Mock data for demonstration
  const mockBills: Bill[] = [
    {
      id: 1,
      billNumber: "INV-2025-001",
      patientName: "John Doe",
      totalAmount: 25000, // $250.00
      paidAmount: 0,
      status: "pending",
      dueDate: "2025-08-15",
      createdAt: "2025-07-31",
      items: [
        {
          id: 1,
          description: "General Consultation",
          quantity: 1,
          unitPrice: 15000,
          totalPrice: 15000,
          category: "consultation"
        },
        {
          id: 2,
          description: "Blood Test - Complete Panel",
          quantity: 1,
          unitPrice: 10000,
          totalPrice: 10000,
          category: "lab"
        }
      ]
    },
    {
      id: 2,
      billNumber: "INV-2025-002",
      patientName: "Jane Smith",
      totalAmount: 45000, // $450.00
      paidAmount: 45000,
      status: "paid",
      dueDate: "2025-08-10",
      createdAt: "2025-07-30",
      items: [
        {
          id: 3,
          description: "Cardiology Consultation",
          quantity: 1,
          unitPrice: 25000,
          totalPrice: 25000,
          category: "consultation"
        },
        {
          id: 4,
          description: "ECG Test",
          quantity: 1,
          unitPrice: 20000,
          totalPrice: 20000,
          category: "procedure"
        }
      ]
    }
  ];

  const mockPayments: Payment[] = [
    {
      id: 1,
      transactionId: "pi_1234567890",
      patientName: "Jane Smith",
      amount: 45000,
      currency: "USD",
      status: "succeeded",
      gateway: "stripe",
      createdAt: "2025-07-30T14:30:00Z",
      description: "Payment for consultation and ECG test"
    }
  ];

  const currentBills = bills || mockBills;
  const currentPayments = payments || mockPayments;

  const filteredBills = currentBills.filter(bill => {
    const matchesSearch = bill.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <RoleBasedLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Billing & Payments</h1>
              <p className="text-gray-600">Manage bills, process payments, and track transactions</p>
            </div>
          </div>
          
          {(user as UserType).role !== "patient" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Bill</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createBillMutation.mutate({
                    patientId: formData.get('patientId'),
                    description: formData.get('description'),
                    amount: parseFloat(formData.get('amount') as string) * 100,
                    dueDate: formData.get('dueDate'),
                  });
                }}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="patientId">Patient</Label>
                        <Input id="patientId" name="patientId" placeholder="Patient ID" required />
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount ($)</Label>
                        <Input id="amount" name="amount" type="number" step="0.01" required />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input id="description" name="description" placeholder="Bill description" required />
                    </div>
                    
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input id="dueDate" name="dueDate" type="date" required />
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-4">
                    <Button type="submit" disabled={createBillMutation.isPending} className="flex-1">
                      {createBillMutation.isPending ? "Creating..." : "Create Bill"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">$12,450</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Bills</p>
                  <p className="text-2xl font-bold text-yellow-600">8</p>
                </div>
                <Receipt className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">3</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-blue-600">$3,200</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bills & Invoices Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Bills & Invoices</span>
          </h2>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search bills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Bills List */}
            <div className="space-y-4">
              {filteredBills.map((bill) => (
                <Card key={bill.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{bill.billNumber}</h3>
                          <p className="text-sm text-gray-600">{bill.patientName}</p>
                          <p className="text-xs text-gray-500">Due: {new Date(bill.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold">${(bill.totalAmount / 100).toFixed(2)}</p>
                          {bill.paidAmount > 0 && (
                            <p className="text-sm text-gray-500">Paid: ${(bill.paidAmount / 100).toFixed(2)}</p>
                          )}
                        </div>
                        
                        <Badge className={getStatusColor(bill.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(bill.status)}
                            <span>{bill.status.replace('_', ' ')}</span>
                          </div>
                        </Badge>
                        
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedBill(bill)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {bill.status === 'pending' && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedBill(bill);
                                setShowPaymentModal(true);
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </div>

        {/* Payment History Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment History</span>
          </h2>
            <div className="space-y-4">
              {currentPayments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{payment.transactionId}</h3>
                          <p className="text-sm text-gray-600">{payment.patientName}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.createdAt).toLocaleDateString()} via {payment.gateway}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            ${(payment.amount / 100).toFixed(2)} {payment.currency}
                          </p>
                          <p className="text-sm text-gray-500">{payment.description}</p>
                        </div>
                        
                        <Badge className={getStatusColor(payment.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(payment.status)}
                            <span>{payment.status}</span>
                          </div>
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </div>

        {/* Payment Methods Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment Methods</span>
          </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paymentMethods?.map((method) => (
                <Card key={method.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-8 w-8 text-gray-600" />
                        <div>
                          <p className="font-semibold">{method.brand.toUpperCase()}</p>
                          <p className="text-sm text-gray-500">•••• {method.last4}</p>
                        </div>
                      </div>
                      {method.isDefault && (
                        <Badge variant="outline">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                  </CardContent>
                </Card>
              )) || (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No payment methods</h3>
                    <p className="text-gray-600">Add a payment method to get started</p>
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
        </div>

        {/* Bill Detail Modal */}
        <Dialog open={!!selectedBill && !showPaymentModal} onOpenChange={(open) => !open && setSelectedBill(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bill Details - {selectedBill?.billNumber}</DialogTitle>
            </DialogHeader>
            
            {selectedBill && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Patient</Label>
                    <p className="font-medium">{selectedBill.patientName}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={getStatusColor(selectedBill.status)}>
                      {selectedBill.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <p className="font-medium">{new Date(selectedBill.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p className="font-medium">{new Date(selectedBill.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <Label>Bill Items</Label>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Qty</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Rate</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBill.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-4 py-2 text-sm">{item.description}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right">${(item.unitPrice / 100).toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium">
                              ${(item.totalPrice / 100).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-sm font-medium text-right">Total:</td>
                          <td className="px-4 py-2 text-sm font-bold text-right">
                            ${(selectedBill.totalAmount / 100).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
            </DialogHeader>
            
            {selectedBill && (
              <RazorpayPaymentForm 
                billId={selectedBill.id}
                amount={selectedBill.totalAmount - selectedBill.paidAmount}
                onSuccess={() => {
                  setShowPaymentModal(false);
                  setSelectedBill(null);
                  queryClient.invalidateQueries({ queryKey: ["/api/billing/bills"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/billing/payments"] });
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleBasedLayout>
  );
}