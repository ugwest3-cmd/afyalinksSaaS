'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, Trash2, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';

export default function WhatsAppPage() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    // Mock initial state
    setSessions([
      { id: '1', pharmacy_id: 'ph_1', phone_number: '+256700000001', status: 'CONNECTED', last_seen: new Date().toISOString() },
      { id: '2', pharmacy_id: 'ph_2', phone_number: '+256700000002', status: 'DISCONNECTED', last_seen: new Date().toISOString() }
    ]);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#17211E]">WhatsApp Connections</h1>
          <p className="text-[#6B7773]">Manage pharmacy WhatsApp numbers</p>
        </div>
        <Button className="bg-[#0B8F6A] hover:bg-[#075C47]">
          <Plus className="w-4 h-4 mr-2" /> Connect Number
        </Button>
      </div>

      <Card className="p-4 shadow-sm border-[#DCE7E3]">
        <Table>
          <TableHeader className="bg-[#F7FAF9]">
            <TableRow>
              <TableHead>Pharmacy ID</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">{session.pharmacy_id}</TableCell>
                <TableCell className="font-mono text-sm">{session.phone_number}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      session.status === 'CONNECTED' ? 'bg-[#16834B]' : 'bg-[#D64545]'
                    }`} />
                    <span className="text-sm font-medium">{session.status}</span>
                  </div>
                </TableCell>
                <TableCell className="text-[#6B7773] text-sm">
                  {new Date(session.last_seen).toLocaleString()}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" className="h-8">
                    <RefreshCw className="w-3 h-3 mr-1" /> Reconnect
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-[#D64545] border-[#D64545] hover:bg-[#FEF2F2]">
                    <Trash2 className="w-3 h-3 mr-1" /> Disconnect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
