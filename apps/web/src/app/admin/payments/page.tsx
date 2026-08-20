'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await api.get('/api/admin/payments');
        setPayments(data.payments || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#17211E]">Payments</h1>

      <Card className="p-4 shadow-sm">
        <div className="rounded-md border border-[#DCE7E3]">
          <Table>
            <TableHeader className="bg-[#F7FAF9]">
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0B8F6A]" />
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-[#6B7773]">
                    No payments found.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.order_number}</TableCell>
                    <TableCell className="text-xs font-mono">{p.tracking_id || '-'}</TableCell>
                    <TableCell>UGX {Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={
                        p.status === 'COMPLETED' ? 'bg-[#16834B] text-white hover:bg-[#16834B]' :
                        p.status === 'FAILED' ? 'bg-[#D64545] text-white hover:bg-[#D64545]' :
                        'bg-[#D98A00] text-white hover:bg-[#D98A00]'
                      }>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.payment_method || '-'}</TableCell>
                    <TableCell className="text-[#6B7773]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
