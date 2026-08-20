'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Building2, MessageSquare, ShoppingCart, Clock, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get('/api/admin/dashboard/stats');
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0B8F6A]" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Pharmacies', value: stats?.totalPharmacies || 0, icon: Building2, color: 'text-blue-600' },
    { label: 'Active WhatsApp', value: stats?.activeWhatsapp || 0, icon: MessageSquare, color: 'text-green-600' },
    { label: 'Orders Today', value: stats?.ordersToday || 0, icon: ShoppingCart, color: 'text-purple-600' },
    { label: 'Pending Orders', value: stats?.pendingOrders || 0, icon: Clock, color: 'text-orange-600' },
    { label: 'Payments Today', value: `UGX ${(stats?.paymentsToday || 0).toLocaleString()}`, icon: DollarSign, color: 'text-[#0B8F6A]' },
    { label: 'Successful Payments', value: stats?.successfulPayments || 0, icon: CheckCircle, color: 'text-[#16834B]' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#17211E]">Dashboard</h1>
        <p className="text-[#6B7773]">Platform Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c, i) => (
          <Card key={i} className="p-6 shadow-sm flex items-center gap-4 border-[#DCE7E3]">
            <div className={`p-4 rounded-full bg-[#F7FAF9] ${c.color}`}>
              <c.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B7773]">{c.label}</p>
              <h3 className="text-2xl font-bold text-[#17211E]">{c.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="p-6 h-[400px] flex items-center justify-center bg-[#F7FAF9] border-[#DCE7E3]">
          <p className="text-[#6B7773]">Orders Over Time Chart (Placeholder)</p>
        </Card>
        <Card className="p-6 h-[400px] flex items-center justify-center bg-[#F7FAF9] border-[#DCE7E3]">
          <p className="text-[#6B7773]">Revenue Chart (Placeholder)</p>
        </Card>
      </div>
    </div>
  );
}
