import { NextResponse } from 'next/server';
import { MasterWalletManager } from '@/lib/master-wallet';

export async function GET() {
  try {
    const masterWalletManager = new MasterWalletManager();
    const info = await masterWalletManager.getMasterWalletInfo();
    
    if (info) {
      return NextResponse.json(info);
    } else {
      return NextResponse.json(
        { error: 'No master wallet found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error getting master wallet info:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

