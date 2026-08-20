import { motion, animate } from 'framer-motion'
import { useRef, useState } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { CheckCircle2 } from 'lucide-react'

function AnimatedNumber({ target, suffix = '' }) {
    const [display, setDisplay] = useState(0);
    const ref = useRef(false);

    return (
        <motion.span
            onViewportEnter={() => {
                if (ref.current) return
                ref.current = true
                const controls = animate(0, target, {
                    duration: 2,
                    ease: 'easeOut',
                    onUpdate: (v) => setDisplay(Math.round(v)),
                })
                return () => controls.stop()
            }}
        >
            {display}
            {suffix}
        </motion.span>
    )
}

export default function About() {
    return (
        <section id="about" className="relative py-12 sm:py-14 md:py-16 px-6">
            <div className="max-w-6xl mx-auto">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-xs font-semibold uppercase tracking-widest text-brand-secondary mb-3 block">
                        About StudiFi
                    </span>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-balance">
                        Learn Smarter with <span className="text-brand-secondary">AI</span>
                    </h2>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-10 items-start">

                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                    >
                        <GlassCard hoverable className="p-8">
                            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-8">
                                Our Impact in Numbers
                            </h3>

                            <div className="grid grid-cols-2 gap-6">
                                {[
                                    { value: 95, suffix: "%", label: "Answer Accuracy" },
                                    { value: 96, suffix: "%", label: "Concept Retention" },
                                    { value: 95, suffix: "%", label: "Personalized Responses" },
                                    { value: 94, suffix: "%", label: "Problem-Solving" },
                                ].map((s, i) => (
                                    <motion.div
                                        key={s.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1, duration: 2 }}
                                        className="p-5 rounded-xl bg-[rgba(239,169,67,0.05)] border border-[rgba(239,169,67,0.1)] hover:border-[rgba(239,169,67,0.25)] hover:bg-[rgba(239,169,67,0.08)] transition-all duration-300"
                                    >
                                        <div className="text-2xl sm:text-3xl font-extrabold text-brand-secondary mb-1">
                                            <AnimatedNumber target={s.value} suffix={s.suffix} />
                                        </div>

                                        <div className="text-sm text-muted-foreground leading-tight">
                                            {s.label}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="mt-8 space-y-4">
                                {[
                                    { label: "Learning Accuracy", pct: 98 },
                                    { label: "Concept Mastery", pct: 94 },
                                    { label: "Student Satisfaction", pct: 98 }
                                ].map((bar) => (
                                    <div key={bar.label}>
                                        <div className="flex justify-between text-sm mb-1.5">
                                            <span className="text-muted-foreground">{bar.label}</span>
                                            <span className="text-brand-secondary font-semibold">{bar.pct}%</span>
                                        </div>

                                        <div className="h-1.5 bg-[rgba(27,48,80,0.6)] rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full bg-brand-secondary"
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${bar.pct}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="flex flex-col justify-center gap-6"
                    >
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-balance leading-tight">
                            We're on a mission to <span className="text-[#c23c3a]">transform</span> learning with AI
                        </h3>

                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            StudiFi is an AI-powered learning platform that leverages advanced Large Language Models (LLMs) to deliver personalized education.
                            From instant explanations to interactive tutoring, we help students understand concepts faster and learn more effectively.
                        </p>

                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            Whether you're preparing for exams, mastering a new subject, or strengthening your fundamentals,
                            StudiFi adapts to your learning style with AI-generated lessons, practice quizzes, personalized feedback, and 24/7 academic support.
                        </p>

                        <div className="flex flex-wrap gap-2.5 mt-2">
                            {[
                                "AI Tutor",
                                "Personalized Learning",
                                "LLM Powered",
                                "Instant Doubt Solving",
                                "Adaptive Quizzes",
                                "Progress Tracking"
                            ].map((tag, i) => (
                                <motion.span
                                    key={tag}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.07, duration: 0.4 }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[rgba(239,169,67,0.15)] text-brand-secondary"
                                >
                                    <CheckCircle2 className="w-3 h-3" />
                                    {tag}
                                </motion.span>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}