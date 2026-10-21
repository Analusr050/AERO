// Desenvolver rota GET `/api/
// webhook` para validação do
// Token de Verificação da Meta

import { NextResponse } from 'next/server';
import { enviarMensagemWhatsApp } from '@/services/whatsapp';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Proibido', { status: 403 });
} 
