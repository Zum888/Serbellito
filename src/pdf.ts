import { COMPANY } from './catalog'
import { formatConsultedAt, formatDateLong, money } from './format'
import type { Complemento, Invoice } from './types'

const WIN: Record<string, string> = {
  á: '\\341',
  é: '\\351',
  í: '\\355',
  ó: '\\363',
  ú: '\\372',
  ñ: '\\361',
  Á: '\\301',
  É: '\\311',
  Í: '\\315',
  Ó: '\\323',
  Ú: '\\332',
  Ñ: '\\321',
  ü: '\\374',
  Ü: '\\334',
  '¿': '\\277',
  '¡': '\\241',
  '·': '\\267',
}

function escapePdf(text: string): string {
  let out = ''
  for (const char of text) {
    if (char === '\\' || char === '(' || char === ')') {
      out += `\\${char}`
      continue
    }
    const code = char.charCodeAt(0)
    if (code >= 32 && code <= 126) {
      out += char
      continue
    }
    out += WIN[char] ?? '?'
  }
  return out
}

function makePdf(lines: { text: string; size: number; bold?: boolean; y: number }[]): Uint8Array {
  const commands = [
    '0.45 w',
    '36 36 540 720 re S',
    ...lines.map((line) => {
      const font = line.bold ? 'F2' : 'F1'
      return `BT /${font} ${line.size} Tf 48 ${line.y} Td (${escapePdf(line.text)}) Tj ET`
    }),
  ]
  const stream = commands.join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n`
  body += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i += 1) body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(body)
}

function blobFrom(bytes: Uint8Array, filename: string): { blob: Blob; filename: string } {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return { blob: new Blob([copy], { type: 'application/pdf' }), filename }
}

export function fiscalPdf(doc: 'constancia' | 'opinion', consultedAt: string) {
  const stamp = 'MUESTRA · SIN VALIDEZ OFICIAL'
  if (doc === 'constancia') {
    const bytes = makePdf([
      { text: stamp, size: 11, bold: true, y: 730 },
      { text: 'CONSTANCIA DE SITUACIÓN FISCAL', size: 16, bold: true, y: 690 },
      { text: 'Documento simulado para la demostración', size: 11, y: 666 },
      { text: `Contribuyente: ${COMPANY.name}`, size: 12, y: 620 },
      { text: `RFC: ${COMPANY.rfc}`, size: 12, y: 600 },
      { text: `Estatus en el padrón: ${COMPANY.status}`, size: 12, y: 580 },
      { text: `Régimen: ${COMPANY.regimen}`, size: 12, y: 560 },
      { text: `Inicio de operaciones: ${COMPANY.start}`, size: 12, y: 540 },
      { text: `Domicilio: ${COMPANY.address}`, size: 11, y: 520 },
      { text: 'Actividad: Comercio al por mayor. Bodega en Guadalajara, Jalisco.', size: 11, y: 496 },
      { text: `Fecha y hora de la consulta simulada: ${consultedAt}`, size: 11, y: 450 },
      { text: 'Esta hoja no tiene validez oficial y no sustituye una consulta al SAT.', size: 11, y: 410 },
      { text: 'No requiere contraseña ni e.firma. Serbellito no se conectó al SAT.', size: 11, y: 392 },
    ])
    return blobFrom(bytes, 'constancia-situacion-fiscal-muestra.pdf')
  }
  const bytes = makePdf([
    { text: stamp, size: 11, bold: true, y: 730 },
    { text: 'OPINIÓN DEL CUMPLIMIENTO', size: 16, bold: true, y: 690 },
    { text: 'DE OBLIGACIONES FISCALES', size: 16, bold: true, y: 668 },
    { text: 'Resultado: POSITIVO', size: 20, bold: true, y: 620 },
    { text: 'Sentido de la opinión: Positivo.', size: 13, y: 588 },
    { text: 'El contribuyente se encuentra al corriente de sus obligaciones fiscales.', size: 12, y: 564 },
    { text: `Contribuyente: ${COMPANY.name}`, size: 12, y: 524 },
    { text: `RFC: ${COMPANY.rfc}`, size: 12, y: 504 },
    { text: `Domicilio: ${COMPANY.address}`, size: 11, y: 484 },
    { text: `Fecha y hora de la consulta simulada: ${consultedAt}`, size: 11, y: 444 },
    { text: 'Folio de muestra: OCU-2026-1118', size: 11, y: 424 },
    { text: 'Esta hoja no tiene validez oficial y no sustituye una consulta al SAT.', size: 11, y: 384 },
    { text: 'No requiere contraseña ni e.firma. Serbellito no se conectó al SAT.', size: 11, y: 366 },
  ])
  return blobFrom(bytes, 'opinion-cumplimiento-muestra.pdf')
}

export function invoicePdf(invoice: Invoice) {
  const bytes = makePdf([
    { text: 'MUESTRA · SIN VALIDEZ OFICIAL', size: 11, bold: true, y: 730 },
    { text: 'REPRESENTACIÓN IMPRESA DE CFDI', size: 15, bold: true, y: 690 },
    { text: `${invoice.direction === 'recibida' ? 'Factura recibida' : 'Factura emitida'} ${invoice.folio}`, size: 13, y: 660 },
    { text: `${invoice.name}`, size: 12, y: 628 },
    { text: `RFC: ${invoice.rfc}`, size: 12, y: 608 },
    { text: `UUID de muestra: ${invoice.uuid}`, size: 11, y: 588 },
    { text: `Fecha: ${formatDateLong(invoice.issueDate)}`, size: 12, y: 560 },
    { text: `Concepto: ${invoice.concept}`, size: 12, y: 540 },
    { text: `Total: ${money(invoice.total)} MXN`, size: 13, bold: true, y: 512 },
    { text: `Método de pago: ${invoice.metodo}`, size: 12, y: 488 },
    { text: `Vigencia de la demostración: ${invoice.vigencia}`, size: 12, y: 468 },
    { text: `Receptor o emisor de la demo: ${COMPANY.name}`, size: 11, y: 430 },
    { text: `RFC de la empresa: ${COMPANY.rfc}`, size: 11, y: 412 },
    { text: 'Documento ficticio. No es un CFDI del SAT.', size: 11, y: 370 },
  ])
  return blobFrom(bytes, `factura-${invoice.folio}-muestra.pdf`)
}

export function complementoPdf(invoice: Invoice, complemento: Complemento) {
  const bytes = makePdf([
    { text: 'MUESTRA · SIN VALIDEZ OFICIAL', size: 11, bold: true, y: 730 },
    { text: 'COMPLEMENTO DE PAGO', size: 16, bold: true, y: 690 },
    { text: `Relacionado con la factura ${invoice.folio}`, size: 13, y: 658 },
    { text: `${invoice.name}`, size: 12, y: 626 },
    { text: `RFC: ${invoice.rfc}`, size: 12, y: 606 },
    { text: `Folio del complemento: ${complemento.folio}`, size: 12, y: 578 },
    { text: `UUID de muestra: ${complemento.uuid}`, size: 11, y: 558 },
    { text: `Fecha: ${formatDateLong(complemento.fecha)}`, size: 12, y: 530 },
    { text: `Monto del complemento: ${money(complemento.amount)} MXN`, size: 13, bold: true, y: 502 },
    { text: 'Este documento está relacionado con la factura y no cuenta como otro CFDI de la lista de 100.', size: 11, y: 460 },
    { text: 'Documento ficticio. No es un complemento real del SAT.', size: 11, y: 430 },
  ])
  return blobFrom(bytes, `complemento-${invoice.folio}-muestra.pdf`)
}

export function consultedLabel(isoTime: string): string {
  const date = new Date(isoTime)
  if (Number.isNaN(date.getTime())) return isoTime
  return formatConsultedAt(date)
}
