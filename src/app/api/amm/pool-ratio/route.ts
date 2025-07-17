import { NextResponse } from 'next/server';
import { AmmManager } from '../../../../lib/amm-manager';

const ammManager = new AmmManager();

export async function POST(request: Request) {
  try {
    const { asset1, asset2 } = await request.json();

    if (!asset1 || !asset2) {
      return NextResponse.json({ error: 'Missing required assets' }, { status: 400 });
    }

    const ratio = await ammManager.getAmmPoolRatio(asset1, asset2);

    if (!ratio) {
      return NextResponse.json({ error: 'Failed to get AMM pool ratio' }, { status: 500 });
    }

    return NextResponse.json(ratio);
  } catch (error: any) {
    console.error('Error in AMM pool ratio API:', error);
    return NextResponse.json({ error: error.message || 'Failed to get AMM pool ratio' }, { status: 500 });
  }
}


