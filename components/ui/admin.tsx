import { Shield } from "lucide-react"

export function AdminBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-odfe-gold/15 px-3 py-1 text-xs font-semibold text-odfe-gold">
      <Shield size={12} />
      Admin
    </div>
  )
}
