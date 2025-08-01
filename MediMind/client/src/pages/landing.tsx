import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hospital, Users, Clock, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Hospital className="h-12 w-12 text-blue-600 mr-4" />
            <h1 className="text-4xl font-bold text-gray-800">MediDesk Pro</h1>
          </div>
          <p className="text-xl text-gray-600 mb-8">
            AI-Powered Hospital Front Desk Management System
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => window.location.href = "/signup"}
              variant="outline"
              size="lg"
              className="px-8 py-3 text-lg"
            >
              Create Account
            </Button>
          </div>
        </header>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Multi-Role Access</h3>
              <p className="text-gray-600 text-sm">
                Secure role-based access for patients, doctors, nurses, and administrative staff
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <Clock className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Smart Queue Management</h3>
              <p className="text-gray-600 text-sm">
                AI-powered queue optimization with real-time updates and QR token system
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <Hospital className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
              <p className="text-gray-600 text-sm">
                24/7 AI-powered assistance for appointments, queries, and patient support
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">HIPAA Compliant</h3>
              <p className="text-gray-600 text-sm">
                Enterprise-grade security with HIPAA and NDHM compliance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Overview */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Comprehensive Hospital Management
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-blue-600">For Patients</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Self-service kiosk for appointments</li>
                  <li>• QR-based queue tokens</li>
                  <li>• Real-time wait time updates</li>
                  <li>• AI-powered appointment booking</li>
                  <li>• Digital medical record access</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 text-green-600">For Healthcare Staff</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Role-specific dashboards</li>
                  <li>• Real-time patient management</li>
                  <li>• Integrated EMR/LIMS systems</li>
                  <li>• Queue optimization tools</li>
                  <li>• Predictive analytics</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-4">Ready to streamline your hospital operations?</h3>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
          >
            Get Started Now
          </Button>
        </div>
      </div>
    </div>
  );
}
