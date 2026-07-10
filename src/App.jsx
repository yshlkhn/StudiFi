import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import LandingPage from "./pages/Landing/LandingPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import TermsOfService from "./components/Layout/TermsOfServices";
import PrivacyPolicy from "./components/Layout/PrivacyPolicy";
import ForgotPassword from "./components/Layout/ForgotPassword";
import UpdatePassword from "./components/Layout/UpdatePassword";
import NotFound from "./pages/NotFound";

import ProtectedRoute from "./Routes/ProtectedRoute";
import PublicRoute from "./Routes/PublicRoute";

import DashboardLayout from "./pages/DashboardLayout";

import Dashboard from "./pages/dashboard/Dashboard";
import MyFolders from "./pages/dashboard/MyFolders";
import FolderDetails from "./pages/dashboard/FolderDetails";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>

          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/login" element={<PublicRoute> <Login /> </PublicRoute>} />
          <Route path="/signup" element={<PublicRoute ><Signup /> </PublicRoute>} />

          {/* Protected Layout */}
          <Route element={<ProtectedRoute> <DashboardLayout /> </ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/myfolders" element={<MyFolders />} />
            <Route path="/folder/:id" element={<FolderDetails />} />
          </Route>

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