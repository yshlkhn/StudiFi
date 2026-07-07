import Header from '@/components/Layout/Header'
import Hero from '@/components/Layout/Hero'
import About from '@/components/Layout/About'
import Features from '@/components/Layout/Features'
import HowItWorks from '@/components/Layout/HowItWork'
import Testimonials from '@/components/Layout/Testimonials'
import Contact from '@/components/Layout/Contact'
import Footer from '@/components/Layout/Footer'

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
