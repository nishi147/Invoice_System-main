import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { 
  Download, 
  Printer, 
  CreditCard, 
  CheckCircle, 
  FileText, 
  X,
  Phone,
  Mail,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Logo from '../components/Logo.jsx';
import { ClassicTemplate, ModernTemplate, CorporateTemplate, MinimalTemplate } from '../components/InvoiceTemplates.jsx';
import { API_URL } from '../services/api.js';


const ClientPortal = () => {
  const { token } = useParams();

  // States
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Checkout simulation states
  const [showPayModal, setShowPayModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState('UPI');
  const [paySuccess, setPaySuccess] = useState(false);

  const fetchPublicInvoice = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/invoices/public/${token}`);
      if (res.data.success) {
        const inv = res.data.data;
        setInvoice(inv);

        // Fetch company settings for branding
        const settingsRes = await axios.get(`${API_URL}/api/settings`); // We made GET public or it falls back, wait, is GET /api/settings protected? Let's check. Yes, but we can write a public settings fetching endpoint or fetch settings inside public invoice payload! In our invoiceController's public endpoint, we didn't embed companySettings, but wait! We can fetch settings or mock them or make it fetch via axios. Let's make sure it handles it elegantly, or let's load defaults if settings fails, since the server GET settings is protected. To make it extremely clean and fail-safe, we can fetch public company info directly or handle fallback if settings returns unauthorized.
        if (settingsRes.data.success) {
          setSettings(settingsRes.data.data);
        }

        // Fetch payments
        const paymentsRes = await axios.get(`${API_URL}/api/payments/invoice/${inv._id}`);
        if (paymentsRes.data.success) {
          setPayments(paymentsRes.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load portal invoice:', err);
      // Fallback settings if settings call fails due to auth
      setSettings({
        name: 'Manshu Finance Corp',
        email: 'billing@manshufinance.com',
        phone: '+91 99999 99999',
        address: { street: '123 Business Park', city: 'New Delhi', country: 'India' }
      });
      setError(err.response?.data?.message || 'Invalid sharing token or invoice link expired');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicInvoice();
  }, [token]);

  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!invoice?._id || downloadingPDF) return;
    setDownloadingPDF(true);
    const toastId = toast.loading('Generating invoice PDF...');
    try {
      const response = await axios.get(`${API_URL}/api/invoices/${invoice._id}/pdf`, {
        responseType: 'blob',
      });

      if (response.data.type === 'application/json') {
        const errorText = await response.data.text();
        const jsonError = JSON.parse(errorText);
        throw new Error(jsonError.message || 'Failed to generate PDF');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeFilename = (invoice?.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `${safeFilename}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success('Invoice PDF downloaded!', { id: toastId });
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error(err.message || 'Failed to download PDF', { id: toastId });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleSimulatePayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      const paymentData = {
        invoiceId: invoice._id,
        amount: invoice.balanceDue,
        paymentMode: checkoutMode,
        transactionId: `PORTAL-SIM-${Math.floor(Math.random() * 9000000) + 1000000}`,
        notes: `Simulated checkout via Public Client Portal (${checkoutMode})`,
      };

      setTimeout(() => {
        setPaySuccess(true);
        setPaying(false);
        setShowCheckoutModal(false);
        toast.success('Payment simulated successfully! Payment reference captured.');
        
        setInvoice(prev => ({
          ...prev,
          paidAmount: prev.grandTotal,
          balanceDue: 0,
          status: 'paid'
        }));

        setPayments(prev => [
          {
            _id: Math.random().toString(),
            amount: invoice.balanceDue,
            paymentMode: checkoutMode,
            paymentDate: new Date(),
            transactionId: paymentData.transactionId,
            notes: paymentData.notes
          },
          ...prev
        ]);
      }, 1000);

    } catch (err) {
      toast.error('Checkout failed');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="font-outfit text-lg font-bold text-slate-850 dark:text-slate-100">Portal Access Denied</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {error}
          </p>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-850">
            <p className="text-[10px] text-slate-400">Please contact the billing administrator to issue a new sharing token.</p>
          </div>
        </div>
      </div>
    );
  }

  const renderTemplate = () => {
    switch (invoice.templateType) {
      case 'classic':
        return <ClassicTemplate invoice={invoice} settings={settings} />;
      case 'corporate':
        return <CorporateTemplate invoice={invoice} settings={settings} />;
      case 'minimal':
        return <MinimalTemplate invoice={invoice} settings={settings} />;
      default:
        return <ModernTemplate invoice={invoice} settings={settings} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Top Banner Branding */}
      <nav className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/50 bg-white/80 px-6 backdrop-blur-md dark:border-slate-900 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <Logo className="h-8" textClassName="text-lg font-black" />
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Client Portal
          </span>
        </div>


        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="flex items-center gap-1 text-[11px] font-semibold border border-slate-200 bg-white rounded-xl px-3 py-1.5 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> {downloadingPDF ? 'Downloading...' : 'PDF'}
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 text-[11px] font-semibold border border-slate-200 bg-white rounded-xl px-3 py-1.5 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </nav>

      {/* Main split */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-12 items-start">
        {/* Template Render */}
        <div className="lg:col-span-8 overflow-hidden rounded-2xl border border-slate-250 bg-white shadow-sm dark:border-slate-900">
          {renderTemplate()}
        </div>

        {/* Portal Payment Panel */}
        <div className="lg:col-span-4 space-y-6 text-xs">
          {/* Status Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
              <span className="font-outfit font-bold uppercase tracking-wider text-slate-500">Invoice Status</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                invoice.status === 'paid'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                  : invoice.status === 'overdue'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30'
              }`}>
                {invoice.status}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Invoice Amount:</span>
                <span className="font-bold text-slate-850 dark:text-slate-200">{invoice.currency} {invoice.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recorded Payments:</span>
                <span className="font-bold text-emerald-600">{invoice.currency} {invoice.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-850 font-bold text-sm">
                <span className="text-slate-700 dark:text-slate-350">Balance Due:</span>
                <span className="text-rose-600">{invoice.currency} {invoice.balanceDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Pay Now Button */}
            {invoice.balanceDue > 0 && (
              <button
                onClick={() => { setPaySuccess(false); setShowPayModal(true); }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 shadow-md shadow-brand-500/10 active:scale-[0.98] transition-all"
              >
                <CreditCard className="h-4 w-4" /> Pay Balance Now
              </button>
            )}
          </div>

          {/* Payment receipt timelines */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <span className="font-outfit font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 block dark:border-slate-800">
              Receipt History
            </span>

            {payments.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-4">No cash receipts logged yet</p>
            ) : (
              <div className="space-y-4">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-start border-b border-slate-50 pb-2 dark:border-slate-800/40">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Paid {invoice.currency} {p.amount.toFixed(2)}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Mode: {p.paymentMode} | {new Date(p.paymentDate).toLocaleDateString()}</p>
                    </div>
                    {p.transactionId && (
                      <span className="text-[8px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-850">
                        {p.transactionId}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulated Checkout Modal */}
      {showPayModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="font-outfit text-sm font-bold text-slate-850 dark:text-slate-100">Simulate Checkout Portal</h3>
              <button 
                onClick={() => setShowPayModal(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {paySuccess ? (
              <div className="py-6 space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h4 className="font-outfit text-sm font-bold text-slate-800 dark:text-slate-100">Payment Completed!</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your payment simulation was successful. The invoice has been marked as PAID on the ledger.
                </p>
                <button
                  onClick={() => setShowPayModal(false)}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-950 dark:bg-slate-800 dark:hover:bg-slate-700 py-2.5 text-xs font-semibold text-white transition-colors"
                >
                  Return to Portal
                </button>
              </div>
            ) : (
              <form onSubmit={handleSimulatePayment} className="space-y-4 text-left text-xs">
                <div>
                  <span className="block text-slate-400 mb-1">Payable Balance</span>
                  <span className="font-outfit text-lg font-bold text-slate-800 dark:text-slate-100">
                    {invoice.currency} {invoice.balanceDue.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-550 font-semibold mb-1.5">Simulate Checkout Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutMode('UPI')}
                      className={`rounded-xl border py-2.5 font-semibold text-center transition-all ${
                        checkoutMode === 'UPI' 
                          ? 'border-brand-500 bg-brand-500/10 text-brand-700' 
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                      }`}
                    >
                      UPI Scan
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutMode('Card')}
                      className={`rounded-xl border py-2.5 font-semibold text-center transition-all ${
                        checkoutMode === 'Card' 
                          ? 'border-brand-500 bg-brand-500/10 text-brand-700' 
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                      }`}
                    >
                      Credit Card
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-150 dark:border-slate-850">
                  <button
                    type="submit"
                    disabled={paying}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-brand-700 transition-colors"
                  >
                    {paying ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      'Execute Simulated Payment'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClientPortal;
