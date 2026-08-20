export default function StudyMeter({ percent = 68, label = "of goal" }) {
    const cx = 70, cy = 72, r = 54;
    const track = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    const len = Math.PI * r;
    const offset = len * (1 - percent / 100);

    const needleAngleDeg = 180 - (percent / 100) * 180;
    const needleRad = (needleAngleDeg * Math.PI) / 180;
    const nx = cx + (r - 14) * Math.cos(needleRad);
    const ny = cy - (r - 14) * Math.sin(needleRad);

    const ticks = [0, 25, 50, 75, 100].map((t) => {
        const a = (180 - (t / 100) * 180) * (Math.PI / 180);
        const inner = r + 4;
        const outer = r + 10;
        return {
            t,
            x1: cx + inner * Math.cos(a),
            y1: cy - inner * Math.sin(a),
            x2: cx + outer * Math.cos(a),
            y2: cy - outer * Math.sin(a),
        };
    });

    return (
        <svg width="140" height="92" viewBox="0 0 140 92" className="shrink-0 overflow-visible">
            {ticks.map((tk) => (
                <line
                    key={tk.t}
                    x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2}
                    stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"
                />
            ))}
            <path d={track} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" strokeLinecap="round" />
            <path
                d={track} fill="none" stroke="#efa943" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={len} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 800ms ease" }}
            />
            <circle cx={cx} cy={cy} r="4" fill="#efa943" />
            <line
                x1={cx} y1={cy} x2={nx} y2={ny}
                stroke="#f5f3ee" strokeWidth="2.5" strokeLinecap="round"
                style={{ transition: "all 800ms ease" }}
            />
            <text x={cx} y={cy - 20} textAnchor="middle" fontSize="22" fontWeight="700" fill="#f5f3ee">
                {percent}%
            </text>
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fill="rgba(245,243,238,0.55)">
                {label}
            </text>
        </svg>
    );
}