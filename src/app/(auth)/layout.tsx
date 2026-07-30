import { TikTokPixel } from "@/components/analytics/tiktok-pixel";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      {/* O cadastro dispara CompleteRegistration, então o Pixel precisa existir
          aqui — mas não no layout raiz, que alcançaria a área logada. */}
      <TikTokPixel />
    </>
  );
}
