import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Network, Palette, Smartphone, Target, Bolt, RotateCcw, 
  MessageCircle, Menu, X, Plus, Mail, User, Send, Lock, 
  LogOut, Search, Trash2, CheckCircle, Clock, Phone
} from 'lucide-react';

// --- CONFIGURACIÓN DE API ---
// La dejamos fija para asegurar que apunte a producción
const API_URL = "https://songbird-api.onrender.com";

// --- COMPONENTE 1: LOGIN (MOTOR FETCH + ANTI-BLOQUEO) ---
const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const formData = new URLSearchParams();
        formData.append('username', username.trim());
        formData.append('password', password);

        try {
            console.log("Iniciando login con FETCH...");
            
            // Usamos FETCH en lugar de Axios para el Login (más robusto contra CORS)
            const response = await fetch(`${API_URL}/token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                console.log("¡Token recibido!", data);
                localStorage.setItem('token', data.access_token);
                // Redirección forzada para limpiar estado y caché
                window.location.href = "/dashboard";
            } else {
                const errData = await response.json();
                console.error("Error servidor:", errData);
                setError(errData.detail || "Credenciales incorrectas");
            }
        } catch (error: any) {
            console.error("Error de red:", error);
            setError("Error de conexión. Tu navegador bloqueó la solicitud (posible CORS o extensión).");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
            <form onSubmit={handleLogin} className="bg-white p-10 rounded-xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-blue-900">Admin Access</h2>
                    <p className="text-gray-400 text-sm mt-2">Secure Login Area</p>
                </div>
                
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium border border-red-100 text-center">{error}</div>}

                <div className="mb-5">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Username</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            name="sb_user_x" // Nombre único anti-bloqueo
                            autoComplete="off" // Apaga el autocompletar
                            className="w-full pl-10 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/50 focus:border-blue-900 text-black transition-all"
                            placeholder="Enter username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                </div>
                <div className="mb-8">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            name="sb_pass_x" // Nombre único anti-bloqueo
                            autoComplete="off" // Apaga el autocompletar
                            className="w-full pl-10 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/50 focus:border-blue-900 text-black transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
                <button type="submit" className="w-full bg-blue-900 text-white py-3.5 rounded-lg font-bold hover:bg-blue-800 transition shadow-lg shadow-blue-900/30">
                    Sign In
                </button>
                <div className="mt-6 text-center">
                    <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 font-medium">← Back to Website</Link>
                </div>
            </form>
        </div>
    );
};

// --- COMPONENTE 2: CRM DASHBOARD (FULL) ---
interface Message { 
    id: number; 
    name: string; 
    email: string; 
    phone: string;
    content: string; 
    status: 'pending' | 'contacted' | 'recontact' | 'won' | 'lost';
    created_at: string; 
}

const Dashboard = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const navigate = useNavigate();

    const fetchMessages = () => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        axios.get(`${API_URL}/messages/`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then((res: any) => { setMessages(res.data); setLoading(false); })
        .catch((err: any) => { 
            console.error(err); 
            if (err.response?.status === 401) { localStorage.removeItem('token'); navigate('/login'); }
            setLoading(false);
        });
    };

    useEffect(() => { fetchMessages(); }, [navigate]);

    const handleStatusChange = async (id: number, newStatus: string) => {
        const token = localStorage.getItem('token');
        setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as any } : m));
        
        try {
            await axios.patch(`${API_URL}/messages/${id}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Error updating status", error);
            fetchMessages(); 
        }
    };

    const handleDelete = async (id: number) => {
        if(!window.confirm("Are you sure you want to delete this lead? This cannot be undone.")) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_URL}/messages/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    // Filter Logic
    const filteredMessages = messages.filter(msg => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = msg.name.toLowerCase().includes(term) || 
                              msg.email.toLowerCase().includes(term) ||
                              (msg.phone && msg.phone.includes(term));
        const matchesFilter = filterStatus === 'all' || msg.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    // Stats Logic
    const stats = {
        total: messages.length,
        pending: messages.filter(m => m.status === 'pending').length,
        won: messages.filter(m => m.status === 'won').length
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'pending': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'contacted': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'recontact': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'won': return 'bg-green-100 text-green-700 border-green-200';
            case 'lost': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* Top Bar */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-black text-blue-900 tracking-tight">Songbird<span className="text-red-600">CRM</span></h1>
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-500 uppercase tracking-wider">Dashboard</span>
                </div>
                <div className="flex gap-4 items-center">
                    <Link to="/" className="text-sm font-medium text-gray-500 hover:text-black">View Website</Link>
                    <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} className="text-sm font-bold text-red-600 hover:text-red-800 bg-red-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Leads</p>
                            <p className="text-4xl font-black text-gray-900 mt-2">{stats.total}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-full text-blue-900"><User size={24} /></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Pending Action</p>
                            <p className="text-4xl font-black text-yellow-500 mt-2">{stats.pending}</p>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-full text-yellow-600"><Clock size={24} /></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Won Deals</p>
                            <p className="text-4xl font-black text-green-500 mt-2">{stats.won}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-full text-green-600"><CheckCircle size={24} /></div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            name="sb_search_lead"
                            autoComplete="off"
                            placeholder="Search name, email, phone..." 
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all bg-white text-black text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        {['all', 'pending', 'contacted', 'recontact', 'won', 'lost'].map(status => (
                            <button 
                                key={status}
                                type="button"
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-colors whitespace-nowrap ${
                                    filterStatus === status ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                {status === 'all' ? 'All Leads' : status.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? <div className="p-12 text-center text-gray-400">Loading data...</div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-wider">Date</th>
                                        <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-wider">Contact Info</th>
                                        <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-wider">Message</th>
                                        <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredMessages.map((msg) => (
                                        <tr key={msg.id} className="hover:bg-blue-50/20 transition-colors group">
                                            <td className="p-5 text-sm text-gray-500 whitespace-nowrap align-top">
                                                {new Date(msg.created_at).toLocaleDateString()}
                                                <span className="block text-xs text-gray-400 mt-1">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className="p-5 align-top">
                                                <div className="font-bold text-gray-900">{msg.name}</div>
                                                <div className="text-sm text-blue-600 font-medium">{msg.email}</div>
                                                {msg.phone && <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Phone size={10}/> {msg.phone}</div>}
                                            </td>
                                            <td className="p-5 max-w-xs align-top">
                                                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed" title={msg.content}>{msg.content}</p>
                                            </td>
                                            <td className="p-5 align-top">
                                                <select 
                                                    value={msg.status} 
                                                    onChange={(e) => handleStatusChange(msg.id, e.target.value)}
                                                    className={`appearance-none cursor-pointer pl-3 pr-8 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${getStatusColor(msg.status)}`}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="contacted">Contacted</option>
                                                    <option value="recontact">Re-contact</option>
                                                    <option value="won">Won (Client)</option>
                                                    <option value="lost">Lost</option>
                                                </select>
                                            </td>
                                            <td className="p-5 text-right align-top">
                                                <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <a 
                                                        href={`https://wa.me/${msg.phone ? msg.phone.replace(/[^0-9]/g, '') : ''}?text=Hi ${msg.name}, I saw your inquiry on Songbird Columbia.`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className={`p-2 rounded-lg transition-colors ${msg.phone ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-300 bg-gray-100 cursor-not-allowed'}`}
                                                        title={msg.phone ? "Open WhatsApp" : "No Phone Number"}
                                                        onClick={(e) => !msg.phone && e.preventDefault()}
                                                    >
                                                        <MessageCircle size={18} />
                                                    </a>
                                                    <a 
                                                        href={`mailto:${msg.email}?subject=Response from Songbird Columbia`} 
                                                        className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" 
                                                        title="Send Email"
                                                    >
                                                        <Mail size={18} />
                                                    </a>
                                                    <button 
                                                        onClick={() => handleDelete(msg.id)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Lead"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredMessages.length === 0 && (
                                <div className="p-16 text-center flex flex-col items-center">
                                    <div className="bg-gray-50 p-6 rounded-full mb-4 text-gray-300">
                                        <Search size={40} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">No leads found</h3>
                                    <p className="text-gray-500 mt-2">Try adjusting your search or filter settings.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// --- COMPONENTE 3: LANDING PAGE (FULL) ---
const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // New State with Phone
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', content: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openWhatsApp = () => {
    const phone = "15551234567"; 
    const msg = encodeURIComponent("Hi Songbird Columbia!");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await axios.post(`${API_URL}/contact/`, formData);
      setStatus('success');
      setFormData({ name: '', email: '', phone: '', content: '' });
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-blue-900 text-white font-sans selection:bg-red-600 selection:text-white">
      {/* HEADER */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 backdrop-blur-md border-b border-white/10 ${
        isScrolled ? 'bg-blue-900/95 py-2 shadow-xl' : 'bg-blue-900/80 py-4'
      }`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <a href="#hero" className="flex items-center gap-4 group">
            <img src="/assets/logo.png" alt="Songbird Logo" className="logo-force" />
            <div className="border-l border-white/20 pl-4 hidden sm:block">
              <span className="block font-extrabold text-lg md:text-xl uppercase tracking-tighter">Songbird Columbia</span>
              <span className="block text-[10px] text-red-600 font-bold tracking-[2px] uppercase">Web Development</span>
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-10">
            <ul className="flex gap-8 font-semibold text-sm">
              <li><a href="#services" className="hover:text-red-600 transition-colors">Services</a></li>
              <li><a href="#about" className="hover:text-red-600 transition-colors">About</a></li>
              <li><a href="#contact" className="hover:text-red-600 transition-colors">Contact</a></li>
            </ul>
            <Link to="/login" className="text-white/50 text-xs hover:text-white flex items-center gap-1">
                <Lock size={12}/> Admin
            </Link>
          </nav>
          <button className="md:hidden text-white p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        <div className={`md:hidden absolute top-full left-0 w-full bg-blue-900 border-b border-white/10 overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
           <ul className="flex flex-col p-8 gap-6 font-bold text-center">
             <li><a href="#services" onClick={() => setIsMenuOpen(false)}>Services</a></li>
             <li><a href="#about" onClick={() => setIsMenuOpen(false)}>About</a></li>
             <li><a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a></li>
             <li><Link to="/login" className="text-red-600">Admin Login</Link></li>
           </ul>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section id="hero" className="pt-32 md:pt-48 pb-20 px-6">
          <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <span className="inline-block px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6">
                Landing Pages for US Businesses
              </span>
              <h1 className="text-4xl md:text-7xl font-extrabold leading-[1.1] mb-6">
                Conversion-Focused <br />
                <span className="text-white/90">Landing Pages</span>
              </h1>
              <p className="text-lg text-white/70 mb-8 max-w-lg mx-auto md:mx-0">
                Songbird Columbia builds landing pages designed to turn visitors into real customers. One page. One goal. Flat pricing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-8">
                <a href="#contact" className="bg-red-600 px-10 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-transform shadow-lg">Get Started</a>
                <a href="#services" className="bg-white/10 backdrop-blur-md border border-white/20 px-10 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-all">View Services</a>
              </div>
            </div>
            <div className="relative flex justify-center items-center">
              <div className="absolute w-72 h-72 bg-red-600/20 blur-[100px] -z-10 rounded-full"></div>
              <img 
                src="/assets/mockup.png" 
                alt="Website Mockup" 
                className="w-full max-w-lg rounded-xl shadow-2xl border border-white/10 md:rotate-y-[-10deg] md:rotate-x-[5deg] hover:rotate-0 transition-all duration-700 ease-out"
              />
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="py-24 bg-white/5">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Our Services</h2>
              <p className="text-white/60">Expertly crafted landing pages that drive results.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <ServiceCard icon={<Network />} title="Strategy" desc="Clear structure and hierarchy for maximum impact." />
              <ServiceCard icon={<Palette />} title="Custom Design" desc="Clean and modern UI tailored to your brand." />
              <ServiceCard icon={<Smartphone />} title="Responsive" desc="Perfect viewing on mobile, tablet, and desktop." />
              <ServiceCard icon={<Target />} title="CTA Optimization" desc="Strategically designed to drive contact and sales." />
              <ServiceCard icon={<Bolt />} title="Fast Delivery" desc="High-quality turnaround in just a few days." />
              <ServiceCard icon={<RotateCcw />} title="Revisions" desc="We iterate together until it’s exactly right." />
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="bg-white text-black py-24 px-6">
          <div className="container mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-6 leading-tight">About <br />Songbird Columbia</h2>
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">We specialize in landing pages, not bloated websites. We believe focus is the key to conversion.</p>
              <div className="p-4 border-l-4 border-red-600 bg-gray-50 italic font-medium">
                "When you work with us, you talk directly with the builder. No middleman, no confusion."
              </div>
            </div>
            <div className="flex justify-center">
              <div className="bg-blue-900 text-white p-10 md:p-16 rounded-xl text-center w-full max-w-sm shadow-2xl">
                <span className="block text-7xl font-black mb-2">$300</span>
                <span className="uppercase tracking-[4px] font-bold text-red-600">Flat Price</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 px-6 bg-blue-900 text-white">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                { q: "Why only landing pages?", a: "Because focus converts. A single goal yields better results." },
                { q: "Is $300 final?", a: "Yes, it's a flat price for a professional landing page." },
                { q: "Do you offer revisions?", a: "Yes, we iterate until you're happy with the result." },
                { q: "Who do I talk to?", a: "You talk directly with the builder of your site." }
              ].map((item, index) => (
                <div key={index} className="border-b border-white/10">
                  <button 
                    className="w-full flex justify-between items-center py-6 text-left font-bold text-lg md:text-xl group"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span className="group-hover:text-red-600 transition-colors">{item.q}</span>
                    <Plus className={`transition-transform duration-300 ${openFaq === index ? 'rotate-45' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === index ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-white/60 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="py-24 px-6 bg-white text-blue-900">
          <div className="container mx-auto max-w-4xl grid md:grid-cols-2 gap-12">
            <div>
                <h2 className="text-4xl font-black mb-6">Let's build something great.</h2>
                <p className="text-gray-600 mb-8">Fill out the form or chat with us directly. We reply fast.</p>
                <button onClick={openWhatsApp} className="flex items-center gap-3 text-green-600 font-bold text-lg hover:underline mb-8">
                    <MessageCircle /> Chat on WhatsApp
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-gray-50 p-8 rounded-2xl shadow-lg border border-gray-200">
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2 text-gray-700">Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                          type="text" required 
                          className="w-full pl-10 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900 text-black"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2 text-gray-700">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                          type="email" required 
                          className="w-full pl-10 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900 text-black"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                </div>

                {/* PHONE FIELD */}
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2 text-gray-700">Phone</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                          type="tel" required 
                          className="w-full pl-10 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900 text-black"
                          placeholder="+1 (555) 000-0000"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-bold mb-2 text-gray-700">Message</label>
                    <textarea 
                      required rows={4}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900 text-black"
                      placeholder="Tell us about your project..."
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                    ></textarea>
                </div>
                <button 
                    disabled={status === 'sending' || status === 'success'}
                    className={`w-full py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-all ${
                        status === 'success' ? 'bg-green-500' : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
                >
                    {status === 'sending' ? 'Sending...' : status === 'success' ? 'Sent!' : <><Send size={18} /> Send Message</>}
                </button>
                {status === 'error' && <p className="text-red-500 text-sm mt-2 text-center">Something went wrong. Try WhatsApp.</p>}
            </form>
          </div>
        </section>
      </main>
      <footer className="py-8 bg-blue-950 text-center text-white/40 text-sm">© 2026 Songbird Columbia</footer>
    </div>
  );
};

// Componente helper para tarjetas de servicios
const ServiceCard = ({ icon, title, desc }: { icon: React.ReactElement, title: string, desc: string }) => (
  <div className="bg-white/5 p-10 rounded-xl border border-white/10 hover:border-red-600/50 hover:bg-white/10 transition-all duration-300 group">
    <div className="text-red-600 mb-6 transform group-hover:scale-110 group-hover:-translate-y-1 transition-transform inline-block">
      {React.cloneElement(icon, { size: 44 } as React.SVGProps<SVGSVGElement>)}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-white/50 leading-relaxed text-sm">{desc}</p>
  </div>
);

// --- APP ROUTER ---
const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </Router>
    );
};

export default App;