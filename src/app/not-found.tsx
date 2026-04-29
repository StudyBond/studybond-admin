import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">404</p>
        <h1 className="mt-3 text-2xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-slate-400">
          The admin route you requested does not exist yet or has moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950"
        >
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
