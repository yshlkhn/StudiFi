import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react'
import DotField from '@/components/ui/DotField'
import Logo from "@/assets/logo_header.svg"
import { supabase } from '@/lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { toast } from "react-toastify"

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  })
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const isStrongPassword = (password) => {
    // At least:
    // 1 uppercase, 1 lowercase, 1 number, 1 special char, 8+ length
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password)
  }


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      if (!form.name || !form.email || !form.password) {
        throw new Error("All fields are required");
      }

      if (!isValidEmail(form.email)) {
        throw new Error("Please enter a valid email address");
      }

      if (!isStrongPassword(form.password)) {
        throw new Error(
          "Password must be 8+ characters and include uppercase, lowercase, number, and special character"
        );
      }

      const { error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.name.trim(),
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      toast.success("Account created successfully");
      navigate("/dashboard", {
        replace: true
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-primary flex items-center justify-center px-4 pt-8 py-12 relative overflow-hidden">

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
        <div className="z-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
          {/* Logo */}
          <div className="flex items-center justify-center mb-1.5">
            <img
              src={Logo}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="text-center mb-6">
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: 'var(--font-plus-jakarta)' }}
            >
              Create your account
            </h1>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id='name'
                  type="text"
                  required
                  autoComplete='off'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your Name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 bg-[rgba(27,48,80,0.3)] border border-[rgba(239,169,67,0.1)] focus:border-[rgba(239,169,67,0.4)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(239,169,67,0.08)] transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email"
                className="block text-sm font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id='email'
                  type="email"
                  required
                  autoComplete='off'
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 bg-[rgba(27,48,80,0.3)] border border-[rgba(239,169,67,0.1)] focus:border-[rgba(239,169,67,0.4)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(239,169,67,0.08)] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password"
                className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                id='passowrd'
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete='off'
                  placeholder="Min. 8 characters"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <p className={/[A-Z]/.test(form.password) ? "text-green-400" : "text-muted-foreground"}>
                ✓ Uppercase
              </p>
              <p className={/[a-z]/.test(form.password) ? "text-green-400" : "text-muted-foreground"}>
                ✓ Lowercase
              </p>
              <p className={/\d/.test(form.password) ? "text-green-400" : "text-muted-foreground"}>
                ✓ Number
              </p>
              <p className={/[@$!%*?&]/.test(form.password) ? "text-green-400" : "text-muted-foreground"}>
                ✓ Special Character
              </p>
              <p
                className={`${form.password.length >= 8 ? "text-green-400" : "text-muted-foreground"} col-span-2`}>
                ✓ Minimum 8 characters
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}

            {/* Terms */}
            <p className="text-xs text-muted-foreground">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-brand-secondary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-brand-secondary hover:underline">Privacy Policy</Link>.
            </p>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-secondary hover:bg-[#f5ba65] disabled:opacity-70 text-[#080d14] font-semibold rounded-xl hover:shadow-[0_8px_30px_rgba(239,169,67,0.4)] transition-all duration-200 text-sm"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  Create Free Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-secondary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-4">
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