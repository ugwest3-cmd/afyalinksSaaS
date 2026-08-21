import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';

async function test() {
  console.log('Testing Baileys...');
  try {
    const { state } = await useMultiFileAuthState('scratch_session');
    const socket = makeWASocket.default ? (makeWASocket as any).default({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
    }) : makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
    });
    console.log('Socket created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating socket:', error);
    process.exit(1);
  }
}
test();
