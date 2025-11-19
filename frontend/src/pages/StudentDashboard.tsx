import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bus, Clock, Users, CalendarDays, LogOut } from 'lucide-react';
import lnmiitLogo from '@/assets/lnmiit-logo.png';
import apiFetch from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface BusRoute {
  id: string;
  busNumber: string;
  departureTime: string;
  arrivalTime: string;
  totalSeats: number;
  bookedSeats: number;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { clearAuth, auth } = useAuth();
  const [buses, setBuses] = useState<BusRoute[]>([]);
  const [myBookingsCount, setMyBookingsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [busData, bookingsData] = await Promise.all([
          apiFetch('/buses'),
          apiFetch('/bookings/mybookings')
        ]);
        setBuses(busData);
        setMyBookingsCount(bookingsData.filter((b: any) => b.status === 'confirmed').length);
      } catch (error: any) {
        toast.error(`Failed to load data: ${error.message}`);
        if (error.message.includes('401')) {
          handleLogout();
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();  
  }, []);

  const handleBookSeat = (busId: string) => {
    navigate(`/book-seat/${busId}`);
  };

  const handleJoinWaitlist = async (e: React.MouseEvent, busId: string) => {
    e.stopPropagation();
    try {
      const response = await apiFetch('/bookings/waitlist', {
        method: 'POST',
        body: { busId },
      });
      toast.success(response.message);
      // You might want to refresh stats or waiting list count here
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const getAvailabilityBadge = (booked: number, total: number) => {
    const available = total - booked;
    if (available === 0) {
      return <Badge variant="destructive">Full</Badge>;
    } else if (available <= 5) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Limited</Badge>;
    } else {
      return <Badge className="bg-green-600 hover:bg-green-700">Available</Badge>;
    }
  };
  
  const getSeatProgress = (booked: number, total: number) => {
    if (total === 0) return '0%';
    const available = total - booked;
    return `${(available / total) * 100}%`;
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
                <h1 className="text-xl font-bold text-foreground">LNMIIT Bus Booking</h1>
                <p className="text-sm text-muted-foreground">Student Portal</p>
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome, {auth?.name.split(' ')[0] || 'Student'}! 
          </h2>
          <p className="text-muted-foreground">
            Select a bus route to view seat availability and make your booking.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate('/my-bookings')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                My Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-1/4" /> : (
                <p className="text-2xl font-bold text-primary">{myBookingsCount}</p>
              )}
              <p className="text-sm text-muted-foreground">Active bookings</p>
            </CardContent>
          </Card>

          <Card className="border-accent/20 hover:border-accent/40 transition-colors cursor-pointer" onClick={() => navigate('/timetable')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Timetable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-accent">View</p>
              <p className="text-sm text-muted-foreground">Complete schedule</p>
            </CardContent>
          </Card>

          <Card className="border-green-600/20 hover:border-green-600/40 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Waiting List
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* This would require another API call, leaving as 0 for now */}
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-sm text-muted-foreground">Pending requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Buses */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-foreground mb-4">Available Buses</h3>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {buses.map((bus) => (
              <Card 
                key={bus.id} 
                className={`overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  selectedBus === bus.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedBus(bus.id)}
              >
                <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">Bus No: {bus.busNumber}</CardTitle>
                    {getAvailabilityBadge(bus.bookedSeats, bus.totalSeats)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Departure</p>
                        <p className="font-semibold">{bus.departureTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-accent" />
                      <div>
                        <p className="text-sm text-muted-foreground">Arrival</p>
                        <p className="font-semibold">{bus.arrivalTime}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-muted-foreground">Seat Availability</p>
                        <p className="text-sm font-semibold">
                          {bus.totalSeats - bus.bookedSeats} / {bus.totalSeats}
                        </p>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-600 to-green-500 h-2 rounded-full transition-all"
                          style={{ width: getSeatProgress(bus.bookedSeats, bus.totalSeats) }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      onClick={(e) => {
                        if (bus.bookedSeats >= bus.totalSeats) {
                          handleJoinWaitlist(e, bus.id);
                        } else {
                          e.stopPropagation();
                          handleBookSeat(bus.id);
                        }
                      }}
                    >
                      {bus.bookedSeats >= bus.totalSeats ? 'Join Waiting List' : 'Book Seat'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;