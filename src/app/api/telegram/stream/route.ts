import { NextRequest, NextResponse } from "next/server";
import { getTelegramClient } from "@/lib/telegram-client";
import { Api } from "telegram";
import bigInt from "big-integer";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get("chatId");
    const messageId = searchParams.get("messageId");
    const accessHash = searchParams.get("accessHash");
    const chatType = searchParams.get("chatType");
    
    if (!chatId || !messageId) return new NextResponse("Missing params", { status: 400 });

    const client = await getTelegramClient();
    
    try {
        let inputPeer;
        const cleanId = (chatType === 'channel' && chatId.startsWith('-100')) 
            ? chatId.substring(4) 
            : chatId;
        const peerId = bigInt(cleanId);
        const hash = accessHash ? bigInt(accessHash) : bigInt(0);
        
        if (chatType === 'user') {
            inputPeer = new Api.InputPeerUser({ userId: peerId, accessHash: hash });
        } else if (chatType === 'channel') {
            inputPeer = new Api.InputPeerChannel({ channelId: peerId, accessHash: hash });
        } else {
            inputPeer = new Api.InputPeerChat({ chatId: peerId });
        }

        const msgs = await client.getMessages(inputPeer, { ids: [Number(messageId)] });
        if (!msgs || msgs.length === 0) {
             return new NextResponse("Not found", { status: 404 });
        }
        
        const msg = msgs[0];
        if (!msg.media || !(msg.media instanceof Api.MessageMediaDocument)) {
            return new NextResponse("Not a media message", { status: 400 });
        }

        const mimeType = msg.media.document instanceof Api.Document ? msg.media.document.mimeType : 'audio/mpeg';
        const size = msg.media.document instanceof Api.Document ? msg.media.document.size : 0;

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // @ts-ignore
                    for await (const chunk of client.iterDownload({ file: msg.media, requestSize: 128 * 1024 })) {
                        controller.enqueue(new Uint8Array(chunk));
                    }
                    controller.close();
                } catch (e) {
                    controller.error(e);
                } 
                // Do not disconnect client
            },
            cancel() {
                // Client stays alive
            }
        });
        
        return new NextResponse(stream, {
            headers: { 
                "Content-Type": mimeType || 'audio/mpeg',
                "Content-Length": size.toString(),
            }
        });

    } catch (e) {
        console.error("Stream error", e);
        return new NextResponse("Error", { status: 500 });
    }
}
