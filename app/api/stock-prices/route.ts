import { NextRequest, NextResponse } from "next/server"
import { getStockPrices } from "../../../lib/twelvedata"

// GET /api/stock-prices?symbols=AAPL,MSFT  ->  { AAPL: 123.4, MSFT: 456.7 }
export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)

  try {
    const data = await getStockPrices(symbols)
    const prices = Object.fromEntries(
      Object.entries(data).map(([symbol, v]) => [symbol, parseFloat(v.price)])
    )
    return NextResponse.json(prices)
  } catch (err) {
    console.error("Erro ao buscar preços de ações:", err)
    return NextResponse.json({ error: "Falha ao buscar preços" }, { status: 502 })
  }
}
