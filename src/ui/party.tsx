import { partyByName, type Party } from '../catalog'

export function PartyLines({ party, name, compact = false }: { party?: Party; name?: string; compact?: boolean }) {
  const resolved = party ?? (name ? partyByName(name) : undefined)
  if (!resolved) return name ? <p className="muted">{name}</p> : null
  if (compact) {
    return (
      <p className="party inline">
        RFC {resolved.rfc} · Razón social {resolved.razonSocial} · Nombre comercial {resolved.nombreComercial} · Subnombre {resolved.subnombre}
      </p>
    )
  }
  return (
    <div className="party">
      <span>RFC {resolved.rfc}</span>
      <span>Razón social {resolved.razonSocial}</span>
      <span>Nombre comercial {resolved.nombreComercial}</span>
      <span>Subnombre {resolved.subnombre}</span>
    </div>
  )
}
