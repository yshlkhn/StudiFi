import { motion } from 'framer-motion'
import {
  Brain,
  Zap,
  Shield,
  BarChart3,
  Users,
  Puzzle,
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI Personal Tutor',
    description:
      'Learn with an intelligent AI tutor that provides personalized explanations, step-by-step guidance, and instant answers to your questions.',
    color: '#c23c3a'
  },
  {
    icon: Zap,
    title: 'Instant Doubt Solving',
    description:
      'Get accurate explanations for complex topics in seconds. Ask questions anytime and receive clear, easy-to-understand responses.',
    color: '#c23c3a'
  },
  {
    icon: Shield,
    title: 'Personalized Learning Paths',
    description:
      'Study at your own pace with AI-generated lessons and learning plans tailored to your goals, strengths, and progress.',
    color: '#c23c3a'
  },
  {
    icon: BarChart3,
    title: 'Progress Analytics',
    description:
      'Track your learning journey with detailed insights, performance analytics, and recommendations to improve continuously.',
    color: '#c23c3a'
  },
  {
    icon: Users,
    title: 'Interactive Practice',
    description:
      'Reinforce your knowledge through AI-generated quizzes, practice questions, and real-world exercises that adapt to your skill level.',
    color: '#c23c3a'
  },
  {
    icon: Puzzle,
    title: 'LLM-Powered Learning',
    description:
      'Powered by advanced Large Language Models (LLMs) to deliver conversational learning, concept simplification, summaries, and exam preparation.',
    color: '#c23c3a',
  },
]

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

export default function Features() {
  return (
    <section id="features" className="relative py-12 sm:py-14 md:py-16 px-6">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-100 bg-[#1b3050] rounded-full filter blur-[150px] opacity-30 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-secondary mb-3 block"> Features </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-balance mb-4">
            Your Complete <span className="text-brand-secondary">AI Study Toolkit</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed text-pretty">
            Experience personalized education with AI-powered tutoring, instant doubt solving, adaptive quizzes, progress tracking, and intelligent learning paths—all in one platform.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feat) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.title}
                variants={cardVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group relative p-6 rounded-2xl glass-card cursor-default overflow-hidden"
              >
                {/* Glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${feat.color}18, transparent 70%)`,
                  }}
                />
                {/* Glow border */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                  style={{
                    boxShadow: `0 0 0 1px ${feat.color}40`,
                  }}
                />

                <div
                  className="w-12 h-12 rounded-xl mb-5 flex items-center justify-center relative z-10 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${feat.color}18`, border: `1px solid ${feat.color}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color: feat.color }} />
                </div>
                <h3
                  className="text-base font-bold text-foreground mb-2 relative z-10"
                >
                  {feat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10">
                  {feat.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section >
  )
}