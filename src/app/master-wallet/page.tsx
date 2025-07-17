'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Wallet, Plus, Send, ArrowUpDown, RefreshCw, Upload, Download } from 'lucide-react'
import { toast } from 'sonner'

interface MasterWalletInfo {
  address: string
  balance: number
}

export default function MasterWalletPage() {
  const [masterWalletInfo, setMasterWalletInfo] = useState<MasterWalletInfo | null>(null)
  const [privateKey, setPrivateKey] = useState('')
  const [seedPhrase, setSeedPhrase] = useState('')
  const [amountPerWallet, setAmountPerWallet] = useState('')
  const [memoBroadcast, setMemoBroadcast] = useState('')
  const [memoCollect, setMemoCollect] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [wallets, setWallets] = useState<any[]>([])
  const [selectedWallets, setSelectedWallets] = useState<string[]>([])
  const [broadcastResults, setBroadcastResults] = useState<any>(null)
  const [collectResults, setCollectResults] = useState<any>(null)

  useEffect(() => {
    fetchMasterWalletInfo()
    fetchWallets()
  }, [])

  const fetchMasterWalletInfo = async () => {
    try {
      const response = await fetch('/api/master-wallet/info')
      if (response.ok) {
        const data = await response.json()
        setMasterWalletInfo(data)
      } else {
        setMasterWalletInfo(null)
      }
    } catch (error) {
      console.error('Error fetching master wallet info:', error)
      setMasterWalletInfo(null)
    }
  }

  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets-with-balances')
      if (response.ok) {
        const data = await response.json()
        setWallets(data.wallets || [])
        setSelectedWallets(data.wallets.map((w: any) => w.address)) // Select all by default
      }
    } catch (error) {
      console.error('Error fetching wallets:', error)
    }
  }

  const handleWalletSelection = (address: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedWallets(prev => [...prev, address])
    } else {
      setSelectedWallets(prev => prev.filter(walletAddress => walletAddress !== address))
    }
  }

  const createMasterWallet = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/master-wallet/create', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message)
        fetchMasterWalletInfo()
      } else {
        toast.error(data.message || 'Failed to create master wallet')
      }
    } catch (error) {
      toast.error('Failed to create master wallet')
    } finally {
      setLoading(false)
    }
  }

  const setMasterWallet = async () => {
    if (!privateKey) {
      toast.error('Private key is required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/master-wallet/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ private_key: privateKey })
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message)
        setPrivateKey('')
        fetchMasterWalletInfo()
      } else {
        toast.error(data.message || 'Failed to set master wallet')
      }
    } catch (error) {
      toast.error('Failed to set master wallet')
    } finally {
      setLoading(false)
    }
  }

  const importMasterWalletFromSeed = async () => {
    if (!seedPhrase) {
      toast.error('Seed phrase is required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/master-wallet/import-seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seed: seedPhrase })
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message)
        setSeedPhrase('')
        fetchMasterWalletInfo()
      } else {
        toast.error(data.message || 'Failed to import master wallet from seed')
      }
    } catch (error) {
      toast.error('Failed to import master wallet from seed')
    } finally {
      setLoading(false)
    }
  }

  const handleBroadcast = async () => {
    if (!amountPerWallet) {
      toast.error('Amount per wallet is required')
      return
    }

    if (selectedWallets.length === 0) {
      toast.error('Please select at least one wallet')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/master-wallet/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_addresses: selectedWallets,
          amount_per_wallet: parseFloat(amountPerWallet),
          memo: memoBroadcast
        })
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message)
        setBroadcastResults(data.results)
        fetchMasterWalletInfo()
      } else {
        toast.error(data.message || 'Failed to broadcast')
      }
    } catch (error) {
      toast.error('Failed to broadcast')
    } finally {
      setLoading(false)
    }
  }

  const handleCollect = async () => {
    if (!password) {
      toast.error('Password is required')
      return
    }

    if (selectedWallets.length === 0) {
      toast.error('Please select at least one wallet')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/master-wallet/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_addresses: selectedWallets,
          password: password,
          memo: memoCollect
        })
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message)
        setCollectResults(data.results)
        fetchMasterWalletInfo()
      } else {
        toast.error(data.message || 'Failed to collect')
      }
    } catch (error) {
      toast.error('Failed to collect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Send className="h-10 w-10 text-blue-600" />
            R3STORE Master Wallet Control
          </h1>
          <p className="text-gray-600">Manage your master wallet for broadcasting and collecting XRP.</p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            <Button variant="outline" asChild>
              <a href="/">
                <Wallet className="h-4 w-4 mr-2" />
                Wallets
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/swap">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Swap
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

        {/* Master Wallet Info */}
        {masterWalletInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Current Master Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Address</Label>
                  <p className="font-mono text-sm break-all">{masterWalletInfo.address}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Balance</Label>
                  <p className="font-semibold">{masterWalletInfo.balance.toFixed(6)} XRP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Master Wallet Setup */}
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="import-key">Import Private Key</TabsTrigger>
            <TabsTrigger value="import-seed">Import Seed</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create New Master Wallet</CardTitle>
                <CardDescription>
                  Generate a new master wallet for broadcasting and collecting XRP.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={createMasterWallet} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Master Wallet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import-key">
            <Card>
              <CardHeader>
                <CardTitle>Set Existing Master Wallet (Private Key)</CardTitle>
                <CardDescription>
                  Import an existing wallet using its private key.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="privateKey">Private Key</Label>
                  <Input
                    id="privateKey"
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Enter private key"
                  />
                </div>
                <Button onClick={setMasterWallet} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Setting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Set Master Wallet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import-seed">
            <Card>
              <CardHeader>
                <CardTitle>Import Master Wallet from Seed</CardTitle>
                <CardDescription>
                  Import an existing wallet using its seed phrase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="seedPhrase">Seed Phrase</Label>
                  <Input
                    id="seedPhrase"
                    type="text"
                    value={seedPhrase}
                    onChange={(e) => setSeedPhrase(e.target.value)}
                    placeholder="Enter 12-word seed phrase"
                  />
                </div>
                <Button onClick={importMasterWalletFromSeed} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Import from Seed
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Master Wallet Operations */}
        {masterWalletInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Broadcast */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Broadcast to All Wallets
                </CardTitle>
                <CardDescription>
                  Send XRP from master wallet to all generated wallets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amountPerWallet">Amount per Wallet (XRP)</Label>
                  <Input
                    id="amountPerWallet"
                    type="number"
                    step="0.000001"
                    value={amountPerWallet}
                    onChange={(e) => setAmountPerWallet(e.target.value)}
                    placeholder="e.g., 1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="memoBroadcast">Memo (Optional)</Label>
                  <Input
                    id="memoBroadcast"
                    type="text"
                    value={memoBroadcast}
                    onChange={(e) => setMemoBroadcast(e.target.value)}
                    placeholder="Transaction memo"
                  />
                </div>
                <Button onClick={handleBroadcast} disabled={loading || selectedWallets.length === 0} className="w-full">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Broadcast to Selected Wallets ({selectedWallets.length})
                    </>
                  )}
                </Button>
                {broadcastResults && (
                  <div className="mt-4 p-3 border rounded-md bg-gray-50">
                    <h4 className="font-medium mb-2">Broadcast Results:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(broadcastResults).map(([address, txHash]) => (
                        <div key={address} className="flex justify-between items-center text-sm">
                          <span className="font-mono">{address.substring(0, 8)}...</span>
                          {txHash ? (
                            <a
                              href={`https://xrpscan.com/tx/${txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              View Tx
                            </a>
                          ) : (
                            <span className="text-red-500">Failed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Collect */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Collect from All Wallets
                </CardTitle>
                <CardDescription>
                  Collect XRP from all generated wallets to master wallet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="password">Wallet Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter wallet encryption password"
                  />
                </div>
                <div>
                  <Label htmlFor="memoCollect">Memo (Optional)</Label>
                  <Input
                    id="memoCollect"
                    type="text"
                    value={memoCollect}
                    onChange={(e) => setMemoCollect(e.target.value)}
                    placeholder="Transaction memo"
                  />
                </div>
                <Button onClick={handleCollect} disabled={loading || selectedWallets.length === 0} className="w-full">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Collecting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Collect from Selected Wallets ({selectedWallets.length})
                    </>
                  )}
                </Button>
                {collectResults && (
                  <div className="mt-4 p-3 border rounded-md bg-gray-50">
                    <h4 className="font-medium mb-2">Collection Results:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(collectResults).map(([address, txHash]) => (
                        <div key={address} className="flex justify-between items-center text-sm">
                          <span className="font-mono">{address.substring(0, 8)}...</span>
                          {txHash ? (
                            <a
                              href={`https://xrpscan.com/tx/${txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              View Tx
                            </a>
                          ) : (
                            <span className="text-red-500">Failed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Wallet Selection */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Select Wallets for Operations</CardTitle>
            <CardDescription>Choose which wallets to include in broadcast and collect operations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Button onClick={() => setSelectedWallets(wallets.map(w => w.address))} variant="outline" size="sm" className="mr-2">Select All</Button>
              <Button onClick={() => setSelectedWallets([])} variant="outline" size="sm">Deselect All</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      XRP Balance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      LAWAS Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {wallets.map((wallet) => (
                    <tr key={wallet.address}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Checkbox
                          checked={selectedWallets.includes(wallet.address)}
                          onCheckedChange={(isChecked: boolean) => handleWalletSelection(wallet.address, isChecked)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {wallet.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {wallet.xrp_balance ? parseFloat(wallet.xrp_balance).toFixed(2) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {wallet.lawas_balance ? parseFloat(wallet.lawas_balance).toFixed(2) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

