import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  DollarSign, FileText, Plus, Search, Filter, Eye, Printer,
  CheckCircle, XCircle, Clock, AlertTriangle, CreditCard,
  Receipt, TrendingUp, ArrowLeft, Trash2, Edit2, X, Send,
  BarChart3, RefreshCw, Shield, ChevronDown, ChevronUp,
  Banknote, Wallet, Building2, Activity, Users, Calendar,
  Download, BadgePercent, Landmark, Zap
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// ================================================
// SUB-COMPONENTS
// ================================================

/** Status badge colors */
const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-700',
  FINALIZED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-red-50 text-red-500',
  REFUNDED: 'bg-purple-100 text-purple-700',
  DISPUTED: 'bg-orange-100 text-orange-700',
  WRITTEN_OFF: 'bg-gray-200 text-gray-500'
};

const CATEGORY_OPTIONS = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'LAB_TEST', label: 'Lab Test' },
  { value: 'IMAGING', label: 'Imaging' },
  { value: 'ROOM_CHARGE', label: 'Room Charge' },
  { value: 'NURSING', label: 'Nursing' },
  { value: 'SURGICAL', label: 'Surgical' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'MISCELLANEOUS', label: 'Miscellaneous' }
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: Wallet },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'NET_BANKING', label: 'Net Banking', icon: Building2 },
  { value: 'INSURANCE', label: 'Insurance', icon: Shield },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 }
];

const GOVT_SCHEMES = [
  { value: 'AYUSHMAN_BHARAT', label: 'Ayushman Bharat (PM-JAY)', maxCoverage: 500000 },
  { value: 'PM_JAY', label: 'Pradhan Mantri Jan Arogya Yojana', maxCoverage: 500000 },
  { value: 'ESI', label: 'ESI (Employees State Insurance)', maxCoverage: 0 },
  { value: 'CGHS', label: 'CGHS (Central Govt Health Scheme)', maxCoverage: 0 },
  { value: 'STATE_HEALTH_SCHEME', label: 'State Health Scheme', maxCoverage: 0 },
  { value: 'BPL_CARD', label: 'BPL Card Holder', maxCoverage: 0 },
  { value: 'SENIOR_CITIZEN', label: 'Senior Citizen Discount', maxCoverage: 0 },
  { value: 'EX_SERVICEMAN', label: 'Ex-Serviceman', maxCoverage: 0 },
  { value: 'FREEDOM_FIGHTER', label: 'Freedom Fighter', maxCoverage: 0 },
  { value: 'JANANI_SURAKSHA', label: 'Janani Suraksha Yojana', maxCoverage: 0 },
  { value: 'RASHTRIYA_SWASTHYA_BIMA', label: 'Rashtriya Swasthya Bima Yojana', maxCoverage: 30000 },
  { value: 'OTHER', label: 'Other Scheme', maxCoverage: 0 }
];

/** Generate and download PDF invoice using browser print */
const generatePDFInvoice = async (billId) => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${API_URL}/api/billing/${billId}/invoice-data`, {
      headers: { 'x-auth-token': token }
    });

    const { bill, payments, generatedAt } = res.data;
    const hospital = bill.hospitalId || {};
    const patient = bill.patientSnapshot || {};

    const invoiceWindow = window.open('', '_blank', 'width=800,height=900');
    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${bill.billNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; padding: 20px; }
          .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
          .hospital-info h1 { font-size: 20px; color: #2563eb; margin-bottom: 4px; }
          .hospital-info p { font-size: 11px; color: #666; }
          .invoice-title { text-align: right; }
          .invoice-title h2 { font-size: 24px; color: #333; letter-spacing: 2px; }
          .invoice-title p { font-size: 11px; color: #666; margin-top: 4px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
          .meta-box h4 { font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; letter-spacing: 1px; }
          .meta-box p { font-size: 12px; margin-bottom: 2px; }
          .meta-box .highlight { font-weight: 600; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          thead th { background: #2563eb; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
          tbody td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          .text-right { text-align: right; }
          .summary-table { width: 300px; margin-left: auto; }
          .summary-table td { padding: 6px 10px; font-size: 12px; }
          .summary-table .total-row td { border-top: 2px solid #333; font-size: 16px; font-weight: 700; color: #1e293b; }
          .scheme-badge { background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-size: 10px; display: inline-block; margin-top: 6px; }
          .gst-info { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px; margin-bottom: 15px; font-size: 11px; }
          .payment-section { border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px; }
          .payment-section h4 { font-size: 12px; font-weight: 600; margin-bottom: 6px; }
          .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; }
          .status-paid { background: #dcfce7; color: #166534; }
          .status-unpaid { background: #fee2e2; color: #991b1b; }
          .status-partial { background: #fef3c7; color: #92400e; }
          .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
          @media print { body { padding: 0; } .invoice-container { border: none; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="hospital-info">
              <h1>${hospital.name || 'Hospital'}</h1>
              <p>${hospital.address || ''}</p>
              <p>Phone: ${hospital.phone || 'N/A'} | Email: ${hospital.email || 'N/A'}</p>
              ${bill.gstDetails?.hospitalGSTIN ? `<p>GSTIN: ${bill.gstDetails.hospitalGSTIN}</p>` : ''}
            </div>
            <div class="invoice-title">
              <h2>INVOICE</h2>
              <p><strong>Bill No:</strong> ${bill.billNumber}</p>
              <p><strong>Date:</strong> ${new Date(bill.billDate).toLocaleDateString('en-IN')}</p>
              <p><strong>Type:</strong> ${bill.billType}</p>
              <p class="status-badge ${bill.status === 'PAID' ? 'status-paid' : bill.status === 'PARTIALLY_PAID' ? 'status-partial' : 'status-unpaid'}">${bill.status?.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <h4>Patient Details</h4>
              <p class="highlight">${patient.name || 'N/A'}</p>
              <p>Phone: ${patient.phone || 'N/A'}</p>
              <p>Age: ${patient.age || 'N/A'} | Gender: ${patient.gender || 'N/A'}</p>
              ${patient.address ? `<p>Address: ${patient.address}</p>` : ''}
            </div>
            <div class="meta-box">
              <h4>Bill Summary</h4>
              ${bill.dueDate ? `<p>Due Date: ${new Date(bill.dueDate).toLocaleDateString('en-IN')}</p>` : ''}
              ${bill.appointmentId ? `<p>Appointment: ${bill.appointmentId.appointmentDate || ''} - Dr. ${bill.appointmentId.doctor || ''}</p>` : ''}
              ${bill.govtScheme?.isApplied ? `<p><span class="scheme-badge">🏛 ${GOVT_SCHEMES.find(s => s.value === bill.govtScheme.schemeName)?.label || bill.govtScheme.schemeName}</span></p><p>Scheme ID: ${bill.govtScheme.schemeId || 'N/A'}</p>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Category</th>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Tax</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${bill.items?.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.category}</td>
                  <td>${item.description}${item.cptCode ? ` <small>(CPT: ${item.cptCode})</small>` : ''}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">₹${item.unitPrice?.toFixed(2)}</td>
                  <td class="text-right">${item.discount > 0 ? item.discount + '%' : '-'}</td>
                  <td class="text-right">${item.taxRate > 0 ? item.taxRate + '%' : '-'}</td>
                  <td class="text-right">₹${item.lineTotal?.toFixed(2)}</td>
                </tr>
              `).join('') || '<tr><td colspan="8">No items</td></tr>'}
            </tbody>
          </table>

          ${bill.gstDetails?.isGSTApplicable ? `
          <div class="gst-info">
            <strong>GST Details</strong> (SAC: ${bill.gstDetails.sacCode || '999312'})
            ${bill.gstDetails.igstRate > 0 ? `<span style="margin-left:12px">IGST @${bill.gstDetails.igstRate}%: ₹${bill.gstDetails.igstAmount?.toFixed(2)}</span>` : `
            <span style="margin-left:12px">CGST @${bill.gstDetails.cgstRate}%: ₹${bill.gstDetails.cgstAmount?.toFixed(2)}</span>
            <span style="margin-left:12px">SGST @${bill.gstDetails.sgstRate}%: ₹${bill.gstDetails.sgstAmount?.toFixed(2)}</span>
            `}
            <span style="margin-left:12px"><strong>Total GST: ₹${bill.gstDetails.totalGST?.toFixed(2)}</strong></span>
          </div>` : ''}

          <table class="summary-table">
            <tr><td>Subtotal</td><td class="text-right">₹${bill.subtotal?.toFixed(2)}</td></tr>
            ${bill.totalDiscount > 0 ? `<tr><td>Discount</td><td class="text-right" style="color:#16a34a">-₹${bill.totalDiscount?.toFixed(2)}</td></tr>` : ''}
            ${bill.totalTax > 0 ? `<tr><td>Item Tax</td><td class="text-right">₹${bill.totalTax?.toFixed(2)}</td></tr>` : ''}
            ${bill.gstDetails?.totalGST > 0 ? `<tr><td>GST</td><td class="text-right">₹${bill.gstDetails.totalGST?.toFixed(2)}</td></tr>` : ''}
            ${bill.govtScheme?.isApplied && bill.govtScheme.approvedAmount > 0 ? `<tr><td style="color:#16a34a">Govt Scheme Discount</td><td class="text-right" style="color:#16a34a">-₹${bill.govtScheme.approvedAmount?.toFixed(2)}</td></tr>` : ''}
            ${bill.insurance?.approvedAmount > 0 ? `<tr><td>Insurance Coverage</td><td class="text-right" style="color:#16a34a">-₹${bill.insurance.approvedAmount?.toFixed(2)}</td></tr>` : ''}
            <tr class="total-row"><td>Grand Total</td><td class="text-right">₹${bill.grandTotal?.toFixed(2)}</td></tr>
            <tr><td>Amount Paid</td><td class="text-right" style="color:#16a34a">₹${bill.amountPaid?.toFixed(2)}</td></tr>
            ${bill.balanceDue > 0 ? `<tr><td><strong>Balance Due</strong></td><td class="text-right" style="color:#dc2626"><strong>₹${bill.balanceDue?.toFixed(2)}</strong></td></tr>` : ''}
          </table>

          ${payments.length > 0 ? `
          <div class="payment-section">
            <h4>Payment History</h4>
            <table>
              <thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th class="text-right">Amount</th><th>Status</th></tr></thead>
              <tbody>
                ${payments.map(p => `
                  <tr>
                    <td>${p.receiptNumber || '-'}</td>
                    <td>${new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>${p.method}</td>
                    <td class="text-right">₹${Math.abs(p.amount).toFixed(2)}</td>
                    <td><span class="status-badge ${p.status === 'COMPLETED' ? 'status-paid' : ''}">${p.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : ''}

          <div class="footer">
            <p>This is a computer-generated invoice. No signature required.</p>
            <p>Generated on ${new Date(generatedAt).toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div class="no-print" style="text-align:center;margin-top:20px;">
          <button onclick="window.print()" style="background:#2563eb;color:white;border:none;padding:10px 30px;border-radius:6px;cursor:pointer;font-size:14px;">
            🖨 Print / Save as PDF
          </button>
        </div>
      </body>
      </html>
    `);
    invoiceWindow.document.close();
    toast.success('Invoice opened in new tab. Use Print > Save as PDF.');
  } catch (err) {
    console.error('PDF generation error:', err);
    toast.error('Failed to generate invoice');
  }
};

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
    {status?.replace(/_/g, ' ')}
  </span>
);

const StatCard = ({ icon: Icon, label, value, sub, color = 'blue' }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-${color}-50`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  </div>
);

// ================================================
// CREATE BILL MODAL
// ================================================
const CreateBillModal = ({ show, onClose, onCreated }) => {
  const [patientId, setPatientId] = useState('');
  const [billType, setBillType] = useState('OPD');
  const [items, setItems] = useState([{
    category: 'CONSULTATION', description: '', unitPrice: 0, quantity: 1, discount: 0, taxRate: 0
  }]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  // Govt scheme state
  const [applyScheme, setApplyScheme] = useState(false);
  const [schemeName, setSchemeName] = useState('');
  const [schemeId, setSchemeId] = useState('');
  const [schemeBeneficiary, setSchemeBeneficiary] = useState('');
  const [schemeDiscount, setSchemeDiscount] = useState(0);
  const [schemeMaxCoverage, setSchemeMaxCoverage] = useState(0);
  const [schemeNotes, setSchemeNotes] = useState('');
  // GST state
  const [applyGST, setApplyGST] = useState(false);
  const [hospitalGSTIN, setHospitalGSTIN] = useState('');
  const [cgstRate, setCgstRate] = useState(9);
  const [sgstRate, setSgstRate] = useState(9);

  useEffect(() => {
    if (patientSearch.length < 2 || patientId) {
      setShowPatientDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/billing/search-patients`, {
          params: { q: patientSearch },
          headers: { 'x-auth-token': token }
        });
        setFilteredPatients(res.data);
        setShowPatientDropdown(true);
      } catch (err) {
        console.error('Patient search failed:', err);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, patientId]);

  const addItem = () => {
    setItems([...items, { category: 'MISCELLANEOUS', description: '', unitPrice: 0, quantity: 1, discount: 0, taxRate: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const calcLineTotal = (item) => {
    const sub = (item.quantity || 1) * (item.unitPrice || 0);
    const disc = sub * (item.discount || 0) / 100;
    const taxable = sub - disc;
    const tax = taxable * (item.taxRate || 0) / 100;
    return (taxable + tax).toFixed(2);
  };

  const grandTotal = items.reduce((sum, item) => sum + parseFloat(calcLineTotal(item)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId) return toast.error('Please select a patient');
    if (items.some(i => !i.description || i.unitPrice <= 0)) {
      return toast.error('All items need a description and valid price');
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/billing`, {
        patientId, billType, items, notes
      }, { headers: { 'x-auth-token': token } });

      const billId = res.data._id;

      // Apply govt scheme if selected
      if (applyScheme && schemeName) {
        try {
          await axios.put(`${API_URL}/api/billing/${billId}/govt-scheme`, {
            schemeName, schemeId, beneficiaryName: schemeBeneficiary,
            discountPercent: schemeDiscount, maxCoverageAmount: schemeMaxCoverage, notes: schemeNotes
          }, { headers: { 'x-auth-token': token } });
        } catch (schemeErr) {
          console.error('Govt scheme application failed:', schemeErr);
          toast.error('Bill created but scheme application failed');
        }
      }

      // Apply GST if enabled
      if (applyGST) {
        try {
          await axios.put(`${API_URL}/api/billing/${billId}/gst`, {
            hospitalGSTIN, cgstRate, sgstRate, igstRate: 0
          }, { headers: { 'x-auth-token': token } });
        } catch (gstErr) {
          console.error('GST application failed:', gstErr);
        }
      }

      toast.success(`Bill ${res.data.billNumber} created!`);
      onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Create New Bill
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Patient Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
            <div className="relative">
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); setPatientId(''); }}
                placeholder="Type at least 2 characters to search by name or phone..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${patientId ? 'border-green-400 bg-green-50' : ''}`}
              />
              {searchingPatients && (
                <div className="absolute right-3 top-2.5">
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                </div>
              )}
            </div>
            {showPatientDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredPatients.length > 0 ? filteredPatients.map(p => (
                  <button key={p._id} type="button"
                    onClick={() => { setPatientId(p._id); setPatientSearch(p.name); setShowPatientDropdown(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-b-0">
                    <span className="font-medium">{p.name}</span>
                    {p.phone && <span className="text-gray-400 ml-2">({p.phone})</span>}
                    {p.email && <span className="text-gray-400 ml-2 text-xs">{p.email}</span>}
                  </button>
                )) : (
                  <p className="px-3 py-2 text-sm text-gray-500">No patients found for "{patientSearch}"</p>
                )}
              </div>
            )}
            {patientId && <p className="text-xs text-green-600 mt-1">✓ Patient selected</p>}
          </div>

          {/* Bill Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Type</label>
            <select value={billType} onChange={e => setBillType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="OPD">OPD</option>
              <option value="IPD">IPD</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="DAY_CARE">Day Care</option>
              <option value="PHARMACY_ONLY">Pharmacy Only</option>
            </select>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Line Items</label>
              <button type="button" onClick={addItem}
                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <select value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)}
                        className="w-full px-2 py-1.5 border rounded text-sm">
                        {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <input type="text" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                        placeholder="Description" className="w-full px-2 py-1.5 border rounded text-sm" />
                    </div>
                    <div className="col-span-1">
                      <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border rounded text-sm" title="Qty" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="Price" className="w-full px-2 py-1.5 border rounded text-sm" />
                    </div>
                    <div className="col-span-1 flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-700">₹{calcLineTotal(item)}</span>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Optional fields row */}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <input type="number" min="0" max="100" value={item.discount} onChange={e => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)}
                      placeholder="Discount %" className="px-2 py-1 border rounded text-xs" />
                    <input type="number" min="0" max="100" value={item.taxRate} onChange={e => updateItem(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                      placeholder="Tax %" className="px-2 py-1 border rounded text-xs" />
                    <input type="text" value={item.cptCode || ''} onChange={e => updateItem(idx, 'cptCode', e.target.value)}
                      placeholder="CPT Code" className="px-2 py-1 border rounded text-xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Total */}
          <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Grand Total</span>
            <span className="text-2xl font-bold text-blue-900">₹{grandTotal.toFixed(2)}</span>
          </div>

          {/* Notes */}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Bill notes (optional)" className="w-full px-3 py-2 border rounded-lg text-sm" />

          {/* Govt Scheme Discount Section */}
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <button type="button" onClick={() => setApplyScheme(!applyScheme)}
              className="w-full px-4 py-2.5 flex items-center justify-between bg-green-50 hover:bg-green-100 transition-colors">
              <span className="flex items-center gap-2 text-sm font-medium text-green-800">
                <Landmark className="w-4 h-4" /> Government Scheme Discount
              </span>
              {applyScheme ? <ChevronUp className="w-4 h-4 text-green-600" /> : <ChevronDown className="w-4 h-4 text-green-600" />}
            </button>
            {applyScheme && (
              <div className="p-4 space-y-3 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Scheme Name *</label>
                    <select value={schemeName} onChange={e => {
                      setSchemeName(e.target.value);
                      const scheme = GOVT_SCHEMES.find(s => s.value === e.target.value);
                      if (scheme?.maxCoverage) setSchemeMaxCoverage(scheme.maxCoverage);
                    }} className="w-full px-2 py-1.5 border rounded text-sm">
                      <option value="">Select Scheme</option>
                      {GOVT_SCHEMES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Scheme/Enrollment ID</label>
                    <input type="text" value={schemeId} onChange={e => setSchemeId(e.target.value)}
                      placeholder="e.g. AB-1234567890" className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Beneficiary Name</label>
                  <input type="text" value={schemeBeneficiary} onChange={e => setSchemeBeneficiary(e.target.value)}
                    placeholder="Name as on scheme card" className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Discount %</label>
                    <input type="number" min="0" max="100" value={schemeDiscount}
                      onChange={e => setSchemeDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max Coverage (₹)</label>
                    <input type="number" min="0" value={schemeMaxCoverage}
                      onChange={e => setSchemeMaxCoverage(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                </div>
                {schemeDiscount > 0 && (
                  <div className="bg-green-50 rounded p-2 text-xs text-green-700 flex items-center gap-1">
                    <BadgePercent className="w-3 h-3" />
                    Estimated discount: ₹{Math.min(grandTotal * schemeDiscount / 100, schemeMaxCoverage || Infinity).toFixed(2)}
                    {schemeMaxCoverage > 0 && ` (capped at ₹${schemeMaxCoverage.toLocaleString()})`}
                  </div>
                )}
                <textarea value={schemeNotes} onChange={e => setSchemeNotes(e.target.value)} rows={1}
                  placeholder="Scheme notes (optional)" className="w-full px-2 py-1.5 border rounded text-xs" />
              </div>
            )}
          </div>

          {/* GST Section */}
          <div className="border border-blue-200 rounded-lg overflow-hidden">
            <button type="button" onClick={() => setApplyGST(!applyGST)}
              className="w-full px-4 py-2.5 flex items-center justify-between bg-blue-50 hover:bg-blue-100 transition-colors">
              <span className="flex items-center gap-2 text-sm font-medium text-blue-800">
                <Receipt className="w-4 h-4" /> GST Details
              </span>
              {applyGST ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
            </button>
            {applyGST && (
              <div className="p-4 space-y-3 bg-white">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hospital GSTIN</label>
                  <input type="text" value={hospitalGSTIN} onChange={e => setHospitalGSTIN(e.target.value)}
                    placeholder="e.g. 29ABCDE1234F1Z5" className="w-full px-2 py-1.5 border rounded text-sm" maxLength={15} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CGST Rate %</label>
                    <input type="number" min="0" max="28" step="0.5" value={cgstRate}
                      onChange={e => setCgstRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">SGST Rate %</label>
                    <input type="number" min="0" max="28" step="0.5" value={sgstRate}
                      onChange={e => setSgstRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border rounded text-sm" />
                  </div>
                </div>
                <div className="bg-blue-50 rounded p-2 text-xs text-blue-700">
                  Estimated GST: CGST ₹{(grandTotal * cgstRate / 100).toFixed(2)} + SGST ₹{(grandTotal * sgstRate / 100).toFixed(2)}
                  = <strong>₹{(grandTotal * (cgstRate + sgstRate) / 100).toFixed(2)}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Create Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================================================
// PAYMENT MODAL
// ================================================
const PaymentModal = ({ show, onClose, bill, onPaid }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [transactionId, setTransactionId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bill) setAmount(bill.balanceDue?.toFixed(2) || '');
  }, [bill]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return toast.error('Enter a valid amount');
    if (numAmount > bill.balanceDue) return toast.error('Amount exceeds balance due');

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { amount: numAmount, method, transactionId, referenceNumber, upiId, cardLast4, notes };
      const res = await axios.post(`${API_URL}/api/billing/${bill._id}/payment`, payload, {
        headers: { 'x-auth-token': token }
      });
      toast.success(`Payment recorded! Receipt: ${res.data.payment.receiptNumber}`);
      onPaid(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show || !bill) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" /> Record Payment
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Bill info */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium">Bill: {bill.billNumber}</p>
            <p className="text-gray-500">Patient: {bill.patientSnapshot?.name || 'N/A'}</p>
            <div className="flex justify-between mt-1">
              <span>Total: ₹{bill.grandTotal?.toFixed(2)}</span>
              <span className="font-bold text-red-600">Balance: ₹{bill.balanceDue?.toFixed(2)}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input type="number" step="0.01" min="0.01" max={bill.balanceDue} value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${method === m.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* UPI specific */}
          {method === 'UPI' && (
            <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)}
              placeholder="UPI ID (e.g. user@upi)" className="w-full px-3 py-2 border rounded-lg text-sm" />
          )}

          {/* Card specific */}
          {method === 'CARD' && (
            <input type="text" maxLength={4} value={cardLast4} onChange={e => setCardLast4(e.target.value.replace(/\D/g, ''))}
              placeholder="Last 4 digits" className="w-full px-3 py-2 border rounded-lg text-sm" />
          )}

          {/* Transaction reference */}
          {method !== 'CASH' && (
            <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)}
              placeholder="Transaction/Reference ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
          )}

          {/* Reference Number */}
          <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
            placeholder="Reference number (optional)" className="w-full px-3 py-2 border rounded-lg text-sm" />

          {/* Notes */}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Payment notes" className="w-full px-3 py-2 border rounded-lg text-sm" />

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================================================
// GOVT SCHEME MODAL (for applying to existing draft bills)
// ================================================
const GovtSchemeModal = ({ show, onClose, bill, onApplied }) => {
  const [schemeName, setSchemeName] = useState('');
  const [schemeId, setSchemeId] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [maxCoverageAmount, setMaxCoverageAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schemeName) return toast.error('Please select a scheme');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/billing/${bill._id}/govt-scheme`, {
        schemeName, schemeId, beneficiaryName, discountPercent, maxCoverageAmount, notes
      }, { headers: { 'x-auth-token': token } });
      toast.success('Government scheme applied!');
      onApplied(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to apply scheme');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${API_URL}/api/billing/${bill._id}/govt-scheme`, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Scheme removed');
      onApplied(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to remove scheme');
    }
  };

  if (!show || !bill) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-green-600" /> Government Scheme
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium">Bill: {bill.billNumber}</p>
            <p className="text-gray-500">Current Total: ₹{bill.grandTotal?.toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheme *</label>
            <select value={schemeName} onChange={e => {
              setSchemeName(e.target.value);
              const scheme = GOVT_SCHEMES.find(s => s.value === e.target.value);
              if (scheme?.maxCoverage) setMaxCoverageAmount(scheme.maxCoverage);
            }} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Select Scheme</option>
              {GOVT_SCHEMES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <input type="text" value={schemeId} onChange={e => setSchemeId(e.target.value)}
            placeholder="Scheme Enrollment ID" className="w-full px-3 py-2 border rounded-lg text-sm" />

          <input type="text" value={beneficiaryName} onChange={e => setBeneficiaryName(e.target.value)}
            placeholder="Beneficiary Name" className="w-full px-3 py-2 border rounded-lg text-sm" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discount %</label>
              <input type="number" min="0" max="100" value={discountPercent}
                onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Coverage (₹)</label>
              <input type="number" min="0" value={maxCoverageAmount}
                onChange={e => setMaxCoverageAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          {discountPercent > 0 && bill.grandTotal && (
            <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
              <BadgePercent className="w-4 h-4 inline mr-1" />
              Estimated: ₹{Math.min(bill.grandTotal * discountPercent / 100, maxCoverageAmount || Infinity).toFixed(2)} off
            </div>
          )}

          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Notes (optional)" className="w-full px-3 py-2 border rounded-lg text-sm" />

          <div className="flex justify-between pt-2">
            {bill.govtScheme?.isApplied && (
              <button type="button" onClick={handleRemove}
                className="px-4 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Remove Scheme
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
                Apply Scheme
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================================================
// BILL DETAIL VIEW
// ================================================
const BillDetailView = ({ billId, onBack, onUpdate }) => {
  const [bill, setBill] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    fetchBillDetail();
  }, [billId]);

  const fetchBillDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/billing/${billId}`, {
        headers: { 'x-auth-token': token }
      });
      setBill(res.data.bill);
      setPayments(res.data.payments || []);
    } catch (err) {
      toast.error('Failed to load bill details');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm('Finalize this bill? It cannot be modified after finalization.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/billing/${billId}/finalize`, {}, {
        headers: { 'x-auth-token': token }
      });
      setBill(res.data);
      toast.success('Bill finalized!');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to finalize');
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/billing/${billId}/cancel`, { reason }, {
        headers: { 'x-auth-token': token }
      });
      setBill(res.data);
      toast.success('Bill cancelled');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to cancel');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/billing/audit/${billId}`, {
        headers: { 'x-auth-token': token }
      });
      setAuditLogs(res.data);
      setShowAudit(true);
    } catch (err) {
      toast.error('Failed to load audit logs');
    }
  };

  const handlePaymentComplete = (data) => {
    setBill(data.bill);
    setPayments(prev => [data.payment, ...prev]);
    if (onUpdate) onUpdate();
  };

  if (loading) return <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>;
  if (!bill) return <p className="text-center text-gray-500 py-8">Bill not found</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Bills
        </button>
        <div className="flex items-center gap-2">
          {bill.status === 'DRAFT' && (
            <>
              <button onClick={() => setShowSchemeModal(true)}
                className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center gap-1">
                <Landmark className="w-3 h-3" /> {bill.govtScheme?.isApplied ? 'Edit Scheme' : 'Govt Scheme'}
              </button>
              <button onClick={handleFinalize}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                <Send className="w-3 h-3" /> Finalize
              </button>
              <button onClick={handleCancel}
                className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Cancel
              </button>
            </>
          )}
          {(bill.status === 'FINALIZED' || bill.status === 'PARTIALLY_PAID') && (
            <button onClick={() => setShowPayment(true)}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Record Payment
            </button>
          )}
          <button onClick={() => generatePDFInvoice(billId)}
            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1">
            <Download className="w-3 h-3" /> PDF Invoice
          </button>
          <button onClick={fetchAuditLogs}
            className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Audit Trail
          </button>
        </div>
      </div>

      {/* Bill Header Card */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{bill.billNumber}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {bill.billType} Bill · Created {new Date(bill.createdAt).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status={bill.status} />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="text-gray-500">Patient</p>
            <p className="font-medium">{bill.patientSnapshot?.name}</p>
            <p className="text-gray-400 text-xs">{bill.patientSnapshot?.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Financial Summary</p>
            <p className="font-medium">Subtotal: ₹{bill.subtotal?.toFixed(2)}</p>
            {bill.totalDiscount > 0 && <p className="text-green-600 text-xs">Discount: -₹{bill.totalDiscount?.toFixed(2)}</p>}
            {bill.totalTax > 0 && <p className="text-gray-400 text-xs">Tax: +₹{bill.totalTax?.toFixed(2)}</p>}
          </div>
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t">
          <div>
            <span className="text-sm text-gray-500">Grand Total</span>
            <p className="text-2xl font-bold text-gray-900">₹{bill.grandTotal?.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Paid: <span className="font-medium text-green-600">₹{bill.amountPaid?.toFixed(2)}</span></p>
            {bill.balanceDue > 0 && (
              <p className="text-sm text-red-600 font-bold">Balance Due: ₹{bill.balanceDue?.toFixed(2)}</p>
            )}
          </div>
        </div>

        {/* Govt Scheme Info */}
        {bill.govtScheme?.isApplied && (
          <div className="mt-3 pt-3 border-t bg-green-50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                {GOVT_SCHEMES.find(s => s.value === bill.govtScheme.schemeName)?.label || bill.govtScheme.schemeName}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-green-700">
              {bill.govtScheme.schemeId && <p>ID: {bill.govtScheme.schemeId}</p>}
              <p>Discount: {bill.govtScheme.discountPercent}%</p>
              <p className="font-semibold">Saved: ₹{bill.govtScheme.approvedAmount?.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* GST Info */}
        {bill.gstDetails?.isGSTApplicable && (
          <div className="mt-3 pt-3 border-t bg-blue-50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">GST Breakdown</span>
              {bill.gstDetails.hospitalGSTIN && <span className="text-xs text-blue-500">GSTIN: {bill.gstDetails.hospitalGSTIN}</span>}
            </div>
            <div className="flex gap-4 text-xs text-blue-700">
              {bill.gstDetails.igstRate > 0 ? (
                <p>IGST @{bill.gstDetails.igstRate}%: ₹{bill.gstDetails.igstAmount?.toFixed(2)}</p>
              ) : (
                <>
                  <p>CGST @{bill.gstDetails.cgstRate}%: ₹{bill.gstDetails.cgstAmount?.toFixed(2)}</p>
                  <p>SGST @{bill.gstDetails.sgstRate}%: ₹{bill.gstDetails.sgstAmount?.toFixed(2)}</p>
                </>
              )}
              <p className="font-semibold">Total GST: ₹{bill.gstDetails.totalGST?.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-700">Line Items ({bill.items?.length})</h4>
        </div>
        <div className="divide-y">
          {bill.items?.map((item, idx) => (
            <div key={item._id || idx} className="px-5 py-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs bg-gray-100 rounded font-medium">{item.category}</span>
                  <span className="text-sm font-medium text-gray-900">{item.description}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {item.quantity} × ₹{item.unitPrice?.toFixed(2)}
                  {item.discount > 0 && ` · ${item.discount}% off`}
                  {item.taxRate > 0 && ` · ${item.taxRate}% tax`}
                  {item.cptCode && ` · CPT: ${item.cptCode}`}
                </div>
              </div>
              <span className="font-semibold text-gray-900">₹{item.lineTotal?.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payments History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700">Payment History ({payments.length})</h4>
          </div>
          <div className="divide-y">
            {payments.map((p) => (
              <div key={p._id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.receiptNumber || 'Processing...'}</p>
                  <p className="text-xs text-gray-400">{p.method} · {new Date(p.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${p.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {p.amount < 0 ? '-' : '+'}₹{Math.abs(p.amount).toFixed(2)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      p.status === 'REFUNDED' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Trail */}
      {showAudit && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <Shield className="w-4 h-4" /> Audit Trail
            </h4>
            <button onClick={() => setShowAudit(false)} className="text-xs text-gray-400 hover:text-gray-600">Hide</button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y">
            {auditLogs.map((log) => (
              <div key={log._id} className="px-5 py-2 text-xs">
                <div className="flex justify-between">
                  <span className={`font-semibold ${log.severity === 'CRITICAL' ? 'text-red-600' :
                      log.severity === 'WARNING' ? 'text-yellow-600' : 'text-gray-700'
                    }`}>{log.action?.replace(/_/g, ' ')}</span>
                  <span className="text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {log.description && <p className="text-gray-500 mt-0.5">{log.description}</p>}
              </div>
            ))}
            {auditLogs.length === 0 && <p className="px-5 py-3 text-xs text-gray-400">No audit entries</p>}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal show={showPayment} onClose={() => setShowPayment(false)} bill={bill} onPaid={handlePaymentComplete} />

      {/* Govt Scheme Modal */}
      <GovtSchemeModal
        show={showSchemeModal}
        onClose={() => setShowSchemeModal(false)}
        bill={bill}
        onApplied={(updatedBill) => { setBill(updatedBill); if (onUpdate) onUpdate(); }}
      />
    </div>
  );
};

// ================================================
// MAIN COMPONENT
// ================================================
const BillingDashboard = () => {
  const { socket } = useSocket();
  const [view, setView] = useState('list');         // 'list' | 'detail' | 'stats'
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [pendingPayments, setPendingPayments] = useState([]);
  const [rejectModal, setRejectModal] = useState(null); // { paymentId, billNumber }
  const [rejectReason, setRejectReason] = useState('');

  const fetchBills = useCallback(async (page = 1) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page, limit: 15 });
      if (filter.status) params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);

      const res = await axios.get(`${API_URL}/api/billing/hospital?${params}`, {
        headers: { 'x-auth-token': token }
      });
      setBills(res.data.bills);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch bills:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/billing/stats/hospital`, {
        headers: { 'x-auth-token': token }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch billing stats:', err);
    }
  }, []);

  const fetchPendingVerifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/billing/pending-verifications`, {
        headers: { 'x-auth-token': token }
      });
      setPendingPayments(res.data);
    } catch (err) {
      console.error('Failed to fetch pending verifications:', err);
    }
  }, []);

  const handleConfirmPayment = async (paymentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/billing/payment/${paymentId}/confirm-upi`, {}, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Payment confirmed! Bill marked as paid.');
      fetchPendingVerifications();
      fetchBills();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to confirm payment');
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectModal) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/billing/payment/${rejectModal.paymentId}/reject-upi`,
        { reason: rejectReason || 'Payment not received by hospital' },
        { headers: { 'x-auth-token': token } }
      );
      toast.success('Payment rejected. Patient will be notified.');
      setRejectModal(null);
      setRejectReason('');
      fetchPendingVerifications();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to reject payment');
    }
  };

  useEffect(() => {
    fetchBills();
    fetchStats();
    fetchPendingVerifications();
  }, []);

  useEffect(() => {
    fetchBills(1);
  }, [filter]);

  // ── Real-time socket listeners for payment updates ──
  useEffect(() => {
    if (!socket) return;

    const refreshAll = () => {
      fetchBills();
      fetchStats();
      fetchPendingVerifications();
    };

    // When a payment is auto-confirmed by the server
    const handleAutoConfirmed = (data) => {
      console.log('💰 Payment auto-confirmed:', data);
      toast.success(`Payment auto-confirmed for ${data.billNumber} — ₹${data.amount?.toFixed(2)}`, { icon: '✅' });
      refreshAll();
    };

    // When a payment is manually confirmed (by this or another hospital user)
    const handlePaymentConfirmed = (data) => {
      console.log('✅ Payment confirmed:', data);
      refreshAll();
    };

    // When a new pending payment arrives from a patient
    const handlePendingVerification = (data) => {
      console.log('🔔 New pending payment:', data);
      toast(`New UPI payment from ${data.patientName} — ₹${data.amount?.toFixed(2)}`, { icon: '💳' });
      fetchPendingVerifications();
    };

    // When a payment is received (Razorpay completed)
    const handlePaymentReceived = (data) => {
      console.log('💰 Payment received:', data);
      refreshAll();
    };

    socket.on('payment_auto_confirmed', handleAutoConfirmed);
    socket.on('payment_confirmed', handlePaymentConfirmed);
    socket.on('payment_pending_verification', handlePendingVerification);
    socket.on('payment_received', handlePaymentReceived);

    return () => {
      socket.off('payment_auto_confirmed', handleAutoConfirmed);
      socket.off('payment_confirmed', handlePaymentConfirmed);
      socket.off('payment_pending_verification', handlePendingVerification);
      socket.off('payment_received', handlePaymentReceived);
    };
  }, [socket, fetchBills, fetchStats, fetchPendingVerifications]);

  const handleBillCreated = () => {
    fetchBills();
    fetchStats();
  };

  // ================================================
  // LIST VIEW
  // ================================================
  if (view === 'detail' && selectedBillId) {
    return (
      <BillDetailView
        billId={selectedBillId}
        onBack={() => { setView('list'); setSelectedBillId(null); fetchBills(); fetchStats(); }}
        onUpdate={() => { fetchBills(); fetchStats(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Receipt} label="Total Bills" value={stats?.summary?.totalBills || 0} color="blue" />
        <StatCard icon={TrendingUp} label="Revenue" value={`₹${(stats?.summary?.totalRevenue || 0).toLocaleString()}`} color="green" />
        <StatCard icon={CheckCircle} label="Collected" value={`₹${(stats?.summary?.totalCollected || 0).toLocaleString()}`} color="emerald" />
        <StatCard icon={AlertTriangle} label="Outstanding" value={`₹${(stats?.summary?.totalOutstanding || 0).toLocaleString()}`} color="red" />
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })}
              placeholder="Search bills..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm text-gray-600">
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="FINALIZED">Finalized</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> New Bill
        </button>
      </div>

      {/* Pending Verifications Alert Section */}
      {pendingPayments.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-200 bg-yellow-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-700" />
              <span className="font-semibold text-yellow-800">Pending UPI Verifications</span>
              <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full font-bold">{pendingPayments.length}</span>
            </div>
            <button onClick={fetchPendingVerifications} className="text-xs text-yellow-700 hover:underline flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          <div className="divide-y divide-yellow-100">
            {pendingPayments.map(payment => (
              <div key={payment._id} className="px-4 py-3 flex items-start justify-between gap-3 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{payment.patientId?.name || 'Unknown Patient'}</span>
                    <span className="font-mono text-xs text-blue-600">{payment.billId?.billNumber}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">Amount: <span className="font-bold text-gray-800">₹{payment.amount?.toFixed(2)}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">Txn ID: <span className="font-mono">{payment.transactionId}</span></p>
                  <p className="text-xs text-gray-400">{new Date(payment.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleConfirmPayment(payment._id)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Confirm
                  </button>
                  <button
                    onClick={() => { setRejectModal({ paymentId: payment._id, billNumber: payment.billId?.billNumber }); setRejectReason(''); }}
                    className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg hover:bg-red-100 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 mb-1">Reject Payment</h3>
            <p className="text-xs text-gray-500 mb-3">Bill: {rejectModal.billNumber}</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason (optional): e.g. Payment not received in UPI app"
              className="w-full border rounded-lg p-2.5 text-sm resize-none h-20 focus:ring-2 focus:ring-red-300 outline-none"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRejectPayment}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">Reject Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Bills List */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : bills.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No bills found</p>
          <button onClick={() => setShowCreateModal(true)} className="mt-3 text-sm text-blue-600 hover:underline">
            Create your first bill
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Bill #</th>
                  <th className="px-4 py-3 text-left font-medium">Patient</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bills.map(bill => (
                  <tr key={bill._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedBillId(bill._id); setView('detail'); }}>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{bill.billNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{bill.patientSnapshot?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-400">{bill.patientSnapshot?.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{bill.billType}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{bill.grandTotal?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={bill.balanceDue > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                        ₹{bill.balanceDue?.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={bill.status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(bill.billDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-xs text-gray-500">
                Showing {bills.length} of {pagination.total} bills
              </span>
              <div className="flex gap-1">
                {Array.from({ length: pagination.pages }, (_, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); fetchBills(i + 1); }}
                    className={`px-2.5 py-1 text-xs rounded ${pagination.page === i + 1 ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
                      }`}>{i + 1}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <CreateBillModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleBillCreated}
      />
    </div>
  );
};

export default BillingDashboard;
