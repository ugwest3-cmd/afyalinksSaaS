import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { logger } from '../../config/logger.js';
import { handleIncomingMessage } from './messageHandler.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { boomify, failedDependency, internal } from '@hapi/boom';

export type SessionStatus = 'INITIALIZING' | 'QR_READY' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED';

export class WhatsAppSession {
    public sessionId: string;
    public pharmacyId: string;
    public phoneNumber: string;
    public status: SessionStatus = 'INITIALIZING';
    public qrCode: string | null = null;
    public lastError: string | null = null;
    
    private client: Client | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(sessionId: string, pharmacyId: string, phoneNumber: string) {
        this.sessionId = sessionId;
        this.pharmacyId = pharmacyId;
        this.phoneNumber = phoneNumber;
    }

    public async connect(): Promise<void> {
        try {
            logger.info(`Starting connection for session ${this.sessionId}`);
            this.status = 'INITIALIZING';
            
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: this.sessionId,
                    dataPath: './whatsapp_sessions'
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu'
                    ],
                    executablePath: process.env.CHROME_BIN || undefined
                }
            });

            const initTimeout = setTimeout(() => {
                if (this.status === 'INITIALIZING') {
                    logger.error(`Session ${this.sessionId} hung on INITIALIZING for 30s. Forcing fail.`);
                    this.status = 'FAILED';
                    this.lastError = 'Browser engine failed to start';
                    this.disconnect();
                }
            }, 30000);

            this.client.on('qr', async (qr) => {
                clearTimeout(initTimeout);
                try {
                    this.qrCode = await qrcode.toDataURL(qr);
                    this.status = 'QR_READY';
                    logger.info(`QR code generated for session ${this.sessionId}`);
                } catch (err: any) {
                    this.lastError = err.message;
                    logger.error(err, `Failed to generate QR code data URL for session ${this.sessionId}`);
                }
            });

            this.client.on('ready', async () => {
                clearTimeout(initTimeout);
                this.status = 'CONNECTED';
                this.qrCode = null;
                this.reconnectAttempts = 0;
                logger.info(`Session ${this.sessionId} successfully connected`);
                await supabaseAdmin.from('whatsapp_accounts').update({ status: 'CONNECTED', last_connected_at: new Date().toISOString() }).eq('session_id', this.sessionId);
            });

            this.client.on('authenticated', () => {
                clearTimeout(initTimeout);
                logger.info(`Session ${this.sessionId} authenticated`);
            });

            this.client.on('auth_failure', (msg) => {
                clearTimeout(initTimeout);
                logger.error(`Session ${this.sessionId} authentication failed: ${msg}`);
                this.status = 'FAILED';
                this.lastError = msg;
            });

            this.client.on('disconnected', async (reason) => {
                logger.warn(`Session ${this.sessionId} disconnected: ${reason}`);
                
                if (reason === 'NAVIGATION' as any || reason === 'CONFLICT' as any) {
                    this.handleReconnect();
                } else {
                    this.status = 'DISCONNECTED';
                    this.qrCode = null;
                    await supabaseAdmin.from('whatsapp_accounts').update({ status: 'DISCONNECTED', last_disconnected_at: new Date().toISOString() }).eq('session_id', this.sessionId);
                }
            });

            this.client.on('message', async (msg) => {
                try {
                    await handleIncomingMessage(this.sessionId, msg as any);
                } catch (error) {
                    logger.error(error, `Error handling message for session ${this.sessionId}`);
                }
            });

            await this.client.initialize();

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
            this.lastError = 'Max reconnect attempts reached';
        }
    }

    public async disconnect(): Promise<void> {
        if (this.client) {
            try {
                await this.client.destroy();
            } catch (e) {}
            this.client = null;
            this.status = 'DISCONNECTED';
            logger.info(`Session ${this.sessionId} disconnected`);
        }
    }

    public async reconnect(): Promise<void> {
        await this.disconnect();
        this.reconnectAttempts = 0;
        await this.connect();
    }

    public async sendMessage(to: string, text: string): Promise<void> {
        if (!this.client || this.status !== 'CONNECTED') {
            throw failedDependency(`Session ${this.sessionId} is not connected`);
        }
        
        try {
            // whatsapp-web.js requires numbers formatted as 1234567890@c.us
            let cleanNumber = to.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\+/g, '');
            const formattedNumber = `${cleanNumber}@c.us`;
            await this.client.sendMessage(formattedNumber, text);
            logger.info(`Message sent successfully to ${to} via session ${this.sessionId}`);
        } catch (error) {
            logger.error(error, `Failed to send message to ${to} via session ${this.sessionId}`);
            throw internal('Failed to send WhatsApp message');
        }
    }
    public getStatus(): SessionStatus {
        return this.status;
    }

    public getQR(): string | null {
        return this.qrCode;
    }
}
