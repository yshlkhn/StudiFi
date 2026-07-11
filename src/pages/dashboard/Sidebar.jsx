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
            const { data, error } = await supabase.auth.getUser();
            if (!mounted) return;
            if (error) console.error("Failed to load user:", error.message);
            setUser(data?.user ?? null);
            setLoadingUser(false);
        };
        loadUser();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            mounted = false;
            listener?.subscription?.unsubscribe();
        };
    }, []);

    const fullName = useMemo(
        () => user?.user_metadata?.full_name?.trim() || user?.email?.split("@")[0] || "Student",
        [user]
    );
    const initial = fullName[0]?.toUpperCase() ?? "S";

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Couldn't log out, try again");
            return;
        }
        toast.success("Logged out");
        navigate("/login");
    };

    return (
        <>
            {/* mobile nav toggle */}
            <button
                onClick={() => setNavOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm"
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
                        onClick={logout}
                        className="w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5
                            text-white/50 hover:text-white hover:bg-white/5
                            border border-white/10 font-medium rounded-lg transition-colors duration-150 text-[13px]"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Log out
                    </button>
                </div>
            </aside>

            {navOpen && (
                <div onClick={() => setNavOpen(false)} className="fixed inset-0 bg-black/60 z-30 lg:hidden" />
            )}
        </>
    )
}