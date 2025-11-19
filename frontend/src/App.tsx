import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import StudentDashboard from "./pages/StudentDashboard";
import BookSeat from "./pages/BookSeat";
import AdminDashboard from "./pages/AdminDashboard";
import Timetable from "./pages/Timetable";
import MyBookings from "./pages/MyBookings";
import NotFound from "./pages/NotFound";
import StudentProtectedRoute from "./components/ui/StudentProtectedRoute";
import AdminProtectedRoute from "./components/ui/AdminProtectedRoute";
// --- NEW IMPORTS ---
import ConductorProtectedRoute from "./components/ui/ConductorProtectedRoute";
import ConductorDashboard from "./pages/ConductorDashboard";
import ManageBusSeats from "./pages/ManageBusSeats";
// --- END NEW IMPORTS ---

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Student Protected Routes */}
          <Route element={<StudentProtectedRoute />}>
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/book-seat/:busId" element={<BookSeat />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/my-bookings" element={<MyBookings />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>

          {/* --- NEW ROUTES --- */}
          {/* Conductor Protected Routes */}
          <Route element={<ConductorProtectedRoute />}>
            <Route path="/conductor-dashboard" element={<ConductorDashboard />} />
            <Route path="/conductor/bus/:busId" element={<ManageBusSeats />} />
          </Route>
          {/* --- END NEW ROUTES --- */}

          {/* CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;