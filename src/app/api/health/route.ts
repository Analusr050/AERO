// Configurar servidor básico
// Next.js com rota de healthcheck
// `/api/health` e Biome Linter

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'AERO API operacional' }, { status: 200 });
}