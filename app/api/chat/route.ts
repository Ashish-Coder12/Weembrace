// app/api/chat/route.ts
// Chat endpoint that connects the frontend to the Agentic AI Engine

import { NextResponse } from 'next/server';
import { runAssetAgent, ChatMessage } from '@/lib/agent';
import { getAllAssets } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = body.messages || [];
    const customApiKey: string | undefined = body.apiKey;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Run the autonomous agent loop
    const agentResult = await runAssetAgent(messages, customApiKey);

    // Fetch refreshed asset list in case tools (add/transfer) modified state
    const assets = getAllAssets();

    return NextResponse.json({
      reply: agentResult.reply,
      toolCalls: agentResult.toolCalls,
      mode: agentResult.mode,
      assets: assets
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal agent error' },
      { status: 500 }
    );
  }
}
