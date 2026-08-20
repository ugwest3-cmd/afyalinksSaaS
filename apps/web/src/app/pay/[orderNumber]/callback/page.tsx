'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function PaymentCallbackPage({ params }: { params: { orderNumber: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  
  const OrderTrackingId = searchParams.get('OrderTrackingId');
  const OrderMerchantReference = searchParams.get('OrderMerchantReference');

  useEffect(() => {
    if (!OrderTrackingId) {
      setStatus('failed');
      return;
    }

    const verifyPayment = async () => {
      try {
        await api.post(`/api/payments/verify`, {
          orderNumber: params.orderNumber,
          trackingId: OrderTrackingId,
          merchantReference: OrderMerchantReference,
        });
        setStatus('success');
        
        // Auto-redirect
        setTimeout(() => {
          router.push(`/pay/${params.orderNumber}`);
        }, 4000);
      } catch (error) {
        setStatus('failed');
      }
    };

    verifyPayment();
  }, [params.orderNumber, OrderTrackingId, OrderMerchantReference, router]);

  return (
    <div className="min-h-screen bg-[#F7FAF9] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-[#0B8F6A]">AFYA LINKS</h1>
        
        <Card className="p-8 shadow-lg">
          {status === 'processing' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-16 h-16 text-[#0B8F6A] animate-spin" />
              <h2 className="text-xl font-semibold text-[#17211E]">Verifying Payment...</h2>
              <p className="text-[#6B7773]">Please wait while we confirm with PesaPal.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="w-16 h-16 text-[#16834B]" />
              <h2 className="text-xl font-bold text-[#17211E]">Payment Successful!</h2>
              <p className="text-[#6B7773]">Your order #{params.orderNumber} is now paid.</p>
              <p className="text-sm text-[#6B7773] mt-4">Redirecting you shortly...</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="w-16 h-16 text-[#D64545]" />
              <h2 className="text-xl font-bold text-[#17211E]">Payment Failed</h2>
              <p className="text-[#6B7773]">We could not verify your payment.</p>
              <Button 
                onClick={() => router.push(`/pay/${params.orderNumber}`)}
                className="mt-4 bg-[#0B8F6A] hover:bg-[#075C47]"
              >
                Try Again
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
