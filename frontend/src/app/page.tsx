"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Home() {
  const [dashboardData, setDashboardData] = useState({ total_assets: 0, risk_score: 0, alerts: 0, transactions: [], monitored_contracts: [], network: "" })
  const [walletAddress, setWalletAddress] = useState("")
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [chatMessage, setChatMessage] = useState("")
  const [chatResponse, setChatResponse] = useState("")
  const [contractInput, setContractInput] = useState("")
  const [scanResult, setScanResult] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      window.location.href = "/login"
      return
    }
    fetchDashboard()
  }, [])

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard`, {
        headers: getAuthHeaders()
      })
      if (res.status === 401) {
        window.location.href = "/login"
        return
      }
      const data = await res.json()
      setDashboardData(data)
    } catch (error) {
      console.error("Failed to fetch dashboard", error)
      setErrorMessage("Cannot reach backend. Make sure the API server is running.")
    }
  }

  const analyzeWallet = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ address: walletAddress })
      })
      if (res.status === 401) {
        window.location.href = "/login"
        return
      }
      const data = await res.json()
      setAnalysisResult(data)
    } catch (error) {
      console.error("Failed to analyze wallet", error)
    }
  }

  const sendChat = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ message: chatMessage })
      })
      if (res.status === 401) {
        window.location.href = "/login"
        return
      }
      const data = await res.json()
      setChatResponse(data.response)
    } catch (error) {
      console.error("Failed to send chat", error)
    }
  }

  const scanContract = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ address: contractInput, code: contractInput })
      })
      if (res.status === 401) {
        window.location.href = "/login"
        return
      }
      const data = await res.json()
      setScanResult(data)
    } catch (error) {
      console.error("Failed to scan contract", error)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <AppHeader />

        {errorMessage && <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">{errorMessage}</div>}

        <div className="mb-8 rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-foreground shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Explore digital contracts</h2>
              <p className="text-sm text-muted-foreground">Analyze contract code, detect vulnerabilities, and review suspicious blockchain patterns.</p>
            </div>
            <Link href="/contracts">
              <Button variant="outline">Open Contract Guard</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Overview</CardTitle>
              <CardDescription>Total Assets</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${dashboardData.total_assets.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-2">Network: {dashboardData.network || "Ethereum"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Score</CardTitle>
              <CardDescription>Current Risk Level</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{dashboardData.risk_score}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
              <CardDescription>Active Alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-500">{dashboardData.alerts}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Recent on-chain activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.transactions.length > 0 ? (
                  dashboardData.transactions.map((tx: any) => (
                    <div key={tx.hash} className="rounded-xl border p-4">
                      <p className="text-sm text-muted-foreground">{tx.date} · {tx.type}</p>
                      <p className="font-semibold">{tx.amount}</p>
                      <p className="text-sm">{tx.hash}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent transactions found.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monitored Contracts</CardTitle>
              <CardDescription>Watched blockchain contracts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.monitored_contracts.length > 0 ? (
                  dashboardData.monitored_contracts.map((contract: any) => (
                    <div key={contract.address} className="rounded-xl border p-4">
                      <p className="text-sm text-muted-foreground">{contract.label}</p>
                      <p className="font-semibold">{contract.address}</p>
                      <p className="text-sm">Risk: {contract.risk}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No contracts monitored yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Risk Analysis</CardTitle>
              <CardDescription>Analyze wallet security</CardDescription>
            </CardHeader>
            <CardContent>
              <Input placeholder="Enter wallet address" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="mb-4" />
              <Button onClick={analyzeWallet}>Analyze</Button>
              {analysisResult && (
                <div className="mt-4 space-y-2 rounded-xl border p-4">
                  <p><strong>Wallet:</strong> {analysisResult.wallet}</p>
                  <p><strong>Status:</strong> {analysisResult.status}</p>
                  <p><strong>Estimated Value:</strong> ${analysisResult.estimated_value}</p>
                  <p><strong>Recommendations:</strong> {analysisResult.recommendations.join(", ")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Security Assistant</CardTitle>
              <CardDescription>Get AI-powered security advice</CardDescription>
            </CardHeader>
            <CardContent>
              <Input placeholder="Ask a security question" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} className="mb-4" />
              <Button onClick={sendChat}>Chat</Button>
              {chatResponse && <p className="mt-4 rounded-xl border p-4">{chatResponse}</p>}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Smart Contract Checker</CardTitle>
              <CardDescription>Scan contracts for vulnerabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <Input placeholder="Enter contract address or paste code" value={contractInput} onChange={(e) => setContractInput(e.target.value)} className="mb-4" />
              <Button onClick={scanContract}>Scan</Button>
              {scanResult && (
                <div className="mt-4 space-y-2 rounded-xl border p-4">
                  <p><strong>Contract Type:</strong> {scanResult.contract_type}</p>
                  <p><strong>Audit Score:</strong> {scanResult.audit_score}</p>
                  <p><strong>Flags:</strong> {scanResult.flags.join(", ")}</p>
                  <p><strong>Recommendations:</strong> {scanResult.recommendations.join(", ")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
