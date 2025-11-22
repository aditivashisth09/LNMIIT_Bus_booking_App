import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, X, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import lnmiitLogo from '@/assets/lnmiit-logo.png';
import apiFetch from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth'; 

interface Seat {
  id: string;
  row: number;
  number: number;
  status: 'available' | 'booked' | 'selected';
}

interface BusDetails {
  bus: {
    _id: string;
    busNumber: string;
    route: string;
  };
  seats: Seat[];
  availableCount: number;
  bookedCount: number;
}

const BookSeat = () => {
  const { busId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth(); 
  
  const [busDetails, setBusDetails] = useState<BusDetails | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isOnHold, setIsOnHold] = useState(false);

  useEffect(() => {
    if (auth?.onHold) {
        setIsOnHold(true);
        toast.error('Booking denied. You are on hold for excessive absences.');
        setIsLoading(false);
        return;
    }

    const fetchBusData = async () => {
      if (!busId) return;
      setIsLoading(true);
      try {
        const data: BusDetails = await apiFetch(`/buses/${busId}`);
        setBusDetails(data);
        setSeats(data.seats);
      } catch (error: any) {
        toast.error(`Failed to load bus details: ${error.message}`);
        navigate('/student-dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBusData();
  }, [busId, navigate, auth]);

  const handleSeatClick = (seat: Seat) => {
    if (isOnHold) {
      toast.error('Booking denied. You are on hold for excessive absences.');
      return;
    }

    if (seat.status === 'booked') {
      toast.error('This seat is already booked');
      return;
    }

    // Deselect if clicking the same seat
    if (selectedSeat && selectedSeat.id === seat.id) {
      setSeats(prev => prev.map(s => 
        s.id === seat.id ? { ...s, status: 'available' } : s
      ));
      setSelectedSeat(null);
    } else {
      // Select new seat
      setSeats(prev => prev.map(s => {
        if (s.id === seat.id) return { ...s, status: 'selected' };
        if (s.status === 'selected') return { ...s, status: 'available' }; // Deselect old
        return s;
      }));
      setSelectedSeat(seat);
    }
  };

  const getSeatColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-600 hover:bg-green-700 border-green-700';
      case 'booked':
        return 'bg-red-600 border-red-700 cursor-not-allowed';
      case 'selected':
        return 'bg-blue-600 border-blue-700 ring-2 ring-blue-400';
      default:
        return 'bg-gray-400';
    }
  };

  // --- FIXED BOOKING LOGIC ---
  const handleConfirmBooking = async () => {
    if (isOnHold) {
      toast.error('Booking denied. You are on hold for excessive absences.');
      return;
    }
    
    if (!selectedSeat || !busId) {
      toast.error('Please select a seat first');
      return;
    }

    setIsBooking(true);
    try {
      await apiFetch('/bookings', {
        method: 'POST',
        body: {
          busId: busId,
          seatNumber: selectedSeat.number,
        },
      });
      
      toast.success(`Seat ${selectedSeat.number} booked successfully!`);
      
      // 1. Immediate Visual Feedback: Mark seat as booked
      setSeats(prev => prev.map(s => 
        s.id === selectedSeat.id ? { ...s, status: 'booked' } : s
      ));

      // 2. Delay navigation slightly for UX, but keep button in 'Booking...' state
      setTimeout(() => {
        navigate('/my-bookings');
      }, 1500);
      
    } catch (error: any) {
      if (error.message.includes('Booking denied. You have been marked absent')) {
         toast.error(error.message);
         setIsOnHold(true); 
      } else {
         toast.error(error.message);
      }
      
      // Reset selection on error
      setSeats(prev => prev.map(s => 
        s.status === 'selected' ? { ...s, status: 'available' } : s
      ));
      setSelectedSeat(null);
      
      // 3. Only re-enable button if there was an error
      setIsBooking(false);
    }
  };

  const availableCount = seats.filter(s => s.status === 'available').length;
  const bookedCount = seats.filter(s => s.status === 'booked').length;
  const totalCount = seats.length;
  
  const HoldWarningCard = () => (
    <Card className="border-red-500 bg-red-50/50 dark:bg-red-900/20 mb-6">
      <CardHeader className="flex flex-row items-center space-y-0 p-4">
        <ShieldOff className="h-6 w-6 text-red-600 mr-3" />
        <CardTitle className="text-lg text-red-600">Booking Restricted</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-red-500">
          You are currently on hold due to 5 absences. You cannot book new seats. Please pay the fine in MIS portal and contact the administrator for removal.
        </CardDescription>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
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
          
          {isOnHold && <HoldWarningCard />}
          
          <Card>
            <CardHeader>
              {isLoading ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16" />
                    <div>
                      <Skeleton className="h-6 w-64 mb-2" />
                      <Skeleton className="h-5 w-80" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-32" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={lnmiitLogo} alt="LNMIIT Logo" className="h-16 w-auto" />
                    <div>
                      <CardTitle className="text-2xl">{busDetails?.bus.busNumber}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        {busDetails?.bus.route} - The LNM Institute of Information Technology
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="text-lg px-4 py-2">
                    {availableCount} seats available
                  </Badge>
                </div>
              )}
            </CardHeader>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Seat Map */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Bus Layout</CardTitle>
                <CardDescription>Click on an available seat to select</CardDescription>
              </CardHeader>
              <CardContent>
                
                {/* Seats Grid */}
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-3/4" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.from({ length: 10 }, (_, rowIndex) => (
                      <div key={rowIndex} className="flex gap-2 justify-center">
                        {/* Left side seats */}
                        <div className="flex gap-2">
                          {seats
                            .filter(seat => seat.row === rowIndex + 1)
                            .slice(0, 2)
                            .map(seat => (
                              <button
                                key={seat.id}
                                onClick={() => handleSeatClick(seat)}
                                disabled={seat.status === 'booked' || isBooking || isOnHold} 
                                className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-semibold text-white text-sm ${getSeatColor(seat.status)}`}
                              >
                                {seat.number}
                              </button>
                            ))}
                        </div>

                        {/* Aisle */}
                        <div className="w-8" />

                        {/* Right side seats */}
                        <div className="flex gap-2">
                          {seats
                            .filter(seat => seat.row === rowIndex + 1)
                            .slice(2, 4)
                            .map(seat => (
                              <button
                                key={seat.id}
                                onClick={() => handleSeatClick(seat)}
                                disabled={seat.status === 'booked' || isBooking || isOnHold} 
                                className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-semibold text-white text-sm ${getSeatColor(seat.status)}`}
                              >
                                {seat.number}
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Legend */}
                <div className="mt-8 pt-6 border-t flex flex-wrap gap-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-600 border-2 border-green-700 rounded-lg" />
                    <span className="text-sm font-medium">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-600 border-2 border-red-700 rounded-lg" />
                    <span className="text-sm font-medium">Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 border-2 border-blue-700 rounded-lg ring-2 ring-blue-400" />
                    <span className="text-sm font-medium">Selected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="md:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Seats</span>
                      <span className="font-semibold">{totalCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available</span>
                      <span className="font-semibold text-green-600">{availableCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Booked</span>
                      <span className="font-semibold text-red-600">{bookedCount}</span>
                    </div>
                  </div>
                )}

                <div className="h-px bg-border" />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Selected Seat</p>
                  {selectedSeat ? (
                    <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg p-3">
                      <span className="font-bold text-lg">
                        Seat {selectedSeat.number}
                      </span>
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                      <span className="text-sm text-muted-foreground">No seat selected</span>
                      <X className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 h-12 text-base font-semibold"
                  onClick={handleConfirmBooking}
                  disabled={!selectedSeat || isLoading || isBooking || isOnHold} 
                >
                  {isBooking ? 'Booking...' : 'Confirm Booking'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  You can cancel your booking up to 30 min before departure
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookSeat;