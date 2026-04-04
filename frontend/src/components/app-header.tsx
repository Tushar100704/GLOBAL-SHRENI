import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AppHeader() {
  return (
    <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-4xl font-bold text-foreground">ARISE Guardian</h1>
        <p className="text-sm text-muted-foreground">AI-powered Web3 security vault for wallet safety and contract defense.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/contracts">
          <Button variant="outline">Contracts</Button>
        </Link>
        <Link href="/login">
          <Button variant="ghost">Auth</Button>
        </Link>
      </div>
    </header>
  )
}
