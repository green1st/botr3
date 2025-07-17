import { NextResponse } from 'next/server';
import { TrustlineManager } from '@/lib/trustline-manager';
import { WalletManager } from '@/lib/wallet-manager';

export async function GET() {
  try {
    const walletManager = new WalletManager();
    const wallets = await walletManager.getAllWallets();
    
    const walletAddresses = wallets.map(wallet => wallet.address);
    
    const trustlineManager = new TrustlineManager();
    const result = await trustlineManager.getAllWalletsTrustlines(walletAddresses);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting all trustlines:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

