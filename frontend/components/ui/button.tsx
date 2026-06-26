import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plasma/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-plasma/15 text-plasma border border-plasma/40 hover:bg-plasma/25 hover:shadow-plasma-sm",
        primary:
          "bg-plasma text-space font-semibold hover:shadow-plasma hover:scale-[1.03] active:scale-100",
        ghost: "text-star/80 hover:bg-white/5 hover:text-star",
        outline:
          "border border-white/15 bg-white/5 text-star hover:border-plasma/50 hover:text-plasma",
        solar:
          "bg-solar/15 text-solar border border-solar/40 hover:bg-solar/25 hover:shadow-solar",
        pill: "rounded-full border border-white/10 bg-white/5 text-ui-gray hover:text-star",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
