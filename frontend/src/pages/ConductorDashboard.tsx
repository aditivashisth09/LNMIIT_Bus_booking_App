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
  // Changed to an array of buses
  const [buses, setBuses] = useState<AssignedBus[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedBuses = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch('/buses/mybus');
        // Ensure we set an array (even if API returns single object by mistake, wrap it)
        setBuses(Array.isArray(data) ? data : [data]);
      } catch (error: any) {
        // Don't show error if it's just 404 (no bus assigned)
        if (!error.message.includes('404')) {
            toast.error(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignedBuses();
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
        <h2 className="text-2xl font-bold mb-6">Your Schedule for Today</h2>
        
        {isLoading ? (
          <div className="space-y-4 max-w-2xl mx-auto">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : buses.length > 0 ? (
          <div className="grid gap-6 max-w-2xl mx-auto">
            {buses.map((bus) => (
              <Card key={bus.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-1 bg-gradient-to-r from-primary to-accent" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                     <CardTitle className="text-xl flex items-center gap-2">
                        <Bus className="h-5 w-5 text-primary" />
                        Bus {bus.busNumber}
                     </CardTitle>
                     <Badge className="text-sm px-3 py-1">{bus.departureTime}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                    <span className="font-semibold text-foreground">{bus.route}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 border rounded-md">
                      <p className="text-sm text-muted-foreground mb-1">Total Seats</p>
                      <p className="text-xl font-bold">{bus.totalSeats}</p>
                    </div>
                    <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                      <p className="text-sm text-muted-foreground mb-1">Bookings</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{bus.bookedSeats}</p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full h-12 text-lg"
                    onClick={() => navigate(`/conductor/bus/${bus.id}`)}
                  >
                    <Users className="h-5 w-5 mr-2" />
                    Manage Seats & Attendance
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto text-center py-12 border-dashed">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground">No Buses Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">You have no bus schedules assigned for today. Please contact an administrator if this is an error.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ConductorDashboard;