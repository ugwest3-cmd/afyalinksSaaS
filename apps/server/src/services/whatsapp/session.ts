import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import type { Client as ClientType } from 'whatsapp-web.js';
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
    
    private client: ClientType | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(sessionId: string, pharmacyId: string, phoneNumber: string) {
        this.sessionId = sessionId;
        this.pharmacyId = pharmacyId;
        this.phoneNumber = phoneNumber;
    }

    public async connect(): Promise<void> {
        try {
            // Download Chromium to the persistent volume if it doesn't exist
            let browserPath = process.env.PUPPETEER_EXECUTABLE_PATH || '';
            try {
                const { execSync } = await import('child_process');
                if (!browserPath) {
                    try { browserPath = execSync('which chromium').toString().trim(); } catch (e) {}
                }
                if (!browserPath) {
                    try { browserPath = execSync('which chromium-browser').toString().trim(); } catch (e) {}
                }
                if (!browserPath) {
                    try { browserPath = execSync('which google-chrome').toString().trim(); } catch (e) {}
                }
            } catch (e) {}

            if (!browserPath) {
                try {
                    const fs = await import('fs');
                    const path = await import('path');
                    const { install, resolveBuildId, Browser, detectBrowserPlatform } = await import('@puppeteer/browsers');
                    const { getSessionStoragePath } = await import('./config.js');
                    
                    const cacheDir = path.resolve(getSessionStoragePath(), 'chrome');
                    if (!fs.existsSync(cacheDir)) {
                        fs.mkdirSync(cacheDir, { recursive: true });
                    }
                    
                    logger.info('Resolving Chromium build ID...');
                    const platform = detectBrowserPlatform();
                    if (!platform) throw new Error('Unsupported platform');
                    
                    const buildId = await resolveBuildId(Browser.CHROME, platform, 'latest');
                    logger.info(`Resolved build ID: ${buildId}. Checking local cache...`);
                    
                    const installInfo = await install({
                        cacheDir,
                        browser: Browser.CHROME,
                        buildId,
                        downloadProgressCallback: (downloaded, total) => {
                            const percent = Math.round((downloaded / total) * 100);
                            if (percent % 20 === 0) logger.info(`Downloading Chrome: ${percent}%`);
                        }
                    });
                    
                    browserPath = installInfo.executablePath;
                    logger.info(`Chromium ready at: ${browserPath}`);
                } catch (error: any) {
                    logger.error(error, 'Failed to download Chromium to persistent volume');
                    throw new Error(`Failed to download Chrome: ${error.message}`);
                }
            } else {
                logger.info(`Using system Chromium at: ${browserPath}`);
            }

            const { getSessionStoragePath } = await import('./config.js');
            const path = await import('path');
            const fs = await import('fs');

            // Clean up stale lock files from previous crashes to prevent "Profile in use" errors
            const sessionDataPath = path.resolve(getSessionStoragePath(), 'session-' + this.sessionId);
            const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
            for (const lf of lockFiles) {
                const lockFile = path.join(sessionDataPath, lf);
                if (fs.existsSync(lockFile)) {
                    try { fs.unlinkSync(lockFile); logger.info(`Removed stale ${lf} for session ${this.sessionId}`); } catch (e) {}
                }
            }

            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: this.sessionId,
                    dataPath: path.resolve(getSessionStoragePath())
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
                    executablePath: browserPath || undefined
                }
            });

            const initTimeout = setTimeout(() => {
                if (this.status === 'INITIALIZING') {
                    logger.error(`Session ${this.sessionId} hung on INITIALIZING for 90s. Forcing fail.`);
                    this.status = 'FAILED';
                    this.lastError = 'Browser engine failed to start';
                    this.disconnect();
                }
            }, 90000);

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

    public async sendMessage(to: string, text: string) {
        if (!this.client) throw new Error('Client not initialized');
        try {
            // whatsapp-web.js accepts the raw JID (to) which includes @s.whatsapp.net or @g.us
            await this.client.sendMessage(to, text);
        } catch (error) {
            logger.error(error, `Failed to send message to ${to}`);
            throw error;
        }
    }

    public getStatus(): SessionStatus {
        return this.status;
    }

    public getQR(): string | null {
        return this.qrCode;
    }
}
