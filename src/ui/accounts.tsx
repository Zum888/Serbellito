import { ACCOUNTS } from '../catalog'

export function AccountChips({ accountId, onSelect }: { accountId: string; onSelect: (accountId: string) => void }) {
  return (
    <div className="chips" role="group" aria-label="Cuenta bancaria">
      {ACCOUNTS.map((account) => {
        const on = account.id === accountId
        return (
          <button key={account.id} type="button" className={on ? 'chip on' : 'chip'} aria-pressed={on} onClick={() => onSelect(account.id)}>
            {account.bank} · {account.mask}
          </button>
        )
      })}
    </div>
  )
}
