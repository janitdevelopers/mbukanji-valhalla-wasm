import React from "react"
import type { Metadata } from 'next'
import './globals.css' // Import globals.css at the top of the file

export const metadata: Metadata = {
  title: '@jansoft/mbujkanji-valhalla-wasm - Test Page',
  description: 'Offline routing engine for web applications using Valhalla compiled to WebAssembly',
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
