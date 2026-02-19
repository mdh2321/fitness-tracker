'use client';

interface TargetRingProps {
  value: number;
  target: number;
  label: string;
  color: string;
  size?: number;
  formatValue?: (v: number) => string;
  formatTarget?: (t: number) => string;
}

export function TargetRing({ value, target, label, color, size = 80, formatValue, formatTarget }: TargetRingProps) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(value / target, 1);
  const strokeDashoffset = circumference * (1 - percentage);
  const completed = value >= target;

  const displayValue = formatValue ? formatValue(value) : String(value);
  const displayTarget = formatTarget ? formatTarget(target) : String(target);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1a1a24" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            opacity={completed ? 1 : 0.8}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-lg font-bold tabular-nums text-gray-100">{displayValue}</span>
          <span className="text-[10px] text-gray-500">/{displayTarget}</span>
        </div>
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}
