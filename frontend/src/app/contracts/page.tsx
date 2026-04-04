"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ContractsPage() {
  const [contractInput, setContractInput] = useState("")
  const [scanResult, setScanResult] = useState<any>(null)
  const [feedback, setFeedback] = useState("")

  const scanContract = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: contractInput, code: contractInput })
      })
      const data = await res.json()
      setScanResult(data)
    } catch (error) {
      setFeedback("Unable to scan contract. Ensure the backend is running.")
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Smart Contract Guard</h1>
            <p className="text-muted-foreground">Analyze contract code, audit risk, and explore blockchain contract status.</p>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contract Scanner</CardTitle>
            <CardDescription>Submit a smart contract address or Solidity code snippet for a rule-based risk scan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="Paste address or contract code"
                value={contractInput}
                onChange={(e) => setContractInput(e.target.value)}
                className="mb-4"
              />
              <Button onClick={scanContract}>Run Contract Scan</Button>
              {feedback && <p className="text-sm text-destructive">{feedback}</p>}
              {scanResult && (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p><strong>Audit Score:</strong> {scanResult.audit_score}</p>
                  <p><strong>Contract Type:</strong> {scanResult.contract_type}</p>
                  <p><strong>Flags:</strong> {scanResult.flags.join(", ")}</p>
                  <p><strong>Recommendations:</strong> {scanResult.recommendations.join(", ")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Digital Contract Patterns</CardTitle>
              <CardDescription>Built-in contract checks for common blockchain threats.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>• Reentrancy detection on withdraw/call.value patterns</li>
                <li>• Unsafe external calls via delegatecall or call</li>
                <li>• Approval and transfer risk for ERC-20 flows</li>
                <li>• Owner privilege and admin-access warnings</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blockchain Compliance</CardTitle>
              <CardDescription>Essential checks for contract safety and user protection.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>• Detect suspicious on-chain activity</li>
                <li>• Evaluate contract trust via code patterns</li>
                <li>• Provide human-readable security tips</li>
                <li>• Track contracts across Ethereum ecosystems</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
