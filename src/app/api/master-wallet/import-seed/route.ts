import { NextRequest, NextResponse } from 'next/server';
import { MasterWalletManager } from '@/lib/master-wallet';

export async function POST(request: NextRequest) {
  try {
    const { seed } = await request.json();

    if (!seed) {
      return NextResponse.json(
        { error: 'Seed is required' },
        { status: 400 }
      );
    }

    const masterWalletManager = new MasterWalletManager();
    const result = await masterWalletManager.importMasterWalletFromSeed(seed);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error importing master wallet from seed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

