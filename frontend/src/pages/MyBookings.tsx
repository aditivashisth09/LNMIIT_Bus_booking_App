import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bus, Calendar, MapPin, Clock, Ticket, Trash2, History } from 'lucide-react'; // Added History icon
import { toast } from 'sonner';
import lnmiitLogo from '@/assets/lnmiit-logo.png';
import apiFetch from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Booking {
  _id: string; // Changed from id to _id
  busNumber: string;
  route: string;
  seatNumber: number;
  departureTime: string;
  bookingDate: string;
  status: 'confirmed' | 'cancelled' | 'attended' | 'absent'; // UPDATED
}

// Helper to convert time string (e.g., '09:00 AM') into minutes for comparison
const parseTime = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!parts) return 0;

    let hours = parseInt(parts[1]);
    const minutes = parseInt(parts[2]);
    const modifier = parts[3].toUpperCase();

    if (modifier === 'PM' && hours !== 12) {
        hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
        hours = 0;
    }
    return hours * 60 + minutes;
};

// Helper to check if a booking is in the future (or very near future)
const isUpcoming = (booking: Booking): boolean => {
    const today = new Date();
    // Normalize date to remove time component for simple date comparison
    const bookingDate = new Date(booking.bookingDate);
    bookingDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (bookingDate > today) {
        return true; // Booking is on a future day
    }
    
    if (bookingDate.getTime() === today.getTime()) {
        // If it's today, compare times (in minutes)
        const nowMinutes = (new Date().getHours() * 60) + new Date().getMinutes();
        const departureMinutes = parseTime(booking.departureTime);
        // Consider upcoming if departure is at least 30 minutes in the future
        return departureMinutes - nowMinutes > 30; 
    }

    return false;
}

const MyBookings = () => {
  const navigate = useNavigate();
  const [allBookings, setAllBookings] = useState<Booking[]>([]); // Stores ALL fetched data
  const [displayedBookings, setDisplayedBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'current' | 'past'>('current'); // NEW STATE: Default to 'current'

  // Helper function to render status badges
  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Confirmed</Badge>;
      case 'attended':
        return <Badge className="bg-green-600 hover:bg-green-700">Attended</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown Status</Badge>;
    }
  };

  const filterBookings = (bookings: Booking[], currentView: 'current' | 'past') => {
      // Sort all bookings by date/time (most recent first)
      const sortedBookings = [...bookings].sort((a, b) => 
          new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
      );
      
      // Filter based on selected view
      if (currentView === 'current') {
          // Show upcoming 'confirmed' bookings only.
          return sortedBookings.filter(b => isUpcoming(b) && b.status === 'confirmed');
      } else {
          // Show past trips: everything NOT upcoming, including cancelled ones.
          return sortedBookings.filter(b => !isUpcoming(b));
      }
  }

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      // The backend fetches ALL bookings for the user.
      const data: Booking[] = await apiFetch('/bookings/mybookings');
      setAllBookings(data);
      // Initialize displayed bookings based on default view ('current')
      setDisplayedBookings(filterBookings(data, 'current')); 
    } catch (error: any) {
      toast.error(`Failed to fetch bookings: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effect to handle initial fetch
  useEffect(() => {
    fetchBookings();
  }, []);

  // Effect to re-filter when allBookings or view changes
  useEffect(() => {
      setDisplayedBookings(filterBookings(allBookings, view));
  }, [view, allBookings]);

  const handleCancelBooking = async (id: string) => {
    try {
      await apiFetch(`/bookings/${id}`, {
        method: 'DELETE',
      });
      toast.success('Booking cancelled successfully!');
      fetchBookings(); // Refresh the list
    } catch (error: any) {
      toast.error(`Failed to cancel booking: ${error.message}`);
    }
  };

  // Filter for only 'confirmed' bookings to count active ones for the badge
  const activeBookingsCount = allBookings.filter(b => b.status === 'confirmed' && isUpcoming(b)).length;
  
  // Custom message for the content based on the view
  const contentMessage = view === 'current'
    ? "Your upcoming confirmed reservations. You can cancel these before the deadline."
    : "Your trip history, including past attendances, absences, and cancelled bookings.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/student-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={lnmiitLogo} alt="LNMIIT Logo" className="h-16 w-auto" />
                  <div>
                    <CardTitle className="text-3xl mb-2">My Bookings</CardTitle>
                    <CardDescription className="text-base">
                      Manage your LNMIIT bus seat reservations
                    </CardDescription>
                  </div>
                </div>
                {/* Badge showing current count */}
                <Badge className="text-lg px-4 py-2">
                  {view === 'current' ? `${activeBookingsCount} Active` : 'History'}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </div>
        
        {/* --- VIEW TOGGLE BUTTONS (Current/Past) --- */}
        <div className="flex mb-6 rounded-lg bg-muted/50 p-1 w-full max-w-sm mx-auto">
            <Button
                variant={view === 'current' ? 'default' : 'ghost'}
                onClick={() => setView('current')}
                className="flex-1"
            >
                Current Bookings
            </Button>
            <Button
                variant={view === 'past' ? 'default' : 'ghost'}
                onClick={() => setView('past')}
                className="flex-1"
            >
                Past Trips
            </Button>
        </div>
        {/* --- END VIEW TOGGLE BUTTONS --- */}

        {/* Info Message based on view */}
        <p className="text-sm text-muted-foreground text-center mb-4">
            {contentMessage}
        </p>

        {/* Bookings List */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </>
          ) : displayedBookings.length > 0 ? (
            displayedBookings.map((booking) => {
                const isCancellable = booking.status === 'confirmed' && view === 'current';
                
                // Determine card appearance based on status
                let cardColor = '';
                if (booking.status === 'confirmed') cardColor = '#2563EB';
                if (booking.status === 'attended') cardColor = '#16A34A';
                if (booking.status === 'absent') cardColor = '#DC2626';
                if (booking.status === 'cancelled') cardColor = '#A0A0A0';

                const cardStyle = {
                    opacity: isCancellable || view === 'past' ? 1 : 0.7,
                    pointerEvents: isCancellable ? 'auto' : 'none', 
                };

                return (
                    <Card 
                        key={booking._id} 
                        className="overflow-hidden transition-shadow"
                        style={cardStyle}
                    >
                        {/* --- Dynamic Card Border Color based on Status --- */}
                        <div className="h-2" style={{
                            backgroundColor: cardColor
                        }} />
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                        <Bus className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{booking.busNumber}</h3>
                                        <p className="text-muted-foreground">{booking.route}</p>
                                    </div>
                                </div>
                                {getStatusBadge(booking.status)}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Ticket className="h-4 w-4 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Seat Number</p>
                                            <p className="font-bold text-lg">{booking.seatNumber}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Pickup Point</p>
                                            <p className="font-semibold">{booking.route.split('→')[0].trim()}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-accent" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Departure Time</p>
                                            <p className="font-bold text-accent">{booking.departureTime}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-accent" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Booking Date</p>
                                            <p className="font-semibold">
                                                {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/timetable');
                                    }}
                                >
                                    View Timetable
                                </Button>
                                
                                {/* --- CONDITIONAL CANCEL BUTTON (Only for Confirmed/Current bookings) --- */}
                                {isCancellable && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="flex-1">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Cancel Booking
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently cancel your booking for seat {booking.seatNumber} on bus {booking.busNumber}. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Back</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleCancelBooking(booking._id)}>
                                                    Yes, Cancel Booking
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                            
                            {/* --- CONDITIONAL MESSAGE --- */}
                            {booking.status === 'confirmed' ? (
                                <p className="text-xs text-muted-foreground text-center mt-3">
                                    Cancellation allowed up to 30 minutes before departure
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground text-center mt-3 font-semibold"
                                    style={{ color: booking.status === 'absent' ? '#DC2626' : (booking.status === 'attended' ? '#16A34A' : '#A0A0A0') }}
                                >
                                    {booking.status === 'cancelled' ? 'This booking was cancelled.' : `Attendance marked as ${booking.status}.`}
                                </p>
                            )}
                        
                        </CardContent>
                    </Card>
                );
            })
          ) : (
            <Card className="py-12">
              <CardContent className="text-center">
                <Bus className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">No Bookings Found</h3>
                <p className="text-muted-foreground mb-6">
                  {view === 'current' ? `You have no upcoming confirmed trips (Active: ${activeBookingsCount}).` : "Your recorded trip history is empty for past dates."}
                </p>
                <Button 
                  onClick={() => navigate('/student-dashboard')}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  Browse Available Buses
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBookings;