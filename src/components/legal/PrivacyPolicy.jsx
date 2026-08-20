import { motion } from "framer-motion";

export default function PrivacyPolicy() {
  return (
    <section className="relative min-h-screen py-10 px-4 sm:px-6 overflow-hidden bg-brand-primary">
      {/* Background Glow */}
      <div className="absolute left-1/2 -translate-x-1/2 w-175 h-full bg-brand-accent/20 sm:bg-brand-accent/ blur-[180px] rounded-full pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl p-8 md:p-12 bg-linear-to-br from-brand-primary/90 via-brand-primary/85 to-[#2a3f63] shadow-[0_10px_40px_rgba(0,0,0,0.25)] border border-white/20"
        >
          <h1 className="text-2xl sm:text-3xl md:text-5xl text-brand-secondary font-extrabold mb-2">
            Privacy Policy
          </h1>

          <p className="text-xs sm:text-base text-gray-300 mb-10">
            Effective Date: June 29, 2026
          </p>

          <div className="space-y-6">

            <Section
              title="1. Information We Collect"
              text="We collect account information, learning preferences, AI conversations, quiz results, progress history, and basic device information to provide our services."
            />

            <Section
              title="2. How We Use Your Information"
              text="Your information is used to personalize learning experiences, generate AI responses, improve recommendations, monitor progress, maintain security, and enhance platform performance."
            />

            <Section
              title="3. AI Processing"
              text="Questions submitted to StudiFi may be processed by AI systems to generate educational responses. We implement safeguards to protect user privacy."
            />

            <Section
              title="4. Cookies"
              text="Cookies help keep you signed in, remember preferences, improve security, and analyze platform usage."
            />

            <Section
              title="5. Information Sharing"
              text="We do not sell your personal information. Data may only be shared with trusted infrastructure providers, analytics services, or when required by law."
            />

            <Section
              title="6. Data Security"
              text="We use encrypted connections, secure authentication, and access controls to protect your information."
            />

            <Section
              title="7. Your Rights"
              text="Depending on your location, you may request access, correction, deletion, or export of your personal data."
            />

            <Section
              title="8. Contact"
              text="For privacy-related questions, contact support@studifi.ai."
            />

          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Section({ title, text }) {
  return (
    <div>
      <h2 className="text-md sm:text-xl font-bold mb-3 text-brand-accent">
        {title}
      </h2>

      <p className="text-sm leading-8 sm:text-md text-muted-foreground">
        {text}
      </p>
    </div>
  );
}