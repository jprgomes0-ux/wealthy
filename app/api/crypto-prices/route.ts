import { NextRequest, NextResponse } from "next/server"
import { getCryptoPrices } from "../../../lib/coingecko"

// GET /api/crypto-prices?symbols=BTC,ETH  ->  { BTC: 65000, ETH: 3200 }
export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)

  try {
    const data = await getCryptoPrices(symbols)
    const prices = Object.fromEntries(Object.entries(data).map(([s, v]) => [s, v.usd]))
    return NextResponse.json(prices)
  } catch (err) {
    console.error("Erro ao buscar preços de crypto:", err)
    return NextResponse.json({ error: "Falha ao buscar preços" }, { status: 502 })
  }
}
