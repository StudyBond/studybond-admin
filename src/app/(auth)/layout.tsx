/**
 * The auth shell.
 *
 * This used to set a cyan-on-slate radial gradient (`#020617` → `#0f172a`)
 * that belonged to no palette in the app, and the login page then painted
 * its own competing gradient mesh on top of it. Both are gone: the sign-in
 * screen sits on the same ground as the console it leads to, so the two do
 * not look like different products.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--sb-bg)]">{children}</div>
  );
}
