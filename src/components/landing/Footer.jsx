import { motion } from 'framer-motion'
import { FaGithub, FaLinkedin, FaTwitter, FaYoutube } from 'react-icons/fa'
import Logo from "@/assets/logo_footer.svg"
import { Link } from 'react-router-dom'

const links = {
  Navigation: [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Features', href: '#features' },
    { label: 'Contact', href: '#contact' },
  ],
  Platform: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'AI Learning Partner', href: '/dashboard' },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
};

const socials = [
  { icon: FaTwitter, label: 'Twitter / X', href: '#' },
  { icon: FaGithub, label: 'GitHub', href: '#' },
  { icon: FaLinkedin, label: 'LinkedIn', href: '#' },
  { icon: FaYoutube, label: 'YouTube', href: '#' },
]

export default function Footer() {
  return (
    <footer className="relative px-6 pb-8 pt-1">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="max-w-6xl mx-auto"
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(27,48,80,0.18)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(239,169,67,0.12)',
          }}
        >
          <div className="p-10 sm:p-12">

            <div className="grid lg:grid-cols-5 gap-10 mb-12">

              <div className="lg:col-span-2">
                <img
                  src={Logo}
                  alt="StudiFi"
                  className="h-10 w-auto object-contain mb-4 -ml-1"
                />

                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  StudiFi is your AI study partner that helps you learn smarter,
                  understand faster, and achieve your academic goals.
                </p>

                <div className="flex gap-2">
                  {socials.map(({ icon: Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      className="w-8 h-8 rounded-lg bg-input border border-[rgba(239,169,67,0.1)] hover:border-[rgba(239,169,67,0.3)] hover:bg-[rgba(239,169,67,0.1)] flex items-center justify-center text-muted-foreground hover:text-[#efa943] transition-all duration-200"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>


              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-12">
                {Object.entries(links).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-brand-secondary mb-4">
                      {category}
                    </h4>

                    <ul className="space-y-2.5">
                      {items.map((item) => (
                        <li key={item.label}>
                          {item.href.startsWith('#') ? (
                            <a
                              href={item.href}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                            >
                              {item.label}
                            </a>
                          ) : (
                            <Link
                              to={item.href}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                            >
                              {item.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

            </div>


            <div className="border-t border-[rgba(239,169,67,0.08)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">

              <div className="text-center sm:text-left">
                <p className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()} StudiFi. All rights reserved.
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  Your AI-powered partner for better learning.
                </p>
              </div>


              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  AI Study Partner Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </footer>
  )
}