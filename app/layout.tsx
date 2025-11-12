import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "sonner";
import { HideNLogo } from "@/components/HideNLogo";

export const metadata: Metadata = {
  title: "Rankly - Get more traffic from LLMs",
  description: "AI-powered brand visibility and AEO optimization platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ErrorBoundary>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={process.env.NODE_ENV !== 'production'}
              disableTransitionOnChange
            >
              <AuthProvider>
                <OnboardingProvider>
                  <AnalyticsProvider>
                    <FilterProvider>
                      {children}
                      <Toaster richColors position="top-right" />
                      <HideNLogo />
                    </FilterProvider>
                  </AnalyticsProvider>
                </OnboardingProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
