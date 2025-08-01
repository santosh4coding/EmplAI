import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hospital, User, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DemoLogin() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/demo-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });

      if (response.ok) {
        toast({
          title: "Login Successful",
          description: `Logged in as ${role}`,
        });
        window.location.href = "/";
      } else {
        throw new Error("Login failed");
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Hospital className="h-8 w-8 text-blue-600 mr-2" />
            <CardTitle className="text-2xl">MediDesk Pro</CardTitle>
          </div>
          <p className="text-gray-600">Demo Login - Hospital Management System</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <Label htmlFor="role">Login as</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="super-admin">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Super Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="doctor">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Doctor
                    </div>
                  </SelectItem>
                  <SelectItem value="nurse">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Nurse
                    </div>
                  </SelectItem>
                  <SelectItem value="front-desk">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Front Desk
                    </div>
                  </SelectItem>
                  <SelectItem value="patient">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Patient
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Demo Instructions:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use any email address</li>
              <li>• Select "Admin" or "Super Admin" to access admin features</li>
              <li>• All data is for demonstration purposes</li>
              <li>• No actual authentication required</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}