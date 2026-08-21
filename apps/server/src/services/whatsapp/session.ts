import NodeCache from 'node-cache';
import { 
    makeWASocket,
    DisconnectReason, 
    useMultiFileAuthState, 
    WAMessage, 
    WASocket,
    Browsers
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import { logger } from '../../config/logger.js';
import { createAuthState } from './store.js';
import { handleIncomingMessage } from './messageHandler.js';
import { supabaseAdmin } from '../../config/supabase.js';

export type SessionStatus = 'INITIALIZING' | 'QR_READY' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED';

export class WhatsAppSession {
    public sessionId: string;
    public pharmacyId: string;
    public phoneNumber: string;
    public status: SessionStatus = 'INITIALIZING';
    public qrCode: string | null = null;
    public lastError: string | null = null;
    
    private socket: WASocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private msgRetryCounterCache = new NodeCache(); // REQUIRED for newer Baileys

    constructor(sessionId: string, pharmacyId: string, phoneNumber: string) {
        this.sessionId = sessionId;
        this.pharmacyId = pharmacyId;
        this.phoneNumber = phoneNumber;
    }

    public async connect(): Promise<void> {
        try {
            logger.info(`Starting connection for session ${this.sessionId}`);
            this.status = 'INITIALIZING';
            
            const { state, saveCreds } = await createAuthState(this.sessionId);

            this.socket = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                browser: Browsers.macOS('Desktop'),
                msgRetryCounterCache: this.msgRetryCounterCache,
                generateHighQualityLinkPreview: false, // Prevents hanging on link generation
                syncFullHistory: false, // Prevents downloading huge histories on init
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 10000,
                emitOwnEvents: true,
                markOnlineOnConnect: true
            });

            // Fallback timeout in case Baileys hangs silently
            const initTimeout = setTimeout(() => {
                if (this.status === 'INITIALIZING') {
                    logger.error(`Session ${this.sessionId} hung on INITIALIZING for 15s. Forcing ws close.`);
                    this.status = 'FAILED';
                    this.lastError = 'WebSocket connection timed out (Network or IPv6 issue)';
                    
                    // Force destroy the underlying websocket to unblock memory
                    if (this.socket && (this.socket as any).ws) {
                        try {
                            (this.socket as any).ws.close();
                        } catch(e) {}
                    }
                    this.disconnect();
                }
            }, 15000);

            this.socket?.ev.on('creds.update', saveCreds);
            
            this.socket?.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (connection || qr) {
                    clearTimeout(initTimeout);
                }

                if (qr) {
                    try {
                        this.qrCode = await qrcode.toDataURL(qr);
                        this.status = 'QR_READY';
                        logger.info(`QR code generated for session ${this.sessionId}`);
                    } catch (err: any) {
                        this.lastError = err.message;
                        logger.error(err, `Failed to generate QR code data URL for session ${this.sessionId}`);
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                    logger.warn(`Connection closed for session ${this.sessionId}. Reconnecting: ${shouldReconnect}`);
                    
                    if (shouldReconnect) {
                        this.handleReconnect();
                    } else {
                        this.status = 'DISCONNECTED';
                        this.qrCode = null;
                        await supabaseAdmin.from('whatsapp_accounts').update({ status: 'DISCONNECTED', last_disconnected_at: new Date().toISOString() }).eq('session_id', this.sessionId);
                    }
                } else if (connection === 'open') {
                    this.status = 'CONNECTED';
                    this.qrCode = null;
                    this.reconnectAttempts = 0;
                    logger.info(`Session ${this.sessionId} successfully connected`);
                    await supabaseAdmin.from('whatsapp_accounts').update({ status: 'CONNECTED', last_connected_at: new Date().toISOString() }).eq('session_id', this.sessionId);
                }
            });

            this.socket?.ev.on('messages.upsert', async (m) => {
                if (m.type === 'notify') {
                    for (const msg of m.messages) {
                        try {
                            await handleIncomingMessage(this.sessionId, msg);
                        } catch (error) {
                            logger.error(error, `Error handling message for session ${this.sessionId}`);
                        }
                    }
                }
            });

        } catch (error: any) {
            this.lastError = error.message;
            logger.error(error, `Error connecting session ${this.sessionId}:`);
            this.status = 'FAILED';
        }
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            logger.info(`Reconnecting session ${this.sessionId} in ${timeout}ms (Attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connect(), timeout);
        } else {
            logger.error(`Max reconnect attempts reached for session ${this.sessionId}`);
            this.status = 'FAILED';
        }
    }

    public async disconnect(): Promise<void> {
        if (this.socket) {
            this.socket?.end(new Error('Manual disconnect'));
            this.socket = null;
            this.status = 'DISCONNECTED';
            this.qrCode = null;
            logger.info(`Session ${this.sessionId} manually disconnected`);
        }
    }

    public async reconnect(): Promise<void> {
        await this.disconnect();
        this.reconnectAttempts = 0;
        await this.connect();
    }

    public async sendMessage(jid: string, text: string): Promise<void> {
        if (!this.socket || this.status !== 'CONNECTED') {
            throw new Error(`Cannot send message. Session ${this.sessionId} is not connected.`);
        }
        await this.socket?.sendMessage(jid, { text });
    }

    public async sendMedia(jid: string, mediaUrl: string, caption?: string): Promise<void> {
        if (!this.socket || this.status !== 'CONNECTED') {
            throw new Error(`Cannot send media. Session ${this.sessionId} is not connected.`);
        }
        // In a real implementation, you might need to fetch the URL to a buffer if it's external,
        // but Baileys handles URLs natively in some cases if mapped correctly.
        // For MVP, assuming image url sending.
        await this.socket?.sendMessage(jid, { 
            image: { url: mediaUrl }, 
            caption 
        });
    }

    public getStatus(): SessionStatus {
        return this.status;
    }

    public getQR(): string | null {
        return this.qrCode;
    }
}
