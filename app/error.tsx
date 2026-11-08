"use client"

import { useEffect } from "react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Optionally send error to a logging service
    // console.error(error)
  }, [error])

  return (
    <html>
      <body style={{ maxWidth: 1024, margin: "0 auto", padding: 16 }}>
        <h2>Ocorreu um erro inesperado</h2>
        <p>{error?.message || "Tente novamente em instantes."}</p>
        <button onClick={() => reset()} style={{ padding: "8px 12px", fontWeight: 600 }}>Tentar novamente</button>
      </body>
    </html>
  )
}
