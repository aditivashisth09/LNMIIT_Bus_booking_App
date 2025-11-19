import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// UPDATED: Added ArrowLeft and Key icons
import { Mail, Lock, User, Shield, Phone, Key, ArrowLeft } from 'lucide-react'; 
import { toast } from 'sonner';
import lnmiitLogo from '@/assets/lnmiit-logo.png';
import apiFetch from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { saveAuth } = useAuth();
  
  // --- NEW STATE ---
  // This state controls which portal (Student, Admin, Conductor) is active
  const [userType, setUserType] = useState<'student' | 'admin' | 'conductor'>('student');
  // --- END NEW STATE ---

  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);

  // Login form state (shared by all user types)
  const [loginId, setLoginId] = useState(''); 
  const [loginPassword, setLoginPassword] = useState('');

  // Student Signup form state
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentConfirmPassword, setStudentConfirmPassword] = useState('');

  // Conductor Signup form state
  const [conductorName, setConductorName] = useState('');
  const [conductorPhone, setConductorPhone] = useState('');
  const [conductorPassword, setConductorPassword] = useState('');
  const [conductorConfirmPassword, setConductorConfirmPassword] = useState('');
  const [conductorPasscode, setConductorPasscode] = useState('');

  // --- NEW: Admin Signup form state ---
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  // --- END NEW STATE ---


  // --- GENERIC LOGIN HANDLER (for all roles) ---
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!loginId || !loginPassword) {
      toast.error('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { loginId: loginId, password: loginPassword },
      });

      saveAuth(data);
      toast.success('Login successful!');
      
      // The backend provides the role, so we can redirect correctly
      if (data.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (data.role === 'conductor') {
        navigate('/conductor-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- STUDENT SIGNUP HANDLER ---
  const handleStudentSignup = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!studentName || !studentEmail || !studentPassword || !studentConfirmPassword) {
      toast.error('Please fill in all fields');
      setIsLoading(false);
      return;
    }
    if (studentPassword !== studentConfirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: {
          name: studentName,
          email: studentEmail,
          password: studentPassword,
          confirmPassword: studentConfirmPassword,
          role: 'student',
        },
      });

      toast.success('Student Account created successfully! Please login.');
      setActiveTab('login'); // Switch to login tab
      setLoginId(studentEmail);
      setLoginPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: ADMIN SIGNUP HANDLER ---
  // (Uses the same logic as student signup; backend assigns role based on email)
  const handleAdminSignup = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  
    if (!adminName || !adminEmail || !adminPassword || !adminConfirmPassword) {
      toast.error('Please fill in all fields');
      setIsLoading(false);
      return;
    }
    if (adminPassword !== adminConfirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }
  
    try {
      // We still send 'student' role; backend logic in authController
      // will check the email and elevate to 'admin' if it matches.
      await apiFetch('/auth/register', {
        method: 'POST',
        body: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          confirmPassword: adminConfirmPassword,
          role: 'student', // Backend will elevate this to 'admin'
        },
      });
  
      toast.success('Admin Account created successfully! Please login.');
      setActiveTab('login');
      setLoginId(adminEmail);
      setLoginPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- CONDUCTOR SIGNUP HANDLER ---
  const handleConductorSignup = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!conductorName || !conductorPhone || !conductorPassword || !conductorConfirmPassword || !conductorPasscode) {
      toast.error('Please fill in all fields');
      setIsLoading(false);
      return;
    }
    if (conductorPassword !== conductorConfirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: {
          name: conductorName,
          phone: conductorPhone, // Use phone
          password: conductorPassword,
          confirmPassword: conductorConfirmPassword,
          role: 'conductor',
          passcode: conductorPasscode,
        },
      });

      toast.success('Conductor account created! Please login.');
      setActiveTab('login');
      setLoginId(conductorPhone); // Pre-fill login with phone
      setLoginPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Portal Switch Handlers ---
  const switchToAdmin = () => {
    setUserType('admin');
    setActiveTab('login'); // Default to login tab
    setLoginId('admin@lnmiit.ac.in'); // Pre-fill admin email
    setLoginPassword('');
  };

  const switchToConductor = () => {
    setUserType('conductor');
    setActiveTab('login'); // Default to login tab
    setLoginId(''); // Clear login ID for phone number
    setLoginPassword('');
  };

  const switchToStudent = () => {
    setUserType('student');
    setActiveTab('login'); // Default to login tab
    setLoginId('');
    setLoginPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <img src={lnmiitLogo} alt="LNMIIT Logo" className="h-32 w-auto" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            LNMIIT Bus Booking System
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            The LNM Institute of Information Technology - Book your campus shuttle seats seamlessly
          </p>
        </div>

        {/* Auth Cards */}
        <div className="max-w-md mx-auto">
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              {/* --- DYNAMIC TITLE --- */}
              {userType === 'student' && (
                <>
                  <CardTitle className="text-2xl text-center">Welcome to LNMIIT</CardTitle>
                  <CardDescription className="text-center">
                    Login to book your LNMIIT bus seat
                  </CardDescription>
                </>
              )}
              {userType === 'admin' && (
                <>
                  <CardTitle className="text-2xl text-center">Admin Portal</CardTitle>
                  <CardDescription className="text-center">
                    Administrator Login / Sign Up
                  </CardDescription>
                </>
              )}
              {userType === 'conductor' && (
                <>
                  <CardTitle className="text-2xl text-center">Conductor Portal</CardTitle>
                  <CardDescription className="text-center">
                    Conductor Login / Sign Up
                  </CardDescription>
                </>
              )}
              {/* --- END DYNAMIC TITLE --- */}
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                
                {/* --- DYNAMIC TABS LIST --- */}
                {userType === 'student' && (
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="student_signup">Student Sign Up</TabsTrigger>
                  </TabsList>
                )}
                {userType === 'admin' && (
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Admin Login</TabsTrigger>
                    <TabsTrigger value="admin_signup">Admin Sign Up</TabsTrigger>
                  </TabsList>
                )}
                {userType === 'conductor' && (
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Conductor Login</TabsTrigger>
                    <TabsTrigger value="conductor_signup">Conductor Sign Up</TabsTrigger>
                  </TabsList>
                )}
                {/* --- END DYNAMIC TABS LIST --- */}


                {/* --- LOGIN FORM (SHARED) --- */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-id">
                        {/* Dynamic Label */}
                        {userType === 'conductor' ? 'Phone Number' : 'Email'}
                        {userType === 'student'} 
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-id"
                          type="text"
                          placeholder={
                            userType === 'conductor' ? 'Enter your phone number' : 
                            userType === 'admin' ? 'admin@lnmiit.ac.in' : 
                            'student@lnmiit.ac.in'
                          }
                          className="pl-10"
                          value={loginId}
                          onChange={(e) => setLoginId(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Enter your password"
                          className="pl-10"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 h-11 text-base font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>

                    {/* --- DYNAMIC BUTTONS (Only show for students) --- */}
                    {userType === 'student' && (
                      <>
                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or</span>
                          </div>
                        </div>

                        <Button 
                          type="button"
                          variant="outline" 
                          className="w-full"
                          onClick={switchToAdmin}
                          disabled={isLoading}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Portal
                        </Button>

                        <Button 
                          type="button"
                          variant="outline" 
                          className="w-full"
                          onClick={switchToConductor}
                          disabled={isLoading}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Conductor Portal
                        </Button>
                      </>
                    )}
                    {/* --- END DYNAMIC BUTTONS --- */}
                  </form>
                </TabsContent>

                {/* --- STUDENT SIGNUP FORM --- */}
                <TabsContent value="student_signup">
                  <form onSubmit={handleStudentSignup} className="space-y-4">
                    {/* Student name */}
                    <div className="space-y-2">
                      <Label htmlFor="student-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="student-name"
                          type="text"
                          placeholder="Student Name"
                          className="pl-10"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    {/* Student email */}
                    <div className="space-y-2">
                      <Label htmlFor="student-email">LNMIIT Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="student-email"
                          type="email"
                          placeholder="student@lnmiit.ac.in"
                          className="pl-10"
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Must be a valid @lnmiit.ac.in email
                      </p>
                    </div>
                    {/* Student password */}
                    <div className="space-y-2">
                      <Label htmlFor="student-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="student-password"
                          type="password"
                          placeholder="Create password"
                          className="pl-10"
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    {/* Student confirm password */}
                    <div className="space-y-2">
                      <Label htmlFor="student-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="student-confirm-password"
                          type="password"
                          placeholder="Re-enter password"
                          className="pl-10"
                          value={studentConfirmPassword}
                          onChange={(e) => setStudentConfirmPassword(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 h-11 text-base font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Student Account'}
                    </Button>
                  </form>
                </TabsContent>

                {/* --- ADMIN SIGNUP FORM (NEW) --- */}
                <TabsContent value="admin_signup">
                  <form onSubmit={handleAdminSignup} className="space-y-4">
                    {/* Admin name */}
                    <div className="space-y-2">
                      <Label htmlFor="admin-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="admin-name"
                          type="text"
                          placeholder="Admin Name"
                          className="pl-10"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    {/* Admin email */}
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">Admin Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="admin-email"
                          type="email"
                          placeholder="admin@lnmiit.ac.in"
                          className="pl-10"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Must be a valid @lnmiit.ac.in email
                      </p>
                    </div>
                    {/* Admin password */}
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="admin-password"
                          type="password"
                          placeholder="Create password"
                          className="pl-10"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    {/* Admin confirm password */}
                    <div className="space-y-2">
                      <Label htmlFor="admin-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="admin-confirm-password"
                          type="password"
                          placeholder="Re-enter password"
                          className="pl-10"
                          value={adminConfirmPassword}
                          onChange={(e) => setAdminConfirmPassword(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 h-11 text-base font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Admin Account'}
                    </Button>
                  </form>
                </TabsContent>
                
                {/* --- CONDUCTOR SIGNUP FORM --- */}
                <TabsContent value="conductor_signup">
                  <form onSubmit={handleConductorSignup} className="space-y-4">
                    {/* Conductor name */}
                    <div className="space-y-2">
                      <Label htmlFor="conductor-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="conductor-name"
                          type="text"
                          placeholder="Conductor Name"
                          className="pl-10"
                          value={conductorName}
                          onChange={(e) => setConductorName(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    {/* Conductor phone */}
                    <div className="space-y-2">
                      <Label htmlFor="conductor-phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="conductor-phone"
                          type="tel"
                          placeholder="9876543210"
                          className="pl-10"
                          value={conductorPhone}
                          onChange={(e) => setConductorPhone(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                       <p className="text-xs text-muted-foreground">
                        Your phone number will be your login ID.
                      </p>
                    </div>
                    {/* Conductor password */}
                    <div className="space-y-2">
                      <Label htmlFor="conductor-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="conductor-password"
                          type="password"
                          placeholder="Create password"
                          className="pl-10"
                          value={conductorPassword}
                          onChange={(e) => setConductorPassword(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    {/* Conductor confirm password */}
                    <div className="space-y-2">
                      <Label htmlFor="conductor-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="conductor-confirm-password"
                          type="password"
                          placeholder="Re-enter password"
                          className="pl-10"
                          value={conductorConfirmPassword}
                          onChange={(e) => setConductorConfirmPassword(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    {/* Conductor passcode */}
                    <div className="space-y-2">
                      <Label htmlFor="conductor-passcode">Conductor Passcode</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="conductor-passcode"
                          type="password"
                          placeholder="Enter registration passcode"
                          className="pl-10"
                          value={conductorPasscode}
                          onChange={(e) => setConductorPasscode(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 h-11 text-base font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Conductor Account'}
                    </Button>
                  </form>
                </TabsContent>

              </Tabs>

              {/* --- NEW "BACK" BUTTON --- */}
              {userType !== 'student' && (
                <Button 
                  variant="link" 
                  className="w-full mt-4 text-muted-foreground"
                  onClick={switchToStudent}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Student Portal
                </Button>
              )}
              {/* --- END "BACK" BUTTON --- */}

            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6 bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2">
                📍Rupa ki Nangal, Post-Sumel, Via - Jamdoli, Jaipur, Rajasthan 302031
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;