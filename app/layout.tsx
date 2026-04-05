import type { Metadata } from 'next'
import './globals.css'
import { APP_DESCRIPTION, APP_NAME, APP_LOGO_URL } from '@/lib/branding'
import { ThemeProvider } from '@/components/theme/theme-provider'

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  icons: {
    icon: APP_LOGO_URL,
    shortcut: APP_LOGO_URL,
    apple: APP_LOGO_URL,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
