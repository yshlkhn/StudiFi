import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard } from "lucide-react";

export default function Dashboard() {
    const navigate = useNavigate();

    const logout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-primary relative overflow-hidden">

            {/* soft background glow */}
            <div className="absolute inset-0 bg-linear-to-br from-[rgba(239,169,67,0.08)] via-transparent to-transparent" />

            {/* main card */}
            <div className="relative z-10 w-full max-w-md text-center p-8 rounded-2xl 
                      bg-white/5 backdrop-blur-sm border border-white/10 
                      shadow-[0_10px_40px_rgba(0,0,0,0.25)]">

                {/* icon */}
                <div className="flex items-center justify-center mb-4">
                    <div className="p-3 rounded-xl bg-[rgba(239,169,67,0.1)] border border-[rgba(239,169,67,0.2)]">
                        <LayoutDashboard className="text-[#efa943]" />
                    </div>
                </div>

                {/* title */}
                <h1
                    className="text-2xl font-bold text-white mb-2"
                    style={{ fontFamily: "var(--font-plus-jakarta)" }}
                >
                    Welcome to Dashboard
                </h1>

                <p className="text-sm text-gray-400 mb-6">
                    You are successfully logged in 🚀
                </p>

                {/* button */}
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 
                     bg-brand-secondary hover:bg-[#f5ba65] 
                     text-black font-semibold rounded-xl 
                     hover:scale-[1.02] transition-all duration-200"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>

            </div>
        </div>
    );
}