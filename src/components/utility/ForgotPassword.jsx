import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import DotField from "../ui/DotField"; 

const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6 },
    },
};

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState(""); // ✅ NEW

    const handleReset = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        // ❗ FRONTEND VALIDATION
        if (!email.trim()) {
            setError("Email is required");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        setMessage("Password reset link sent! Check your email.");
    };

    return (
        <div className="min-h-screen bg-brand-primary flex items-center justify-center px-6 relative overflow-hidden">

            {/* 🌟 DotField Background */}
            <div className="absolute inset-0 z-0">
                <DotField
                    dotRadius={1.5}
                    dotSpacing={14}
                    bulgeStrength={67}
                    glowRadius={160}
                    sparkle={false}
                    waveAmplitude={0}
                    cursorRadius={500}
                    cursorForce={0.1}
                    bulgeOnly
                    gradientFrom="#efa943"
                    gradientTo="#efa943"
                    glowColor="#efa943"
                />
            </div>

            {/* FORM */}
            <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8"
            >
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-[#efa943] transition mb-6"
                >
                    <ArrowLeft size={18} />
                    Back to Login
                </Link>

                <h1 className="text-3xl font-bold text-white mb-2">
                    Forgot Password
                </h1>

                <p className="text-gray-400 mb-8">
                    Enter your email address and we'll send you a password reset link.
                </p>

                <form onSubmit={handleReset} noValidate className="space-y-5">

                    <div className="relative">
                        <Mail
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                            size={18}
                        />

                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl bg-black/30 border border-white/10 pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#efa943]"
                        />
                    </div>
                    {error && (
                        <p className="text-red-400 text-sm mt-2">
                            {error}
                        </p>
                    )}

                    {/* SUCCESS MESSAGE */}
                    {message && (
                        <div className="rounded-xl border border-[#efa943]/20 bg-[#efa943]/10 p-4 text-sm text-[#efa943]">
                            {message}
                        </div>
                    )}

                    <button
                        disabled={loading}
                        className="w-full rounded-xl bg-[#efa943] py-3 font-semibold text-black hover:scale-[1.02] transition disabled:opacity-60"
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}