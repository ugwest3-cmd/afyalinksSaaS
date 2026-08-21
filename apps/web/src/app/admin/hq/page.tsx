'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Trash2, QrCode, Loader2, Bot } from 'lucide-react';
import { api } from '@/lib/api';

export default function HQPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Connection Modal State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // QR Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<string>('INITIALIZING');

  const fetchData = async () => {
    try {
      const sessRes = await api.get('/api/admin/whatsapp/sessions');
      // Only show the system session
      const systemSessions = (sessRes.sessions || []).filter((s: any) => s.is_system);
      setSessions(systemSessions);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll for QR status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isQrModalOpen && activeSessionId && qrStatus !== 'CONNECTED') {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/api/admin/whatsapp/${activeSessionId}/qr`);
          setQrStatus(res.status);
          if (res.qrCode) {
            setQrCode(res.qrCode);
          }
          if (res.status === 'CONNECTED') {
            setIsQrModalOpen(false);
            fetchData();
          }
        } catch (error) {
          // Keep waiting
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isQrModalOpen, activeSessionId, qrStatus]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    
    setIsConnecting(true);
    try {
      // By omitting pharmacyId, the backend sets is_system = true automatically
      const res = await api.post('/api/admin/whatsapp/connect', { 
        phoneNumber 
      });
      if (res?.sessionId) {
        setIsConnectModalOpen(false);
        setActiveSessionId(res.sessionId);
        setQrStatus('INITIALIZING');
        setQrCode(null);
        setIsQrModalOpen(true);
        setPhoneNumber('');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to initialize connection');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (sessionId: string) => {
    if (!confirm('Are you sure you want to completely disconnect and remove this number?')) return;
    try {
      await api.post(`/api/admin/whatsapp/${sessionId}/disconnect`, {});
      fetchData();
    } catch (error) {
      alert('Failed to disconnect');
    }
  };

  const handleReconnect = async (sessionId: string) => {
    try {
      await api.post(`/api/admin/whatsapp/${sessionId}/reconnect`, {});
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#17211E]">Afya Links HQ</h1>
          <p className="text-[#6B7773]">Connect the central platform WhatsApp number to route orders.</p>
        </div>
        <Button 
          onClick={() => setIsConnectModalOpen(true)} 
          className="bg-[#0B8F6A] hover:bg-[#075C47]"
          disabled={sessions.length > 0} // Only allow one system number
        >
          <Plus className="w-4 h-4 mr-2" /> Connect HQ Number
        </Button>
      </div>

      <Card className="border-[#DCE7E3] shadow-sm">
        <Table>
          <TableHeader className="bg-[#F7FAF9]">
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Session ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading...
                </TableCell>
              </TableRow>
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-[#6B7773]">
                  No Central HQ number connected yet.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.sessionId}>
                  <TableCell className="font-medium text-[#17211E]">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-[#E8F7F2] text-[#0B8F6A]">
                      <Bot className="w-3 h-3 mr-1" /> Afya Links Central Route
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted">
                    {session.sessionId}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        session.status === 'CONNECTED' ? 'bg-[#16834B]' : 
                        session.status === 'QR_READY' ? 'bg-[#D98A00]' : 'bg-[#D64545]'
                      }`} />
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
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Connect Modal */}
      <Modal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        title="Connect HQ WhatsApp"
        description="Enter the phone number for the central routing system."
      >
        <form onSubmit={handleConnect} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input 
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="+256700000000"
              required
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsConnectModalOpen(false)} className="mr-2">Cancel</Button>
            <Button type="submit" className="bg-[#0B8F6A] hover:bg-[#075C47]" loading={isConnecting}>
              Connect
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Scan QR Code"
        description="Open WhatsApp on your phone and link a device."
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
