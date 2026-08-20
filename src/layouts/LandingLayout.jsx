import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'

import Hero from '@/components/landing/Hero'
import About from '@/components/landing/About'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWork'
import Testimonials from '@/components/landing/Testimonials'
import Contact from '@/components/landing/Contact'


export default function Landing() {
  return (
    <main className="min-h-screen bg-brand-primary text-foreground overflow-x-hidden">
      <Header />
      <Hero />
      <About />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Contact />
      <Footer />
    </main>
  )
}
