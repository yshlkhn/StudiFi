import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LandingPage from "@/pages/Landing/LandingPage";

export default function HomeRedirect() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-primary">
        <div className="text-white text-lg">
          Loading...
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}