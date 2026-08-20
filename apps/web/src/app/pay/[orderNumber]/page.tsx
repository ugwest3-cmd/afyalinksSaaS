import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Payment Request - Afya Links',
};

async function getOrder(orderNumber: string) {
  try {
    const data = await api.get(`/api/orders/public/${orderNumber}`);
    return data;
  } catch (error) {
    return null;
  }
}

export default async function PublicPaymentPage({ params }: { params: { orderNumber: string } }) {
  const order = await getOrder(params.orderNumber);

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F7FAF9] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center shadow-lg">
          <AlertCircle className="w-16 h-16 text-[#D64545] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#17211E] mb-2">Order Not Found</h1>
          <p className="text-[#6B7773]">The requested order could not be found or is no longer available.</p>
        </Card>
      </div>
    );
  }

  const isPaid = order.status === 'PAID' || order.payment_status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED' || order.status === 'EXPIRED';
  const isAwaitingConfirmation = !order.total_amount;

  return (
    <div className="min-h-screen bg-[#F7FAF9] flex flex-col p-4 items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B8F6A] mb-2">AFYA LINKS</h1>
          <p className="text-[#6B7773] font-medium uppercase tracking-wider text-sm">Payment Request</p>
        </div>

        <Card className="p-6 md:p-8 shadow-xl border-t-4 border-t-[#0B8F6A]">
          <div className="text-center space-y-6">
            <div>
              <p className="text-sm text-[#6B7773] mb-1">Order Number</p>
              <p className="text-xl font-bold text-[#17211E]">{order.order_number}</p>
            </div>
            
            {order.pharmacy && (
              <div>
                <p className="text-sm text-[#6B7773] mb-1">Pharmacy</p>
                <p className="text-lg text-[#17211E]">{order.pharmacy.name}</p>
              </div>
            )}

            {isAwaitingConfirmation ? (
              <div className="bg-[#E8F7F2] p-6 rounded-lg text-[#075C47]">
                <ClockIcon className="w-12 h-12 mx-auto mb-3 opacity-80" />
                <p className="font-semibold">Awaiting Pharmacy Confirmation</p>
                <p className="text-sm mt-2 opacity-90">The pharmacy is preparing your total amount.</p>
              </div>
            ) : isPaid ? (
              <div className="bg-[#E8F7F2] p-6 rounded-lg text-[#16834B]">
                <CheckCircle className="w-16 h-16 mx-auto mb-3" />
                <p className="text-xl font-bold">Payment Successful</p>
                <p className="text-sm mt-1">Thank you for your order.</p>
              </div>
            ) : isCancelled ? (
              <div className="bg-[#FEF2F2] p-6 rounded-lg text-[#D64545]">
                <XCircle className="w-16 h-16 mx-auto mb-3" />
                <p className="text-xl font-bold">Order Cancelled</p>
                <p className="text-sm mt-1">This order is no longer valid for payment.</p>
              </div>
            ) : (
              <>
                <div className="py-4 border-y border-[#DCE7E3]">
                  <p className="text-sm text-[#6B7773] mb-2">Total Amount Due</p>
                  <p className="text-4xl font-extrabold text-[#17211E]">
                    UGX {Number(order.total_amount).toLocaleString()}
                  </p>
                </div>

                <Button 
                  asChild
                  className="w-full text-lg h-14 bg-[#0B8F6A] hover:bg-[#075C47] text-white rounded-xl shadow-lg transition-all"
                >
                  <a href={`/api/payments/redirect/${order.order_number}`}>
                    PAY NOW
                  </a>
                </Button>
              </>
            )}
          </div>
        </Card>

        <div className="text-center text-sm text-[#6B7773] flex items-center justify-center gap-2">
          Secure payment powered by <strong>PesaPal</strong>
        </div>
      </div>
    </div>
  );
}

function ClockIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
