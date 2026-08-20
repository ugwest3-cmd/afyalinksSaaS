'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AuditPage() {
  const [logs] = useState([
    { id: 1, created_at: new Date().toISOString(), actor: 'admin@afyalinks.com', action: 'UPDATE_ORDER', entity: 'Order', details: 'Updated status to COMPLETED' },
    { id: 2, created_at: new Date().toISOString(), actor: 'system', action: 'CREATE_PAYMENT', entity: 'Payment', details: 'Initialized payment for AFY-2026-000123' }
  ]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#17211E]">Audit Log</h1>
      <Card className="p-4 shadow-sm">
        <Table>
          <TableHeader className="bg-[#F7FAF9]">
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-[#6B7773] text-sm">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell className="font-medium text-[#17211E]">{log.actor}</TableCell>
                <TableCell><Badge variant="default">{log.action}</Badge></TableCell>
                <TableCell>{log.entity}</TableCell>
                <TableCell className="text-sm text-[#6B7773]">{log.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
