import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Lock, User, Shield, Phone, Key, ArrowLeft } from 'lucide-react'; 
import { toast } from 'sonner';
import lnmiitLogo from '@/assets/lnmiit-logo.png';
import apiFetch from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { saveAuth } = useAuth();
  
  const [userType, setUserType] = useState<'student' | 'admin' | 'conductor'>('student');
  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginId, setLoginId] = useState(''); 
  const [loginPassword, setLoginPassword] = useState('');

  // Student Signup form state
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentConfirmPassword, setStudentConfirmPassword] = useState('');

  // Conductor Signup form state
  const [conductorName, setConductorName] = useState('');
  const [conductorEmail, setConductorEmail] = useState(''); // NEW: Conductor Email
  const [conductorPhone, setConductorPhone] = useState('');
  const [conductorPassword, setConductorPassword] = useState('');
  const [conductorConfirmPassword, setConductorConfirmPassword] = useState('');
  const [conductorPasscode, setConductorPasscode] = useState('');

  // Admin Signup form state
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');

  // --- LOGIN HANDLER ---
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

  // --- STUDENT SIGNUP ---
  const handleStudentSignup = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!studentName || !studentEmail || !studentPhone || !studentPassword || !studentConfirmPassword) {
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
          phone: studentPhone,
          password: studentPassword,
          confirmPassword: studentConfirmPassword,
          role: 'student',
        },
      });

      toast.success('Student Account created successfully! Please login.');
      setActiveTab('login'); 
      setLoginId(studentEmail);
      setLoginPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ADMIN SIGNUP ---
  const handleAdminSignup = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  
    if (!adminName || !adminEmail || !adminPhone || !adminPassword || !adminConfirmPassword || !adminPasscode) {
      toast.error('Please fill in all fields including Admin Passcode');
      setIsLoading(false);
      return;
    }
    if (adminPassword !== adminConfirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }
  
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: {
          name: adminName,
          email: adminEmail,
          phone: adminPhone,
          password: adminPassword,
          confirmPassword: adminConfirmPassword,
          role: 'admin',
          passcode: adminPasscode,
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

  // --- CONDUCTOR SIGNUP (UPDATED) ---
  const handleConductorSignup = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation now includes email
    if (!conductorName || !conductorEmail || !conductorPhone || !conductorPassword || !conductorConfirmPassword || !conductorPasscode) {
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
          email: conductorEmail, // Send email
          phone: conductorPhone, 
          password: conductorPassword,
          confirmPassword: conductorConfirmPassword,
          role: 'conductor',
          passcode: conductorPasscode,
        },
      });

      toast.success('Conductor account created! Please login.');
      setActiveTab('login');
      setLoginId(conductorPhone); // Can login with phone
      setLoginPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToAdmin = () => {
    setUserType('admin');
    setActiveTab('login'); 
    setLoginId(''); 
    setLoginPassword('');
  };

  const switchToConductor = () => {
    setUserType('conductor');
    setActiveTab('login'); 
    setLoginId(''); 
    setLoginPassword('');
  };

  const switchToStudent = () => {
    setUserType('student');
    setActiveTab('login'); 
    setLoginId('');
    setLoginPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary">
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

        <div className="max-w-md mx-auto">
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              {userType === 'student' && <CardTitle className="text-2xl text-center">Welcome to LNMIIT</CardTitle>}
              {userType === 'admin' && <CardTitle className="text-2xl text-center">Admin Portal</CardTitle>}
              {userType === 'conductor' && <CardTitle className="text-2xl text-center">Conductor Portal</CardTitle>}
              <CardDescription className="text-center">
                {userType === 'student' ? 'Login to book your LNMIIT bus seat' : `${userType.charAt(0).toUpperCase() + userType.slice(1)} Login / Sign Up`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value={`${userType}_signup`}>Sign Up</TabsTrigger>
                </TabsList>

                {/* LOGIN FORM */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-id">{userType === 'conductor' ? 'Phone Number / Email' : 'Email'}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-id"
                          type="text"
                          placeholder={userType === 'conductor' ? 'Enter phone or email' : userType === 'admin' ? 'admin@lnmiit.ac.in' : 'user@lnmiit.ac.in'}
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
                    <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>

                    {userType === 'student' && (
                      <>
                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
                        </div>
                        <Button type="button" variant="outline" className="w-full" onClick={switchToAdmin} disabled={isLoading}>
                          <Shield className="h-4 w-4 mr-2" /> Admin Portal
                        </Button>
                        <Button type="button" variant="outline" className="w-full mt-2" onClick={switchToConductor} disabled={isLoading}>
                          <User className="h-4 w-4 mr-2" /> Conductor Portal
                        </Button>
                      </>
                    )}
                  </form>
                </TabsContent>

                {/* STUDENT SIGNUP */}
                <TabsContent value="student_signup">
                  <form onSubmit={handleStudentSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input placeholder="Student Name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input placeholder="student@lnmiit.ac.in" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input placeholder="9876543210" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" placeholder="Create password" value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input type="password" placeholder="Re-enter password" value={studentConfirmPassword} onChange={(e) => setStudentConfirmPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full">Create Student Account</Button>
                  </form>
                </TabsContent>

                {/* ADMIN SIGNUP */}
                <TabsContent value="admin_signup">
                  <form onSubmit={handleAdminSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input placeholder="Admin Name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input placeholder="admin@lnmiit.ac.in" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input placeholder="9876543210" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" placeholder="Create password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input type="password" placeholder="Re-enter password" value={adminConfirmPassword} onChange={(e) => setAdminConfirmPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Admin Passcode</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input type="password" placeholder="Enter admin registration code" className="pl-10" value={adminPasscode} onChange={(e) => setAdminPasscode(e.target.value)} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Create Admin Account</Button>
                  </form>
                </TabsContent>

                {/* CONDUCTOR SIGNUP */}
                <TabsContent value="conductor_signup">
                  <form onSubmit={handleConductorSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input placeholder="Conductor Name" value={conductorName} onChange={(e) => setConductorName(e.target.value)} />
                    </div>
                    {/* ADDED EMAIL FIELD */}
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input placeholder="conductor@gmail.com" value={conductorEmail} onChange={(e) => setConductorEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input placeholder="9876543210" value={conductorPhone} onChange={(e) => setConductorPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" placeholder="Create password" value={conductorPassword} onChange={(e) => setConductorPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input type="password" placeholder="Re-enter password" value={conductorConfirmPassword} onChange={(e) => setConductorConfirmPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Conductor Passcode</Label>
                      <Input type="password" placeholder="Enter conductor registration code" value={conductorPasscode} onChange={(e) => setConductorPasscode(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full">Create Conductor Account</Button>
                  </form>
                </TabsContent>

              </Tabs>

              {userType !== 'student' && (
                <Button variant="link" className="w-full mt-4 text-muted-foreground" onClick={switchToStudent}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Student Portal
                </Button>
              )}

            </CardContent>
          </Card>
          <Card className="mt-6 bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2">📍 Rupa ki Nangal, Post-Sumel, Via - Jamdoli, Jaipur, Rajasthan 302031</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;