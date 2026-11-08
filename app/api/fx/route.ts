import { NextRequest, NextResponse } from "next/server"

// GET /api/fx?date=2025-04-15&currency=USD  ->  { rate: 1.1357, date: "2025-04-15" }
// Taxas de referência do BCE via Frankfurter (api.frankfurter.dev). Em fins de semana e
// feriados devolve a do último dia útil anterior, e a "date" da resposta indica qual foi.
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? ""
  const currency = (req.nextUrl.searchParams.get("currency") ?? "").toUpperCase()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
  }
  if (currency === "EUR") return NextResponse.json({ rate: 1, date })

  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/${date}?base=EUR&symbols=${currency}`, {
      next: { revalidate: 86_400 },
    })
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`)
    const data: { date: string; rates: Record<string, number> } = await res.json()
    const rate = data.rates?.[currency]
    if (!rate) throw new Error("Moeda sem taxa")
    return NextResponse.json({ rate, date: data.date })
  } catch (err) {
    console.error("Erro ao obter câmbio:", err)
    return NextResponse.json({ error: "Não foi possível obter o câmbio" }, { status: 502 })
  }
}
