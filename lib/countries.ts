// Códigos numéricos de país usados no Anexo J
export const COUNTRIES: [string, string][] = [
  ["840", "Estados Unidos"], ["528", "Países Baixos"], ["276", "Alemanha"], ["250", "França"],
  ["372", "Irlanda"], ["826", "Reino Unido"], ["724", "Espanha"], ["380", "Itália"],
  ["756", "Suíça"], ["442", "Luxemburgo"], ["196", "Chipre"], ["124", "Canadá"],
  ["392", "Japão"], ["208", "Dinamarca"], ["752", "Suécia"], ["620", "Portugal"],
  ["056", "Bélgica"], ["246", "Finlândia"], ["578", "Noruega"], ["040", "Áustria"],
  ["036", "Austrália"], ["156", "China"], ["158", "Taiwan"], ["344", "Hong Kong"],
  ["136", "Ilhas Caimão"], ["832", "Jersey"], ["060", "Bermudas"], ["376", "Israel"],
  ["076", "Brasil"], ["410", "Coreia do Sul"], ["356", "Índia"], ["702", "Singapura"],
]

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "DKK", "SEK", "NOK", "CAD", "JPY", "HKD", "AUD"]

export const countryName = (code: string) => COUNTRIES.find(c => c[0] === code)?.[1] ?? code
