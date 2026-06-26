import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium font-mono tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-plasma/40 bg-plasma/10 text-plasma",
        solar: "border-solar/40 bg-solar/10 text-solar",
        alert: "border-alert/40 bg-alert/10 text-alert",
        purple: "border-[#9b6bff]/40 bg-[#9b6bff]/10 text-[#c5a8ff]",
        muted: "border-white/10 bg-white/5 text-ui-gray",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
