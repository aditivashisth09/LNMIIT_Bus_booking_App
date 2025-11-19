import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bus, Clock, Users, LogOut } from 'lucide-react';
import lnmiitLogo from '@/assets/lnmiit-logo.png';
import apiFetch from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';

interface AssignedBus {
  id: string;
  busNumber: string;
  route: string;
  departureTime: string;
  totalSeats: number;
  bookedSeats: number;
}

const ConductorDashboard = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  const [bus, setBus] = useState<AssignedBus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedBus = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch('/buses/mybus');
        setBus(data);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignedBus();
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={lnmiitLogo} alt="LNMIIT Logo" className="h-12 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-foreground">LNMIIT Bus Portal</h1>
                <p className="text-sm text-muted-foreground">Conductor Dashboard</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <Skeleton className="h-64 w-full max-w-2xl mx-auto" />
        ) : bus ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Your Assigned Bus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bus className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bus Number</p>
                    <p className="text-2xl font-bold">{bus.busNumber}</p>
                  </div>
                </div>
                <Badge className="text-lg">{bus.route}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Departure</p>
                  <p className="font-semibold">{bus.departureTime}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Seats</p>
                  <p className="font-semibold">{bus.totalSeats}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Bookings</p>
                  <p className="font-semibold">{bus.bookedSeats}</p>
                </div>
              </div>
              <Button 
                className="w-full h-12 text-lg"
                onClick={() => navigate(`/conductor/bus/${bus.id}`)}
              >
                Manage Seats & Attendance
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-2xl mx-auto text-center py-12">
            <CardHeader>
              <CardTitle className="text-2xl">No Bus Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">You are not currently assigned to a bus. Please contact an administrator.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ConductorDashboard;