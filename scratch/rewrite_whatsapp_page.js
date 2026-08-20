const fs = require('fs');
const path = 'g:\\AFYA LINKS\\apps\\web\\src\\app\\admin\\whatsapp\\page.tsx';

const content = `'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Trash2, QrCode, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Pharmacy } from '@afya-links/shared';

export default function WhatsAppPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);

  // Connection Modal State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // QR Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<string>('INITIALIZING');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, pharmaciesRes] = await Promise.all([
        api.get('/api/admin/whatsapp/sessions'),
        api.get('/api/admin/pharmacies?limit=100')
      ]);
      if (sessionsRes?.sessions) setSessions(sessionsRes.sessions);
      if (pharmaciesRes?.data) setPharmacies(pharmaciesRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  // Poll for QR Code when modal is open
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isQrModalOpen && activeSessionId && qrStatus !== 'CONNECTED') {
      interval = setInterval(async () => {
        try {
          // Check status first
          const statusRes = await api.get(\`/api/admin/whatsapp/\${activeSessionId}/status\`);
          if (statusRes?.status) {
            setQrStatus(statusRes.status);
            if (statusRes.status === 'CONNECTED') {
              setIsQrModalOpen(false);
              fetchData(); // Refresh list
              alert('Successfully connected WhatsApp!');
              return;
            }
          }

          // Fetch QR if ready
          if (statusRes?.status === 'QR_READY' || qrStatus === 'INITIALIZING') {
            const qrRes = await api.get(\`/api/admin/whatsapp/\${activeSessionId}/qr\`);
            if (qrRes?.qrCode) {
              setQrCode(qrRes.qrCode);
            }
          }
        } catch (e) {
          // Ignore polling errors
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isQrModalOpen, activeSessionId, qrStatus]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPharmacy || !phoneNumber) return;
    
    setIsConnecting(true);
    try {
      const res = await api.post('/api/admin/whatsapp/connect', { 
        pharmacyId: selectedPharmacy, 
        phoneNumber 
      });
      if (res?.sessionId) {
        setIsConnectModalOpen(false);
        setActiveSessionId(res.sessionId);
        setQrStatus('INITIALIZING');
        setQrCode(null);
        setIsQrModalOpen(true);
        setSelectedPharmacy('');
        setPhoneNumber('');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to initialize connection');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (sessionId: string) => {
    if (!confirm('Are you sure you want to disconnect this number?')) return;
    try {
      await api.post(\`/api/admin/whatsapp/\${sessionId}/disconnect\`, {});
      fetchData();
    } catch (error) {
      alert('Failed to disconnect');
    }
  };

  const handleReconnect = async (sessionId: string) => {
    try {
      await api.post(\`/api/admin/whatsapp/\${sessionId}/reconnect\`, {});
      alert('Reconnection initiated');
      fetchData();
    } catch (error) {
      alert('Failed to reconnect');
    }
  };

  const handleShowQr = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setQrStatus('INITIALIZING');
    setQrCode(null);
    setIsQrModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#17211E]">WhatsApp Connections</h1>
          <p className="text-[#6B7773]">Manage pharmacy WhatsApp numbers via Baileys</p>
        </div>
        <Button onClick={() => setIsConnectModalOpen(true)} className="bg-[#0B8F6A] hover:bg-[#075C47]">
          <Plus className="w-4 h-4 mr-2" /> Connect Number
        </Button>
      </div>

      <Card className="p-4 shadow-sm border-[#DCE7E3]">
        <Table>
          <TableHeader className="bg-[#F7FAF9]">
            <TableRow>
              <TableHead>Pharmacy</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Session ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading sessions...
                </TableCell>
              </TableRow>
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[#6B7773]">
                  No WhatsApp sessions found. Connect a number to begin.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => {
                const pharmacy = pharmacies.find(p => p.id === session.pharmacyId);
                return (
                  <TableRow key={session.sessionId}>
                    <TableCell className="font-medium text-[#17211E]">
                      {pharmacy?.name || session.pharmacyId}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {pharmacy?.whatsapp_number || 'Unknown'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted truncate max-w-[100px]">
                      {session.sessionId}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={\`w-2 h-2 rounded-full \${
                          session.status === 'CONNECTED' ? 'bg-[#16834B]' : 
                          session.status === 'QR_READY' ? 'bg-[#D98A00]' : 'bg-[#D64545]'
                        }\`} />
                        <span className="text-sm font-medium">{session.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {session.status === 'QR_READY' && (
                        <Button variant="outline" size="sm" onClick={() => handleShowQr(session.sessionId)} className="h-8">
                          <QrCode className="w-3 h-3 mr-1" /> View QR
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleReconnect(session.sessionId)} className="h-8">
                        <RefreshCw className="w-3 h-3 mr-1" /> Reconnect
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDisconnect(session.sessionId)} className="h-8 text-[#D64545] border-[#D64545] hover:bg-[#FEF2F2]">
                        <Trash2 className="w-3 h-3 mr-1" /> Disconnect
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Connect Modal */}
      <Modal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        title="Connect WhatsApp Number"
        description="Select a pharmacy and enter the phone number you want to connect as their ordering channel."
      >
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <Label>Pharmacy</Label>
            <select
              value={selectedPharmacy}
              onChange={(e) => setSelectedPharmacy(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select a pharmacy...</option>
              {pharmacies.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input 
              placeholder="+256700000000" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <p className="text-xs text-muted">Include country code (e.g. +256)</p>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsConnectModalOpen(false)} className="mr-2">
              Cancel
            </Button>
            <Button type="submit" loading={isConnecting} className="bg-primary hover:bg-primary-dark">
              Initialize Connection
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Scan QR Code"
        description="Open WhatsApp on the pharmacy's phone, go to Linked Devices, and scan this QR code."
      >
        <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
          {qrCode ? (
            <div className="space-y-4 text-center">
              <div className="bg-white p-4 rounded-xl border border-border shadow-sm inline-block">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
              </div>
              <p className="text-sm font-medium text-primary animate-pulse">Waiting for scan...</p>
            </div>
          ) : (
            <div className="space-y-4 text-center text-muted flex flex-col items-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p>Generating secure QR code...</p>
              <p className="text-xs">Status: {qrStatus}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
`;

fs.writeFileSync(path, content);
