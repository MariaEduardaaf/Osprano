import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/lib/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
// Serifada de exibição dos modelos Mesa, Ofício e Vitrine (src/components/site-templates).
// Variável própria (não --font-serif) para não colidir com o tema padrão do Tailwind v4.
const serif = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export const metadata: Metadata = {
  title: "Osprano — ache a dor, feche o site",
  description:
    "Encontre negócios locais com presença digital fraca, pontue a dor e aborde por email — compliant by design.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tree = (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${serif.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );

  // Demo mode (dev only) runs without Clerk.
  return DEMO ? tree : <ClerkProvider>{tree}</ClerkProvider>;
}
