import { NextRequest, NextResponse } from 'next/server';
import { MasterWalletManager } from '@/lib/master-wallet';

export async function POST(request: NextRequest) {
  try {
    const { wallet_addresses, amount_per_wallet, memo } = await request.json();

    if (!wallet_addresses || wallet_addresses.length === 0) {
      return NextResponse.json(
        { error: 'No wallet addresses provided' },
        { status: 400 }
      );
    }

    if (!amount_per_wallet) {
      return NextResponse.json(
        { error: 'Amount per wallet is required' },
        { status: 400 }
      );
    }

    const masterWalletManager = new MasterWalletManager();
    const result = await masterWalletManager.broadcastToWallets(
      wallet_addresses,
      amount_per_wallet,
      memo || ''
    );
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error broadcasting to wallets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

