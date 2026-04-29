import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--background)]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-[color:var(--accent-cyan)]/20" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/40 shadow-[0_0_32px_rgba(110,196,184,0.15)] backdrop-blur-xl">
            <LoaderCircle className="h-6 w-6 animate-spin text-[color:var(--accent-cyan)]" />
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-white">StudyBond</h2>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
            Initializing Admin Workspace...
          </p>
        </div>
      </div>
    </main>
  );
}
