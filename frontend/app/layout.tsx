import type { Metadata } from "next"
import { DM_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif" })
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "LogiCraft",
  description: "Fleet tracking, warehouse inventory, shipment control, and transit ticketing.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${mono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
