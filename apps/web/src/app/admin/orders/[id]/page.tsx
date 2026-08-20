'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ChevronRight, ArrowLeft, Loader2, Building2, Phone, DollarSign, Clock, Save } from 'lucide-react';
import { api } from '@/lib/api';
import type { Order } from '@afya-links/shared';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Set Price state
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceAmount, setPriceAmount] = useState('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

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

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const handleSetPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceAmount || isNaN(Number(priceAmount))) return;
    
    setIsSavingPrice(true);
    try {
      await api.patch(`/api/admin/orders/${params.id}/price`, { amount: Number(priceAmount) });
      setIsPriceModalOpen(false);
      setPriceAmount('');
      // Refresh order to get updated timeline and status
      await fetchOrder();
    } catch (error) {
      console.error('Failed to set price', error);
      alert('Failed to set price. Please try again.');
    } finally {
      setIsSavingPrice(false);
    }
  };

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
            <>
              <Button onClick={() => setIsPriceModalOpen(true)} className="bg-[#0B8F6A] hover:bg-[#097859]">
                <DollarSign className="w-4 h-4 mr-2" />
                Set Price
              </Button>
              <Button variant="outline" className="border-[#D64545] text-[#D64545] hover:bg-[#FEF2F2]">
                Cancel Order
              </Button>
            </>
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
            <p className="font-medium text-[#17211E]">{order.customer_phone}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-[#F7FAF9] rounded-lg">
            <DollarSign className="w-5 h-5 text-[#0B8F6A]" />
          </div>
          <div>
            <p className="text-sm text-[#6B7773]">Total Amount</p>
            <p className="font-medium text-[#17211E]">
              {order.amount ? `UGX ${Number(order.amount).toLocaleString()}` : 'Pending'}
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

            {order.amount && (
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-[#0B8F6A] rounded-full -left-[7px] top-1.5" />
                <p className="text-sm font-medium text-[#17211E]">Amount Set</p>
                <p className="text-xs text-[#6B7773]">Amount updated to UGX {Number(order.amount).toLocaleString()}</p>
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

      <Modal 
        isOpen={isPriceModalOpen} 
        onClose={() => setIsPriceModalOpen(false)}
        title="Set Order Price"
        description="Enter the total amount in UGX for this order. This will automatically generate a payment link."
      >
        <form onSubmit={handleSetPrice} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (UGX)</Label>
            <Input 
              id="amount" 
              type="number" 
              placeholder="e.g. 50000"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              required
              min="1"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsPriceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSavingPrice}>
              <Save className="w-4 h-4 mr-2" />
              Confirm Price
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
