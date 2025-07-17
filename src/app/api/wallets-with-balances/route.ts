import { NextResponse } from 'next/server';
import { WalletManager } from '@/lib/wallet-manager';

export async function GET() {
  try {
    const walletManager = new WalletManager();
    const wallets = await walletManager.getAllWalletsWithBalances();
    
    return NextResponse.json({ wallets });
  } catch (error) {
    console.error('Error fetching wallets with balances:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

