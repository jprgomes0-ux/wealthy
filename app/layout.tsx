"use client"

import { PortfolioProvider } from "../context/PortfolioContext"
import { BrokerProvider } from "../context/BrokerContext"
import { AuthProvider } from "../context/AuthContext"
import "./globals.css"
import { Toaster } from "react-hot-toast"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="transition-colors">
        <AuthProvider> {/* novo */}
          <BrokerProvider>
            <PortfolioProvider>
              {children}

              {/* Toasts globais */}
              <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                  duration: 3000,
                  style: {
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#fff",
                    background: "#10b981",
                    boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
                  },
                  success: { iconTheme: { primary: "#fff", secondary: "#10b981" } },
                  error: {
                    style: { background: "#ef4444", color: "#fff" },
                    iconTheme: { primary: "#fff", secondary: "#ef4444" },
                  },
                }}
              />
            </PortfolioProvider>
          </BrokerProvider>
        </AuthProvider>
      </body>
    </html>
  )
}