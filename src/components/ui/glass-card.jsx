import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { forwardRef } from 'react'

const GlassCard = forwardRef(
  ({ className, glow, hoverable = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'glass-card rounded-2xl',
          glow && 'glow-primary',
          hoverable &&
            'hover:border-[rgba(239,169,67,0.3)] hover:bg-[rgba(27,48,80,0.35)] transition-all duration-300',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

GlassCard.displayName = 'GlassCard'

export { GlassCard }