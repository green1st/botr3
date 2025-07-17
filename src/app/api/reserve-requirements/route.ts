import { NextRequest, NextResponse } from 'next/server';
import { TrustlineManager } from '@/lib/trustline-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const numTrustlines = parseInt(searchParams.get('num_trustlines') || '0');

    const trustlineManager = new TrustlineManager();
    const result = trustlineManager.getReserveRequirements(numTrustlines);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting reserve requirements:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

