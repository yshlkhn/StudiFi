import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import { useState } from 'react'

const testimonials = [
  {
    name: 'Sarah Ahmed',
    role: 'Computer Science Student',
    initials: 'SA',
    color: '#c23c3a',
    rating: 5,
    review:
      "StudiFi feels like having a personal AI tutor available 24/7. It explains difficult programming concepts in simple language and helps me learn much faster.",
  },
  {
    name: 'Ali Khan',
    role: 'Medical Student',
    initials: 'AK',
    color: '#efa943',
    rating: 5,
    review:
      "The AI-generated quizzes and personalized study plans have completely changed how I prepare for exams. I feel much more confident now.",
  },
  {
    name: 'Priya Sharma',
    role: 'Engineering Student',
    initials: 'PS',
    color: '#c23c3a',
    rating: 5,
    review:
      "Whenever I get stuck on a difficult topic, StudiFi provides step-by-step explanations that are easy to understand. It's like learning with an expert tutor.",
  },
  {
    name: 'James Wilson',
    role: 'High School Student',
    initials: 'JW',
    color: '#c23c3a',
    rating: 5,
    review:
      "I love how the platform adapts to my learning pace. The interactive lessons and instant feedback make studying much more engaging.",
  },
  {
    name: 'Ayesha Malik',
    role: 'Business Student',
    initials: 'AM',
    color: '#efa943',
    rating: 5,
    review:
      "StudiFi doesn't just answer questions—it helps me truly understand concepts with personalized examples, summaries, and practice exercises.",
  },
  {
    name: 'Daniel Lee',
    role: 'University Student',
    initials: 'DL',
    color: '#c23c3a',
    rating: 5,
    review:
      "From learning new topics to preparing for finals, StudiFi has become my go-to AI learning platform. It's improved both my confidence and my grades.",
  },
]

export default function Testimonials() {
    const [activeCard, setActiveCard] = useState(null)

  return (
    <section id="testimonials" className="relative py-12 sm:py-14 md:py-16 px-6">
      {/* Background glow */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((t, i) => {
          const isActive = activeCard === i

          return (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              whileHover={{ rotate: 0.6, y: -4, scale: 1.02 }}
              onClick={() => setActiveCard(i)}
              className={`group relative p-6 rounded-2xl glass-card cursor-pointer overflow-hidden transition-all duration-300 ${
                isActive
                  ? 'border border-[rgba(239,169,67,0.30)] bg-[rgba(239,169,67,0.08)]'
                  : ''
              }`}
            >
              {/* Quote icon */}
              <Quote
                className="absolute top-5 right-5 w-8 h-8 opacity-10 group-hover:opacity-20 transition-opacity"
                style={{
                  color: isActive ? '#efa943' : t.color,
                }}
              />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 fill-current ${
                      isActive ? 'text-[#efa943]' : 'text-brand-secondary'
                    }`}
                  />
                ))}
              </div>

              {/* Review */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                &ldquo;{t.review}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[#080d14] shrink-0 transition-colors duration-300"
                  style={{
                    background: isActive ? '#efa943' : t.color,
                  }}
                >
                  {t.initials}
                </div>

                <div>
                  <div
                    className={`text-sm font-semibold transition-colors duration-300 ${
                      isActive ? 'text-[#efa943]' : 'text-foreground'
                    }`}
                  >
                    {t.name}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t.role}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
