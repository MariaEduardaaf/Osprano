import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
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

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

// TEMPORÁRIO (plano docs/superpowers/plans/2026-09-16-redesenho-vidro.md, Tarefa 24 remove):
// `?theme=dark|light` força o tema nos screenshots headless. Só fora de produção.
const THEME_QUERY_HOOK =
  process.env.NODE_ENV !== "production"
    ? `(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='light'||q==='dark'){document.documentElement.dataset.theme=q;}}catch(e){}})();`
    : "";

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
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT + THEME_QUERY_HOOK }} />
      </head>
      <body className="min-h-full">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );

  // Demo mode (dev only) runs without Clerk.
  return DEMO ? tree : <ClerkProvider>{tree}</ClerkProvider>;
}
