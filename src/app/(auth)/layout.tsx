import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <div className="w-full max-w-sm rounded-lg border border-navy-100 bg-white p-8 shadow-sm">{children}</div>
    </div>
  );
}
