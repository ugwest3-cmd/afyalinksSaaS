'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Building2, Save, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EditPharmacyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    phone: '',
    staffPhoneNumber: '',
    email: '',
    address: '',
    city: '',
    country: 'Uganda',
    whatsappNumber: '',
    pesapalConsumerKey: '',
    pesapalConsumerSecret: '',
    pesapalEnvironment: 'SANDBOX'
  });

  useEffect(() => {
    const fetchPharmacy = async () => {
      try {
        const data = await api.get(`/api/admin/pharmacies/${params.id}`);
        setFormData({
          name: data.name || '',
          legalName: data.legal_name || '',
          phone: data.phone || '',
          staffPhoneNumber: data.staff_phone_number || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || 'Uganda',
          whatsappNumber: data.whatsapp_number || '',
          pesapalConsumerKey: data.pesapal_consumer_key || '',
          pesapalConsumerSecret: '', // Keep empty for security unless changing
          pesapalEnvironment: data.pesapal_environment || 'SANDBOX'
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load pharmacy details');
      } finally {
        setFetching(false);
      }
    };
    fetchPharmacy();
  }, [params.id]);

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
        staff_phone_number: formData.staffPhoneNumber || null,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || 'Uganda',
        whatsapp_number: formData.whatsappNumber || null,
        pesapal_consumer_key: formData.pesapalConsumerKey || undefined,
        pesapal_consumer_secret: formData.pesapalConsumerSecret || undefined,
        pesapal_environment: formData.pesapalEnvironment
      };
      
      if (!payload.pesapal_consumer_secret) {
        delete (payload as any).pesapal_consumer_secret;
      }
      
      await api.patch(`/api/admin/pharmacies/${params.id}`, payload);
      router.push(`/admin/pharmacies/${params.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update pharmacy');
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-[#E8F7F2] w-1/4 rounded"></div>
        <div className="h-96 bg-white rounded-xl border border-[#DCE7E3]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/pharmacies/${params.id}`}>
          <Button variant="ghost" size="icon" className="text-[#6B7773] hover:text-[#17211E]">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-[#17211E]">Edit Pharmacy</h1>
          <p className="text-[#6B7773]">Update details for {formData.name}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
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
              <Label htmlFor="phone" className="text-[#17211E]">Public Phone Number *</Label>
              <Input 
                id="phone" name="phone" 
                value={formData.phone} onChange={handleChange} 
                required placeholder="+256..."
                className="border-[#DCE7E3] focus-visible:ring-[#0B8F6A]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffPhoneNumber" className="text-[#17211E]">Staff/Owner WhatsApp Number</Label>
              <Input 
                id="staffPhoneNumber" name="staffPhoneNumber" 
                value={formData.staffPhoneNumber} onChange={handleChange} 
                placeholder="+256... (For receiving orders)"
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
                placeholder="Leave blank to keep unchanged"
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
          <Link href={`/admin/pharmacies/${params.id}`}>
            <Button type="button" variant="outline" className="border-[#DCE7E3]">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-[#0B8F6A] hover:bg-[#075C47] text-white">
            {loading ? 'Saving...' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
