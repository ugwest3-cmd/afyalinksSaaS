'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, Activity, Database, Smartphone } from 'lucide-react';

export default function SystemPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#17211E]">System Health</h1>
          <p className="text-[#6B7773]">Monitor core services and infrastructure</p>
        </div>
        <Button variant="outline"><Activity className="w-4 h-4 mr-2" /> Refresh Status</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 shadow-sm border-l-4 border-l-[#16834B]">
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-5 h-5 text-[#6B7773]" />
            <h3 className="font-semibold text-[#17211E]">API Server</h3>
          </div>
          <p className="text-[#16834B] font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16834B]" /> Operational
          </p>
          <p className="text-xs text-[#6B7773] mt-2">Uptime: 99.9%</p>
        </Card>

        <Card className="p-4 shadow-sm border-l-4 border-l-[#16834B]">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-[#6B7773]" />
            <h3 className="font-semibold text-[#17211E]">Database (Supabase)</h3>
          </div>
          <p className="text-[#16834B] font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16834B]" /> Operational
          </p>
          <p className="text-xs text-[#6B7773] mt-2">Latency: 12ms</p>
        </Card>

        <Card className="p-4 shadow-sm border-l-4 border-l-[#D98A00]">
          <div className="flex items-center gap-3 mb-2">
            <Smartphone className="w-5 h-5 text-[#6B7773]" />
            <h3 className="font-semibold text-[#17211E]">WhatsApp Baileys</h3>
          </div>
          <p className="text-[#D98A00] font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D98A00]" /> Degraded
          </p>
          <p className="text-xs text-[#6B7773] mt-2">1 Session Disconnected</p>
        </Card>

        <Card className="p-4 shadow-sm border-l-4 border-l-[#16834B]">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-[#6B7773]" />
            <h3 className="font-semibold text-[#17211E]">PesaPal API</h3>
          </div>
          <p className="text-[#16834B] font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16834B]" /> Operational
          </p>
          <p className="text-xs text-[#6B7773] mt-2">Token valid</p>
        </Card>
      </div>
    </div>
  );
}
