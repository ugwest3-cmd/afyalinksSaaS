'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, CheckCircle2, XCircle, Stethoscope, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Clinic {
  id: string;
  name: string;
  phone_number: string;
  location: string;
  preferred_driver_name: string;
  preferred_driver_phone: string;
  additional_phones: string[];
  created_at: string;
}

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    location: '',
    preferred_driver_name: '',
    preferred_driver_phone: ''
  });

  const fetchClinics = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/clinics');
      setClinics(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load clinics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  const openModal = (clinic?: Clinic) => {
    if (clinic) {
      setEditingClinic(clinic);
      setFormData({
        name: clinic.name || '',
        phone_number: clinic.phone_number || '',
        location: clinic.location || '',
        preferred_driver_name: clinic.preferred_driver_name || '',
        preferred_driver_phone: clinic.preferred_driver_phone || ''
      });
    } else {
      setEditingClinic(null);
      setFormData({ name: '', phone_number: '', location: '', preferred_driver_name: '', preferred_driver_phone: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClinic) {
        await api.put(`/api/admin/clinics/${editingClinic.id}`, formData);
      } else {
        await api.post('/api/admin/clinics', formData);
      }
      setIsModalOpen(false);
      fetchClinics();
    } catch (err: any) {
      setError(err.message || 'Failed to save clinic');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this clinic?')) return;
    try {
      await api.delete(`/api/admin/clinics/${id}`);
      fetchClinics();
    } catch (err: any) {
      setError('Failed to delete clinic');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17211E]">Clinics</h1>
          <p className="text-[#6B7773] mt-1">Manage registered clinics and delivery preferences.</p>
        </div>
        <Button 
          className="bg-[#16834B] hover:bg-[#126B3D] text-white"
          onClick={() => openModal()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Clinic
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-[#FEE2E2] text-[#991B1B] rounded-md border border-[#F87171] flex items-center">
          <XCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <Card className="border-[#DCE7E3] shadow-sm bg-white">
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F7FAF9]">
                <TableRow>
                  <TableHead className="text-[#17211E] font-semibold">Clinic Name</TableHead>
                  <TableHead className="text-[#17211E] font-semibold">Phone Number</TableHead>
                  <TableHead className="text-[#17211E] font-semibold">Location</TableHead>
                  <TableHead className="text-[#17211E] font-semibold">Driver Name</TableHead>
                  <TableHead className="text-[#17211E] font-semibold">Driver Phone</TableHead>
                  <TableHead className="text-right text-[#17211E] font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-[#6B7773]">
                      Loading clinics...
                    </TableCell>
                  </TableRow>
                ) : clinics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-[#6B7773]">
                      <Stethoscope className="w-8 h-8 mx-auto text-[#DCE7E3] mb-2" />
                      No clinics found. Add a new one.
                    </TableCell>
                  </TableRow>
                ) : (
                  clinics.map((clinic) => (
                    <TableRow key={clinic.id} className="hover:bg-[#F7FAF9] transition-colors">
                      <TableCell className="font-medium text-[#17211E]">{clinic.name}</TableCell>
                      <TableCell className="text-[#4E5955]">{clinic.phone_number}</TableCell>
                      <TableCell className="text-[#4E5955]">{clinic.location || 'N/A'}</TableCell>
                      <TableCell className="text-[#4E5955]">{clinic.preferred_driver_name || 'N/A'}</TableCell>
                      <TableCell className="text-[#4E5955]">{clinic.preferred_driver_phone || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openModal(clinic)}
                          className="mr-2"
                        >
                          <Pencil className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(clinic.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full bg-white">
            <CardHeader>
              <CardTitle>{editingClinic ? 'Edit Clinic' : 'Add New Clinic'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#17211E]">Clinic Name</label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#17211E]">Phone Number</label>
                  <Input 
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    required
                    placeholder="e.g. 256700000000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#17211E]">Location</label>
                  <Input 
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#17211E]">Preferred Driver Name</label>
                  <Input 
                    value={formData.preferred_driver_name}
                    onChange={(e) => setFormData({ ...formData, preferred_driver_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#17211E]">Preferred Driver Phone</label>
                  <Input 
                    value={formData.preferred_driver_phone}
                    onChange={(e) => setFormData({ ...formData, preferred_driver_phone: e.target.value })}
                  />
                </div>
                
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[#DCE7E3]">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#16834B] hover:bg-[#126B3D] text-white">Save</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
