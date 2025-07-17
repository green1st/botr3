import { NextResponse } from 'next/server';
import { WalletManager } from '@/lib/wallet-manager';

export async function GET() {
  try {
    const walletManager = new WalletManager();
    const wallets = await walletManager.getAllWallets();
    
    return NextResponse.json({ wallets });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

