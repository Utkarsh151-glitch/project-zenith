import { cn } from "@/lib/utils";

/** Custom spinning orbit-ring loader in plasma cyan. */
export function LoadingOrbit({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="animate-spin-orbit"
        style={{ width: size, height: size }}
      >
        <defs>
          <linearGradient id="orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="1" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,229,255,0.12)" strokeWidth="4" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="url(#orbit-grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="180 80"
        />
        <circle cx="90" cy="50" r="4" fill="#00E5FF" />
      </svg>
    </div>
  );
}

export default LoadingOrbit;
