import { findParty } from './domain'
import { norm } from './format'
import type { ChatAction, ChatMessage, FiscalDoc } from './types'

export type BuiltReply = {
  kind: ChatMessage['kind']
  text: string
  supplier?: string
  fiscal?: FiscalDoc
  actions?: { label: string; action: ChatAction }[]
  openUpload?: boolean
}

function has(text: string, ...parts: string[]): boolean {
  return parts.some((part) => text.includes(part))
}

export function interpret(input: string): BuiltReply {
  const text = norm(input)
  if (!text) {
    return { kind: 'text', text: 'Escribe una pregunta o arrastra tu estado de cuenta.' }
  }

  if (has(text, 'cuanto le debo', 'cuanto debo', 'le debo a', 'saldo de', 'saldo con')) {
    const party = findParty(input)
    if (!party) {
      return {
        kind: 'text',
        text: 'Dime el proveedor. Por ejemplo: ¿Cuánto le debo a Empaques de Occidente?',
      }
    }
    return { kind: 'debt', text: '', supplier: party.name }
  }

  if (has(text, 'sin factura', 'pagos sin')) {
    return { kind: 'unbilled', text: '' }
  }

  if (has(text, 'opinion de cumplimiento', 'opinion del cumplimiento', 'calificacion ante el sat', 'buena calificacion', 'opinion de cumplimiento')) {
    return {
      kind: 'fiscal',
      fiscal: 'opinion',
      text: 'La opinión de cumplimiento es positiva.',
    }
  }

  if (has(text, 'constancia')) {
    return {
      kind: 'fiscal',
      fiscal: 'constancia',
      text: 'Esta es la constancia de situación fiscal de Distribuidora La Central.',
    }
  }

  if (has(text, 'documento del sat', 'documentos del sat', 'pedir documento')) {
    return {
      kind: 'text',
      text: 'Puedo prepararte la constancia de situación fiscal o la opinión de cumplimiento. Las dos consultas son una simulación, sin contraseña ni e.firma.',
      actions: [
        { label: 'Constancia de situación fiscal', action: { type: 'ask', text: 'Dame mi constancia' } },
        { label: 'Opinión de cumplimiento', action: { type: 'ask', text: 'Dame mi opinión de cumplimiento' } },
      ],
    }
  }

  if (has(text, 'estado de cuenta', 'subir estado', 'cargar estado')) {
    return {
      kind: 'upload',
      text: 'Suelta tu Excel, CSV o PDF en el mensaje, o usa el estado de cuenta de ejemplo. El CSV de ejemplo se lee en este navegador.',
      openUpload: true,
      actions: [{ label: 'Elegir archivo', action: { type: 'upload' } }],
    }
  }

  if (has(text, 'pendiente')) {
    return { kind: 'pending', text: '' }
  }

  return {
    kind: 'text',
    text: 'No tengo una respuesta para eso. Puedo ayudarte con estas tres cosas.',
    actions: [
      { label: 'Subir estado de cuenta', action: { type: 'upload' } },
      { label: 'Pedir mi constancia', action: { type: 'ask', text: 'Pedir mi constancia' } },
      { label: 'Revisar pagos sin factura', action: { type: 'ask', text: 'Revisar pagos sin factura' } },
    ],
  }
}
