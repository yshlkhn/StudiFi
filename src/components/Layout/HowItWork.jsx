import { motion } from 'framer-motion'
import { UserPlus, Search, GitMerge, Trophy } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Create Your Learning Profile',
    description:
      'Tell StudiFi about your academic goals, subjects, skill level, and learning preferences so AI can personalize your learning journey.',
    color: '#efa943',
  },
  {
    number: '02',
    icon: Search,
    title: 'Learn with Your AI Tutor',
    description:
      'Ask questions naturally and receive instant explanations, concept breakdowns, examples, and step-by-step solutions powered by advanced LLMs.',
    color: '#c23c3a',
  },
  {
    number: '03',
    icon: GitMerge,
    title: 'Practice & Reinforce',
    description:
      'Master concepts through adaptive quizzes, flashcards, interactive exercises, and AI-generated study sessions tailored to your progress.',
    color: '#efa943',
  },
  {
    number: '04',
    icon: Trophy,
    title: 'Track Your Progress',
    description:
      'Monitor your performance, identify weak areas, and receive personalized recommendations to continuously improve and achieve your goals.',
    color: '#c23c3a',
  },
]

export default function HowItWorks() {
  return (
    <section id="working" className="relative py-12 sm:py-14 md:py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-secondary mb-3 block">
            How It Works
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-balance mb-4">
            Start Learning in <span className="text-brand-secondary">4 Simple Steps</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Learn faster with your AI tutor. Get personalized lessons, instant answers, adaptive practice, and real-time feedback designed to help you master any subject.</p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line — desktop */}
          <div className="hidden lg:block absolute top-18 left-[calc(12.5%+2rem)] right-[calc(12.5%+2rem)] h-px">
            <motion.div
              className="h-full bg-[rgba(239,169,67,0.25)]"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
              style={{ transformOrigin: 'left' }}
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className="flex flex-col items-center text-center group"
                >
                  {/* Icon circle */}
                  <div className="relative mb-6">
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center relative z-10 transition-all duration-300"
                      style={{
                        border: `1px solid ${step.color}30`,
                        background: `${step.color}10`,
                      }}
                    >
                      <Icon className="w-6 h-6" style={{ color: step.color }} />
                    </motion.div>
                    {/* Number badge */}
                    <span
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-[#080d14] z-20"
                      style={{ background: step.color }}
                    >
                      {i + 1}
                    </span>
                    {/* Glow */}
                    <div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                      style={{ background: step.color }}
                    />
                  </div>

                  <h3
                    className="text-base font-bold text-foreground mb-2"
                    style={{ fontFamily: 'var(--font-plus-jakarta)' }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-55">
                    {step.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 p-px rounded-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(239,169,67,0.3), rgba(194,60,58,0.2), rgba(27,48,80,0.3))' }}
        >
          <div className="rounded-2xl glass-card p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <h3 className="text-xl font-bold text-foreground mb-1">
              Ready to learn with AI?
            </h3>

            <p className="text-muted-foreground text-sm">
              Join thousands of students already learning smarter with StudiFi.
            </p>

            <a href="/signup" className="shrink-0 px-6 py-3 bg-brand-accent hover:bg-destructive text-[#080d14] font-semibold rounded-xl hover:scale-105 hover:shadow-[0_8px_30px_rgba(194,60,58,0.4)] transition-all duration-200 text-sm">
              Get Started Free
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
