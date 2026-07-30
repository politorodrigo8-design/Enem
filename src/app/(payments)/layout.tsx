import { Nunito_Sans } from "next/font/google";
import { TikTokPixel } from "@/components/analytics/tiktok-pixel";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

/**
 * As telas de retorno do pagamento ficam fora do layout da landing de propósito:
 * ali o cabeçalho traz o CTA "Começar agora" apontando para o checkout, ou seja,
 * oferecia a compra a quem tinha acabado de comprar. Também evita a consulta de
 * `getPublicViewer()` num momento em que só importa confirmar o pagamento.
 *
 * O Pixel continua aqui porque a página de sucesso dispara o Purchase do
 * navegador — sem ele, o evento não teria como sair.
 */
export default function PaymentsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={nunitoSans.className}>
      {children}
      <TikTokPixel />
    </div>
  );
}
