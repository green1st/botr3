import { NextRequest, NextResponse } from 'next/server';
import { MasterWalletManager } from '@/lib/master-wallet';

export async function POST(request: NextRequest) {
  try {
    const { private_key } = await request.json();

    if (!private_key) {
      return NextResponse.json(
        { error: 'Private key is required' },
        { status: 400 }
      );
    }

    const masterWalletManager = new MasterWalletManager();
    const result = await masterWalletManager.setMasterWallet(private_key);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error setting master wallet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

