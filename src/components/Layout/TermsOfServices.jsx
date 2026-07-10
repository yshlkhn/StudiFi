import { motion } from "framer-motion";

export default function TermsOfServices() {
  return (
    <section className="relative min-h-screen py-10 px-4 sm:px-6 overflow-hidden bg-brand-primary">
      {/* Background Glow */}
      <div className="absolute left-1/2 -translate-x-1/2 w-175 h-full bg-brand-accent/20 sm:bg-brand-accent/40 blur-[180px] rounded-full pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl p-8 md:p-12 bg-linear-to-br from-brand-primary/90 via-brand-primary/85 to-[#2a3f63] shadow-[0_10px_40px_rgba(0,0,0,0.25)] border border-white/20"
        >
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-brand-secondary mb-2">
            Terms of Service
          </h1>

          <p className="text-xs sm:text-base text-gray-300 mb-10">
            Effective Date: June 29, 2026
          </p>

          <div className="space-y-6">

            <Section
              title="1. Welcome to StudiFi"
              text="StudiFi is an AI-powered learning platform that helps students learn through advanced Large Language Models (LLMs). By accessing or using our platform, you agree to these Terms of Service."
            />

            <Section
              title="2. Eligibility"
              text="You must be at least 13 years old or meet the minimum legal age in your country to use StudiFi. If required by law, parental or guardian consent is necessary."
            />

            <Section
              title="3. Your Account"
              text="You are responsible for maintaining the security of your account credentials and all activities performed under your account."
            />

            <Section
              title="4. Our Services"
              text="StudiFi provides AI tutoring, personalized learning paths, quizzes, concept explanations, progress tracking, and educational recommendations."
            />

            <Section
              title="5. AI Responses"
              text="Our AI strives to provide accurate educational information, but responses may occasionally contain inaccuracies. Always verify important academic information using trusted educational resources."
            />

            <Section
              title="6. Acceptable Use"
              text="You agree not to misuse the platform, upload malicious content, attempt unauthorized access, or use StudiFi for illegal activities."
            />

            <Section
              title="7. Intellectual Property"
              text="All software, branding, designs, graphics, and platform content belong to StudiFi unless otherwise stated."
            />

            <Section
              title="8. Limitation of Liability"
              text="StudiFi is provided 'as is'. We are not responsible for academic outcomes, indirect damages, or losses resulting from the use of our services."
            />

            <Section
              title="9. Contact"
              text="Questions regarding these Terms may be sent to support@studifi.ai."
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