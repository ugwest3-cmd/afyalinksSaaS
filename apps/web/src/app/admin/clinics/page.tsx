'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, Button, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, TextInput } from '@tremor/react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

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

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    location: '',
    preferred_driver_name: '',
    preferred_driver_phone: ''
  });

  const fetchClinics = async () => {
    try {
      const data = await api.get('/api/admin/clinics');
      setClinics(data || []);
    } catch (error) {
      toast.error('Failed to load clinics');
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
        toast.success('Clinic updated successfully');
      } else {
        await api.post('/api/admin/clinics', formData);
        toast.success('Clinic created successfully');
      }
      setIsModalOpen(false);
      fetchClinics();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save clinic');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this clinic?')) return;
    try {
      await api.delete(`/api/admin/clinics/${id}`);
      toast.success('Clinic deleted');
      fetchClinics();
    } catch (error) {
      toast.error('Failed to delete clinic');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title>Registered Clinics</Title>
          <Text>Manage all clinics and their delivery driver preferences.</Text>
        </div>
        <Button icon={PlusIcon} onClick={() => openModal()}>Add Clinic</Button>
      </div>

      <Card>
        {loading ? (
          <Text>Loading clinics...</Text>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Phone Number</TableHeaderCell>
                <TableHeaderCell>Location</TableHeaderCell>
                <TableHeaderCell>Driver Name</TableHeaderCell>
                <TableHeaderCell>Driver Phone</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clinics.map((clinic) => (
                <TableRow key={clinic.id}>
                  <TableCell>{clinic.name}</TableCell>
                  <TableCell>{clinic.phone_number}</TableCell>
                  <TableCell>{clinic.location}</TableCell>
                  <TableCell>{clinic.preferred_driver_name || 'N/A'}</TableCell>
                  <TableCell>{clinic.preferred_driver_phone || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="xs" 
                      variant="secondary" 
                      icon={PencilIcon}
                      onClick={() => openModal(clinic)}
                      className="mr-2"
                    >
                      Edit
                    </Button>
                    <Button 
                      size="xs" 
                      color="red" 
                      icon={TrashIcon}
                      onClick={() => handleDelete(clinic.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full">
            <Title className="mb-4">{editingClinic ? 'Edit Clinic' : 'Add New Clinic'}</Title>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Text>Clinic Name</Text>
                <TextInput 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Text>Phone Number (Include Country Code e.g. 256...)</Text>
                <TextInput 
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <Text>Location</Text>
                <TextInput 
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div>
                <Text>Preferred Driver Name</Text>
                <TextInput 
                  value={formData.preferred_driver_name}
                  onChange={(e) => setFormData({ ...formData, preferred_driver_name: e.target.value })}
                />
              </div>
              <div>
                <Text>Preferred Driver Phone</Text>
                <TextInput 
                  value={formData.preferred_driver_phone}
                  onChange={(e) => setFormData({ ...formData, preferred_driver_phone: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
