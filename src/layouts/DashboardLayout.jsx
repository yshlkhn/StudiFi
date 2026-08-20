import { Outlet } from "react-router-dom";
import Sidebar from "../pages/dashboard/sidebar/Sidebar";

export default function DashboardLayout() {
    return (
        <div className="h-dvh overflow-hidden bg-brand-primary flex relative">
            <Sidebar />

            <main className="flex-1 h-dvh overflow-y-auto relative z-10">
                <Outlet />
            </main>
        </div>
    );
}