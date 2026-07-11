export default function Analytics() {
    return (
        <div className="relative min-h-full bg-brand-primary">

            {/* Background */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#22375c,#12233d_60%)]" />
                <div className="absolute -top-24 right-[-10%] w-130 h-130 rounded-full bg-[#efa943]/8 blur-[130px]" />
                <div className="absolute bottom-[-15%] left-[10%] w-105 h-105 rounded-full bg-[#c23c3a]/6 blur-[130px]" />
                <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                        backgroundSize: "42px 42px",
                    }}
                />
            </div>
        </div>
    )
}