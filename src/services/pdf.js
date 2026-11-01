// Report PDF export. Loaded on demand because jsPDF is large.

// The standard PDF fonts cover Latin-1 only, so typographic characters are simplified.
const clean = (value) =>
  String(value ?? '')
    .replace(/₂/g, '2')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/×/g, 'x')
    .replace(/→/g, '->')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '')

export async function reportToPdf(report) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 48
  const width = doc.internal.pageSize.getWidth() - margin * 2
  const bottom = doc.internal.pageSize.getHeight() - 54
  let y = margin

  const ensure = (needed) => {
    if (y + needed > bottom) {
      doc.addPage()
      y = margin
    }
  }

  const text = (value, { size = 10, bold = false, color = [51, 65, 85], gap = 4 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.splitTextToSize(clean(value), width).forEach((line) => {
      ensure(size + 4)
      doc.text(line, margin, y)
      y += size + 3
    })
    y += gap
  }

  text('Waymark', { size: 11, bold: true, color: [4, 120, 87], gap: 2 })
  text(report.title, { size: 18, bold: true, color: [11, 34, 57], gap: 2 })
  text(`Generated ${new Date(report.generatedAt).toLocaleString('en-CA')}`, { size: 9, gap: 2 })
  if (report.isDemo) text('Demo Data: this report describes a fictional company.', { size: 9, bold: true, color: [146, 64, 14], gap: 2 })
  y += 8

  for (const section of report.sections) {
    ensure(40)
    text(section.heading, { size: 13, bold: true, color: [11, 34, 57], gap: 3 })
    section.paragraphs?.forEach((p) => text(p))
    section.bullets?.forEach((b) => text(`- ${b}`, { gap: 2 }))
    if (section.table) {
      autoTable(doc, {
        startY: y,
        head: [section.table.head.map(clean)],
        body: section.table.rows.map((row) => row.map(clean)),
        margin: { left: margin, right: margin, bottom: 54 },
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: [51, 65, 85] },
        headStyles: { fillColor: [11, 34, 57], textColor: 255 },
        alternateRowStyles: { fillColor: [241, 245, 249] },
      })
      y = doc.lastAutoTable.finalY + 14
    }
    y += 6
  }

  ensure(70)
  text('Sources and data timestamps', { size: 13, bold: true, color: [11, 34, 57], gap: 3 })
  report.sources.forEach((s) => text(`${s.label}: ${s.detail}`, { size: 9, gap: 1 }))
  y += 6
  text(report.disclaimer, { size: 8, color: [100, 116, 139] })

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Waymark · ${clean(report.isDemo ? 'Fictional demo data' : 'Confidential')} · Page ${i} of ${pages}`, margin, doc.internal.pageSize.getHeight() - 28)
  }
  return doc.output('blob')
}
