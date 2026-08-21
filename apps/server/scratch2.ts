import makeWASocket from '@whiskeysockets/baileys';
import * as baileys from '@whiskeysockets/baileys';
console.log('makeWASocket type:', typeof makeWASocket);
console.log('baileys.default type:', typeof (baileys as any).default);
console.log('baileys.makeWASocket type:', typeof (baileys as any).makeWASocket);
