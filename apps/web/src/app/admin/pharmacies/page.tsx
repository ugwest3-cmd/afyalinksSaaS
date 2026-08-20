'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Building2, Phone, MessageSquare, CreditCard, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Pharmacy, PharmacyStatus } from '@afya-links/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PharmaciesPage() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PharmacyStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPharmacies();
  }, [page, status]);

  const fetchPharmacies = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(status && { status }),
        ...(search && { search })
      });
      const response = await api.get(`/api/admin/pharmacies?${queryParams}`);
      setPharmacies(response.data);
      setTotalPages(response.meta?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pharmacies');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPharmacies();
  };

  const getStatusColor = (status: PharmacyStatus) => {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#17211E]">Pharmacies</h1>
          <p className="text-[#6B7773] mt-1">Manage wholesale pharmacy partners</p>
        </div>
        <Link href="/admin/pharmacies/new">
          <Button className="bg-[#0B8F6A] hover:bg-[#075C47] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Pharmacy
          </Button>
        </Link>
      </div>

      <Card className="border-[#DCE7E3] bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7773] w-4 h-4" />
                <Input 
                  placeholder="Search pharmacies by name..." 
                  className="pl-9 border-[#DCE7E3]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline" className="border-[#DCE7E3] text-[#17211E]">
                Search
              </Button>
            </form>
            <select
              className="px-3 py-2 border border-[#DCE7E3] rounded-md text-sm bg-white text-[#17211E] focus:outline-none focus:ring-2 focus:ring-[#0B8F6A]"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as PharmacyStatus | '');
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              {error}
            </div>
          ) : (
            <div className="rounded-md border border-[#DCE7E3] overflow-hidden">
              <Table>
                <TableHeader className="bg-[#F7FAF9]">
                  <TableRow>
                    <TableHead className="text-[#17211E] font-semibold">Pharmacy</TableHead>
                    <TableHead className="text-[#17211E] font-semibold">Contact</TableHead>
                    <TableHead className="text-[#17211E] font-semibold">Integrations</TableHead>
                    <TableHead className="text-[#17211E] font-semibold">Status</TableHead>
                    <TableHead className="text-right text-[#17211E] font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="py-6">
                          <div className="animate-pulse flex space-x-4">
                            <div className="flex-1 space-y-4 py-1">
                              <div className="h-4 bg-[#E8F7F2] rounded w-3/4"></div>
                              <div className="space-y-2">
                                <div className="h-4 bg-[#E8F7F2] rounded"></div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : pharmacies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-[#6B7773]">
                        <Building2 className="w-8 h-8 mx-auto text-[#DCE7E3] mb-2" />
                        No pharmacies found. Try adjusting your search or add a new one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pharmacies.map((pharmacy) => (
                      <TableRow 
                        key={pharmacy.id} 
                        className="cursor-pointer hover:bg-[#F7FAF9] transition-colors"
                        onClick={() => router.push(`/admin/pharmacies/${pharmacy.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium text-[#17211E]">{pharmacy.name}</div>
                          {pharmacy.city && <div className="text-xs text-[#6B7773]">{pharmacy.city}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-[#17211E] gap-2">
                            <Phone className="w-3 h-3 text-[#6B7773]" />
                            {pharmacy.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center text-xs gap-1">
                              <MessageSquare className="w-3 h-3 text-[#16834B]" />
                              <span className={pharmacy.whatsappConnected ? "text-[#16834B]" : "text-[#6B7773]"}>
                                {pharmacy.whatsappConnected ? 'Connected' : 'Not Connected'}
                              </span>
                            </div>
                            <div className="flex items-center text-xs gap-1">
                              <CreditCard className="w-3 h-3 text-[#0B8F6A]" />
                              <span className={pharmacy.pesapalConnected ? "text-[#0B8F6A]" : "text-[#6B7773]"}>
                                {pharmacy.pesapalConnected ? 'Connected' : 'Not Connected'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(pharmacy.status as PharmacyStatus)} variant="default">
                            {pharmacy.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-[#0B8F6A] hover:bg-[#E8F7F2]">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-[#6B7773]">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-[#DCE7E3]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-[#DCE7E3]"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
