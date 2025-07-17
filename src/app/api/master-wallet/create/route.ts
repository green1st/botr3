import { NextResponse } from 'next/server';
import { MasterWalletManager } from '@/lib/master-wallet';

export async function POST() {
  try {
    const masterWalletManager = new MasterWalletManager();
    const result = await masterWalletManager.createMasterWallet();
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating master wallet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

