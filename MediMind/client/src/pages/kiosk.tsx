import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Ticket, Search, Info, ArrowLeft } from "lucide-react";

interface KioskProps {
  onExit: () => void;
}

export default function Kiosk({ onExit }: KioskProps) {
  const [currentView, setCurrentView] = useState<"main" | "appointment" | "token" | "status" | "info">("main");

  const handleMainMenu = () => {
    setCurrentView("main");
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-green-900 z-50">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="p-8 text-center text-white">
          <h1 className="text-4xl font-bold mb-2">Central Government Hospital</h1>
          <p className="text-xl opacity-90">Self-Service Patient Kiosk</p>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-2xl">
            
            {/* Navigation */}
            {currentView !== "main" && (
              <div className="mb-6">
                <Button
                  onClick={handleMainMenu}
                  variant="outline"
                  className="mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Main Menu
                </Button>
              </div>
            )}

            {/* Main Menu */}
            {currentView === "main" && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">
                    How can we help you today?
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Select an option below to get started
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Button
                    onClick={() => setCurrentView("appointment")}
                    className="p-8 h-auto flex flex-col items-center space-y-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200"
                    variant="outline"
                  >
                    <CalendarPlus className="h-12 w-12" />
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2">Book Appointment</h3>
                      <p className="text-sm opacity-80">Schedule a new appointment</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => setCurrentView("token")}
                    className="p-8 h-auto flex flex-col items-center space-y-4 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200"
                    variant="outline"
                  >
                    <Ticket className="h-12 w-12" />
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2">Get Token</h3>
                      <p className="text-sm opacity-80">Get queue token for walk-in</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => setCurrentView("status")}
                    className="p-8 h-auto flex flex-col items-center space-y-4 bg-orange-50 hover:bg-orange-100 text-orange-700 border-2 border-orange-200"
                    variant="outline"
                  >
                    <Search className="h-12 w-12" />
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2">Check Status</h3>
                      <p className="text-sm opacity-80">View appointment or queue status</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => setCurrentView("info")}
                    className="p-8 h-auto flex flex-col items-center space-y-4 bg-purple-50 hover:bg-purple-100 text-purple-700 border-2 border-purple-200"
                    variant="outline"
                  >
                    <Info className="h-12 w-12" />
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2">Information</h3>
                      <p className="text-sm opacity-80">Hospital services & directions</p>
                    </div>
                  </Button>
                </div>
              </>
            )}

            {/* Appointment Booking */}
            {currentView === "appointment" && (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-6">Book New Appointment</h2>
                <Card className="p-6">
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      To book an appointment, please use our online portal or mobile app for the best experience.
                    </p>
                    <p className="text-sm text-gray-500">
                      You can also speak with our front desk staff for immediate assistance.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Token Generation */}
            {currentView === "token" && (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-6">Generate Queue Token</h2>
                <Card className="p-6">
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      Please select your department to generate a queue token:
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <Button className="p-4" variant="outline">Cardiology</Button>
                      <Button className="p-4" variant="outline">Pediatrics</Button>
                      <Button className="p-4" variant="outline">Orthopedics</Button>
                      <Button className="p-4" variant="outline">General Medicine</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Status Check */}
            {currentView === "status" && (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-6">Check Status</h2>
                <Card className="p-6">
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      Enter your appointment ID or token number to check status:
                    </p>
                    <div className="max-w-md mx-auto">
                      <input
                        type="text"
                        placeholder="Enter ID or Token Number"
                        className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                      />
                      <Button className="w-full">Check Status</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Information */}
            {currentView === "info" && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-center">Hospital Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-3">Departments</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Cardiology - 2nd Floor</li>
                        <li>• Pediatrics - 1st Floor</li>
                        <li>• Orthopedics - 3rd Floor</li>
                        <li>• Emergency - Ground Floor</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-3">Visiting Hours</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Monday - Friday: 8:00 AM - 8:00 PM</li>
                        <li>• Saturday: 8:00 AM - 6:00 PM</li>
                        <li>• Sunday: 9:00 AM - 5:00 PM</li>
                        <li>• Emergency: 24/7</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Exit Button */}
            <div className="mt-8 text-center">
              <Button
                onClick={onExit}
                variant="outline"
                className="px-8 py-3"
              >
                Exit Kiosk Mode
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
