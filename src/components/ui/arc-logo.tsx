export function ArcLogo({ size = 20, className }: { size?: number; className?: string }) {
  const r = size * 0.4;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = size * 0.1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a35" strokeWidth={strokeW} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={strokeW}
        strokeDasharray={`${2 * Math.PI * r}`}
        strokeDashoffset={`${2 * Math.PI * r * 0.2}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        strokeLinecap="round"
      />
    </svg>
  );
}
