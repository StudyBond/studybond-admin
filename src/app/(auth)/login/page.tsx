import { LoginForm } from "@/features/admin-auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      {/* Gradient mesh background — slow-moving, brand-tinted */}
      <div
        className="gradient-animate pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(110,196,184,0.07) 0%, transparent 60%)," +
            "radial-gradient(ellipse 60% 50% at 75% 70%, rgba(196,148,74,0.05) 0%, transparent 50%)," +
            "radial-gradient(ellipse 90% 80% at 50% 50%, rgba(12,12,15,1) 50%, transparent 100%)",
        }}
      />

      {/* Floating ambient orbs — very subtle, slow-moving */}
      <div
        className="float-ambient pointer-events-none absolute left-[15%] top-[20%] h-64 w-64 rounded-full opacity-30 blur-[100px]"
        style={{ background: "var(--accent-cyan)" }}
      />
      <div
        className="float-ambient pointer-events-none absolute bottom-[15%] right-[10%] h-80 w-80 rounded-full opacity-20 blur-[120px]"
        style={{ background: "var(--accent-amber)", animationDelay: "5s", animationDirection: "reverse" }}
      />

      {/* Noise texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px",
        }}
      />

      <div className="admin-enter relative z-10 w-full max-w-[480px]">
        <LoginForm />
      </div>
    </main>
  );
}
