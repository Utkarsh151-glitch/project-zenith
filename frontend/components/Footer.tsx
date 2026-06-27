import { Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-space/40 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 md:flex-row md:px-8">
        <div className="flex items-center gap-2 text-center md:text-left">
          <span className="text-lg text-plasma">⊕</span>
          <p className="font-mono text-xs text-ui-gray">
            Project Zenith — ASTRALWEB&apos;26 — Team DO BRONXS
          </p>
        </div>

        <a
          href="https://github.com/Utkarsh151-glitch/project-zenith"
          target="_blank"
          rel="noopener noreferrer"
          data-no-drag
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-ui-gray transition-colors hover:border-plasma/40 hover:text-plasma"
        >
          <Github className="size-4" />
          PROJECT REPOSITORY 
        </a>
      </div>
    </footer>
  );
}
