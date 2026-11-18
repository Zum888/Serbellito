import { useEffect, useState } from 'react'
import { parseMxDate } from '../format'

export function MxDate({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!value) {
      setText('')
      setError(false)
      return
    }
    const [year, month, day] = value.split('-')
    setText(`${day}/${month}/${year}`)
  }, [value])

  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={text}
        placeholder="dd/mm/aaaa"
        inputMode="numeric"
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          if (!next.trim()) {
            setError(false)
            onChange('')
            return
          }
          const parsed = parseMxDate(next)
          if (!parsed) {
            setError(true)
            return
          }
          setError(false)
          onChange(parsed)
        }}
      />
      {error && <span className="field-error">Usa dd/mm/aaaa</span>}
    </label>
  )
}
