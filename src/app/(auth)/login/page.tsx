import { LoginForm } from "@/features/admin-auth/components/login-form";

/**
 * Sign in.
 *
 * The previous version stacked four decorative layers behind the form: a
 * three-stop gradient mesh, two "floating ambient orbs" at blur-[100px] and
 * blur-[120px], and an inline SVG turbulence noise texture. Two of those
 * layers were animated by classes — `gradient-animate` and `float-ambient`
 * — that are not defined anywhere in the stylesheet, so nothing moved. It
 * was several hundred pixels of blur being composited on every paint to
 * produce a static image.
 *
 * An internal console does not need an atmosphere. One centred card.
 */
export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="sb-enter w-full max-w-[26rem]">
        <LoginForm />
      </div>
    </main>
  );
}
