import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Poshta',
  description: 'Content management and page builder',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
