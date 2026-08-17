import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@/styles/toast.css";

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
import FileViewer from "./pages/dashboard/FileViewer";
import AiChat from "./pages/dashboard/AiChat";
import Quizes from "./pages/dashboard/Quizes";
import Analytics from "./pages/dashboard/Analytics";
import Settings from "./pages/dashboard/Settings";
import HomeRedirect from "./pages/HomeRedirect";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>

          {/* Public */}
          <Route path="/" element={<HomeRedirect />} />
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
            <Route path="/myfolders/:id" element={<FolderDetails />} />
            <Route path="/myfolders/file/:fileId" element={<FileViewer />} />
            <Route path="/ai-chat" element={<AiChat />} />
            <Route path="/quizes" element={<Quizes />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
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
        toastClassName="studifi-toast"
        bodyClassName="studifi-toast-body"
        progressClassName="studifi-toast-progress"
      />
    </>
  );
}

export default App;