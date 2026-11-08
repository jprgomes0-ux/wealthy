import { getStockPrices, StockPrices } from "./twelvedata"
import { getCryptoPrices, CryptoPrices } from "./coingecko"

export type PortfolioPrices = {
  stocks: StockPrices
  cryptos: CryptoPrices
}

export async function getPortfolioPrices(
  stocks: string[],
  cryptos: string[]
): Promise<PortfolioPrices> {
  const [stockData, cryptoData] = await Promise.all([
    getStockPrices(stocks),
    getCryptoPrices(cryptos)
  ])
  return { stocks: stockData, cryptos: cryptoData }
}