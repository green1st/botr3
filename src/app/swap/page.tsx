
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowUpDown, Wallet, Plus, Send, RefreshCw, Banknote, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'

interface Token {
  currency: string
  issuer: string | null
  name: string
}

export default function SwapPage() {
  const [wallets, setWallets] = useState<any[]>([])
  const [selectedWallets, setSelectedWallets] = useState<string[]>([])
  const [password, setPassword] = useState('')

  // Swap states
  const [sourceToken, setSourceToken] = useState('')
  const [destinationToken, setDestinationToken] = useState('')
  const [amountToSwap, setAmountToSwap] = useState('')
  const [supportedTokens, setSupportedTokens] = useState<Token[]>([])
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [loadingSwap, setLoadingSwap] = useState(false)
  const [swapResults, setSwapResults] = useState<any>(null)

  // AMM Deposit states
  const [depositWalletAddress, setDepositWalletAddress] = useState('')
  const [depositAmountLawas, setDepositAmountLawas] = useState('')
  const [depositAmountXRP, setDepositAmountXRP] = useState('')
  const [depositPassword, setDepositPassword] = useState('')
  const [loadingDeposit, setLoadingDeposit] = useState(false)
  const [depositResults, setDepositResults] = useState<any>(null)
  const [depositOption, setDepositOption] = useState('both') // 'both', 'lawas', 'xrp'

  // Set Trustline LP states
  const [lpTrustlinePassword, setLpTrustlinePassword] = useState('')
  const [loadingLpTrustline, setLoadingLpTrustline] = useState(false)
  const [lpTrustlineResults, setLpTrustlineResults] = useState<any>(null)

  useEffect(() => {
    fetchWallets()
    fetchSupportedTokens()
  }, [])

  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets-with-balances')
      if (response.ok) {
        const data = await response.json()
        setWallets(data.wallets || [])
        setSelectedWallets(data.wallets.map((w: any) => w.address)) // Select all by default
        if (data.wallets.length > 0) {
          setDepositWalletAddress(data.wallets[0].address) // Set default deposit wallet
        }
      }
    } catch (error) {
      console.error('Error fetching wallets:', error)
    }
  }

  const fetchSupportedTokens = async () => {
    try {
      const response = await fetch('/api/swap/supported-tokens')
      if (response.ok) {
        const data = await response.json()
        setSupportedTokens(data.tokens || [])
      }
    } catch (error) {
      console.error('Error fetching supported tokens:', error)
    }
  }

  const getExchangeRate = async () => {
    if (!sourceToken || !destinationToken || !amountToSwap) return

    try {
      const sourceTokenData = supportedTokens.find(t => t.currency === sourceToken)
      const destTokenData = supportedTokens.find(t => t.currency === destinationToken)

      const response = await fetch('/api/swap/exchange-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_currency: sourceToken,
          source_issuer: sourceTokenData?.issuer,
          destination_currency: destinationToken,
          destination_issuer: destTokenData?.issuer,
          amount: amountToSwap
        })
      })

      if (response.ok) {
        const data = await response.json()
        setExchangeRate(data.rate)
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to get exchange rate');
        setExchangeRate(null);
      }
    } catch (error) {
      console.error('Error getting exchange rate:', error)
      toast.error('Failed to connect to backend for exchange rate');
      setExchangeRate(null);
    }
  }

  useEffect(() => {
    getExchangeRate()
  }, [sourceToken, destinationToken, amountToSwap])

  const handleWalletSelection = (address: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedWallets(prev => [...prev, address])
    } else {
      setSelectedWallets(prev => prev.filter(walletAddress => walletAddress !== address))
    }
  }

  const handleSwap = async () => {
    if (!sourceToken || !destinationToken || !amountToSwap || !password) {
      toast.error('Please fill in all required fields')
      return
    }

    if (selectedWallets.length === 0) {
      toast.error('Please select at least one wallet')
      return
    }

    setLoadingSwap(true)
    try {
      const sourceTokenData = supportedTokens.find(t => t.currency === sourceToken)
      const destTokenData = supportedTokens.find(t => t.currency === destinationToken)

      const response = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_addresses: selectedWallets,
          destination_account: selectedWallets[0], // Use first selected wallet as destination for demo
          source_currency: sourceToken,
          source_issuer: sourceTokenData?.issuer,
          destination_currency: destinationToken,
          destination_issuer: destTokenData?.issuer,
          destination_amount: amountToSwap,
          password: password
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message)
        setSwapResults(data.results)
        fetchWallets() // Refresh wallet balances after successful swap
      } else {
        toast.error(data.error || 'Failed to execute swap')
      }
    } catch (error) {
      toast.error('Failed to execute swap')
    } finally {
      setLoadingSwap(false)
    }
  }

  const handleAmmDeposit = async () => {
    if (!depositWalletAddress || !depositPassword) {
      toast.error('Please select a wallet and enter password')
      return
    }

    let lawasAmount = null;
    let xrpAmount = null;

    if (depositOption === 'both' || depositOption === 'lawas') {
      if (!depositAmountLawas) {
        toast.error('Please enter LAWAS amount')
        return
      }
      lawasAmount = parseFloat(depositAmountLawas);
    }

    if (depositOption === 'both' || depositOption === 'xrp') {
      if (!depositAmountXRP) {
        toast.error('Please enter XRP amount')
        return
      }
      xrpAmount = parseFloat(depositAmountXRP);
    }

    if (!lawasAmount && !xrpAmount) {
      toast.error('Please enter at least one amount to deposit')
      return
    }

    setLoadingDeposit(true)
    try {
      const response = await fetch('/api/amm/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: depositWalletAddress,
          amountLawas: lawasAmount,
          amountXRP: xrpAmount,
          password: depositPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('AMM Deposit successful!')
        setDepositResults(data)
        fetchWallets() // Refresh wallet balances after successful deposit
      } else {
        toast.error(data.error || 'Failed to deposit to AMM pool')
      }
    } catch (error) {
      console.error('Error depositing to AMM pool:', error)
      toast.error('Failed to connect to backend for AMM deposit')
    } finally {
      setLoadingDeposit(false)
    }
  }

  const handleBatchAmmDeposit = async () => {
    if (!depositPassword) {
      toast.error("Please enter wallet password");
      return;
    }

    if (selectedWallets.length === 0) {
      toast.error('Please select at least one wallet for batch deposit')
      return
    }

    let lawasAmount = null;
    let xrpAmount = null;

    if (depositOption === 'both' || depositOption === 'lawas') {
      if (!depositAmountLawas) {
        toast.error('Please enter LAWAS amount');
        return;
      }
      lawasAmount = parseFloat(depositAmountLawas);
    }

    if (depositOption === 'both' || depositOption === 'xrp') {
      if (!depositAmountXRP) {
        toast.error('Please enter XRP amount');
        return;
      }
      xrpAmount = parseFloat(depositAmountXRP);
    }

    if (!lawasAmount && !xrpAmount) {
      toast.error('Please enter at least one amount to deposit');
      return;
    }

    setLoadingDeposit(true);
    try {
      const response = await fetch('/api/amm/deposit-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_addresses: selectedWallets, // Send selected wallets
          password: depositPassword,
          amountLawas: lawasAmount,
          amountXRP: xrpAmount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setDepositResults(data);
        fetchWallets(); // Refresh wallet balances after successful deposit
      } else {
        toast.error(data.error || 'Failed to execute batch AMM deposit');
      }
    } catch (error) {
      console.error('Error executing batch AMM deposit:', error);
      toast.error('Failed to connect to backend for batch AMM deposit');
    } finally {
      setLoadingDeposit(false);
    }
  };

  const handleSetLpTrustline = async () => {
    if (!lpTrustlinePassword) {
      toast.error('Please enter wallet password');
      return;
    }

    if (selectedWallets.length === 0) {
      toast.error('Please select at least one wallet to set LP trustline')
      return
    }

    setLoadingLpTrustline(true);
    try {
      const response = await fetch('/api/amm/set-lp-trustline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_addresses: selectedWallets, // Send selected wallets
          password: lpTrustlinePassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setLpTrustlineResults(data);
        fetchWallets(); // Refresh wallet balances after successful trustline setting
      } else {
        toast.error(data.error || 'Failed to set LP trustlines');
      }
    } catch (error) {
      console.error('Error setting LP trustlines:', error);
      toast.error('Failed to connect to backend for LP trustline setting');
    } finally {
      setLoadingLpTrustline(false);
    }
  };

  const handleSetLawasTrustline = async () => {
    if (!password) {
      toast.error('Please enter wallet password');
      return;
    }

    if (selectedWallets.length === 0) {
      toast.error('Please select at least one wallet to set LAWAS trustline');
      return;
    }

    setLoadingLpTrustline(true); // Reusing for LAWAS trustline for now
    try {
      const response = await fetch('/api/trustline/set-lawas-trustline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_addresses: selectedWallets,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // setLpTrustlineResults(data); // Consider a separate state for LAWAS trustline results
        fetchWallets(); // Refresh wallet balances after successful trustline setting
      } else {
        toast.error(data.error || 'Failed to set LAWAS trustlines');
      }
    } catch (error) {
      console.error('Error setting LAWAS trustlines:', error);
      toast.error('Failed to connect to backend for LAWAS trustline setting');
    } finally {
      setLoadingLpTrustline(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <ArrowUpDown className="h-10 w-10 text-blue-600" />
            R3STORE Auto-Swap & AMM
          </h1>
          <p className="text-gray-600">Automate token operations across your wallets.</p>
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

        <Tabs defaultValue="swap" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="swap">Auto-Swap</TabsTrigger>
            <TabsTrigger value="amm-deposit">AMM Deposit (Single)</TabsTrigger>
            <TabsTrigger value="amm-deposit-batch">AMM Deposit (Batch)</TabsTrigger>
            <TabsTrigger value="set-lp-trustline">Set Trustline LP</TabsTrigger>
          </TabsList>

          {/* TAB CONTENT UNTUK SWAP */}
          <TabsContent value="swap">
            {/* Swap Configuration */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpDown className="h-5 w-5" />
                  Configure Auto-Swap
                </CardTitle>
                <CardDescription>
                  Set up automatic token swapping for selected wallets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sourceToken">Source Token</Label>
                    <select
                      id="sourceToken"
                      value={sourceToken}
                      onChange={(e) => setSourceToken(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select source token</option>
                      {supportedTokens.map((token) => (
                        <option key={token.currency} value={token.currency}>
                          {token.name} ({token.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="destinationToken">Destination Token</Label>
                    <select
                      id="destinationToken"
                      value={destinationToken}
                      onChange={(e) => setDestinationToken(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select destination token</option>
                      {supportedTokens.map((token) => (
                        <option key={token.currency} value={token.currency}>
                          {token.name} ({token.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="amountToSwap">Amount to Swap</Label>
                  <Input
                    id="amountToSwap"
                    type="number"
                    step="0.000001"
                    value={amountToSwap}
                    onChange={(e) => setAmountToSwap(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
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
                {exchangeRate !== null && (
                  <p className="text-sm text-gray-600">
                    Estimated Rate: 1 {sourceToken} = {exchangeRate?.toFixed(6)} {destinationToken}
                  </p>
                )}
                <Button 
                  onClick={handleSwap} 
                  disabled={loadingSwap || !sourceToken || !destinationToken || !amountToSwap || !password || selectedWallets.length === 0}
                  className="w-full"
                >
                  {loadingSwap ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Swapping...
                    </>
                  ) : (
                    <>
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Execute Auto-Swap for Selected Wallets
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Swap Results */}
            {swapResults && (
              <Card>
                <CardHeader>
                  <CardTitle>R3STORE Swap Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(swapResults).map(([address, txHash]) => (
                      <div key={address} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <p className="font-mono text-sm">{address}</p>
                        {txHash ? (
                          <a 
                            href={`https://xrpscan.com/tx/${txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-500 hover:underline text-sm"
                          >
                            View Transaction
                          </a>
                        ) : (
                          <p className="text-red-500 text-sm">Failed</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB CONTENT UNTUK AMM DEPOSIT (SINGLE) */}
          <TabsContent value="amm-deposit">
            {/* AMM Deposit Configuration */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Configure AMM Deposit
                </CardTitle>
                <CardDescription>
                  Deposit tokens into the LAWAS/XRP AMM Pool for a single wallet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="depositWalletAddress">Wallet Address</Label>
                  <select
                    id="depositWalletAddress"
                    value={depositWalletAddress}
                    onChange={(e) => setDepositWalletAddress(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.address} value={wallet.address}>
                        {wallet.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant={depositOption === 'both' ? 'default' : 'outline'}
                    onClick={() => setDepositOption('both')}
                    className="flex-1"
                  >
                    LAWAS & XRP
                  </Button>
                  <Button 
                    variant={depositOption === 'lawas' ? 'default' : 'outline'}
                    onClick={() => setDepositOption('lawas')}
                    className="flex-1"
                  >
                    LAWAS Only
                  </Button>
                  <Button 
                    variant={depositOption === 'xrp' ? 'default' : 'outline'}
                    onClick={() => setDepositOption('xrp')}
                    className="flex-1"
                  >
                    XRP Only
                  </Button>
                </div>

                {(depositOption === 'both' || depositOption === 'lawas') && (
                  <div>
                    <Label htmlFor="depositAmountLawas">Amount LAWAS</Label>
                    <Input
                      id="depositAmountLawas"
                      type="number"
                      step="0.000001"
                      value={depositAmountLawas}
                      onChange={(e) => setDepositAmountLawas(e.target.value)}
                      placeholder="Enter LAWAS amount"
                    />
                  </div>
                )}

                {(depositOption === 'both' || depositOption === 'xrp') && (
                  <div>
                    <Label htmlFor="depositAmountXRP">Amount XRP</Label>
                    <Input
                      id="depositAmountXRP"
                      type="number"
                      step="0.000001"
                      value={depositAmountXRP}
                      onChange={(e) => setDepositAmountXRP(e.target.value)}
                      placeholder="Enter XRP amount"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="depositPassword">Wallet Password</Label>
                  <Input
                    id="depositPassword"
                    type="password"
                    value={depositPassword}
                    onChange={(e) => setDepositPassword(e.target.value)}
                    placeholder="Enter wallet encryption password"
                  />
                </div>

                <Button 
                  onClick={handleAmmDeposit} 
                  disabled={loadingDeposit || !depositWalletAddress || !depositPassword || ((depositOption === 'both' || depositOption === 'lawas') && !depositAmountLawas) || ((depositOption === 'both' || depositOption === 'xrp') && !depositAmountXRP)}
                  className="w-full"
                >
                  {loadingDeposit ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Depositing...
                    </>
                  ) : (
                    <>
                      <Banknote className="h-4 w-4 mr-2" />
                      Confirm Deposit
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Deposit Results */}
            {depositResults && (
              <Card>
                <CardHeader>
                  <CardTitle>AMM Deposit Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(depositResults, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB CONTENT UNTUK AMM DEPOSIT (BATCH) */}
          <TabsContent value="amm-deposit-batch">
            {/* AMM Deposit Batch Configuration */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Configure AMM Deposit (Batch)
                </CardTitle>
                <CardDescription>
                  Deposit tokens into the LAWAS/XRP AMM Pool for selected wallets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Button 
                    variant={depositOption === 'both' ? 'default' : 'outline'}
                    onClick={() => setDepositOption('both')}
                    className="flex-1"
                  >
                    LAWAS & XRP
                  </Button>
                  <Button 
                    variant={depositOption === 'lawas' ? 'default' : 'outline'}
                    onClick={() => setDepositOption('lawas')}
                    className="flex-1"
                  >
                    LAWAS Only
                  </Button>
                  <Button 
                    variant={depositOption === 'xrp' ? 'default' : 'outline'}
                    onClick={() => setDepositOption('xrp')}
                    className="flex-1"
                  >
                    XRP Only
                  </Button>
                </div>

                {(depositOption === 'both' || depositOption === 'lawas') && (
                  <div>
                    <Label htmlFor="batchDepositAmountLawas">Amount LAWAS</Label>
                    <Input
                      id="batchDepositAmountLawas"
                      type="number"
                      step="0.000001"
                      value={depositAmountLawas}
                      onChange={(e) => setDepositAmountLawas(e.target.value)}
                      placeholder="Enter LAWAS amount"
                    />
                  </div>
                )}

                {(depositOption === 'both' || depositOption === 'xrp') && (
                  <div>
                    <Label htmlFor="batchDepositAmountXRP">Amount XRP</Label>
                    <Input
                      id="batchDepositAmountXRP"
                      type="number"
                      step="0.000001"
                      value={depositAmountXRP}
                      onChange={(e) => setDepositAmountXRP(e.target.value)}
                      placeholder="Enter XRP amount"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="batchDepositPassword">Wallet Password</Label>
                  <Input
                    id="batchDepositPassword"
                    type="password"
                    value={depositPassword}
                    onChange={(e) => setDepositPassword(e.target.value)}
                    placeholder="Enter wallet encryption password"
                  />
                </div>

                <Button 
                  onClick={handleBatchAmmDeposit} 
                  disabled={loadingDeposit || !depositPassword || ((depositOption === 'both' || depositOption === 'lawas') && !depositAmountLawas) || ((depositOption === 'both' || depositOption === 'xrp') && !depositAmountXRP) || selectedWallets.length === 0}
                  className="w-full"
                >
                  {loadingDeposit ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Depositing...
                    </>
                  ) : (
                    <>
                      <Banknote className="h-4 w-4 mr-2" />
                      Confirm Batch Deposit for Selected Wallets
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Batch Deposit Results */}
            {depositResults && (
              <Card>
                <CardHeader>
                  <CardTitle>AMM Batch Deposit Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(depositResults, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB CONTENT UNTUK SET TRUSTLINE LP */}
          <TabsContent value="set-lp-trustline">
            {/* Set LP Trustline Configuration */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Set Trustline LP (Batch)
                </CardTitle>
                <CardDescription>
                  Set trustlines for AMM LP tokens for selected wallets. This is required before depositing to AMM pools.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> You need to set LP trustlines before depositing to AMM pools. 
                    This allows your wallets to receive LP tokens as proof of your liquidity provision.
                  </p>
                </div>

                <div>
                  <Label htmlFor="lpTrustlinePassword">Wallet Password</Label>
                  <Input
                    id="lpTrustlinePassword"
                    type="password"
                    value={lpTrustlinePassword}
                    onChange={(e) => setLpTrustlinePassword(e.target.value)}
                    placeholder="Enter wallet encryption password"
                  />
                </div>

                <Button 
                  onClick={handleSetLpTrustline} 
                  disabled={loadingLpTrustline || !lpTrustlinePassword || selectedWallets.length === 0}
                  className="w-full"
                >
                  {loadingLpTrustline ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Setting Trustlines...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Set LP Trustlines for Selected Wallets
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* LP Trustline Results */}
            {lpTrustlineResults && (
              <Card>
                <CardHeader>
                  <CardTitle>LP Trustline Setting Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(lpTrustlineResults, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* NEW TAB CONTENT FOR LAWAS TRUSTLINE */}
          <TabsContent value="set-lawas-trustline">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Set LAWAS Trustline
                </CardTitle>
                <CardDescription>
                  Set trustline for LAWAS token for selected wallets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> You need to set LAWAS trustline to hold LAWAS tokens.
                  </p>
                </div>

                <div>
                  <Label htmlFor="lawasTrustlinePassword">Wallet Password</Label>
                  <Input
                    id="lawasTrustlinePassword"
                    type="password"
                    value={password} // Reusing main password state
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter wallet encryption password"
                  />
                </div>

                <Button 
                  onClick={() => handleSetLawasTrustline()} // Batch operation
                  disabled={loadingLpTrustline || !password || selectedWallets.length === 0}
                  className="w-full"
                >
                  {loadingLpTrustline ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Setting Trustlines...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Set LAWAS Trustlines for Selected Wallets
                    </>
                  )}
                </Button>
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
                    {/* Removed Actions column */}
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
                      {/* Removed single LAWAS trustline button */}
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



