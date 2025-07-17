
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Wallet, Plus, Send, ArrowUpDown, RefreshCw, Download, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface WalletData {
  address: string
  xrp_balance?: number
  lawas_balance?: number
  reserved_xrp?: number // Added for reserved XRP
}

export default function Home() {
  const [wallets, setWallets] = useState<WalletData[]>([])
  const [numWallets, setNumWallets] = useState(10)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  // Import wallet states
  const [importSeed, setImportSeed] = useState('')
  const [importPrivateKey, setImportPrivateKey] = useState('')
  const [importPassword, setImportPassword] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  const generateWallets = async () => {
    if (!password) {
      setMessage('Password is required')
      toast.error('Password is required')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/generate-wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          num_wallets: numWallets,
          password: password
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage(data.message)
        toast.success(data.message)
        fetchWallets()
      } else {
        setMessage(data.error || 'Error generating wallets')
        toast.error(data.error || 'Error generating wallets')
      }
    } catch (error) {
      setMessage('Failed to connect to backend')
      toast.error('Failed to connect to backend')
    } finally {
      setLoading(false)
    }
  }

  const importWallet = async () => {
    if (!importPassword) {
      toast.error('Password is required')
      return
    }

    if (!importSeed && !importPrivateKey) {
      toast.error('Either seed or private key is required')
      return
    }

    setImportLoading(true)

    try {
      const response = await fetch('/api/import-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seed: importSeed || undefined,
          private_key: importPrivateKey || undefined,
          password: importPassword
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message)
        setImportSeed('')
        setImportPrivateKey('')
        setImportPassword('')
        fetchWallets()
      } else {
        toast.error(data.error || 'Error importing wallet')
      }
    } catch (error) {
      toast.error('Failed to import wallet')
    } finally {
      setImportLoading(false)
    }
  }

  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets-with-balances')
      const data = await response.json()
      
      if (response.ok) {
        setWallets(data.wallets || [])
      }
    } catch (error) {
      console.error('Failed to fetch wallets:', error)
    }
  }

  useEffect(() => {
    fetchWallets()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Wallet className="h-10 w-10 text-blue-600" />
            R3STORE Wallet Manager
          </h1>
          <p className="text-gray-600">Generate and manage 100 XRP wallets with ease</p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            <Button variant="outline" asChild>
              <a href="/swap">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Swap
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/master-wallet">
                <Send className="h-4 w-4 mr-2" />
                Master Wallet
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/trustlines">
                <Plus className="h-4 w-4 mr-2" />
                Trustlines
              </a>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Wallets</TabsTrigger>
            <TabsTrigger value="import">Import Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            {/* Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Generate Wallets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Generate Wallets
                  </CardTitle>
                  <CardDescription>
                    Create multiple XRP wallets at once
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="numWallets">Number of Wallets</Label>
                    <Input
                      id="numWallets"
                      type="number"
                      value={numWallets}
                      onChange={(e) => setNumWallets(parseInt(e.target.value) || 1)}
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Encryption Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password for encryption"
                    />
                  </div>
                  <Button 
                    onClick={generateWallets} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Generate {numWallets} Wallets
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Master Wallet Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Master Wallet
                  </CardTitle>
                  <CardDescription>
                    Broadcast transactions to all wallets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/master-wallet">
                      <Send className="h-4 w-4 mr-2" />
                      Manage Master Wallet
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Auto-Swap Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpDown className="h-5 w-5" />
                    Auto-Swap
                  </CardTitle>
                  <CardDescription>
                    Automatically swap tokens across wallets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/swap">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Configure Auto-Swap
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Wallet
                </CardTitle>
                <CardDescription>
                  Import an existing wallet using seed phrase or private key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="importSeed">Seed Phrase (Optional)</Label>
                  <Input
                    id="importSeed"
                    type="text"
                    value={importSeed}
                    onChange={(e) => setImportSeed(e.target.value)}
                    placeholder="Enter 12-word seed phrase"
                  />
                </div>
                <div className="text-center text-sm text-gray-500">
                  - OR -
                </div>
                <div>
                  <Label htmlFor="importPrivateKey">Private Key (Optional)</Label>
                  <Input
                    id="importPrivateKey"
                    type="password"
                    value={importPrivateKey}
                    onChange={(e) => setImportPrivateKey(e.target.value)}
                    placeholder="Enter private key"
                  />
                </div>
                <div>
                  <Label htmlFor="importPassword">Encryption Password</Label>
                  <Input
                    id="importPassword"
                    type="password"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    placeholder="Enter password to encrypt imported wallet"
                  />
                </div>
                <Button 
                  onClick={importWallet} 
                  disabled={importLoading}
                  className="w-full"
                >
                  {importLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Wallet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Status Message */}
        {message && (
          <div className="mb-6">
            <Card>
              <CardContent className="pt-6">
                <p className={`text-center ${message.includes('Error') || message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Wallets List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallets ({wallets.length})
              </span>
              <Button variant="outline" size="sm" onClick={fetchWallets}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              All generated and imported XRP wallets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {wallets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No wallets generated yet. Use the controls above to create or import wallets.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wallets.map((wallet, index) => (
                  <Card key={wallet.address} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">Wallet {index + 1}</Badge>
                          <Badge variant="outline">Active</Badge>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Address</Label>
                          <p className="text-sm font-mono break-all">{wallet.address}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">XRP Balance</Label>
                          <p className="text-sm font-semibold">
                            {wallet.xrp_balance !== undefined ? `${wallet.xrp_balance.toFixed(6)} XRP` : 'Loading...'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Reserved XRP</Label>
                          <p className="text-sm font-semibold text-gray-500">
                            {wallet.reserved_xrp !== undefined ? `${wallet.reserved_xrp.toFixed(6)} XRP` : 'Loading...'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">LAWAS Balance</Label>
                          <p className="text-sm font-semibold text-orange-600">
                            {wallet.lawas_balance !== undefined ? `${wallet.lawas_balance.toFixed(6)} LAWAS` : 'Loading...'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



