
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Eye, AlertCircle, Wallet, Send, ArrowUpDown, RefreshCw } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface Trustline {
  account: string
  balance: string
  currency: string
  limit: string
  limit_peer: string
  quality_in: number
  quality_out: number
}

interface WalletTrustlines {
  wallet_address: string
  trustlines: Trustline[]
}

export default function TrustlinesPage() {
  const [wallets, setWallets] = useState<any[]>([])
  const [selectedWallets, setSelectedWallets] = useState<string[]>([])
  const [allTrustlines, setAllTrustlines] = useState<WalletTrustlines[]>([])
  const [loading, setLoading] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  
  // Form states for creating trustlines
  const [issuer, setIssuer] = useState("rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC")
  const [currency, setCurrency] = useState("LAWAS")
  const [limit, setLimit] = useState('1000000')
  const [password, setPassword] = useState('')

  useEffect(() => {
    fetchWallets()
  }, [])

  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets-with-balances') // Use wallets-with-balances to get all wallets
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

  const createTrustlinesForSelected = async () => {
    if (!password) {
      toast.error("Please fill in the wallet password")
      return
    }

    if (selectedWallets.length === 0) {
      toast.error('Please select at least one wallet to create trustlines')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/trustlines/create-batch', { // Assuming a new batch API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_addresses: selectedWallets,
          issuer: issuer,
          currency: currency,
          limit: limit,
          password: password
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        if (data.success) {
          toast.success(data.message)
          // Reset form (optional)
          setIssuer("rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC") // Reset to default
          setCurrency("LAWAS") // Reset to default
          setLimit('1000000')
          setPassword('')
        } else {
          // If response.ok is true but data.success is false, display data.message or data.error
          toast.error(data.message || data.error || 'Failed to create trustlines')
        }
      } else {
        // If response.ok is false, display data.error or a generic message
        toast.error(data.error || data.message || 'Failed to create trustlines')
      }
    } catch (error: any) {
      toast.error(`Failed to create trustlines: ${error.message || JSON.stringify(error)}`)
    } finally {
      setLoading(false)
    }
  }

  const viewAllTrustlines = async () => {
    setViewLoading(true)
    try {
      const response = await fetch('/api/trustlines/view-all')
      const data = await response.json()
      
      if (response.ok) {
        if (data.success) {
          setAllTrustlines(data.wallets_trustlines || [])
          toast.success('Trustlines loaded successfully')
        } else {
          toast.error(data.error || 'Failed to load trustlines')
        }
      } else {
        toast.error(data.error || 'Failed to load trustlines')
      }
    } catch (error) {
      toast.error('Failed to load trustlines')
    } finally {
      setViewLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Plus className="h-10 w-10 text-blue-600" />
            R3STORE Trustline Management
          </h1>
          <p className="text-gray-600">Set up trustlines to enable token transactions on your wallets.</p>
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
              <a href="/master-wallet">
                <Send className="h-4 w-4 mr-2" />
                Master Wallet
              </a>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Trustlines</TabsTrigger>
            <TabsTrigger value="view">View Trustlines</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Selected Wallets Trustline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create Trustlines for Selected Wallets
                  </CardTitle>
                  <CardDescription>
                    Set up the same trustline for your selected wallets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Batch Operation</p>
                        <p>This will create the trustline for all selected wallets.</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="issuerAll">Issuer Address</Label>
                    <Input
                      id="issuerAll"
                      type="text"
                      value={issuer}
                      onChange={(e) => setIssuer(e.target.value)}
                      placeholder="e.g., rfAWYnEAkQGAhbESWAMdNccWJvdcrgugMC"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label htmlFor="currencyAll">Currency Code</Label>
                    <Input
                      id="currencyAll"
                      type="text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      placeholder="e.g., LAWAS"
                      readOnly
                    />
                  </div>
                  <div>
                    <Label htmlFor="limitAll">Trust Limit</Label>
                    <Input
                      id="limitAll"
                      type="number"
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                      placeholder="1000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="passwordAll">Wallet Password</Label>
                    <Input
                      id="passwordAll"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter wallet encryption password"
                    />
                  </div>
                  <Button onClick={createTrustlinesForSelected} disabled={loading || selectedWallets.length === 0} className="w-full">
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Trustlines for Selected Wallets
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="view" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    View All Trustlines
                  </span>
                  <Button onClick={viewAllTrustlines} disabled={viewLoading} variant="outline">
                    {viewLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>
                  View all trustlines across your wallets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allTrustlines.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No trustlines found. Click "Refresh" to load trustlines or create some first.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allTrustlines.map((walletTrustlines, index) => (
                      <Card key={walletTrustlines.wallet_address} className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>Wallet {index + 1}</span>
                            <Badge variant="outline">
                              {walletTrustlines.trustlines.length} trustlines
                            </Badge>
                          </CardTitle>
                          <p className="text-sm text-gray-500 font-mono">
                            {walletTrustlines.wallet_address}
                          </p>
                        </CardHeader>
                        <CardContent>
                          {walletTrustlines.trustlines.length === 0 ? (
                            <p className="text-sm text-gray-500">No trustlines found for this wallet.</p>
                          ) : (
                            <div className="space-y-2">
                              {walletTrustlines.trustlines.map((trustline, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                  <div>
                                    <Badge variant="outline" className="mr-2">
                                      {trustline.currency}
                                    </Badge>
                                    <span className="text-sm text-gray-600">
                                      Issuer: {trustline.account.substring(0, 8)}...
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium">
                                      Balance: {trustline.balance}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Limit: {trustline.limit}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Wallet List with Checkboxes */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Wallets</CardTitle>
            <CardDescription>Select wallets for batch operations.</CardDescription>
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



