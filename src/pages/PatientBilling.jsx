import React, { useState, useEffect } from 'react';
import {
    Receipt, FileText, CreditCard, Clock, CheckCircle,
    AlertTriangle, ArrowLeft, Eye, Download, RefreshCw,
    DollarSign, Building2, Calendar, ChevronDown, ChevronUp,
    Pill, Activity, Clipboard, User, Heart, X, Wallet,
    Smartphone, Banknote, IndianRupee, Landmark, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const STATUS_STYLES = {
    DRAFT: 'bg-gray-100 text-gray-700',
    FINALIZED: 'bg-blue-100 text-blue-700',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-red-50 text-red-500',
    REFUNDED: 'bg-purple-100 text-purple-700',
};

const StatusBadge = ({ status }) => (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
        {status?.replace(/_/g, ' ')}
    </span>
);

// ================================================
// BILL CARD (compact)
// ================================================
const BillCard = ({ bill, onView, onPay }) => {
    const isPaid = bill.status === 'PAID';
    const canPay = ['FINALIZED', 'PARTIALLY_PAID', 'OVERDUE'].includes(bill.status);

    return (
        <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-bold text-gray-900 text-sm">{bill.billNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(bill.billDate || bill.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                        })}
                    </p>
                </div>
                <StatusBadge status={bill.status} />
            </div>

            <div className="flex items-center justify-between text-sm">
                <div>
                    <p className="text-gray-500 text-xs">Total</p>
                    <p className="font-bold text-gray-900">₹{bill.grandTotal?.toFixed(2)}</p>
                </div>
                {bill.balanceDue > 0 && (
                    <div className="text-right">
                        <p className="text-gray-500 text-xs">Balance Due</p>
                        <p className="font-bold text-red-600">₹{bill.balanceDue?.toFixed(2)}</p>
                    </div>
                )}
                {isPaid && (
                    <div className="text-right">
                        <p className="text-gray-500 text-xs">Paid</p>
                        <p className="font-bold text-green-600">₹{bill.amountPaid?.toFixed(2)}</p>
                    </div>
                )}
            </div>

            {bill.hospitalId && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {bill.hospitalId.name || 'Hospital'}
                </p>
            )}

            <div className="flex gap-2">
                <button onClick={() => onView(bill._id)}
                    className="flex-1 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> View Details
                </button>
                {canPay && (
                    <button onClick={() => onPay(bill)}
                        className="flex-1 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" /> Pay Now
                    </button>
                )}
            </div>
        </div>
    );
};

// ================================================
// BILL DETAIL VIEW
// ================================================
const BillDetailView = ({ billId, onBack }) => {
    const [bill, setBill] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandItemsSection, setExpandItemsSection] = useState(true);
    const [expandPaymentHistory, setExpandPaymentHistory] = useState(true);

    useEffect(() => {
        const fetchBill = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/billing/${billId}`, {
                    headers: { 'x-auth-token': token }
                });
                setBill(res.data.bill);
            } catch (err) {
                toast.error('Failed to load bill details');
            } finally {
                setLoading(false);
            }
        };

        const fetchPayments = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/billing/${billId}/payments`, {
                    headers: { 'x-auth-token': token }
                });
                setPayments(res.data || []);
            } catch (err) {
                // silently fail
            }
        };

        fetchBill();
        fetchPayments();
    }, [billId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="text-center py-20 text-gray-500">
                <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
                <p>Bill not found</p>
                <button onClick={onBack} className="mt-4 text-blue-600 text-sm font-semibold">← Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Back button */}
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 font-semibold hover:text-blue-700">
                <ArrowLeft className="w-4 h-4" /> Back to Bills
            </button>

            {/* Header */}
            <div className="bg-white rounded-xl border p-5 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{bill.billNumber}</h2>
                        <p className="text-xs text-gray-500">
                            {new Date(bill.billDate || bill.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric'
                            })}
                        </p>
                    </div>
                    <StatusBadge status={bill.status} />
                </div>

                {bill.hospitalId && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-gray-400" /> {bill.hospitalId.name || 'Hospital'}
                    </p>
                )}

                {/* Summary Grid */}
                <div className="grid grid-cols-3 gap-3 mt-2">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-lg font-bold text-gray-900">₹{bill.grandTotal?.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="text-lg font-bold text-green-600">₹{bill.amountPaid?.toFixed(2)}</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${bill.balanceDue > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className="text-xs text-gray-500">Balance</p>
                        <p className={`text-lg font-bold ${bill.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{bill.balanceDue?.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-xl border">
                <button onClick={() => setExpandItemsSection(!expandItemsSection)}
                    className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-gray-700">
                    <span className="flex items-center gap-2">
                        <Clipboard className="w-4 h-4" /> Items ({bill.items?.length || 0})
                    </span>
                    {expandItemsSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandItemsSection && (
                    <div className="px-5 pb-4 space-y-2">
                        {bill.items?.map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                                <div>
                                    <p className="font-medium text-gray-900">{item.description}</p>
                                    <p className="text-xs text-gray-500">{item.category} · Qty: {item.quantity}</p>
                                </div>
                                <p className="font-semibold text-gray-900">₹{(item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
                <div className="bg-white rounded-xl border">
                    <button onClick={() => setExpandPaymentHistory(!expandPaymentHistory)}
                        className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-gray-700">
                        <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> Payment History ({payments.length})
                        </span>
                        {expandPaymentHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandPaymentHistory && (
                        <div className="px-5 pb-4 space-y-2">
                            {payments.map((p, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                                    <div>
                                        <p className="font-medium text-gray-900">₹{p.amount?.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500">
                                            {p.method} · {new Date(p.createdAt).toLocaleDateString('en-IN')}
                                        </p>
                                        {p.receiptNumber && (
                                            <p className="text-xs text-gray-400 font-mono">Receipt: {p.receiptNumber}</p>
                                        )}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        p.status === 'PENDING_VERIFICATION' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {p.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Insurance Info */}
            {bill.insurance?.provider && (
                <div className="bg-white rounded-xl border p-5 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Heart className="w-4 h-4" /> Insurance
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 text-xs">Provider</p>
                            <p className="font-medium">{bill.insurance.provider}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Approved Amount</p>
                            <p className="font-medium text-green-600">₹{bill.insurance.approvedAmount?.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ================================================
// PATIENT PAYMENT MODAL (Razorpay Gateway — like Amazon/Flipkart)
// Payment is confirmed ONLY when bank verifies the transfer
// ================================================
const PatientPaymentModal = ({ bill, onClose, onSuccess }) => {
    const [amount, setAmount] = useState(bill?.balanceDue?.toFixed(2) || '');
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState('form'); // 'form' | 'success'
    const [result, setResult] = useState(null);

    const numAmt = parseFloat(amount) || 0;
    const isValid = numAmt > 0 && numAmt <= (bill?.balanceDue || 0);

    // Fetch order from server (creates a Razorpay order)
    const fetchOrder = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                `${API_URL}/api/billing/${bill._id}/create-order`,
                { amount: numAmt },
                { headers: { 'x-auth-token': token } }
            );
            return res.data;
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to initiate payment');
            return null;
        }
    };

    // Open Razorpay checkout — handles UPI, Card, Net Banking, Wallet
    // On mobile: UPI redirects to PhonePe/GPay/Paytm directly
    // On desktop: Shows UPI QR code, card form, etc.
    // Payment is confirmed ONLY when bank verifies the transfer
    const handlePay = async () => {
        setProcessing(true);
        try {
            const data = await fetchOrder();
            if (!data) { setProcessing(false); return; }

            // Guard: if Razorpay order wasn't created (e.g. keys not configured)
            if (!data.order || !data.key) {
                toast.error('Payment gateway not configured. Please contact the hospital.');
                setProcessing(false);
                return;
            }

            const options = {
                key: data.key,
                amount: data.order.amount,
                currency: data.order.currency,
                name: bill.hospitalId?.name || 'Hospital',
                description: `Bill Payment - ${bill.billNumber}`,
                order_id: data.order.id,
                prefill: {
                    name: data.patient?.name || '',
                    email: data.patient?.email || '',
                    contact: data.patient?.phone || '',
                },
                theme: { color: '#2563EB' },
                handler: async function (response) {
                    // Razorpay received payment confirmation from the bank
                    // Verify the cryptographic signature on our server
                    try {
                        const token = localStorage.getItem('token');
                        const verifyRes = await axios.post(
                            `${API_URL}/api/billing/${bill._id}/verify-payment`,
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                amount: numAmt,
                                method: 'UPI',
                            },
                            { headers: { 'x-auth-token': token } }
                        );
                        setResult(verifyRes.data);
                        setStep('success');
                        toast.success(verifyRes.data.message || 'Payment successful! 🎉');
                    } catch (err) {
                        toast.error(err.response?.data?.msg || 'Payment verification failed');
                    } finally {
                        setProcessing(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                        toast('Payment cancelled', { icon: '⚠️' });
                    }
                },
            };

            if (typeof window.Razorpay === 'undefined') {
                toast.error('Payment gateway not loaded. Please refresh and try again.');
                setProcessing(false);
                return;
            }
            const razorpay = new window.Razorpay(options);
            razorpay.on('payment.failed', (resp) => {
                setProcessing(false);
                toast.error(resp.error?.description || 'Payment failed');
            });
            razorpay.open();
        } catch (err) {
            console.error('Payment error:', err);
            toast.error('Something went wrong. Please try again.');
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && !processing && onClose()}>
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-5 py-4 flex justify-between items-center rounded-t-2xl z-10">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {step === 'success' ? 'Payment Successful' : 'Pay Bill'}
                        </h3>
                        <p className="text-xs text-gray-500">{bill.billNumber}</p>
                    </div>
                    {!processing && (
                        <button onClick={step === 'success' ? () => { onSuccess?.(); onClose(); } : onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Success Step */}
                {step === 'success' && result && (
                    <div className="p-6 space-y-4 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto animate-bounce">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">₹{numAmt.toFixed(2)}</p>
                            <p className="text-sm text-gray-500 mt-1">Payment confirmed successfully!</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Receipt</span>
                                <span className="font-mono font-medium">{result.payment?.receiptNumber}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Remaining Balance</span>
                                <span className={`font-bold ${result.bill?.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{result.bill?.balanceDue?.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Bill Status</span>
                                <StatusBadge status={result.bill?.status} />
                            </div>
                        </div>
                        <button onClick={() => { onSuccess?.(); onClose(); }}
                            className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors">
                            Done
                        </button>
                    </div>
                )}

                {/* Form Step */}
                {step === 'form' && (
                    <div className="p-5 space-y-5">
                        {/* Amount Due Banner */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white">
                            <p className="text-xs text-blue-200">Amount Due</p>
                            <p className="text-3xl font-bold">₹{bill.balanceDue?.toFixed(2)}</p>
                            <p className="text-xs text-blue-200 mt-1">
                                Total: ₹{bill.grandTotal?.toFixed(2)} · Paid: ₹{bill.amountPaid?.toFixed(2)}
                            </p>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Payment Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00" step="0.01" min="0" max={bill.balanceDue}
                                    className="w-full pl-8 pr-4 py-3 border rounded-xl text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setAmount(bill.balanceDue?.toFixed(2))}
                                    className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 font-medium">
                                    Full Amount
                                </button>
                                {bill.balanceDue > 100 && (
                                    <button onClick={() => setAmount((bill.balanceDue / 2).toFixed(2))}
                                        className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 font-medium">
                                        50%
                                    </button>
                                )}
                            </div>
                            {numAmt > bill.balanceDue && <p className="text-xs text-red-500 mt-1">Amount exceeds balance due</p>}
                        </div>

                        {/* Pay Now Button */}
                        <button onClick={handlePay} disabled={!isValid || processing}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200">
                            {processing ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-5 h-5" />
                                    Pay ₹{numAmt.toFixed(2)}
                                </>
                            )}
                        </button>

                        {/* Payment methods info */}
                        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>UPI</span>
                            </div>
                            <span>·</span>
                            <div className="flex items-center gap-1">
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Cards</span>
                            </div>
                            <span>·</span>
                            <span>Net Banking</span>
                            <span>·</span>
                            <span>Wallets</span>
                        </div>

                        {/* Security badge */}
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pb-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                            <span>Secured by Razorpay · Bank-verified payments</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ================================================
// MAIN: PATIENT BILLING & DISCHARGE PAGE
// ================================================
const PatientBillingPage = () => {
    const [activeTab, setActiveTab] = useState('bills');
    const [bills, setBills] = useState([]);
    const [discharges, setDischarges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBillId, setSelectedBillId] = useState(null);
    const [selectedDischargeId, setSelectedDischargeId] = useState(null);
    const [quickPayBill, setQuickPayBill] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-auth-token': token };

            const [billsRes, dischargeRes] = await Promise.all([
                axios.get(`${API_URL}/api/billing/patient`, { headers }).catch(() => ({ data: { bills: [] } })),
                axios.get(`${API_URL}/api/discharge/patient`, { headers }).catch(() => ({ data: [] })),
            ]);

            setBills(billsRes.data.bills || billsRes.data || []);
            setDischarges(Array.isArray(dischargeRes.data) ? dischargeRes.data : []);
        } catch (err) {
            toast.error('Failed to load billing data');
        } finally {
            setLoading(false);
        }
    };

    if (selectedBillId) {
        return (
            <div className="max-w-3xl mx-auto p-4">
                <BillDetailView billId={selectedBillId} onBack={() => { setSelectedBillId(null); fetchData(); }} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">My Bills & Discharge</h1>
                    <p className="text-sm text-gray-500">View and pay your hospital bills</p>
                </div>
                <button onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setActiveTab('bills')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'bills' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                    <Receipt className="w-4 h-4 inline mr-1" /> Bills ({bills.length})
                </button>
                <button onClick={() => setActiveTab('discharge')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'discharge' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                    <FileText className="w-4 h-4 inline mr-1" /> Discharge ({discharges.length})
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            )}

            {/* Bills Tab */}
            {!loading && activeTab === 'bills' && (
                <div className="space-y-3">
                    {bills.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="font-semibold">No bills yet</p>
                            <p className="text-sm mt-1">Bills will appear here after your hospital visit</p>
                        </div>
                    ) : (
                        bills.map(bill => (
                            <BillCard
                                key={bill._id}
                                bill={bill}
                                onView={setSelectedBillId}
                                onPay={setQuickPayBill}
                            />
                        ))
                    )}
                </div>
            )}

            {/* Discharge Tab */}
            {!loading && activeTab === 'discharge' && (
                <div className="space-y-3">
                    {discharges.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="font-semibold">No discharge summaries</p>
                            <p className="text-sm mt-1">Discharge summaries will appear here</p>
                        </div>
                    ) : (
                        discharges.map(d => (
                            <div key={d._id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{d.dischargeId || 'Discharge'}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(d.dischargeDate || d.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${d.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {d.status}
                                    </span>
                                </div>
                                {d.diagnosis && (
                                    <p className="text-xs text-gray-600"><strong>Diagnosis:</strong> {d.diagnosis}</p>
                                )}
                                {d.hospitalId && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <Building2 className="w-3 h-3" /> {d.hospitalId.name || 'Hospital'}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Payment Modal */}
            {quickPayBill && (
                <PatientPaymentModal
                    bill={quickPayBill}
                    onClose={() => setQuickPayBill(null)}
                    onSuccess={() => {
                        setQuickPayBill(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

export default PatientBillingPage;
