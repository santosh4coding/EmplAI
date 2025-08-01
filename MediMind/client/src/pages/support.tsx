import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { 
  Headphones, 
  MessageCircle, 
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  FileText,
  Search,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RoleBasedLayout from "@/components/RoleBasedLayout";

interface SupportTicket {
  id: number;
  ticketId: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in-progress" | "resolved" | "closed";
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  lastUpdate: string;
}

export default function Support() {

  const [searchTerm, setSearchTerm] = useState("");
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "technical",
    priority: "medium"
  });
  const { toast } = useToast();

  // Mock support data
  const supportData = {
    tickets: [
      {
        id: 1,
        ticketId: "SUP001",
        title: "Login Issue - Cannot access patient records",
        description: "User unable to login to the system. Getting authentication error.",
        category: "Technical",
        priority: "high" as const,
        status: "in-progress" as const,
        createdBy: "Dr. Sarah Wilson",
        assignedTo: "IT Support Team",
        createdAt: "2025-07-31T09:30:00Z",
        lastUpdate: "2025-07-31T10:15:00Z"
      },
      {
        id: 2,
        ticketId: "SUP002",
        title: "Prescription printing not working",
        description: "The prescription module is not printing properly. Page layout is distorted.",
        category: "Hardware",
        priority: "medium" as const,
        status: "open" as const,
        createdBy: "Nurse Johnson",
        createdAt: "2025-07-31T08:45:00Z",
        lastUpdate: "2025-07-31T08:45:00Z"
      },
      {
        id: 3,
        ticketId: "SUP003",
        title: "Request for additional user training",
        description: "New staff members need training on the appointment booking system.",
        category: "Training",
        priority: "low" as const,
        status: "resolved" as const,
        createdBy: "HR Department",
        assignedTo: "Training Team",
        createdAt: "2025-07-30T14:00:00Z",
        lastUpdate: "2025-07-31T11:00:00Z"
      }
    ],
    stats: {
      totalTickets: 247,
      openTickets: 23,
      inProgressTickets: 15,
      resolvedToday: 8,
      averageResponseTime: "2.5 hours",
      satisfactionScore: 4.2
    },
    faqs: [
      {
        id: 1,
        question: "How do I reset my password?",
        answer: "Go to the login page and click on 'Forgot Password'. Enter your email address and follow the instructions sent to your email.",
        category: "Account"
      },
      {
        id: 2,
        question: "How do I schedule an appointment?",
        answer: "Navigate to the Appointments section, click 'New Appointment', select the patient, doctor, date and time, then save.",
        category: "Appointments"
      },
      {
        id: 3,
        question: "How do I access patient medical records?",
        answer: "Go to Medical Records section, search for the patient by name or ID, and click on their record to view details.",
        category: "Medical Records"
      }
    ]
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-800";
      case "in-progress": return "bg-yellow-100 text-yellow-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertCircle className="h-4 w-4" />;
      case "in-progress": return <Clock className="h-4 w-4" />;
      case "resolved": return <CheckCircle className="h-4 w-4" />;
      case "closed": return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleSubmitTicket = () => {
    if (!newTicket.title || !newTicket.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Ticket Created",
      description: "Your support ticket has been submitted successfully",
    });

    setNewTicket({
      title: "",
      description: "",
      category: "technical",
      priority: "medium"
    });
  };

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Headphones className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold">Support Center</h1>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="flex items-center">
              <Phone className="h-4 w-4 mr-2" />
              Call Support
            </Button>
            <Button className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              Live Chat
            </Button>
          </div>
        </div>

        {/* Support Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{supportData.stats.totalTickets}</p>
                <p className="text-xs text-gray-600">Total Tickets</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{supportData.stats.openTickets}</p>
                <p className="text-xs text-gray-600">Open</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{supportData.stats.inProgressTickets}</p>
                <p className="text-xs text-gray-600">In Progress</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{supportData.stats.resolvedToday}</p>
                <p className="text-xs text-gray-600">Resolved Today</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{supportData.stats.averageResponseTime}</p>
                <p className="text-xs text-gray-600">Avg Response</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <User className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-indigo-600">{supportData.stats.satisfactionScore}/5</p>
                <p className="text-xs text-gray-600">Satisfaction</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Tickets Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">My Support Tickets</h2>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Support Tickets</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportData.tickets.map((ticket) => (
                    <div key={ticket.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <h3 className="font-semibold text-lg">{ticket.ticketId}: {ticket.title}</h3>
                              <p className="text-sm text-gray-600">{ticket.description}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Category:</span>
                                <p className="font-medium">{ticket.category}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Created By:</span>
                                <p className="font-medium">{ticket.createdBy}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Created:</span>
                                <p className="font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                              </div>
                              {ticket.assignedTo && (
                                <div>
                                  <span className="text-gray-600">Assigned To:</span>
                                  <p className="font-medium">{ticket.assignedTo}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col items-end space-y-2">
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                            <Badge className={getStatusColor(ticket.status)}>
                              {getStatusIcon(ticket.status)}
                              <span className="ml-1">{ticket.status}</span>
                            </Badge>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                            {ticket.status !== "closed" && ticket.status !== "resolved" && (
                              <Button size="sm">
                                Add Comment
                              </Button>
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

        {/* Create Ticket Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Create New Support Ticket</h2>
            <Card>
              <CardHeader>
                <CardTitle>Create New Support Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <Input
                      placeholder="Brief description of the issue"
                      value={newTicket.title}
                      onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      placeholder="Please provide detailed information about the issue..."
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <select 
                        className="w-full p-2 border rounded-md"
                        value={newTicket.category}
                        onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                      >
                        <option value="technical">Technical Issue</option>
                        <option value="hardware">Hardware Problem</option>
                        <option value="training">Training Request</option>
                        <option value="account">Account Access</option>
                        <option value="feature">Feature Request</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Priority</label>
                      <select 
                        className="w-full p-2 border rounded-md"
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <Button onClick={handleSubmitTicket} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* FAQ Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {supportData.faqs.map((faq) => (
                    <div key={faq.id} className="border-b pb-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-sm font-bold text-blue-600">Q</span>
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-semibold">{faq.question}</h3>
                          <p className="text-gray-600">{faq.answer}</p>
                          <Badge variant="outline" className="text-xs">
                            {faq.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Contact Info Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Emergency Support</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">24/7 Emergency Hotline</p>
                      <p className="text-sm text-gray-600">+91 1800-123-4567</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Emergency Email</p>
                      <p className="text-sm text-gray-600">emergency@medidesk.com</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>General Support</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Support Phone</p>
                      <p className="text-sm text-gray-600">+91 1800-987-6543</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Support Email</p>
                      <p className="text-sm text-gray-600">support@medidesk.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Business Hours</p>
                      <p className="text-sm text-gray-600">Mon-Fri: 9:00 AM - 6:00 PM</p>
                    </div>
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