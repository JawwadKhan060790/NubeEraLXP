import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CreditCard, DollarSign, FileText, History, Plus, Search, User, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';

interface FeePayment {
  id: string;
  student_id: string;
  student_name: string;
  grade_name: string;
  amount: number;
  date: string;
  method: string;
  status: 'Completed' | 'Pending' | 'Failed';
}

const TeacherFees: React.FC = () => {
  const location = useLocation();
  const [view, setView] = useState<'setting' | 'list' | 'report' | 'create'>('list');

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (location.pathname.includes('/fee-setting')) setView('setting');
    else if (location.pathname.includes('/fee-paid-list')) setView('list');
    else if (location.pathname.includes('/student-fee-report')) setView('report');
    else if (location.pathname.includes('/create-fee-paid')) setView('create');
  }, [location]);

  // Load from LocalStorage (Mock Backend)
  useEffect(() => {
    const storedPayments = localStorage.getItem('lms_fee_payments');
    if (storedPayments) setPayments(JSON.parse(storedPayments));
  }, []);

  const savePayments = (newPayments: FeePayment[]) => {
    setPayments(newPayments);
    localStorage.setItem('lms_fee_payments', JSON.stringify(newPayments));
  };

  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    grade_name: '',
    amount: '',
    method: 'Cash',
    description: ''
  });

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const newPayment: FeePayment = {
      id: Math.random().toString(36).substr(2, 9),
      student_id: formData.student_id,
      student_name: formData.student_name,
      grade_name: formData.grade_name,
      amount: parseFloat(formData.amount),
      date: new Date().toISOString().split('T')[0],
      method: formData.method,
      status: 'Completed'
    };
    savePayments([newPayment, ...payments]);
    toast.success('Fee payment saved');
    setFormData({ student_id: '', student_name: '', grade_name: '', amount: '', method: 'Cash', description: '' });
  };

  const filteredPayments = payments.filter(p =>
    p.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.grade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.method?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginated Data
  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {[
          { id: 'list', label: 'Paid Fees', icon: History, path: '/teacher/fee-paid-list' },
          { id: 'create', label: 'Add Payment', icon: Plus, path: '/teacher/create-fee-paid' },
          { id: 'setting', label: 'Fee Setup', icon: CreditCard, path: '/teacher/fee-setting' },
          { id: 'report', label: 'Reports', icon: FileText, path: '/teacher/student-fee-report' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => {
              if (btn.id === 'list') setView('list');
              else if (btn.id === 'create') setView('create');
              else if (btn.id === 'setting') setView('setting');
              else if (btn.id === 'report') setView('report');
              window.history.pushState({}, '', btn.path);
            }}
            className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap outline-none ${view === btn.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <btn.icon className="w-3.5 h-3.5" />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Advisory */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm flex items-center gap-4 md:gap-5">
        <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center shadow-sm">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Local Mode</p>
          <p className="text-xs font-medium italic mt-1 text-gray-400">These records are saved locally and will be synced later.</p>
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Payments</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">List of all fee payments</p>
            </div>
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="pl-9 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm outline-none w-full md:w-64 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium shadow-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="text-gray-400 text-[10px] md:text-xs font-bold border-b border-gray-100 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Student</th>
                  <th className="px-6 py-4 whitespace-nowrap">Amount</th>
                  <th className="px-6 py-4 whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 whitespace-nowrap">Method</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="">
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold italic text-sm">No payments found.</td>
                  </tr>
                ) : (
                  paginatedPayments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-primary/5 border border-gray-100 shadow-sm flex items-center justify-center text-primary font-black group-hover:scale-110 transition-transform uppercase">{p.student_name[0]}</div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-primary transition-colors text-sm md:text-base uppercase tracking-tight">{p.student_name}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">{p.grade_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 font-black text-primary text-base md:text-lg tracking-tighter">${p.amount.toLocaleString()}</td>
                      <td className="px-6 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">{p.date}</td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <span className="px-3 py-1 bg-gray-50 border border-gray-100 shadow-sm rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500">{p.method}</span>
                      </td>
                      <td className="px-6 py-6 text-right whitespace-nowrap">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredPayments.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* CREATE VIEW */}
      {view === 'create' && (
        <div className="max-w-2xl mx-auto bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
          <div className="p-8 md:p-12 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Add Fee Payment</h2>
            <p className="text-sm text-gray-500 mt-2 font-medium italic">Enter fee details for a student.</p>
          </div>
          <form onSubmit={handleCreatePayment} className="p-8 md:p-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Student Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    required
                    type="text"
                    value={formData.student_name}
                    onChange={e => setFormData({ ...formData, student_name: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-700 text-sm shadow-sm"
                    placeholder="Enter Student Name"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Grade</label>
                <input
                  required
                  type="text"
                  value={formData.grade_name}
                  onChange={e => setFormData({ ...formData, grade_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-medium text-gray-700 text-sm shadow-sm"
                  placeholder="Enter Grade"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Amount ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-primary w-4 h-4" />
                  <input
                    required
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-bold text-lg text-primary shadow-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Payment Method</label>
                <select
                  value={formData.method}
                  onChange={e => setFormData({ ...formData, method: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none font-semibold text-gray-700 text-sm shadow-sm cursor-pointer appearance-none"
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Online Payment</option>
                  <option>Scholarship</option>
                </select>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <button
                type="submit"
                className="w-full py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px]"
              >
                Save Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* OTHER VIEWS */}
      {(view === 'setting' || view === 'report') && (
        <div className="bg-white rounded-[2rem] p-12 md:p-24 shadow-sm border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center text-primary mb-8 shadow-sm">
            <CreditCard className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Coming Soon</h2>
          <p className="text-gray-500 max-w-md mt-4 font-medium italic text-sm leading-relaxed">The {view === 'setting' ? 'fee setup' : 'report'} section will be available soon.</p>
          <button
            onClick={() => setView('list')}
            className="mt-10 px-8 py-3.5 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            Back to Payments
          </button>
        </div>
      )}
    </div>
  );
};

export default TeacherFees;
