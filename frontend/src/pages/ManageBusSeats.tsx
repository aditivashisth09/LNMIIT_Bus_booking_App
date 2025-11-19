import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, X, User } from 'lucide-react';
import { toast } from 'sonner';
import apiFetch from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Interface for the seat data coming from the conductor API
interface Seat {
  id: string; // "row-col"
  row: number;
  number: number;
  status: 'available' | 'confirmed' | 'attended' | 'absent';
  bookingId: string | null;
  userName: string | null;
}

interface BusData {
  bus: {
    _id: string;
    busNumber: string;
    route: string;
  };
  seats: Seat[];
}

const ManageBusSeats = () => {
  const { busId } = useParams();
  const navigate = useNavigate();
  
  const [busDetails, setBusDetails] = useState<BusData['bus'] | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch the bus and booking data from the new conductor endpoint
  const fetchBusData = async () => {
    if (!busId) return;
    try {
      const data: BusData = await apiFetch(`/conductor/bus/${busId}/bookings`);
      setBusDetails(data.bus);
      setSeats(data.seats);
    } catch (error: any) {
      toast.error(`Failed to load bus data: ${error.message}`);
      navigate('/conductor-dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusData();
  }, [busId, navigate]);

  // --- THIS IS THE FIX ---
  // Updated handler to only open modal for 'confirmed' seats
  // and give feedback for other non-clickable seats.
  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'confirmed') {
      setSelectedSeat(seat);
      setIsModalOpen(true);
    } else if (seat.status === 'available') {
      toast.info('This seat is not booked.');
    } else {
      toast.info(`This seat is already marked as ${seat.status}.`);
    }
  };
  // --- END OF FIX ---

  // Get seat color based on its status
  const getSeatColor = (status: Seat['status']) => {
    switch (status) {
      case 'available':
        return 'bg-gray-300 border-gray-400 text-gray-600 cursor-not-allowed';
      case 'confirmed':
        return 'bg-blue-600 hover:bg-blue-700 border-blue-700 text-white cursor-pointer'; // Booked, not verified
      case 'attended':
        return 'bg-green-600 border-green-700 text-white cursor-not-allowed'; // Green tick
      case 'absent':
        return 'bg-red-600 border-red-700 text-white cursor-not-allowed'; // Red cross
      default:
        return 'bg-gray-400';
    }
  };

  // Handle marking seat as 'attended' or 'absent'
  const handleUpdateStatus = async (status: 'attended' | 'absent') => {
    if (!selectedSeat || !selectedSeat.bookingId) return;

    setIsUpdating(true);
    try {
      await apiFetch(`/conductor/bookings/${selectedSeat.bookingId}/status`, {
        method: 'PUT',
        body: { status },
      });
      toast.success(`Seat ${selectedSeat.number} marked as ${status}.`);
      // Update seat status locally for instant feedback
      setSeats(prev => prev.map(s => 
        s.id === selectedSeat.id ? { ...s, status: status } : s
      ));
      setIsModalOpen(false);
      setSelectedSeat(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate stats for the header
  const attendedCount = seats.filter(s => s.status === 'attended').length;
  const absentCount = seats.filter(s => s.status === 'absent').length;
  const pendingCount = seats.filter(s => s.status === 'confirmed').length;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/conductor-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Card>
            <CardHeader>
              {isLoading ? (
                <Skeleton className="h-10 w-3/4" />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">{busDetails?.busNumber}</CardTitle>
                    <CardDescription className="text-base mt-1">
                      {busDetails?.route}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     <Badge className="bg-blue-600 hover:bg-blue-700">{pendingCount} Pending</Badge>
                     <Badge className="bg-green-600 hover:bg-green-700">{attendedCount} Attended</Badge>
                     <Badge className="bg-red-600 hover:bg-red-700">{absentCount} Absent</Badge>
                  </div>
                </div>
              )}
            </CardHeader>
          </Card>
        </div>

        {/* Seat Map */}
        <Card>
          <CardHeader>
            <CardTitle>Bus Layout</CardTitle>
            <CardDescription>Click a seat to manage attendance.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="mb-8 pt-4 flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 border border-blue-700 rounded-lg" />
                <span className="text-sm font-medium">Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-600 border border-green-700 rounded-lg" />
                <span className="text-sm font-medium">Attended</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-600 border border-red-700 rounded-lg" />
                <span className="text-sm font-medium">Absent</span>
              </div>
               <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-300 border border-gray-400 rounded-lg" />
                <span className="text-sm font-medium">Available</span>
              </div>
            </div>

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
                      {seats.filter(seat => seat.row === rowIndex + 1).slice(0, 2).map(seat => (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          // --- THIS IS THE FIX ---
                          // Only 'confirmed' seats should be clickable.
                          disabled={seat.status !== 'confirmed' || isUpdating}
                          // --- END OF FIX ---
                          className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-semibold text-sm ${getSeatColor(seat.status)}`}
                        >
                          {seat.status === 'attended' ? <Check className="h-5 w-5" /> :
                           seat.status === 'absent' ? <X className="h-5 w-5" /> :
                           seat.number}
                        </button>
                      ))}
                    </div>
                    <div className="w-8" /> {/* Aisle */}
                    {/* Right side seats */}
                    <div className="flex gap-2">
                      {seats.filter(seat => seat.row === rowIndex + 1).slice(2, 4).map(seat => (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          // --- THIS IS THE FIX ---
                          // Only 'confirmed' seats should be clickable.
                          disabled={seat.status !== 'confirmed' || isUpdating}
                          // --- END OF FIX ---
                          className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 flex items-center justify-center font-semibold text-sm ${getSeatColor(seat.status)}`}
                        >
                          {seat.status === 'attended' ? <Check className="h-5 w-5" /> :
                           seat.status === 'absent' ? <X className="h-5 w-5" /> :
                           seat.number}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Seat: {selectedSeat?.number}</DialogTitle>
            <DialogDescription>
              Mark attendance for {selectedSeat?.userName || 'this student'}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 bg-muted p-4 rounded-md">
            <User className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="font-semibold">{selectedSeat?.userName}</p>
              <p className="text-sm text-muted-foreground capitalize">Current Status: {selectedSeat?.status}</p>
</div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button 
              variant="destructive" 
              onClick={() => handleUpdateStatus('absent')}
              disabled={isUpdating}
            >
              <X className="h-4 w-4 mr-2" />
              Mark as Absent
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleUpdateStatus('attended')}
              disabled={isUpdating}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark as Attended
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageBusSeats;