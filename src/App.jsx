import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

import LandingPage from "./pages/Landing/LandingPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import TermsOfService from "./components/utility/TermsOfServices";
import PrivacyPolicy from "./components/utility/PrivacyPolicy";
import ProtectedRoute from "./components/Routes/ProtectedRoute";
import PublicRoute from "./components/Routes/PublicRoute";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./components/utility/ForgotPassword";
import UpdatePassword from "./components/utility/UpdatePassword";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>

          {/* Public */}
          <Route path="/" element={<LandingPage />} />

          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />

          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>

      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
      />
    </>
  );
}

export default App;