import { motion } from 'framer-motion'
import { useState } from 'react'
import { Send, Mail, MessageSquare, User, FileText } from 'lucide-react'

export default function Contact() {
    const [formState, setFormState] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const { name, email, subject, message } = formState;

        if (!name || !email || !subject || !message) {
            setError("All fields are required");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("https://formsubmit.co/ajax/eshalk745@gmail.com", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    subject,
                    message,
                }),
            });

            const data = await response.json();

            if (data.success === "true" || response.ok) {
                setSubmitted(true);
                setFormState({
                    name: "",
                    email: "",
                    subject: "",
                    message: "",
                });
            } else {
                setError("Failed to send message.");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { key: 'name', label: 'Full Name', placeholder: 'Your name', icon: User, type: 'text' },
        { key: 'email', label: 'Email Address', placeholder: 'you@example.com', icon: Mail, type: 'email' },
        { key: 'subject', label: 'Subject', placeholder: 'How can we help?', icon: FileText, type: 'text' },
    ]

    return (
        <section id="contact" className="relative py-12 sm:py-14 md:py-16 px-6">

            <div className="relative max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <span className="text-xs font-semibold uppercase tracking-widest text-brand-secondary mb-3 block">
                        Contact
                    </span>
                    <h2
                        className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-balance mb-4"
                    >
                        Let&apos;s{' '}
                        <span className="text-brand-secondary">talk</span>
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Have questions about StudiFi or need help getting started? Reach out and let us help you learn smarter.
                    </p>
                </motion.div>

                {/* Form card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className=" rounded-2xl p-8 sm:p-10 bg-linear-to-br from-brand-primary/90 via-brand-primary/85 to-[#2a3f63] shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
                >
                    {submitted ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center text-center py-8 gap-4"
                        >
                            <div className="w-16 h-16 rounded-full bg-[rgba(202,59,56,0.12)] border border-[rgba(194,60,58,0.25)] flex items-center justify-center">
                                <Send className="w-7 h-7 text-brand-accent" />
                            </div>
                            <h3
                                className="text-2xl font-bold text-foreground"
                                style={{ fontFamily: 'var(--font-plus-jakarta)' }}
                            >
                                Message Sent!
                            </h3>
                            <p className="text-muted-foreground">
                                Thanks for reaching out. We typically respond within one business day.
                            </p>
                            <button
                                onClick={() => { setSubmitted(false); setFormState({ name: '', email: '', subject: '', message: '' }) }}
                                className="px-5 py-3.5 bg-brand-accent hover:bg-[#a93230] disabled:opacity-70 text-[#080d14] font-semibold rounded-full hover:shadow-[0_8px_30px_rgba(239,0,0,0.2)] transition-all duration-300 text-sm cursor-pointer hover:scale-105"
                            >
                                Send another message
                            </button>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate action="https://formsubmit.co/ib.haseebgul@gmail.com" method="POST" className="space-y-5">

                            <input type="hidden" name="_captcha" value="false" />
                            <input type="hidden" name="_template" value="table" />
                            <input type="hidden" name="_subject" value="New Contact Message from Portfolio" />

                            <div className="grid sm:grid-cols-2 gap-5">
                                {fields.slice(0, 2).map((field) => {
                                    const Icon = field.icon
                                    return (
                                        <div key={field.key}>
                                            <label className="block text-sm font-medium text-brand-accent mb-1.5">
                                                {field.label}
                                            </label>
                                            <div className="relative">
                                                <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                                                <input
                                                    type={field.type}
                                                    name={field.key}
                                                    required
                                                    placeholder={field.placeholder}
                                                    value={formState[field.key]}
                                                    onChange={(e) => {
                                                        setError(null);
                                                        setFormState((s) => ({ ...s, [field.key]: e.target.value, }));
                                                    }}
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm  text-foreground placeholder:text-muted-foreground/70 bg-secondary/50 border border-white/15 focus:border-[rgba(194,60,58,0.5)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(194,60,58,0.12)] transition-all" />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-medium text-brand-accent mb-1.5">
                                    Subject
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                                    <input
                                        type="text"
                                        name="subject"
                                        required
                                        placeholder="What's this about?"
                                        value={formState.subject}
                                        onChange={(e) => {
                                            setError(null);
                                            setFormState((s) => ({ ...s, subject: e.target.value }))
                                        }}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm  text-foreground placeholder:text-muted-foreground/70 bg-secondary/50 border border-white/15 focus:border-[rgba(194,60,58,0.5)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(194,60,58,0.12)] transition-all"
                                    />
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium text-brand-accent mb-1.5">
                                    Message
                                </label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground/70" />
                                    <textarea
                                        rows={5}
                                        name="message"
                                        required
                                        placeholder="Tell us more about your project, question, or idea…"
                                        value={formState.message}
                                        onChange={(e) => {
                                            setError(null);
                                            setFormState((s) => ({ ...s, message: e.target.value }))
                                        }}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/70 bg-secondary/50 border border-white/15 focus:border-[rgba(194,60,58,0.5)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(194,60,58,0.12)] transition-all resize-none"
                                    />
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
                                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-brand-accent hover:bg-[#a93230] disabled:opacity-70 text-[#080d14] font-semibold rounded-xl hover:shadow-[0_8px_30px_rgba(239,0,0,0.2)] transition-all duration-200 text-sm cursor-pointer"
                            >
                                {loading ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Sending…
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Message
                                    </>
                                )}
                            </motion.button>
                        </form>
                    )}
                </motion.div>
            </div>
        </section>
    )
}