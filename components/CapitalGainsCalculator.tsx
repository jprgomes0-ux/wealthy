"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { computeGains, Transaction } from "../lib/capitalGains"
import { BROKER_NAMES, importCSV } from "../lib/importers"
import { COUNTRIES, CURRENCIES, countryName } from "../lib/countries"
import { useEcbRates } from "../lib/useEcbRates"
import "../style/Calculator.css"


const EXAMPLE: Transaction[] = [
  { date: "2023-03-10", type: "compra", ticker: "AAPL", country: "840", qty: 10, price: 150, currency: "USD", rate: "", fees: 1 },
  { date: "2024-06-05", type: "compra", ticker: "AAPL", country: "840", qty: 5, price: 190, currency: "USD", rate: "", fees: 1 },
  { date: "2024-11-20", type: "compra", ticker: "ASML", country: "528", qty: 2, price: 680, currency: "EUR", rate: 1, fees: 2 },
  { date: "2025-02-03", type: "venda", ticker: "ASML", country: "528", qty: 2, price: 640, currency: "EUR", rate: 1, fees: 2 },
  { date: "2025-04-15", type: "venda", ticker: "AAPL", country: "840", qty: 12, price: 200, currency: "USD", rate: "", fees: 1.2 },
]

type Settings = { year: number; marginal: number | ""; broker: string }
const DEFAULT_SETTINGS: Settings = { year: 2025, marginal: 31.4, broker: "196" }
const STORE = "wealthy-mais-valias-v2"

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })
const plain = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const signClass = (v: number) => (v > 0 ? "calc-pos" : v < 0 ? "calc-neg" : "")
const cloneExample = () => EXAMPLE.map(t => ({ ...t }))

export default function CapitalGainsCalculator() {
  const [txs, setTxs] = useState<Transaction[]>(cloneExample)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState("")
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [dragging, setDragging] = useState(false)

  // Recupera os movimentos guardados neste browser
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null")
      if (saved?.txs) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTxs(saved.txs)
        setSettings({ ...DEFAULT_SETTINGS, ...saved.settings })
      }
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORE, JSON.stringify({ txs, settings }))
    } catch {}
  }, [txs, settings, loaded])

  // Câmbio BCE automático nas linhas em moeda estrangeira
  const { status: fxStatus, reset: resetFx, clearRow: clearFx } = useEcbRates(txs, setTxs)

  const result = useMemo(() => computeGains(txs, settings.year), [txs, settings.year])
  const englob = (Math.max(result.balance, 0) * (Number(settings.marginal) || 0)) / 100

  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 9 }, (_, k) => thisYear - k)

  const update = (i: number, patch: Partial<Transaction>) => {
    if ("rate" in patch) clearFx(i)
    setTxs(prev =>
      prev.map((t, j) => {
        if (j !== i) return t
        const next = { ...t, ...patch }
        // Mudar a data ou a moeda pede um câmbio novo
        if ("date" in patch || "currency" in patch) {
          next.rate = next.currency === "EUR" ? 1 : ""
          next.rateDate = undefined
        }
        return next
      })
    )
  }
  const num = (v: string): number | "" => (v === "" ? "" : Number(v))

  const addRow = () => {
    const last = txs[txs.length - 1]
    setTxs(prev => [
      ...prev,
      { date: "", type: "venda", ticker: last?.ticker ?? "", country: last?.country ?? "840", qty: "", price: "", currency: last?.currency ?? "USD", rate: last?.currency === "EUR" ? 1 : "", fees: 0 },
    ])
  }
  const removeRow = (i: number) => {
    resetFx()
    setTxs(prev => prev.filter((_, j) => j !== i))
  }

  // Importa um ou mais CSV (Trading 212 ou Degiro), detetando a corretora pelo cabeçalho
  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const imported: Transaction[] = []
    let skipped = 0
    const errors: string[] = []
    const brokers = new Set<string>()
    let hadDividends = false
    for (const file of Array.from(files)) {
      const r = importCSV(await file.text())
      if (r.broker && r.txs.length) brokers.add(BROKER_NAMES[r.broker])
      if (r.dividends.length) hadDividends = true
      imported.push(...r.txs)
      skipped += r.skipped
      errors.push(...r.errors.map(e => `${file.name}: ${e}`))
    }
    if (!imported.length) {
      setImportMsg({
        ok: false,
        text: hadDividends
          ? "Este ficheiro só tem dividendos. Usa-o na calculadora de dividendos."
          : errors[0] ?? "Não encontrei compras nem vendas no ficheiro.",
      })
      return
    }
    const sig = (t: Transaction) => [t.date, t.type, t.ticker, t.qty, t.price].join("|")
    const isExample = txs.length === EXAMPLE.length && txs.every((t, k) => sig(t) === sig(EXAMPLE[k]))
    const base = isExample ? [] : txs
    const seen = new Set(base.map(sig))
    const fresh = imported.filter(t => (seen.has(sig(t)) ? false : (seen.add(sig(t)), true)))
    resetFx()
    setTxs([...base, ...fresh].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999")))
    const lastSale = fresh.filter(t => t.type === "venda").map(t => t.date).sort().pop()
    if (lastSale) setSettings(s => ({ ...s, year: Number(lastSale.slice(0, 4)) }))
    const dup = imported.length - fresh.length
    setImportMsg({
      ok: true,
      text:
        `Importei ${fresh.length} ${fresh.length === 1 ? "movimento" : "movimentos"} da ${Array.from(brokers).join(" e da ")}` +
        (dup ? ` (${dup} já existiam)` : "") +
        (skipped ? `. Ignorei ${skipped} linhas que não são compras nem vendas (depósitos, dividendos, juros).` : ".") +
        (errors.length ? ` ${errors.length} linhas tinham dados incompletos.` : ""),
    })
  }

  const copyTable = async () => {
    const head = ["Código", "País da fonte", "Data de realização", "Valor de realização", "Data de aquisição", "Valor de aquisição", "Despesas e encargos", "País da contraparte"]
    const rows = result.lines.map(l => ["G01", l.country, l.saleDate, plain.format(l.saleValue), l.buyDate, plain.format(l.buyValue), plain.format(l.expenses), l.broker ?? settings.broker])
    try {
      await navigator.clipboard.writeText([head, ...rows].map(r => r.join("\t")).join("\n"))
      setCopied("Tabela copiada")
    } catch {
      setCopied("O browser não deixou copiar. Seleciona a tabela à mão.")
    }
    setTimeout(() => setCopied(""), 3000)
  }

  let verdict: { pill: string; text: string }
  if (!result.lines.length) verdict = { pill: "Sem vendas", text: `Não há vendas em ${settings.year}. Não tens mais-valias a declarar neste ano.` }
  else if (result.balance <= 0) verdict = { pill: "Saldo negativo", text: `Não pagas imposto sobre mais-valias. Se optares pelo englobamento, podes usar a perda de ${eur.format(-result.balance)} nos 5 anos seguintes.` }
  else if (englob < result.tax28) verdict = { pill: "Englobar compensa", text: `Com a tua taxa marginal pagas cerca de ${eur.format(result.tax28 - englob)} a menos se optares pelo englobamento. A opção aplica-se a todos os rendimentos de capitais e mais-valias desse ano.` }
  else verdict = { pill: "Taxa de 28%", text: `A tributação autónoma a 28% é a melhor opção. O englobamento custaria cerca de ${eur.format(englob - result.tax28)} a mais.` }

  return (
    <main className="calc">
      <nav className="calc-nav">
        <Link href="/">← Wealthy</Link>
        <span className="calc-nav-current">Mais-valias</span>
        <Link href="/calculadoras/dividendos">Dividendos</Link>
      </nav>

      <header className="calc-header">
        <div>
          <h1>Calculadora de mais-valias de ações para o IRS</h1>
          <p className="calc-lede">
            Para quem investe por corretoras estrangeiras (Trading 212, Degiro, XTB, Interactive Brokers). Mete as
            compras e as vendas, e a calculadora aplica o método FIFO, converte para euros com o câmbio do BCE e devolve
            as linhas prontas para o Anexo J, quadro 9.2 A.
          </p>
        </div>
        <label className="calc-field" htmlFor="calc-year">
          Ano do IRS (vendas feitas em)
          <select id="calc-year" value={settings.year} onChange={e => setSettings(s => ({ ...s, year: Number(e.target.value) }))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </header>

      <div className="calc-tiles">
        <div className="calc-tile"><span>Mais-valias</span><strong className="calc-pos">{eur.format(result.gains)}</strong></div>
        <div className="calc-tile"><span>Menos-valias</span><strong className="calc-neg">{eur.format(result.losses)}</strong></div>
        <div className="calc-tile"><span>Saldo de {settings.year}</span><strong className={signClass(result.balance)}>{eur.format(result.balance)}</strong></div>
        <div className="calc-tile calc-tile-main"><span>Imposto à taxa de 28%</span><strong>{eur.format(result.tax28)}</strong></div>
        <div className="calc-tile"><span>Com englobamento (estimativa)</span><strong>{eur.format(englob)}</strong></div>
      </div>

      <div className="calc-verdict">
        <span className="calc-pill">{verdict.pill}</span>
        <span>{verdict.text}</span>
      </div>

      <section className="calc-card">
        <div className="calc-card-head">
          <h2>Movimentos</h2>
          <div className="calc-actions">
            <button type="button" className="calc-btn" onClick={addRow}>Adicionar movimento</button>
            <button type="button" className="calc-btn calc-ghost" onClick={() => { resetFx(); setTxs(cloneExample()); setSettings(DEFAULT_SETTINGS) }}>Repor exemplo</button>
            <button type="button" className="calc-btn calc-ghost" onClick={() => { resetFx(); setTxs([]) }}>Limpar tudo</button>
          </div>
        </div>
        <p className="calc-note">
          Mete todas as compras de cada ação, incluindo as de anos anteriores, porque o FIFO vende primeiro as unidades
          mais antigas. O câmbio (1 EUR = x moeda) é preenchido com a taxa de referência do BCE desse dia, e podes
          alterá-lo à mão.
        </p>

        <label
          htmlFor="calc-file"
          className={`calc-drop${dragging ? " calc-drop-active" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); importFiles(e.dataTransfer.files) }}
        >
          <strong>Importar da Trading 212 ou da Degiro</strong>
          <span>
            Arrasta para aqui os CSV ou clica para os escolher. Podes juntar ficheiros das duas corretoras.
          </span>
          <span>
            Trading 212: Histórico → ícone de exportar → escolhe as datas → CSV (até 12 meses por ficheiro).
            <br />
            Degiro: Caixa de entrada → Transações → escolhe as datas desde a primeira compra → Exportar → CSV.
          </span>
          <input id="calc-file" type="file" accept=".csv,text/csv" multiple onChange={e => { importFiles(e.target.files); e.target.value = "" }} />
        </label>
        {importMsg && <p className={importMsg.ok ? "calc-import-ok" : "calc-import-err"} role="status">{importMsg.text}</p>}

        {(result.warnings.length > 0 || result.shortTerm > 0) && (
          <div className="calc-warn">
            {result.warnings.map((w, k) => <span key={k}>Linha {w.row + 1}: {w.msg}</span>)}
            {result.shortTerm > 0 && (
              <span>
                {result.shortTerm} {result.shortTerm === 1 ? "lote foi detido" : "lotes foram detidos"} menos de 365 dias. Se o
                teu rendimento chegar ao último escalão, essas mais-valias têm de ser englobadas.
              </span>
            )}
          </div>
        )}

        <div className="calc-table-wrap">
          <table className="calc-table calc-tx">
            <thead>
              <tr>
                <th>Data</th><th>Tipo</th><th>Ativo</th><th>País da empresa</th>
                <th className="r">Quantidade</th><th className="r">Preço unitário</th><th>Moeda</th>
                <th className="r">Câmbio BCE</th><th className="r">Comissões</th><th aria-label="Apagar"></th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t, i) => (
                <tr key={i}>
                  <td><input id={`date-${i}`} aria-label="Data" type="date" value={t.date} onChange={e => update(i, { date: e.target.value })} /></td>
                  <td>
                    <select id={`type-${i}`} aria-label="Tipo" value={t.type} onChange={e => update(i, { type: e.target.value as Transaction["type"] })}>
                      <option value="compra">Compra</option><option value="venda">Venda</option>
                    </select>
                  </td>
                  <td><input id={`ticker-${i}`} aria-label="Ativo" value={t.ticker} placeholder="AAPL" onChange={e => update(i, { ticker: e.target.value })} /></td>
                  <td>
                    <select id={`country-${i}`} aria-label="País da empresa" value={t.country} onChange={e => update(i, { country: e.target.value })}>
                      {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}
                    </select>
                  </td>
                  <td><input id={`qty-${i}`} aria-label="Quantidade" className="num" type="number" step="any" min="0" value={t.qty} onChange={e => update(i, { qty: num(e.target.value) })} /></td>
                  <td><input id={`price-${i}`} aria-label="Preço unitário" className="num" type="number" step="any" min="0" value={t.price} onChange={e => update(i, { price: num(e.target.value) })} /></td>
                  <td>
                    <select id={`cur-${i}`} aria-label="Moeda" value={t.currency} onChange={e => update(i, { currency: e.target.value })}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td>
                    {/* Bloqueado quando a moeda é EUR ou quando o câmbio veio do BCE */}
                    <input id={`rate-${i}`} aria-label="Câmbio BCE" className="num" type="number" step="any" min="0" readOnly={t.currency === "EUR" || !!t.rateDate} disabled={t.currency === "EUR"} value={t.currency === "EUR" ? 1 : t.rate} onChange={e => update(i, { rate: num(e.target.value) })} />
                    {t.currency !== "EUR" && t.rateDate && (
                      <small className="calc-fx">BCE{t.rateDate !== t.date ? ` de ${t.rateDate}` : ""}</small>
                    )}
                    {t.currency !== "EUR" && !t.rateDate && fxStatus[i] && <small className="calc-fx">{fxStatus[i]}</small>}
                  </td>
                  <td><input id={`fees-${i}`} aria-label="Comissões" className="num" type="number" step="any" min="0" value={t.fees} onChange={e => update(i, { fees: num(e.target.value) })} /></td>
                  <td><button type="button" className="calc-icon" aria-label="Apagar movimento" onClick={() => removeRow(i)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="calc-card">
        <h2>Englobamento</h2>
        <div className="calc-settings">
          <label className="calc-field" htmlFor="calc-marginal">
            Taxa marginal do teu escalão de IRS (%)
            <input id="calc-marginal" className="num" type="number" min="0" max="60" step="0.1" value={settings.marginal} onChange={e => setSettings(s => ({ ...s, marginal: num(e.target.value) }))} />
          </label>
          <label className="calc-field" htmlFor="calc-broker">
            País da corretora (para movimentos escritos à mão)
            <select id="calc-broker" value={settings.broker} onChange={e => setSettings(s => ({ ...s, broker: e.target.value }))}>
              {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}
            </select>
          </label>
        </div>
        <p className="calc-note">
          A estimativa de englobamento multiplica o saldo pela tua taxa marginal (está na tua última nota de
          liquidação). Se o saldo te fizer subir de escalão, o valor real é um pouco maior. Com englobamento, a
          menos-valia pode ser reportada para os 5 anos seguintes.
        </p>
      </section>

      <section className="calc-card">
        <div className="calc-card-head">
          <h2>Anexo J, quadro 9.2 A</h2>
          <div className="calc-actions">
            <span className="calc-copied" aria-live="polite">{copied}</span>
            <button type="button" className="calc-btn" onClick={copyTable} disabled={!result.lines.length}>Copiar tabela</button>
          </div>
        </div>
        <p className="calc-note">
          Uma linha por cada lote vendido, já em euros. Código G01 = alienação onerosa de ações. As datas e os valores
          vão para as colunas com o mesmo nome no Portal das Finanças.
        </p>
        <div className="calc-table-wrap">
          <table className="calc-table">
            <thead>
              <tr>
                <th>Código</th><th>País da fonte</th><th>Data de realização</th><th className="r">Valor de realização</th>
                <th>Data de aquisição</th><th className="r">Valor de aquisição</th><th className="r">Despesas e encargos</th>
                <th>País da contraparte</th><th>Ativo</th><th className="r">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.length ? (
                result.lines.map((l, k) => (
                  <tr key={k}>
                    <td>G01</td>
                    <td>{countryName(l.country)} ({l.country})</td>
                    <td className="num">{l.saleDate}</td>
                    <td className="r num">{plain.format(l.saleValue)}</td>
                    <td className="num">{l.buyDate}</td>
                    <td className="r num">{plain.format(l.buyValue)}</td>
                    <td className="r num">{plain.format(l.expenses)}</td>
                    <td>{countryName(l.broker ?? settings.broker)} ({l.broker ?? settings.broker})</td>
                    <td>
                      {l.ticker} × {+l.qty.toFixed(6)} {l.heldDays < 365 && <span className="calc-short">&lt; 365 dias</span>}
                    </td>
                    <td className={`r num ${signClass(l.result)}`}>{plain.format(l.result)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={10} className="calc-note">Sem vendas em {settings.year}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="calc-footer">
        <p>
          Os dados ficam só neste browser. É uma ajuda ao cálculo e não substitui um contabilista. Confirma sempre os
          valores antes de submeter a declaração.
        </p>
        <p>
          Desde 2023, as mais-valias de ativos detidos há menos de 365 dias têm de ser englobadas quando o teu rendimento
          coletável total (incluindo essas mais-valias) chega ao último escalão do IRS. As linhas nessa situação aparecem
          marcadas com &quot;&lt; 365 dias&quot;.
        </p>
      </footer>
    </main>
  )
}
