'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bot, Save, Megaphone, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function AICentrePage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  
  const [audience, setAudience] = useState('clinics');
  const [campaignMsg, setCampaignMsg] = useState('');
  const [sendingCampaign, setSendingCampaign] = useState(false);

  useEffect(() => {
    fetchPrompt();
  }, []);

  const fetchPrompt = async () => {
    try {
      const data = await api.get('/api/admin/ai/settings');
      if (data?.prompt) {
        setPrompt(data.prompt);
      }
    } catch (error) {
      console.error('Failed to fetch prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try {
      await api.patch('/api/admin/ai/settings', { prompt });
      alert('AI Prompt updated successfully!');
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Failed to save prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignMsg) return;
    
    if (!confirm(`Are you sure you want to send this broadcast to all ${audience}?`)) return;

    setSendingCampaign(true);
    try {
      const res = await api.post('/api/admin/campaigns/send', { audience, message: campaignMsg });
      alert(res?.message || 'Broadcast sent successfully!');
      setCampaignMsg('');
    } catch (error) {
      console.error('Failed to send campaign:', error);
      alert('Failed to send broadcast. Check if a WhatsApp session is connected.');
    } finally {
      setSendingCampaign(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">AI Centre & Campaigns</h1>
          <p className="text-muted mt-1">Manage AI instructions and send WhatsApp broadcasts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* AI Settings */}
        <Card className="p-6 flex flex-col h-full shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-light rounded-lg">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text">Gemini 2.5 Flash Settings</h2>
          </div>
          
          <p className="text-sm text-muted mb-4">
            Edit the system instructions given to the AI. This controls how the AI classifies incoming WhatsApp orders and interacts with pharmacies.
          </p>

          <div className="flex-1 flex flex-col">
            <Label htmlFor="prompt" className="mb-2">System Prompt</Label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full flex-1 min-h-[300px] p-3 rounded-md border border-border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
              placeholder="Enter system prompt..."
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSavePrompt} loading={savingPrompt} className="bg-primary hover:bg-primary-dark">
              <Save className="w-4 h-4 mr-2" />
              Save AI Configuration
            </Button>
          </div>
        </Card>

        {/* Campaign Broadcast */}
        <Card className="p-6 flex flex-col h-full shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-light rounded-lg">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text">WhatsApp Broadcast</h2>
          </div>
          
          <p className="text-sm text-muted mb-4">
            Send a mass WhatsApp message to your users. The message will be sent through the active pharmacy numbers connected to the system.
          </p>

          <form onSubmit={handleSendCampaign} className="space-y-4 flex-1 flex flex-col">
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="clinics">All Clinics (Customers)</option>
                <option value="pharmacies">All Pharmacies (Partners)</option>
              </select>
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
              <Label htmlFor="message">Message Content</Label>
              <textarea
                id="message"
                value={campaignMsg}
                onChange={(e) => setCampaignMsg(e.target.value)}
                required
                className="w-full flex-1 min-h-[200px] p-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                placeholder="Type your broadcast message here..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={sendingCampaign} className="bg-primary hover:bg-primary-dark">
                <Send className="w-4 h-4 mr-2" />
                Send Broadcast
              </Button>
            </div>
          </form>
        </Card>

      </div>
    </div>
  );
}
