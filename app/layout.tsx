import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { BrandHostnameProvider } from "@/components/brand/brand-hostname-provider";
import { generateBrandMetadata } from "@/lib/utils/metadata";
import { headers } from "next/headers";

const outfit = Outfit({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost';
  
  return generateBrandMetadata(hostname);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={outfit.className}>
        <BrandHostnameProvider hostname={hostname}>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </BrandHostnameProvider>
      </body>
    </html>
  );
}
