import type React from "react"
import type { Metadata } from "next"
import { Orbitron, Inter } from "next/font/google"
import "./globals.css"

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "700", "900"],
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
})

export const metadata: Metadata = {
  title: "HabitatX - Space Habitat Design Platform",
  description: "Design and optimize hexagonal space habitats",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable} dark`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
