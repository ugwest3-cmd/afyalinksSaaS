'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Building2, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewPharmacyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'Uganda',
    whatsappNumber: '',
    pesapalConsumerKey: '',
    pesapalConsumerSecret: '',
    pesapalEnvironment: 'SANDBOX'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name || !formData.phone) {
      setError('Name and Phone are required.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.name,
        legal_name: formData.legalName || null,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || 'Uganda',
        whatsapp_number: formData.whatsappNumber || null,
        status: 'ACTIVE',
        pesapal_consumer_key: formData.pesapalConsumerKey || undefined,
        pesapal_consumer_secret: formData.pesapalConsumerSecret || undefined,
        pesapal_environment: formData.pesapalEnvironment
      };
      const response = await api.post('/api/admin/pharmacies', payload);
      router.push('/admin/pharmacies');
    } catch (err: any) {
      setError(err.message || 'Failed to create pharmacy');
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/pharmacies">
          <Button variant="ghost" size="icon" className="text-[#6B7773] hover:text-[#17211E]">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-[#17211E]">Add New Pharmacy</h1>
          <p className="text-[#6B7773]">Register a new partner pharmacy on the platform.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="border-[#DCE7E3] shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#17211E]">
              <Building2 className="w-5 h-5 text-[#0B8F6A]" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#17211E]">Pharmacy Name *</Label>
              <Input 
                id="name" name="name" 
                value={formData.name} onChange={handleChange} 
                required placeholder="e.g. HealthCare Pharmacy"
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName" className="text-[#17211E]">Legal Name</Label>
              <Input 
                id="legalName" name="legalName" 
                value={formData.legalName} onChange={handleChange} 
                placeholder="e.g. HealthCare Pharmacy Ltd"
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#17211E]">Phone Number *</Label>
              <Input 
                id="phone" name="phone" 
                value={formData.phone} onChange={handleChange} 
                required placeholder="+256..."
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#17211E]">Email Address</Label>
              <Input 
                id="email" name="email" type="email"
                value={formData.email} onChange={handleChange} 
                placeholder="contact@pharmacy.com"
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DCE7E3] shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-[#17211E]">Location</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className="text-[#17211E]">Street Address</Label>
              <Input 
                id="address" name="address" 
                value={formData.address} onChange={handleChange} 
                placeholder="e.g. Plot 123, Kampala Road"
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-[#17211E]">City</Label>
              <Input 
                id="city" name="city" 
                value={formData.city} onChange={handleChange} 
                placeholder="e.g. Kampala"
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country" className="text-[#17211E]">Country</Label>
              <Input 
                id="country" name="country" 
                value={formData.country} onChange={handleChange} 
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DCE7E3] shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-[#17211E]">Integrations</CardTitle>
            <CardDescription>Setup WhatsApp and Payment gateways</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="whatsappNumber" className="text-[#17211E]">WhatsApp Number</Label>
              <Input 
                id="whatsappNumber" name="whatsappNumber" 
                value={formData.whatsappNumber} onChange={handleChange} 
                placeholder="+256..."
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pesapalConsumerKey" className="text-[#17211E]">PesaPal Consumer Key</Label>
              <Input 
                id="pesapalConsumerKey" name="pesapalConsumerKey" 
                value={formData.pesapalConsumerKey} onChange={handleChange} 
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pesapalConsumerSecret" className="text-[#17211E]">PesaPal Consumer Secret</Label>
              <Input 
                id="pesapalConsumerSecret" name="pesapalConsumerSecret" type="password"
                value={formData.pesapalConsumerSecret} onChange={handleChange} 
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pesapalEnvironment" className="text-[#17211E]">PesaPal Environment</Label>
              <select 
                id="pesapalEnvironment" name="pesapalEnvironment" 
                value={formData.pesapalEnvironment} onChange={handleChange}
                className="w-full px-3 py-2 border border-[#DCE7E3] rounded-md text-sm bg-white text-[#17211E] focus:outline-none focus:ring-2 focus:ring-[#0B8F6A]"
              >
                <option value="SANDBOX">Sandbox (Testing)</option>
                <option value="LIVE">Live (Production)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/admin/pharmacies">
            <Button type="button" variant="outline" className="border-[#DCE7E3]">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-[#0B8F6A] hover:bg-[#075C47] text-white">
            {loading ? 'Saving...' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Pharmacy
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
