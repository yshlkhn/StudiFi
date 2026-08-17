import Logo from "@/assets/logo_footer.svg";
import { LayoutDashboard, FolderOpen, MessageSquare, Brain, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";
import { useNavigate, NavLink } from "react-router-dom";

export default function Sidebar() {

    const [navOpen, setNavOpen] = useState(false);
    const [loadingUser, setLoadingUser] = useState(true);
    const [user, setUser] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const navigate = useNavigate();

    const NAV_ITEMS = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
        { id: "folders", label: "My Folders", icon: FolderOpen, href: "/myfolders" },
        { id: "chat", label: "AI Chat", icon: MessageSquare, href: "/ai-chat" },
        { id: "quizzes", label: "Quizzes", icon: Brain, href: "/quizes" },
        { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics" },
        { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
    ];

    useEffect(() => {
        let mounted = true;

        const loadUser = async () => {
            
            const { data, error } = await supabase.auth.getSession();

            if (!mounted) return;

            if (error) {
                console.error("Failed to load session:", error.message);
            }

            setUser(data.session?.user ?? null);
            setLoadingUser(false);
        };

        loadUser();

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!mounted) return;
                setUser(session?.user ?? null);
            }
        );

        return () => {
            mounted = false;
            listener?.subscription?.unsubscribe();
        };
    }, []);

    const fullName =
        user?.user_metadata?.full_name?.trim() ||
        user?.email?.split("@")[0] ||
        "Student";

    const initial = fullName[0]?.toUpperCase() ?? "S";

    const logout = async () => {
        setLoggingOut(true);

        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                toast.error("Couldn't log out, try again");
                return;
            }

            toast.success("Logged out");
            navigate("/login");
        } catch (error) {
            toast.error("Couldn't log out, try again");
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <>
            {/* mobile nav toggle */}
            <button
                onClick={() => setNavOpen(true)}
                className="lg:hidden fixed top-4 right-4 z-30 p-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm"
            >
                <Menu className="w-5 h-5 text-foreground" />
            </button>

            {/* ── Sidebar ───────────────────────────────────────────── */}
            <aside
                className={`fixed lg:static z-40 top-0 left-0 w-60 flex flex-col h-dvh shrink-0
                bg-[#0f1e35]/70 backdrop-blur-xl border-r border-white/[0.07] px-4 py-6
                transition-transform duration-300
                ${navOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
            >
                <div className="flex items-center justify-between mb-5 px-1">
                    <img src={Logo} alt="StudiFi" className="h-auto w-30 object-contain" />
                    <button onClick={() => setNavOpen(false)} className="lg:hidden text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 space-y-0.5">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.id}
                                to={item.href}
                                end={item.href === "/dashboard"}
                                onClick={() => setNavOpen(false)}
                                className={({ isActive }) =>
                                    `relative w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors duration-150
                                    ${isActive ? "text-brand-secondary" : "text-white/50 hover:text-white/90"}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.span
                                                layoutId="nav-active"
                                                className="absolute inset-0 rounded-lg bg-brand-secondary/10 border border-brand-secondary/20"
                                            />
                                        )}
                                        <Icon className="w-4 h-4 relative z-10" />
                                        <span className="relative z-10">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="pt-4 border-t border-white/[0.07] space-y-3">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 rounded-full bg-brand-secondary/15 border border-brand-secondary/30 flex items-center justify-center text-xs font-semibold text-brand-secondary shrink-0">
                            {loadingUser ? "…" : initial}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] font-medium text-white/90 truncate">
                                {loadingUser ? "Loading…" : fullName}
                            </p>
                            <p className="text-[11px] text-white/40 truncate">{user?.email || "Free plan"}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full py-2 bg-brand-secondary text-[#12233d] cursor-pointer font-semibold rounded-lg hover:bg-[#f5ba65] text-xs transition flex items-center justify-center gap-1.5"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Log out
                    </button>
                </div>
            </aside>

            {navOpen && (
                <div onClick={() => setNavOpen(false)} className="fixed inset-0 bg-black/60 z-30 lg:hidden" />
            )}

            {/* Confirm Logout Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0f1e35] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                        <h2 className="text-white font-semibold mb-2">
                            Log out?
                        </h2>

                        <p className="text-white/50 text-sm mb-5">
                            Are you sure you want to log out of your account?
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                disabled={loggingOut}
                                className="px-4 py-2 text-white/60 hover:text-white text-sm transition disabled:opacity-40"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={async () => {
                                    await logout();
                                    setShowLogoutConfirm(false);
                                }}
                                disabled={loggingOut}
                                className="px-4 py-2 bg-red-500 text-white cursor-pointer rounded-lg text-sm hover:bg-red-600 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {loggingOut ? (
                                    <>
                                        <svg
                                            className="w-4 h-4 animate-spin"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                className="opacity-25"
                                            />
                                            <path
                                                fill="currentColor"
                                                className="opacity-75"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Logging out...
                                    </>
                                ) : (
                                    "Log out"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}