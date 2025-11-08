"use client";

type Props = {
  daysRemaining: number;
  intervalDays: number;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HeartbeatRing({ daysRemaining, intervalDays }: Props) {
  const progress = Math.max(
    0,
    Math.min(1, daysRemaining / Math.max(intervalDays, 1)),
  );
  const dash = CIRCUMFERENCE * progress;
  const strokeColor =
    daysRemaining > 14
      ? "var(--color-success-green)"
      : daysRemaining >= 7
        ? "var(--color-bitcoin-gold)"
        : "var(--color-error-red)";
  const animation =
    daysRemaining > 14
      ? undefined
      : daysRemaining >= 7
        ? "heartbeat-pulse 2s ease-in-out infinite"
        : "heartbeat-pulse-fast 0.8s ease-in-out infinite";

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" role="img">
      <circle
        cx="60"
        cy="60"
        r={RADIUS}
        stroke="var(--color-border-subtle)"
        strokeWidth="8"
        fill="none"
      />
      <circle
        cx="60"
        cy="60"
        r={RADIUS}
        stroke={strokeColor}
        strokeWidth="8"
        fill="none"
        strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ animation }}
      />
      <text
        x="60"
        y="65"
        textAnchor="middle"
        fill="var(--color-text-primary)"
        fontSize="18"
        fontWeight="bold"
      >
        {Math.max(daysRemaining, 0)}d
      </text>
    </svg>
  );
}
