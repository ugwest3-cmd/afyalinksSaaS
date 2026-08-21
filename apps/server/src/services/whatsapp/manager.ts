import { logger } from '../../config/logger.js';
import { WhatsAppSession, SessionStatus } from './session.js';
import { supabaseAdmin } from '../../config/supabase.js';

export class WhatsAppManager {
    private static instance: WhatsAppManager;
    private sessions: Map<string, WhatsAppSession> = new Map();

    private constructor() {}

    public static getInstance(): WhatsAppManager {
        if (!WhatsAppManager.instance) {
            WhatsAppManager.instance = new WhatsAppManager();
        }
        return WhatsAppManager.instance;
    }

    public async initialize(): Promise<void> {
        logger.info('Initializing WhatsApp Manager...');
        
        try {
            // Load active sessions from DB
            const { data: accounts, error } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('session_id, pharmacy_id, phone_number')
                .eq('status', 'CONNECTED');

            if (error) {
                throw error;
            }

            if (accounts && accounts.length > 0) {
                logger.info(`Found ${accounts.length} active WhatsApp sessions to restore.`);
                
                // Check if the auth directory exists before trying to reconnect
                const fs = await import('fs');
                
                for (const acc of accounts) {
                    const authPath = `./whatsapp_sessions/session-${acc.session_id}`;
                    if (fs.existsSync(authPath)) {
                        logger.info(`Auth folder found for ${acc.session_id}, restoring...`);
                        await this.createSession(acc.session_id, acc.pharmacy_id, acc.phone_number, true);
                    } else {
                        logger.warn(`No auth folder for ${acc.session_id}. Marking as DISCONNECTED. Admin must re-scan QR.`);
                        await supabaseAdmin.from('whatsapp_accounts')
                            .update({ status: 'DISCONNECTED' })
                            .eq('session_id', acc.session_id);
                    }
                }
            } else {
                logger.info('No active WhatsApp sessions found in DB.');
            }
        } catch (error) {
            logger.error(error, 'Failed to initialize WhatsApp Manager:');
        }
    }

    public async createSession(sessionId: string, pharmacyId: string, phoneNumber: string, autoConnect = false): Promise<WhatsAppSession> {
        if (this.sessions.has(sessionId)) {
            logger.warn(`Session ${sessionId} already exists.`);
            return this.sessions.get(sessionId)!;
        }

        const session = new WhatsAppSession(sessionId, pharmacyId, phoneNumber);
        this.sessions.set(sessionId, session);

        if (autoConnect) {
            await session.connect();
        }

        return session;
    }

    public getSession(sessionId: string): WhatsAppSession | undefined {
        return this.sessions.get(sessionId);
    }

    public getAllSessions(): Array<{ sessionId: string; pharmacyId: string; status: SessionStatus }> {
        const result = [];
        for (const [sessionId, session] of this.sessions.entries()) {
            result.push({
                sessionId,
                pharmacyId: session.pharmacyId,
                status: session.getStatus()
            });
        }
        return result;
    }

    public async connectSession(sessionId: string): Promise<void> {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        await session.connect();
    }

    public async disconnectSession(sessionId: string): Promise<void> {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        await session.disconnect();
    }

    public removeSessionFromMemory(sessionId: string): void {
        this.sessions.delete(sessionId);
        // Also wipe from disk
        import('./store.js').then(m => m.deleteAuthState(sessionId)).catch(e => logger.error(e));
    }

    public async reconnectSession(sessionId: string): Promise<void> {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        await session.reconnect();
    }

    public getSessionStatus(sessionId: string): { status: SessionStatus, lastError: string | null } {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        return { status: session.getStatus(), lastError: session.lastError };
    }

    public getQR(sessionId: string): string | null {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        return session.getQR();
    }

    public async sendMessage(sessionId: string, to: string, text: string): Promise<void> {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
        await session.sendMessage(jid, text);
    }

}
