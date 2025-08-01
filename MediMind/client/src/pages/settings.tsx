import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Save,
  Trash2
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RoleBasedLayout from "@/components/RoleBasedLayout";
import { User as UserType } from "@shared/schema";

interface UserSettings {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    department: string;
    specialization?: string;
    bio?: string;
    profileImage?: string;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    appointmentReminders: boolean;
    systemUpdates: boolean;
    marketingEmails: boolean;
  };
  preferences: {
    theme: "light" | "dark" | "system";
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: "12h" | "24h";
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    loginAlerts: boolean;
  };
}

export default function Settings() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Fetch user settings
  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user/settings"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ section, data }: { section: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/user/settings/${section}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
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
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const response = await apiRequest("POST", "/api/user/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleProfileUpdate = (formData: FormData) => {
    const profileData = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      department: formData.get('department'),
      specialization: formData.get('specialization'),
      bio: formData.get('bio'),
    };

    updateSettingsMutation.mutate({ section: 'profile', data: profileData });
  };

  const handleNotificationUpdate = (key: string, value: boolean) => {
    const currentNotifications = settings?.notifications || {};
    const updatedNotifications = { ...currentNotifications, [key]: value };
    updateSettingsMutation.mutate({ section: 'notifications', data: updatedNotifications });
  };

  const handlePreferenceUpdate = (key: string, value: string) => {
    const currentPreferences = settings?.preferences || {};
    const updatedPreferences = { ...currentPreferences, [key]: value };
    updateSettingsMutation.mutate({ section: 'preferences', data: updatedPreferences });
  };

  const handlePasswordChange = (formData: FormData) => {
    const passwordData = {
      currentPassword: formData.get('currentPassword') as string,
      newPassword: formData.get('newPassword') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

  // Mock settings data if not loaded
  const mockSettings: UserSettings = {
    profile: {
      firstName: (user as UserType)?.firstName || "",
      lastName: (user as UserType)?.lastName || "",
      email: (user as UserType)?.email || "",
      phone: "",
      department: (user as UserType)?.department || "",
      specialization: (user as UserType)?.specialization || "",
      bio: "",
      profileImage: (user as UserType)?.profileImageUrl || "",
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      appointmentReminders: true,
      systemUpdates: true,
      marketingEmails: false,
    },
    preferences: {
      theme: "system",
      language: "en",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      loginAlerts: true,
    },
  };

  const currentSettings = settings || mockSettings;

  return (
    <RoleBasedLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center mb-8">
          <SettingsIcon className="h-8 w-8 text-blue-600 mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
            <p className="text-gray-600">Manage your profile, preferences, and system settings</p>
          </div>
        </div>

        {/* Profile Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Information</span>
          </h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center space-x-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={currentSettings.profile.profileImage} />
                    <AvatarFallback className="text-lg">
                      {currentSettings.profile.firstName?.[0]}{currentSettings.profile.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Profile Form */}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleProfileUpdate(formData);
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        name="firstName" 
                        defaultValue={currentSettings.profile.firstName}
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        name="lastName" 
                        defaultValue={currentSettings.profile.lastName}
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email"
                        defaultValue={currentSettings.profile.email}
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        type="tel"
                        defaultValue={currentSettings.profile.phone}
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input 
                        id="department" 
                        name="department" 
                        defaultValue={currentSettings.profile.department}
                      />
                    </div>
                    {(user as UserType).role === "doctor" && (
                      <div>
                        <Label htmlFor="specialization">Specialization</Label>
                        <Input 
                          id="specialization" 
                          name="specialization" 
                          defaultValue={currentSettings.profile.specialization}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea 
                      id="bio" 
                      name="bio" 
                      defaultValue={currentSettings.profile.bio}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button type="submit" disabled={updateSettingsMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
        </div>

        {/* Notifications Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Settings</span>
          </h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <Label>Email Notifications</Label>
                      </div>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <Switch 
                      checked={currentSettings.notifications.emailNotifications}
                      onCheckedChange={(checked) => handleNotificationUpdate('emailNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="h-4 w-4 text-gray-500" />
                        <Label>SMS Notifications</Label>
                      </div>
                      <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                    </div>
                    <Switch 
                      checked={currentSettings.notifications.smsNotifications}
                      onCheckedChange={(checked) => handleNotificationUpdate('smsNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-4 w-4 text-gray-500" />
                        <Label>Push Notifications</Label>
                      </div>
                      <p className="text-sm text-gray-600">Receive browser push notifications</p>
                    </div>
                    <Switch 
                      checked={currentSettings.notifications.pushNotifications}
                      onCheckedChange={(checked) => handleNotificationUpdate('pushNotifications', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Appointment Reminders</Label>
                      <p className="text-sm text-gray-600">Get reminded about upcoming appointments</p>
                    </div>
                    <Switch 
                      checked={currentSettings.notifications.appointmentReminders}
                      onCheckedChange={(checked) => handleNotificationUpdate('appointmentReminders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>System Updates</Label>
                      <p className="text-sm text-gray-600">Notifications about system maintenance and updates</p>
                    </div>
                    <Switch 
                      checked={currentSettings.notifications.systemUpdates}
                      onCheckedChange={(checked) => handleNotificationUpdate('systemUpdates', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Marketing Emails</Label>
                      <p className="text-sm text-gray-600">Promotional emails and newsletters</p>
                    </div>
                    <Switch 
                      checked={currentSettings.notifications.marketingEmails}
                      onCheckedChange={(checked) => handleNotificationUpdate('marketingEmails', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Preferences Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Application Preferences</span>
          </h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Display & Language</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Theme</Label>
                    <Select 
                      value={currentSettings.preferences.theme} 
                      onValueChange={(value) => handlePreferenceUpdate('theme', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Language</Label>
                    <Select 
                      value={currentSettings.preferences.language} 
                      onValueChange={(value) => handlePreferenceUpdate('language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Timezone</Label>
                    <Select 
                      value={currentSettings.preferences.timezone} 
                      onValueChange={(value) => handlePreferenceUpdate('timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Asia/Kolkata">India Standard Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date Format</Label>
                    <Select 
                      value={currentSettings.preferences.dateFormat} 
                      onValueChange={(value) => handlePreferenceUpdate('dateFormat', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Time Format</Label>
                    <Select 
                      value={currentSettings.preferences.timeFormat} 
                      onValueChange={(value) => handlePreferenceUpdate('timeFormat', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12 Hour</SelectItem>
                        <SelectItem value="24h">24 Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Security Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security Settings</span>
          </h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Change Password</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handlePasswordChange(formData);
                }}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input 
                          id="currentPassword" 
                          name="currentPassword" 
                          type={showPassword ? "text" : "password"}
                          required 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input 
                        id="newPassword" 
                        name="newPassword" 
                        type="password"
                        required 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        type="password"
                        required 
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button type="submit" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                  </div>
                  <Switch 
                    checked={currentSettings.security.twoFactorEnabled}
                    onCheckedChange={(checked) => {
                      // Handle 2FA toggle
                      toast({
                        title: "Feature Coming Soon",
                        description: "Two-factor authentication will be available in the next update",
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Login Alerts</Label>
                    <p className="text-sm text-gray-600">Get notified of new login attempts</p>
                  </div>
                  <Switch 
                    checked={currentSettings.security.loginAlerts}
                    onCheckedChange={(checked) => {
                      // Handle login alerts toggle
                    }}
                  />
                </div>

                <div>
                  <Label>Session Timeout</Label>
                  <Select defaultValue={currentSettings.security.sessionTimeout.toString()}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </RoleBasedLayout>
  );
}