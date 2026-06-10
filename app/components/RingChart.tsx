type RingChartProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
};

export function RingChart({
  value,
  size = 120,
  strokeWidth = 12,
  label,
}: RingChartProps) {
  const clampedValue = Math.min(100, Math.max(1, value));

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = clampedValue / 100;
  const dashOffset = circumference * (1 - progress);

  let color = "#eb2525"; // Red for values below 60
  if (50 < clampedValue && clampedValue < 80) {
    color = "#f59e0b"; // Yellow for values between 51 and 59
  }
  if (clampedValue >= 80) {
    color = "#10b981"; // Green for values 80 and above
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: "stroke-dashoffset 300ms ease",
          }}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        {label ?? (
          <>
            <span
              style={{
                fontSize: size * 0.22,
                fontWeight: 700,
              }}
            >
              {clampedValue}
            </span>
            <span
              style={{
                marginTop: 4,
                fontSize: size * 0.1,
                fontWeight: 500,
                color: "#6b7280",
              }}
            >
              / 100
            </span>
          </>
        )}
      </div>
    </div>
  );
}
