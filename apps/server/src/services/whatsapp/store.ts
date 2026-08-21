import fs from 'fs';
import path from 'path';
import { logger } from '../../config/logger.js';

const SESSIONS_DIR = path.resolve(process.cwd(), 'whatsapp_sessions');

export const deleteAuthState = async (sessionId: string) => {
  // whatsapp-web.js LocalAuth stores sessions in session-<clientId>
  const sessionDir = path.join(SESSIONS_DIR, `session-${sessionId}`);
  
  if (fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      logger.info(`Deleted auth state for session: ${sessionId}`);
    } catch (error) {
      logger.error(error, `Failed to delete auth state for session ${sessionId}:`);
    }
  }
};
