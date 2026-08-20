'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Order } from '@afya-links/shared';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/admin/orders');
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.clinic_phone.includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#17211E]">Orders</h1>
      </div>

      <Card className="p-4 shadow-sm">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B7773]" />
            <Input 
              placeholder="Search by Order # or Phone" 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="h-10 px-4 py-2 flex items-center gap-2 cursor-pointer bg-white text-[#6B7773] border-[#DCE7E3]">
              <Filter className="w-4 h-4" /> Filter
            </Badge>
          </div>
        </div>

        <div className="rounded-md border border-[#DCE7E3]">
          <Table>
            <TableHeader className="bg-[#F7FAF9]">
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Pharmacy</TableHead>
                <TableHead>Clinic Phone</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
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
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-[#6B7773]">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer hover:bg-[#E8F7F2] transition-colors"
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                  >
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.pharmacy?.name || '-'}</TableCell>
                    <TableCell>{order.clinic_phone}</TableCell>
                    <TableCell>
                      {order.total_amount ? `UGX ${Number(order.total_amount).toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        order.status === 'PAID' ? 'bg-[#16834B] text-white hover:bg-[#16834B]' :
                        order.status === 'PENDING' ? 'bg-[#D98A00] text-white hover:bg-[#D98A00]' :
                        'bg-[#6B7773] text-white hover:bg-[#6B7773]'
                      }>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#6B7773]">
                      {new Date(order.created_at).toLocaleDateString()}
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
