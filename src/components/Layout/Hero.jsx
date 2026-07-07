import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, LayoutDashboard } from 'lucide-react'
import DotField from '../ui/DotField'
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: (i) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
}


export default function Hero() {

    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const handleDashboardClick = () => {
        if (isAuthenticated) {
            navigate("/dashboard");
        } else {
            navigate("/login");
        }
    };

    return (
        <section
            id="home"
            className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24"
        >
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

            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                {/* Badge */}
                <motion.div
                    custom={0}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border backdrop-blur-2xl border-[rgba(194,60,58,0.25)] bg-[rgba(194,60,58,0.08)] text-brand-accent text-sm font-medium"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary animate-pulse" />
                    AI-Powered Learning for Every Student
                </motion.div>

                {/* Headline */}
                <motion.h1
                    custom={1}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-balance leading-[1.1] mb-6"
                    style={{ fontFamily: 'var(--font-plus-jakarta)' }}
                >
                    Find Your Perfect.{' '}
                    <span className="text-[#efa943]">Study Partner.</span>
                </motion.h1>

                {/* Subheading */}
                <motion.p
                    custom={2}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="text-md sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-10 text-pretty"
                >
                    StudiFi is an AI-powered learning platform that helps students learn smarter through advanced Large Language Models (LLMs).
                    Get personalized explanations, interactive lessons, instant doubt-solving, quizzes, and adaptive learning tailored to your pace and goals.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    custom={3}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                >
                    <Link
                        to="/signup"
                        className="group flex items-center gap-2 px-7 py-3.5 bg-brand-accent hover:bg-[#d64542] text-black font-semibold rounded-xl hover:scale-105 hover:shadow-[0_8px_30px_rgba(194,60,58,0.35)] transition-all duration-200 text-sm">
                        Get Started Free
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <button
                        onClick={handleDashboardClick}
                        className="group flex items-center gap-2 px-7 py-3.5 bg-brand-secondary  text-black cursor-pointer font-semibold rounded-xl hover:scale-105 transition-all duration-300 text-sm"
                    >
                        <LayoutDashboard className="w-4 h-4 text-black" />

                        {isAuthenticated ? "Go to Dashboard" : "Login to Dashboard"}
                    </button>
                </motion.div>

            </div>
        </section>
    )
}