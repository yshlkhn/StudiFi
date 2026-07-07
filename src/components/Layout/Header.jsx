import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from "@/assets/logo_header.svg"

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'How It Work', href: '#working' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Contact', href: '#contact' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4"
    >
      <div
        className={`w-full max-w-6xl rounded-2xl px-6 py-3 transition-all duration-300 ${scrolled
            ? 'backdrop-blur-xl bg-white/10 border border-[rgba(239,169,67,0.18)] shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
            : 'backdrop-blur-lg bg-white/5 border border-[rgba(239,169,67,0.10)]'
          }`}
      >
        <div className="flex items-center justify-between gap-8">

          {/* Logo */}
          <div className="flex items-center shrink-0">
            <img
              src={Logo}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-foreground rounded-xl hover:bg-muted transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-foreground border border-[rgba(239,169,67,0.2)] hover:border-[rgba(239,169,67,0.4)] rounded-xl hover:scale-105 transition-all duration-200"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 text-sm font-semibold text-[#080d14] bg-brand-secondary hover:bg-[#f5ba65] rounded-xl hover:scale-105 hover:shadow-[0_4px_20px_rgba(239,169,67,0.4)] transition-all duration-200"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded text-foreground hover:bg-muted transition-all"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="pt-3 pb-1 flex flex-col gap-1 border-t border-[rgba(239,169,67,0.1)] mt-3">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-3 py-2.5 text-sm font-medium text-foreground rounded-xl hover:bg-muted transition-all"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex gap-2 mt-2">
                  <Link
                    to="/login"
                    className="flex-1 py-2.5 text-sm font-medium text-center text-foreground border border-[rgba(239,169,67,0.2)] rounded-xl hover:border-[rgba(239,169,67,0.4)] transition-all"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="flex-1 py-2.5 text-sm font-semibold text-center text-[#080d14] bg-[#efa943] hover:bg-[#f5ba65] rounded-xl transition-all"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}