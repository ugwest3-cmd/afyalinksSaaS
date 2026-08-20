import fs from 'fs';
import path from 'path';
import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import { logger } from '../../config/logger.js';

const SESSIONS_DIR = path.resolve(process.cwd(), 'whatsapp_sessions');

export const createAuthState = async (sessionId: string) => {
  const sessionDir = path.join(SESSIONS_DIR, sessionId);
  
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  return { state, saveCreds, sessionDir };
};

export const deleteAuthState = async (sessionId: string) => {
  const sessionDir = path.join(SESSIONS_DIR, sessionId);
  
  if (fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      logger.info(`Deleted auth state for session: ${sessionId}`);
    } catch (error) {
      logger.error(error, `Failed to delete auth state for session ${sessionId}:`);
    }
  }
};
