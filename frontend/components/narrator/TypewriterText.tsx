"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  text: string;
  /** Characters per second. */
  speed?: number;
  className?: string;
  onDone?: () => void;
  showCursor?: boolean;
}

/** Streams text character-by-character, like a live terminal feed. */
export function TypewriterText({
  text,
  speed = 45,
  className,
  onDone,
  showCursor = true,
}: TypewriterTextProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
  }, [text]);

  useEffect(() => {
    if (count >= text.length) {
      onDone?.();
      return;
    }
    const delay = 1000 / speed;
    const id = setTimeout(() => setCount((c) => c + 1), delay);
    return () => clearTimeout(id);
  }, [count, text, speed, onDone]);

  const done = count >= text.length;

  return (
    <span className={cn(className)}>
      {text.slice(0, count)}
      {showCursor && (
        <span
          className={cn(
            "ml-0.5 inline-block h-[1em] w-[0.55ch] translate-y-[0.12em] bg-plasma",
            done ? "animate-pulse" : "opacity-90",
          )}
        />
      )}
    </span>
  );
}

export default TypewriterText;
