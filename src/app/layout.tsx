import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { DemoModeProvider } from "@/components/DemoModeContext";

export const metadata: Metadata = {
  title: "Gambino Admin",
  description: "Admin dashboard for Gambino",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <DemoModeProvider>
            {children}
          </DemoModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}