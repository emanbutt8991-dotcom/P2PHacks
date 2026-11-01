// Number formatting helpers (CAD, en-CA locale).
const cad = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
const cadCompact = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const money = (n) => cad.format(Math.round(n))
export const moneyCompact = (n) => cadCompact.format(n)
export const signedMoney = (n) => {
  const r = Math.round(n)
  if (r === 0) return cad.format(0)
  return (r > 0 ? '+' : '−') + cad.format(Math.abs(r))
}
export const percent = (n, digits = 1) => `${(n * 100).toFixed(digits)}%`
