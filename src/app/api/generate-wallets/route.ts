import { NextRequest, NextResponse } from 'next/server';
import { WalletManager } from '@/lib/wallet-manager';

export async function POST(request: NextRequest) {
  try {
    const { num_wallets, password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (num_wallets > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 wallets allowed' },
        { status: 400 }
      );
    }

    const walletManager = new WalletManager();
    const wallets = await walletManager.generateAndStoreWallets(num_wallets, password);
    
    return NextResponse.json({
      message: `Generated ${wallets.length} wallets successfully`,
      wallets: wallets
    });
  } catch (error) {
    console.error('Error generating wallets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

