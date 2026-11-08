// Cálculo do IRS sobre dividendos estrangeiros (Anexo J, quadro 8 A, código E11).
// Funções puras: sem React nem acesso à rede.

export type Dividend = {
  date: string // data de pagamento, AAAA-MM-DD
  ticker: string
  country: string // país da fonte (código numérico do Anexo J)
  currency: string
  gross: number | "" // dividendo bruto, na moeda de pagamento
  withheld: number | "" // imposto retido lá fora, na mesma moeda
  rate: number | "" // câmbio BCE do dia: 1 EUR = rate moeda
  rateDate?: string
  broker?: string
}

export const DIVIDEND_RATE = 0.28

// Limite de crédito previsto nas convenções para evitar a dupla tributação (dividendos, investidor particular).
// É o máximo que Portugal deixa abater do imposto retido lá fora. A maioria é 15%.
export const TREATY_RATE: Record<string, number> = {
  "840": 0.15, "528": 0.15, "276": 0.15, "250": 0.15, "372": 0.15, "826": 0.1, "724": 0.15, "380": 0.15,
  "756": 0.15, "442": 0.15, "124": 0.15, "392": 0.1, "208": 0.15, "752": 0.15, "056": 0.15, "246": 0.15,
  "578": 0.15, "040": 0.15, "036": 0.15, "156": 0.1, "410": 0.15, "356": 0.15, "702": 0.1, "076": 0.15,
  "376": 0.15, "344": 0.1,
}

export type DividendCountryLine = {
  country: string
  gross: number // EUR
  withheld: number // EUR
  credit: number // imposto estrangeiro que Portugal aceita abater
  ptTax: number // imposto ainda a pagar em Portugal (28%)
  count: number
}

export type DividendsResult = {
  byCountry: DividendCountryLine[]
  gross: number
  withheld: number
  credit: number
  ptTax: number
  lostWithholding: number // retido a mais lá fora, que não se recupera em Portugal
  warnings: { row: number; msg: string }[]
}

export function computeDividends(divs: Dividend[], year: number): DividendsResult {
  const warnings: DividendsResult["warnings"] = []
  const map: Record<string, DividendCountryLine> = {}

  divs.forEach((d, row) => {
    if (!d.date.startsWith(String(year))) return
    const gross = Number(d.gross)
    if (!(gross > 0)) return
    const rate = d.currency === "EUR" ? 1 : Number(d.rate)
    if (!(rate > 0)) {
      warnings.push({ row, msg: `Falta o câmbio BCE em ${d.ticker || "dividendo"} (${d.date}).` })
      return
    }
    const line = (map[d.country] ??= { country: d.country, gross: 0, withheld: 0, credit: 0, ptTax: 0, count: 0 })
    line.gross += gross / rate
    line.withheld += (Number(d.withheld) || 0) / rate
    line.count++
  })

  const byCountry = Object.values(map).map(l => {
    const treaty = TREATY_RATE[l.country] ?? 0
    // O crédito é o menor de: imposto pago lá fora, limite da convenção, imposto português
    const credit = Math.min(l.withheld, l.gross * treaty, l.gross * DIVIDEND_RATE)
    return { ...l, credit, ptTax: l.gross * DIVIDEND_RATE - credit }
  })
  byCountry.sort((a, b) => b.gross - a.gross)

  const sum = (k: keyof DividendCountryLine) => byCountry.reduce((s, l) => s + (l[k] as number), 0)
  const withheld = sum("withheld")
  const credit = sum("credit")
  return {
    byCountry,
    gross: sum("gross"),
    withheld,
    credit,
    ptTax: sum("ptTax"),
    lostWithholding: withheld - credit,
    warnings,
  }
}
