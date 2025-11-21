import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bus, 
  Users, 
  Clock, 
  TrendingUp, 
  Plus,
  LogOut,
  Edit,
  Trash2,
  User,
  ShieldOff // NEW ICON
} from 'lucide-react';
import { toast } from 'sonner';
import lnmiitLogo from '@/assets/lnmiit-logo.png';
import apiFetch from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

// Interface for conductor list
interface Conductor {
  _id: string;
  name: string;
  phone: string;
}

// BusData interface now includes conductor object (Represents a SCHEDULE)
interface BusData {
  id: string;
  busNumber: string;
  route: string;
  driver: string;
  totalSeats: number;
  bookedSeats: number;
  departureTime: string;
  arrivalTime: string;
  conductor: Conductor | null; 
}

interface StatsData {
  totalBuses: number; 
  totalBookings: number;
  totalWaiting: number;
  totalCapacity: number;
  occupancyRate: string;
}

// --- NEW INTERFACE ---
interface OnHoldUser {
  _id: string;
  name: string;
  email: string;
  absentCount: number;
}
// --- END NEW INTERFACE ---

// Interface for unique physical bus assets
interface PhysicalBusAsset {
    busNumber: string;
    schedulesCount: number;
    totalSeats: number;
    driver: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();
  // 'buses' stores all schedules (including placeholders)
  const [buses, setBuses] = useState<BusData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoadingBuses, setIsLoadingBuses] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingHoldList, setIsLoadingHoldList] = useState(true); // NEW

  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [holdList, setHoldList] = useState<OnHoldUser[]>([]); // NEW
  
  const [editingBus, setEditingBus] = useState<BusData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [isFleetManagementOpen, setIsFleetManagementOpen] = useState(false);
  const [newPhysicalBusNumber, setNewPhysicalBusNumber] = useState('');

  const [newBus, setNewBus] = useState({
    busNumber: '',
    route: '',
    driver: '',
    totalSeats: 40,
    departureTime: '',
    arrivalTime: '',
    conductor: '', 
  });

  // --- NEW FETCH FUNCTION ---
  const fetchHoldList = async () => {
    setIsLoadingHoldList(true);
    try {
      const data: OnHoldUser[] = await apiFetch('/admin/hold-list');
      setHoldList(data);
    } catch (error: any) {
      toast.error(`Failed to fetch hold list: ${error.message}`);
    } finally {
      setIsLoadingHoldList(false);
    }
  };
  // --- END NEW FETCH FUNCTION ---

  const fetchConductors = async () => {
    try {
      const data = await apiFetch('/admin/conductors');
      setConductors(data);
    } catch (error: any) {
      toast.error(`Failed to fetch conductors: ${error.message}`);
    }
  };

  const fetchBuses = async () => {
    setIsLoadingBuses(true);
    try {
      // Fetch ALL bus schedules/trips for Admin view
      const data: BusData[] = await apiFetch('/admin/buses/all');
      setBuses(data);
    } catch (error: any) {
      toast.error(`Failed to fetch schedules: ${error.message}`);
    } finally {
      setIsLoadingBuses(false);
    }
  };

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await apiFetch('/admin/stats');
      setStats(data);
    } catch (error: any) {
      toast.error(`Failed to fetch stats: ${error.message}`);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchBuses();
    fetchStats();
    fetchConductors(); 
    fetchHoldList(); // NEW
  }, []);

  // Helper to get unique physical buses from schedules (Includes placeholders)
  const getUniquePhysicalBuses = (schedules: BusData[]): PhysicalBusAsset[] => {
    const uniqueBusAssets = new Map<string, { schedulesCount: number, totalSeats: number, driver: string }>();

    schedules.forEach(bus => {
      const busNumber = bus.busNumber;
      // We count real schedules for the "Active Schedules" count
      const isRealSchedule = bus.route !== 'New Asset (Placeholder)';

      if (uniqueBusAssets.has(busNumber)) {
        if(isRealSchedule) uniqueBusAssets.get(busNumber)!.schedulesCount += 1;
      } else {
        uniqueBusAssets.set(busNumber, {
          schedulesCount: isRealSchedule ? 1 : 0,
          totalSeats: bus.totalSeats, 
          driver: bus.driver
        });
      }
    });

    return Array.from(uniqueBusAssets, ([busNumber, data]) => ({
      busNumber,
      ...data
    })).sort((a, b) => a.busNumber.localeCompare(b.busNumber));
  };
  
  const uniquePhysicalBuses = getUniquePhysicalBuses(buses);
  const availableBusNumbers = uniquePhysicalBuses.map(asset => asset.busNumber);

  // --- FILTERING FOR SCHEDULE LIST ---
  // Exclude placeholder assets so they can't be deleted from "Manage Schedules"
  const visibleSchedules = buses.filter(bus => bus.route !== 'New Asset (Placeholder)');

  // --- FLEET MANAGEMENT LOGIC ---

  const handleAddPhysicalBusAsset = async () => {
      const busNumber = newPhysicalBusNumber.trim();
      if (!busNumber) {
          toast.error('Bus Number cannot be empty.');
          return;
      }
      if (uniquePhysicalBuses.some(bus => bus.busNumber.toLowerCase() === busNumber.toLowerCase())) {
          toast.error(`Physical Bus Asset ${busNumber} is already defined.`);
          return;
      }

      try {
          await apiFetch('/buses', {
              method: 'POST',
              body: {
                  busNumber,
                  route: 'New Asset (Placeholder)',
                  driver: 'To Be Assigned',
                  totalSeats: 40,
                  departureTime: '11:59 PM', 
                  arrivalTime: '11:59 PM',
                  conductor: null,
              }
          });
          toast.success(`Physical Bus Asset ${busNumber} added successfully to the fleet.`);
          setNewPhysicalBusNumber('');
          fetchBuses();
          fetchStats();
      } catch (error: any) {
          toast.error(`Failed to add bus asset: ${error.message}`);
      }
  };

  const handleDeletePhysicalBusAsset = async (busNumber: string) => {
    try {
        await apiFetch(`/buses/fleet/${busNumber}`, {
            method: 'DELETE',
        });
        toast.success(`Physical Bus Asset ${busNumber} and all associated schedules deleted.`);
        setIsFleetManagementOpen(false);
        fetchBuses();
        fetchStats();
    } catch (error: any) {
        toast.error(`Failed to delete bus asset: ${error.message}`);
    }
  };

  // --- HOLD LIST MANAGEMENT LOGIC (NEW) ---
  const handleRemoveHold = async (userId: string) => {
    try {
      const response = await apiFetch(`/admin/remove-hold/${userId}`, {
        method: 'PUT',
      });
      toast.success(response.message);
      fetchHoldList(); // Refresh the hold list
    } catch (error: any) {
      toast.error(`Failed to remove user from hold: ${error.message}`);
    }
  };


  // --- SCHEDULE MANAGEMENT LOGIC (EXISTING) ---

  const handleAddSchedule = async () => {
    if (!newBus.busNumber || !newBus.route || !newBus.driver || !newBus.departureTime || !newBus.arrivalTime) {
      toast.error('Please fill all required fields for the schedule');
      return;
    }

    try {
      await apiFetch('/buses', {
        method: 'POST',
        body: {
          ...newBus,
          totalSeats: Number(newBus.totalSeats),
          conductor: newBus.conductor || null, 
        }
      });
      toast.success('Bus schedule added successfully!');
      setNewBus({
        busNumber: '',
        route: '',
        driver: '',
        totalSeats: 40,
        departureTime: '',
        arrivalTime: '',
        conductor: '', 
      });
      fetchBuses();
      fetchStats();
    } catch (error: any) {
      toast.error(`Failed to add bus schedule: ${error.message}`);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingBus) return;
    const { id, value, type } = e.target;
    
    setEditingBus({
      ...editingBus,
      [id]: type === 'number' ? parseInt(value) || 0 : value,
    });
  };
  
  const handleEditBusSelectChange = (conductorId: string) => {
    if (!editingBus) return;

    if (conductorId === 'none') {
      setEditingBus({ ...editingBus, conductor: null });
    } else {
      const selectedConductor = conductors.find(c => c._id === conductorId) || null;
      setEditingBus({
        ...editingBus,
        conductor: selectedConductor, 
      });
    }
  };

  const handleUpdateBus = async () => {
    if (!editingBus) return;
  
    if (!editingBus.busNumber || !editingBus.route || !editingBus.driver || !editingBus.departureTime || !editingBus.arrivalTime) {
      toast.error('All fields must be filled');
      return;
    }

    try {
      await apiFetch(`/buses/${editingBus.id}`, {
        method: 'PUT',
        body: {
          ...editingBus,
          totalSeats: Number(editingBus.totalSeats),
          conductor: editingBus.conductor ? editingBus.conductor._id : null
        }
      });
      toast.success('Bus schedule updated successfully!');
      setIsEditModalOpen(false); 
      setEditingBus(null); 
      fetchBuses(); 
      fetchStats(); 
    } catch (error: any) {
      toast.error(`Failed to update bus schedule: ${error.message}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await apiFetch(`/buses/${id}`, {
        method: 'DELETE',
      });
      toast.success('Bus schedule removed successfully!');
      fetchBuses();
      fetchStats();
    } catch (error: any) {
      toast.error(`Failed to delete schedule: ${error.message}`);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const StatsCard = ({ 
    title, 
    value, 
    icon, 
    loading, 
    onClick 
  }: { 
    title: string, 
    value: string | number | undefined, 
    icon: React.ReactNode, 
    loading: boolean,
    onClick?: () => void
  }) => (
    <Card 
      className={`border-primary/20 ${onClick ? 'cursor-pointer hover:shadow-md transition-all hover:bg-accent/5' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {loading ? <Skeleton className="h-8 w-1/3" /> : <p className="text-3xl font-bold text-primary">{value}</p>}
          {icon}
        </div>
      </CardContent>
    </Card>
  );

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
                <p className="text-sm text-muted-foreground">Admin Portal</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard 
            title="Total buses" 
            value={stats?.totalBuses} 
            icon={<Bus className="h-8 w-8 text-primary/40" />} 
            loading={isLoadingStats}
            onClick={() => setIsFleetManagementOpen(true)} // Open Fleet Management Modal
          />
          <StatsCard title="Total Bookings" value={stats?.totalBookings} icon={<Users className="h-8 w-8 text-primary/40" />} loading={isLoadingStats} />
          <StatsCard 
            title="Students on Hold" 
            value={holdList.length} 
            icon={<ShieldOff className={`h-8 w-8 ${holdList.length > 0 ? 'text-destructive/80' : 'text-primary/40'}`} />} 
            loading={isLoadingHoldList}
            onClick={() => {
              document.getElementById('hold-list-trigger')?.click();
            }}
          />
          <StatsCard title="Waiting List" value={stats?.totalWaiting} icon={<Clock className="h-8 w-8 text-primary/40" />} loading={isLoadingStats} />
        </div>

        {/* Main Content Tabs */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <Tabs defaultValue="buses" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-fit">
              <TabsTrigger value="buses">Manage Schedules</TabsTrigger>
              <TabsTrigger value="add">Add Schedule</TabsTrigger>
              <TabsTrigger value="hold-list" id="hold-list-trigger">
                Hold List 
                {holdList.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {holdList.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {/* --- TAB 1: MANAGE SCHEDULES --- */}
            <TabsContent value="buses" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Upcoming Bus Schedules (Total: {visibleSchedules.length})</h2>
              </div>
              
              {isLoadingBuses ? (
                <div className="grid gap-4">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {visibleSchedules.length > 0 ? visibleSchedules.map((bus) => (
                    <Card key={bus.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-xl">{bus.busNumber} - {bus.departureTime}</CardTitle>
                              <Badge variant={bus.bookedSeats >= bus.totalSeats ? 'destructive' : 'default'}>
                                {bus.bookedSeats}/{bus.totalSeats} Seats
                              </Badge>
                            </div>
                            <CardDescription className="text-base">{bus.route}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => { setEditingBus(bus); setIsEditModalOpen(true); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete schedule **{bus.busNumber}** departing at **{bus.departureTime}** and all its associated bookings. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteSchedule(bus.id)}>
                                    Yes, Delete Schedule
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Driver</p>
                            <p className="font-semibold">{bus.driver}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Arrival</p>
                            <p className="font-semibold">{bus.arrivalTime}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conductor</p>
                            <div className="flex items-center gap-1.5">
                              {bus.conductor ? (
                                <>
                                  <User className="h-4 w-4" />
                                  <p className="font-semibold">{bus.conductor.name}</p>
                                </>
                              ) : (
                                <p className="font-semibold text-muted-foreground">None</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
                            style={{ width: `${(bus.bookedSeats / bus.totalSeats) * 100}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )) : <p className="text-center text-muted-foreground">No upcoming schedules.</p>}
                </div>
              )}
            </TabsContent>

            {/* --- TAB 2: ADD SCHEDULE --- */}
            <TabsContent value="add">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Bus Schedule</CardTitle>
                  <CardDescription>Allocate a bus to a new time slot/route.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="busNumber">Bus Number</Label>
                      <Select
                        value={newBus.busNumber}
                        onValueChange={(value) => setNewBus({...newBus, busNumber: value})}
                      >
                        <SelectTrigger id="busNumber">
                          <SelectValue placeholder="Select an existing Bus Asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBusNumbers.map((busNumber) => (
                            <SelectItem key={busNumber} value={busNumber}>
                              {busNumber}
                            </SelectItem>
                          ))}
                          {availableBusNumbers.length === 0 && (
                            <SelectItem value="NO_BUSES_AVAILABLE" disabled>No upcoming buses available.</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Manage the list of buses by clicking 'Total Buses' on the dashboard.</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="route">Route</Label>
                      <Input 
                        id="route" 
                        placeholder="From - To"
                        value={newBus.route}
                        onChange={(e) => setNewBus({...newBus, route: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driver">Driver Name</Label>
                      <Input 
                        id="driver" 
                        placeholder="John Doe"
                        value={newBus.driver}
                        onChange={(e) => setNewBus({...newBus, driver: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalSeats">Total Seats</Label>
                      <Input 
                        id="totalSeats" 
                        type="number"
                        value={newBus.totalSeats}
                        onChange={(e) => setNewBus({...newBus, totalSeats: parseInt(e.target.value) || 0})}
                      />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="departureTime">Departure Time</Label>
                      <Input 
                        id="departureTime" 
                        placeholder="09:00 AM"
                        value={newBus.departureTime}
                        onChange={(e) => setNewBus({...newBus, departureTime: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="arrivalTime">Arrival Time</Label>
                      <Input 
                        id="arrivalTime" 
                        placeholder="09:45 AM"
                        value={newBus.arrivalTime}
                        onChange={(e) => setNewBus({...newBus, arrivalTime: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="conductor">Assign Conductor (Optional)</Label>
                      <Select
                        value={newBus.conductor}
                        onValueChange={(value) => setNewBus({ ...newBus, conductor: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger id="conductor">
                          <SelectValue placeholder="Select a conductor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {conductors.map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name} ({c.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    onClick={handleAddSchedule}
                    disabled={availableBusNumbers.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Schedule
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* --- TAB 3: HOLD LIST MANAGEMENT (NEW) --- */}
            <TabsContent value="hold-list">
              <Card>
                <CardHeader>
                  <CardTitle>Absentee Hold List</CardTitle>
                  <CardDescription>Students with 5 'Absent' marks are restricted from booking.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingHoldList ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : holdList.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No students are currently restricted.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {holdList.map(user => (
                        <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50/50 dark:bg-red-900/20">
                          <div>
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="destructive">
                              {user.absentCount} Absences
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  Remove Hold
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Removal of Hold</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove the booking restriction for **{user.name}**? This will reset their absent count and allow them to book seats again.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleRemoveHold(user._id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Confirm Remove Hold
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>


          </Tabs>

          {/* Edit Schedule Dialog Content */}
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Schedule: {editingBus?.busNumber}</DialogTitle>
              <DialogDescription>
                Update the schedule and allocation details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="busNumber" className="text-right">Bus Number</Label>
                <Input id="busNumber" value={editingBus?.busNumber || ''} onChange={handleEditInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="route" className="text-right">Route</Label>
                <Input id="route" value={editingBus?.route || ''} onChange={handleEditInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="driver" className="text-right">Driver</Label>
                <Input id="driver" value={editingBus?.driver || ''} onChange={handleEditInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="departureTime" className="text-right">Departure</Label>
                <Input id="departureTime" value={editingBus?.departureTime || ''} onChange={handleEditInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="arrivalTime" className="text-right">Arrival</Label>
                <Input id="arrivalTime" value={editingBus?.arrivalTime || ''} onChange={handleEditInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="totalSeats" className="text-right">Total Seats</Label>
                <Input id="totalSeats" type="number" value={editingBus?.totalSeats || 40} onChange={handleEditInputChange} className="col-span-3" />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="conductor-edit" className="text-right">Conductor</Label>
                <Select
                  value={editingBus?.conductor?._id || 'none'} 
                  onValueChange={handleEditBusSelectChange}
                >
                  <SelectTrigger id="conductor-edit" className="col-span-3">
                    <SelectValue placeholder="Select a conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {conductors.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setEditingBus(null)}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleUpdateBus}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog> 

        {/* --- Dialog for Managing Physical Bus Assets (Fleet) --- */}
        <Dialog open={isFleetManagementOpen} onOpenChange={setIsFleetManagementOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Total Buses</DialogTitle>
              <DialogDescription>
                The Administrator can add a new bus here. 
              </DialogDescription>
            </DialogHeader>
            
            {/* Add New Physical Bus Asset */}
            <div className="flex gap-2 pt-4 border-b pb-4">
                <Input 
                    placeholder="Enter new bus number"
                    value={newPhysicalBusNumber}
                    onChange={(e) => setNewPhysicalBusNumber(e.target.value)}
                />
                <Button 
                    onClick={handleAddPhysicalBusAsset} 
                    disabled={!newPhysicalBusNumber.trim() || uniquePhysicalBuses.some(bus => bus.busNumber.toLowerCase() === newPhysicalBusNumber.trim().toLowerCase())}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bus
                </Button>
            </div>

            {/* List of Current Assets */}
            <div className="max-h-[50vh] overflow-y-auto">
              {isLoadingBuses && uniquePhysicalBuses.length === 0 ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : uniquePhysicalBuses.length > 0 ? (
                <div className="space-y-2">
                  {uniquePhysicalBuses.map((bus) => (
                    <div key={bus.busNumber} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div className="flex items-center gap-3">
                        <Bus className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold">{bus.busNumber}</p>
                          <p className="text-xs text-muted-foreground">{bus.schedulesCount} Active Schedules | Driver: {bus.driver}</p>
                        </div>
                      </div>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="ml-4">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently Delete This Bus?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action will delete **{bus.busNumber}** as a physical Bus by deleting ALL **{bus.schedulesCount}** schedules (real and placeholders) and all associated bookings. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePhysicalBusAsset(bus.busNumber)}>
                                Yes, Delete Bus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No bus added until now, Add one above</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsFleetManagementOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* --- END FLEET DIALOG --- */}
      </main>
    </div>
  );
};

export default AdminDashboard;