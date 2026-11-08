import type { Metadata } from "next"
import DividendsCalculator from "../../../components/DividendsCalculator"

export const metadata: Metadata = {
  title: "Calculadora de imposto sobre dividendos estrangeiros no IRS (Anexo J) | Wealthy",
  description:
    "Calcula grátis quanto IRS pagas sobre dividendos de ações estrangeiras na Trading 212 ou Degiro: retenção na fonte, crédito de imposto e linhas prontas para o quadro 8 do Anexo J.",
}

export default function DividendosPage() {
  return <DividendsCalculator />
}
