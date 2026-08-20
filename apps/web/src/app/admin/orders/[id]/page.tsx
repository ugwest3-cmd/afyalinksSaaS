'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ArrowLeft, Loader2, Building2, Phone, DollarSign, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import type { Order } from '@afya-links/shared';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await api.get(`/api/admin/orders/${params.id}`);
        setOrder(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B8F6A]" />
      </div>
    );
  }

  if (!order) return <div className="p-6">Order not found</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-[#6B7773] text-sm">
        <Link href="/admin/orders" className="hover:text-[#0B8F6A] flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" /> Orders
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[#17211E] font-medium">Order #{order.order_number}</span>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#17211E] flex items-center gap-3">
            {order.order_number}
            <Badge className="bg-[#E8F7F2] text-[#0B8F6A] hover:bg-[#E8F7F2]">
              {order.status}
            </Badge>
          </h1>
          <p className="text-[#6B7773] mt-1">
            Created on {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {order.status === 'RECEIVED' && (
            <Button variant="outline" className="border-[#D64545] text-[#D64545] hover:bg-[#FEF2F2]">
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-[#F7FAF9] rounded-lg">
            <Building2 className="w-5 h-5 text-[#0B8F6A]" />
          </div>
          <div>
            <p className="text-sm text-[#6B7773]">Pharmacy</p>
            <p className="font-medium text-[#17211E]">{order.pharmacy?.name || 'Unassigned'}</p>
          </div>
        </Card>
        
        <Card className="p-4 flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-[#F7FAF9] rounded-lg">
            <Phone className="w-5 h-5 text-[#0B8F6A]" />
          </div>
          <div>
            <p className="text-sm text-[#6B7773]">Clinic Phone</p>
            <p className="font-medium text-[#17211E]">{order.clinic_phone}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-[#F7FAF9] rounded-lg">
            <DollarSign className="w-5 h-5 text-[#0B8F6A]" />
          </div>
          <div>
            <p className="text-sm text-[#6B7773]">Total Amount</p>
            <p className="font-medium text-[#17211E]">
              {order.total_amount ? `UGX ${Number(order.total_amount).toLocaleString()}` : 'Pending'}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-[#F7FAF9] rounded-lg">
            <Clock className="w-5 h-5 text-[#0B8F6A]" />
          </div>
          <div>
            <p className="text-sm text-[#6B7773]">Payment Status</p>
            <p className="font-medium text-[#17211E]">{order.payment_status || 'UNPAID'}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#17211E] mb-4">Original Message</h2>
          <div className="bg-[#F7FAF9] p-4 rounded-lg border border-[#DCE7E3] whitespace-pre-wrap font-mono text-sm text-[#17211E]">
            {order.original_message}
          </div>
        </Card>

        <Card className="p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#17211E] mb-4">Order Timeline</h2>
          <div className="relative border-l-2 border-[#DCE7E3] ml-3 space-y-6">
            
            <div className="relative pl-6">
              <div className="absolute w-3 h-3 bg-[#0B8F6A] rounded-full -left-[7px] top-1.5" />
              <p className="text-sm font-medium text-[#17211E]">Order Created</p>
              <p className="text-xs text-[#6B7773]">{new Date(order.created_at).toLocaleString()}</p>
            </div>

            {order.total_amount && (
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-[#0B8F6A] rounded-full -left-[7px] top-1.5" />
                <p className="text-sm font-medium text-[#17211E]">Amount Set</p>
                <p className="text-xs text-[#6B7773]">Amount updated to UGX {Number(order.total_amount)}</p>
              </div>
            )}

            {order.status === 'PAID' && (
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-[#16834B] rounded-full -left-[7px] top-1.5" />
                <p className="text-sm font-medium text-[#17211E]">Payment Completed</p>
                <p className="text-xs text-[#6B7773]">Payment verified successfully</p>
              </div>
            )}
            
          </div>
        </Card>
      </div>
    </div>
  );
}
