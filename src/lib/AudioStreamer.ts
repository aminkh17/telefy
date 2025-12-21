import { TelegramClient } from "telegram";
import { Api } from "telegram";
import { getFullTrack, saveFullTrack } from "./db";
import bigInt from "big-integer";

export class AudioStreamer {
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private queue: BufferSource[] = [];
  private isAppending = false;
  private abortController: AbortController | null = null;
  private mimeType = 'audio/mpeg';
  private onProgress?: (progress: number) => void;
  private syncInterval: NodeJS.Timeout | null = null;
  private isDownloadComplete = false;

  constructor(private audioElement: HTMLAudioElement, onProgress?: (progress: number) => void) {
      this.onProgress = onProgress;
  }

  cleanup() {
    this.isDownloadComplete = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
        try {
            this.mediaSource.endOfStream();
        } catch (e) {
            // ignore
        }
    }
    if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
    }
    // Revoke object URL to free memory
    if (this.audioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioElement.src);
    }
    this.audioElement.removeAttribute('src');
    this.audioElement.load();
    this.sourceBuffer = null;
    this.mediaSource = null;
    this.queue = [];
    this.isAppending = false;
  }

  async play(client: TelegramClient, track: any, message: Api.Message) {
    this.cleanup();
    console.log(`Starting playback for: ${track.title}`);
    
    // Start Sync Check
    this.startSyncCheck();

    // 1. Check offline DB
    try {
        const cached = await getFullTrack(track.id);
        if (cached) {
          console.log("Playing from cache");
          this.audioElement.src = URL.createObjectURL(cached.blob);
          this.audioElement.play();
          if (this.onProgress) this.onProgress(100);
          return;
        }
    } catch (e) {
        console.error("Cache read error", e);
    }

    // 2. Setup Streaming
    this.mimeType = track.mimeType || 'audio/mpeg';
    // Firefox/Chrome usually support 'audio/mpeg' for MP3s via MSE.
    // If not supported, we might need to fallback to full download.
    if (!MediaSource.isTypeSupported(this.mimeType)) {
        console.warn(`MIME type ${this.mimeType} not supported for MSE. Falling back to full download.`);
        await this.fallbackDownloadAndPlay(client, track, message);
        return;
    }

    this.mediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(this.mediaSource);
    this.audioElement.src = objectUrl;

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.mediaSource.addEventListener('sourceopen', async () => {
        if (!this.mediaSource) return;
        
        try {
             this.sourceBuffer = this.mediaSource.addSourceBuffer(this.mimeType);
             this.sourceBuffer.addEventListener('updateend', () => {
                 this.isAppending = false;
                 this.processQueue();
             });
             this.sourceBuffer.addEventListener('error', (e) => {
                 console.error("SourceBuffer error", e);
                 this.isAppending = false;
             });
             
             // Start playing immediately (will buffer)
             this.audioElement.play().catch(e => {
                 // Ignore new load request interruptions
                 if (e.name !== 'AbortError') {
                     console.error("Play error:", e);
                 }
             });
             
             await this.streamDownload(client, track, message, signal);
        } catch (e) {
             console.error("SourceOpen error", e);
             // Fallback if addSourceBuffer fails
             this.fallbackDownloadAndPlay(client, track, message);
        }
    }, { once: true });
  }

  private startSyncCheck() {
      if (this.syncInterval) clearInterval(this.syncInterval);
      
      this.syncInterval = setInterval(() => {
          if (!this.audioElement || this.audioElement.paused) return;
          
          // Monitor buffer health
          if (this.audioElement.readyState >= 2) {
             // We can check buffered ranges vs currentTime
             // const buffered = this.audioElement.buffered;
             // Logic to check if we are close to stalling could go here
          }
      }, 1000);
  }

  private async streamDownload(client: TelegramClient, track: any, message: Api.Message, signal: AbortSignal) {
      const chunks: Buffer[] = [];
      let totalDownloaded = 0;
      const totalSize = message.document instanceof Api.Document ? message.document.size.toJSNumber() : 0;
      
      try {
          console.log("Starting streaming download...");
          // Chunk size: 64KB - 128KB is usually good for streaming
          // GramJS requestSize default is decent.
          for await (const chunk of client.iterDownload({ file: message.media, requestSize: 128 * 1024 })) {
              if (signal.aborted) return;
              
              const buffer = chunk as Buffer;
              console.log(`Chunk received: ${buffer.length} bytes`);
              
              // Append to MSE
              // buffer is Uint8Array (Buffer), which is a valid BufferSource
              // Using Uint8Array constructor to ensure type compatibility
              this.enqueueChunk(new Uint8Array(buffer));
              
              // Save for cache
              chunks.push(buffer);
              totalDownloaded += buffer.length;
              
              if (this.onProgress && totalSize > 0) {
                  this.onProgress((totalDownloaded / totalSize) * 100);
              }
          }

          if (signal.aborted) return;
          console.log("Download complete.");
          this.isDownloadComplete = true;

          // Finished
          // Try to close stream if we are not busy
          this.processQueue();

          // Save to DB
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fullBlob = new Blob(chunks as any, { type: this.mimeType });
          saveFullTrack(track, fullBlob).catch(e => console.error("Failed to save to cache", e));

      } catch (e) {
          console.error("Streaming error", e);
          if (signal.aborted) return;
          // Handle network error?
      }
  }

  private enqueueChunk(data: BufferSource) {
      this.queue.push(data);
      this.processQueue();
  }

  private processQueue() {
      if (!this.sourceBuffer || this.isAppending) return;
      
      if (this.queue.length > 0) {
          this.isAppending = true;
          const chunk = this.queue.shift();
          
          try {
              if (chunk) {
                this.sourceBuffer.appendBuffer(chunk);
              }
          } catch (e) {
              console.error("SourceBuffer append error", e);
              this.isAppending = false;
          }
      } else {
          // Queue empty.
          if (this.isDownloadComplete && this.mediaSource && this.mediaSource.readyState === 'open') {
               try {
                   console.log("Ending MediaSource stream");
                   this.mediaSource.endOfStream();
               } catch(e) { console.error("endOfStream error", e); }
          }
      }
  }

  private async fallbackDownloadAndPlay(client: TelegramClient, track: any, message: Api.Message) {
      // Old behavior: download all then play
      try {
          const buffer = await client.downloadMedia(message, {});
           if (buffer && buffer.length > 0) {
              const blob = new Blob([buffer as any], { type: this.mimeType });
              this.audioElement.src = URL.createObjectURL(blob);
              this.audioElement.play();
              saveFullTrack(track, blob).catch(console.error);
           }
      } catch (e) {
          console.error("Fallback download failed", e);
      }
  }
}
