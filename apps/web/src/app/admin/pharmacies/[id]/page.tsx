'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, Phone, MessageSquare, CreditCard, 
  ChevronLeft, Edit, MapPin, Mail, AlertCircle, ShoppingBag, CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { Pharmacy, PharmacyStatus } from '@afya-links/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PharmacyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [pharmacy, setPharmacy] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPharmacy();
  }, [params.id]);

  const fetchPharmacy = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/pharmacies/${params.id}`);
      setPharmacy(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load pharmacy details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: PharmacyStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/api/admin/pharmacies/${params.id}`, { status: newStatus });
      setPharmacy((prev: any) => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-[#E8F7F2] w-1/4 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-[#DCE7E3]"></div>)}
        </div>
        <div className="h-64 bg-white rounded-xl border border-[#DCE7E3]"></div>
      </div>
    );
  }

  if (error || !pharmacy) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-10 h-10 mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Pharmacy</h3>
          <p>{error || 'Pharmacy not found'}</p>
          <Link href="/admin/pharmacies" className="mt-4">
            <Button variant="outline">Back to Pharmacies</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-[#16834B] text-white hover:bg-[#16834B]/90';
      case 'PENDING': return 'bg-[#D98A00] text-white hover:bg-[#D98A00]/90';
      case 'SUSPENDED': return 'bg-[#D64545] text-white hover:bg-[#D64545]/90';
      case 'INACTIVE': return 'bg-[#6B7773] text-white hover:bg-[#6B7773]/90';
      default: return 'bg-[#6B7773] text-white';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/admin/pharmacies" className="flex items-center text-sm text-[#0B8F6A] hover:underline mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Pharmacies
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[#17211E]">{pharmacy.name}</h1>
            <Badge className={getStatusColor(pharmacy.status)} variant="default">
              {pharmacy.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {pharmacy.status !== 'ACTIVE' && (
            <Button 
              variant="outline" 
              className="text-[#16834B] border-[#16834B] hover:bg-[#16834B]/10"
              onClick={() => handleStatusChange('ACTIVE')}
              disabled={updating}
            >
              Activate
            </Button>
          )}
          {pharmacy.status === 'ACTIVE' && (
            <Button 
              variant="outline" 
              className="text-[#D64545] border-[#D64545] hover:bg-[#D64545]/10"
              onClick={() => handleStatusChange('SUSPENDED')}
              disabled={updating}
            >
              Suspend
            </Button>
          )}
          <Link href={`/admin/pharmacies/${pharmacy.id}/edit`}>
            <Button className="bg-[#0B8F6A] hover:bg-[#075C47] text-white">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#DCE7E3] shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-full ${pharmacy.whatsappConnected ? 'bg-[#16834B]/10 text-[#16834B]' : 'bg-[#F7FAF9] text-[#6B7773]'}`}>
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B7773]">WhatsApp</p>
              <p className="text-lg font-bold text-[#17211E]">{pharmacy.whatsappConnected ? 'Connected' : 'Disconnected'}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#DCE7E3] shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-full ${pharmacy.pesapalConnected ? 'bg-[#0B8F6A]/10 text-[#0B8F6A]' : 'bg-[#F7FAF9] text-[#6B7773]'}`}>
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B7773]">PesaPal</p>
              <p className="text-lg font-bold text-[#17211E]">{pharmacy.pesapalConnected ? 'Connected' : 'Disconnected'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DCE7E3] shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#E8F7F2] text-[#0B8F6A]">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B7773]">Total Orders</p>
              <p className="text-lg font-bold text-[#17211E]">{pharmacy.metrics?.totalOrders || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DCE7E3] shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#16834B]/10 text-[#16834B]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B7773]">Paid Orders</p>
              <p className="text-lg font-bold text-[#17211E]">{pharmacy.metrics?.paidOrders || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pharmacy Details */}
        <Card className="border-[#DCE7E3] shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg text-[#17211E] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0B8F6A]" />
              Pharmacy Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-[#6B7773] mb-1">Legal Name</p>
              <p className="text-[#17211E] font-medium">{pharmacy.legalName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-[#6B7773] mb-1">Phone Number</p>
              <div className="flex items-center gap-2 text-[#17211E] font-medium">
                <Phone className="w-4 h-4 text-[#6B7773]" />
                {pharmacy.phone}
              </div>
            </div>
            <div>
              <p className="text-sm text-[#6B7773] mb-1">Email Address</p>
              <div className="flex items-center gap-2 text-[#17211E] font-medium">
                <Mail className="w-4 h-4 text-[#6B7773]" />
                {pharmacy.email || 'N/A'}
              </div>
            </div>
            <div>
              <p className="text-sm text-[#6B7773] mb-1">Location</p>
              <div className="flex items-start gap-2 text-[#17211E] font-medium">
                <MapPin className="w-4 h-4 text-[#6B7773] mt-0.5 shrink-0" />
                <div>
                  <p>{pharmacy.address || 'N/A'}</p>
                  <p className="text-sm text-[#6B7773]">{[pharmacy.city, pharmacy.country].filter(Boolean).join(', ')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-[#DCE7E3] shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-[#17211E]">Recent Orders</CardTitle>
            <CardDescription>Latest 5 orders from this pharmacy</CardDescription>
          </CardHeader>
          <CardContent>
            {pharmacy.recentOrders && pharmacy.recentOrders.length > 0 ? (
              <Table>
                <TableHeader className="bg-[#F7FAF9]">
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pharmacy.recentOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-[#0B8F6A]">#{order.id.substring(0,8)}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>UGX {order.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="default">{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-[#6B7773]">
                <ShoppingBag className="w-8 h-8 mx-auto text-[#DCE7E3] mb-2" />
                <p>No orders placed yet.</p>
              </div>
            )}
            <div className="mt-4 text-center">
              <Link href={`/admin/orders?pharmacyId=${pharmacy.id}`}>
                <Button variant="ghost" className="text-[#0B8F6A]">View All Orders</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
