import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bus, Clock, MapPin } from 'lucide-react';
import lnmiitLogo from '@/assets/lnmiit-logo.png';
import apiFetch from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface BusSchedule {
  _id: string;
  busNumber: string;
  route: string;
  departureTime: string;
  arrivalTime?: string;
  from: string;
  to: string;
  days: string[];
  status: 'active' | 'delayed' | 'cancelled';
}

const Timetable = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<BusSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimetable = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch('/timetable');
        setSchedules(data);
      } catch (error: any) {
        toast.error(`Failed to load timetable: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTimetable();
  }, []);

  // Helper to convert time string to minutes for easy comparison
  const parseTimeMinutes = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  
  const renderSchedules = (data: BusSchedule[]) => (
    <div className="grid gap-4">
      {data.map((schedule) => (
        <Card key={schedule._id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <div className="h-1 bg-gradient-to-r from-primary to-accent" />
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-5 gap-4">
              {/* Bus Info */}
              <div className="md:col-span-1">
                <div className="flex items-center gap-2 mb-2">
                  <Bus className="h-5 w-5 text-primary" />
                  <p className="font-bold text-lg">{schedule.busNumber}</p>
                </div>
                {/* Status Badge Removed Here */}
              </div>

              {/* Route */}
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Route</p>
                <p className="font-semibold text-base">{schedule.route}</p>
                <div className="flex items-center gap-2 mt-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  <p className="text-sm">{schedule.from}</p>
                </div>
              </div>

              {/* Timing */}
              <div className="md:col-span-1">
                <p className="text-sm text-muted-foreground mb-1">Departure</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <p className="font-bold text-primary">{schedule.departureTime}</p>
                </div>
                {schedule.arrivalTime && (
                  <>
                    <p className="text-sm text-muted-foreground mt-2">Arrival</p>
                    <p className="font-semibold">{schedule.arrivalTime}</p>
                  </>
                )}
              </div>

              {/* Days */}
              <div className="md:col-span-1">
                <p className="text-sm text-muted-foreground mb-2">Operating Days</p>
                <div className="flex flex-wrap gap-1">
                  {schedule.days.map((day) => (
                    <Badge key={day} variant="outline" className="text-xs">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
  
  const renderLoading = () => (
    <div className="grid gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );

  // Filter functions based on time
  const morningRoutes = schedules.filter(s => {
    const mins = parseTimeMinutes(s.departureTime);
    return mins >= 360 && mins < 600; // 6:00 AM - 10:00 AM
  });

  const midDayRoutes = schedules.filter(s => {
    const mins = parseTimeMinutes(s.departureTime);
    return mins >= 600 && mins < 960; // 10:00 AM - 4:00 PM
  });
  
  const eveningRoutes = schedules.filter(s => {
    const mins = parseTimeMinutes(s.departureTime);
    return mins >= 960 && mins < 1140; // 4:00 PM - 7:00 PM
  });
  
  const nightRoutes = schedules.filter(s => {
    const mins = parseTimeMinutes(s.departureTime);
    return mins >= 1140; // 7:00 PM onwards
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
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
                    <CardTitle className="text-3xl mb-2">LNMIIT Bus Timetable</CardTitle>
                    <p className="text-muted-foreground">
                      Real-time bus schedules and routes
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Live Data</span>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Time Slots */}
        <div className="space-y-8">
          {/* Morning Slots */}
          {morningRoutes.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-12 bg-gradient-to-r from-primary to-accent rounded-full" />
                <h2 className="text-2xl font-bold">Morning Routes (6:00 AM - 10:00 AM)</h2>
              </div>
              {isLoading ? renderLoading() : renderSchedules(morningRoutes)}
            </div>
          )}

          {/* Mid-Day Slots */}
          {midDayRoutes.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-12 bg-gradient-to-r from-accent to-primary rounded-full" />
                <h2 className="text-2xl font-bold">Mid-Day (10:00 AM - 4:00 PM)</h2>
              </div>
              {isLoading ? renderLoading() : renderSchedules(midDayRoutes)}
            </div>
          )}

          {/* Evening Routes */}
          {eveningRoutes.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-12 bg-gradient-to-r from-primary to-accent rounded-full" />
                <h2 className="text-2xl font-bold">Evening Routes (4:00 PM - 7:00 PM)</h2>
              </div>
              {isLoading ? renderLoading() : renderSchedules(eveningRoutes)}
            </div>
          )}

          {/* Night Routes */}
          {nightRoutes.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-12 bg-gradient-to-r from-accent to-primary rounded-full" />
                <h2 className="text-2xl font-bold">Night Routes (7:00 PM onwards)</h2>
              </div>
              {isLoading ? renderLoading() : renderSchedules(nightRoutes)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timetable;