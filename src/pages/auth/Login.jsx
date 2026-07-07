import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import DotField from '@/components/ui/DotField'
import Logo from "@/assets/logo_header.svg"
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { toast } from "react-toastify"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: "",
    password: ""
  })

  const [error, setError] = useState(null)
  const navigate = useNavigate()


  const handleSubmit = async (e) => {
    e.preventDefault()

    setError(null)
    setLoading(true)

    // 1. REQUIRED FIELDS
    if (!form.email && !form.password) {
      setError("Email and password are required")
      setLoading(false)
      return
    }

    if (!form.email) {
      setError("Email is required")
      setLoading(false)
      return
    }

    if (!form.password) {
      setError("Password is required")
      setLoading(false)
      return
    }

    // 2. EMAIL FORMAT CHECK
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    // 3. SUPABASE LOGIN
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    setLoading(false)

    // 4. SUPABASE ERROR HANDLING
    if (authError) {
      if (authError.message.includes("Invalid login credentials")) {
        setError("Incorrect email or password")
      } else {
        setError(error.message)
      }
      return
    }

    toast.success("Login successful")

    setTimeout(() => {
      navigate("/dashboard")
    }, 1000)
  }

  const mapAuthError = (msg) => {
    if (msg.includes("Invalid login credentials")) {
      return "Incorrect email or password"
    }
    if (msg.includes("Email not confirmed")) {
      return "Please verify your email first"
    }
    if (msg.includes("rate limit")) {
      return "Too many attempts. Try again later"
    }
    return msg
  }

  return (
    <div className="min-h-screen bg-brand-primary flex items-center justify-center px-4 py-12 relative overflow-hidden">

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

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <div className="z-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
          {/* Logo */}
          <div className="flex items-center justify-center mb-2">
            <img
              src={Logo}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="text-center mb-8">
            <h1
              className="text-2xl font-extrabold text-foreground mb-2"
              style={{ fontFamily: 'var(--font-plus-jakarta)' }}
            >
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to continue to your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 bg-[rgba(27,48,80,0.3)] border border-[rgba(239,169,67,0.1)] focus:border-[rgba(239,169,67,0.4)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(239,169,67,0.08)] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#efa943] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 bg-[rgba(27,48,80,0.3)] border border-[rgba(239,169,67,0.1)] focus:border-[rgba(239,169,67,0.4)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(239,169,67,0.08)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-secondary hover:bg-[#f5ba65] disabled:opacity-70 text-[#080d14] font-semibold rounded-xl hover:shadow-[0_8px_30px_rgba(239,169,67,0.4)] transition-all duration-200 text-sm mt-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-brand-secondary hover:underline font-medium">
              Sign up free
            </Link>
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-gray-300 font-medium hover:text-foreground transition-colors"
          >
            &larr; Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}