type RoutePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function RoutePlaceholder({
  eyebrow,
  title,
  description,
}: RoutePlaceholderProps) {
  return (
    <section className="rounded-[28px] border border-white/8 bg-slate-900/78 p-6 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-400">{description}</p>
    </section>
  );
}
