import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet, 
  ArrowRightLeft, 
  History, 
  TrendingUp, 
  TrendingDown, 
  CreditCard,
  User,
  Bell,
  ShieldCheck,
  Loader2,
  Search,
  Menu,
  Wifi,
  Clock,
  MessageCircle,
  X,
  Send,
  Sparkles,
  Newspaper,
  LogOut,
  Mail,
  BrainCircuit,
  Image as ImageIcon,
  Upload,
  Sun,
  Moon,
  RefreshCw,
  Plus
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';

/**
 * FIREBASE CONFIGURATION & INIT
 */
const firebaseConfig = {
  apiKey: "AIzaSyATb8nlBb1BChZym6UkdelQHV2Nz2uiBMM",
  authDomain: "fintech-assignment.firebaseapp.com",
  projectId: "fintech-assignment",
  storageBucket: "fintech-assignment.appspot.com",
  messagingSenderId: "904917524026", 
  appId: "1:904917524026:web:2a8385278453488827d091"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/**
 * OP BANK API SANDBOX CONFIGURATION
 */
const OP_CONFIG = {
  baseUrl: "https://sandbox-api.apiauth.aws.op-palvelut.net/corporate-account-data/v2",
  apiKey: "90SNhgGkjsdiTTY7ztfgV0neWT0CMPde",
  apiSecret: "sKih09NewEuS4j5k",
  surrogateId: "1afb1874-5bd5-4c5a-9dbb-21a66ab23a85"
};

/**
 * MOCK SERVER STATE
 */
let serverBalance = 2450.75;
let serverTransactions = [
  { id: 1, type: 'credit', name: 'Freelance Payout', date: '2023-10-24', amount: 1200.00, status: 'PROCESSED' },
  { id: 2, type: 'debit', name: 'K-Market Helsinki', date: '2023-10-23', amount: 15.40, status: 'PROCESSED' },
  { id: 3, type: 'debit', name: 'Spotify Premium', date: '2023-10-20', amount: 11.99, status: 'PROCESSED' },
  { id: 4, type: 'credit', name: 'MobilePay Transfer', date: '2023-10-18', amount: 34.50, status: 'PROCESSED' },
];

/**
 * MOCK NETWORK LAYER (OP Bank Simulation)
 */
const fakeBankAPI = {
  getBalance: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          accountNumber: "FI89 3123 4829 10",
          balance: serverBalance, 
          currency: "EUR",
          owner: "Alex Student"
        });
      }, 1000); 
    });
  },

  getTransactions: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...serverTransactions]); 
      }, 1000);
    });
  },

  processTransaction: async (amount, recipient) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (amount <= 0) {
          reject("Invalid amount");
        } else {
          serverBalance -= amount;
          const newTx = {
            id: Date.now(),
            type: 'debit',
            name: recipient,
            date: new Date().toISOString().split('T')[0],
            amount: amount,
            status: 'PROCESSED'
          };
          serverTransactions = [newTx, ...serverTransactions];
          resolve({ success: true });
        }
      }, 1500);
    });
  },

  depositTransaction: async (amount) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (amount <= 0) {
          reject("Invalid amount");
        } else {
          serverBalance += amount;
          const newTx = {
            id: Date.now(),
            type: 'credit',
            name: 'Account Top Up',
            date: new Date().toISOString().split('T')[0],
            amount: amount,
            status: 'PROCESSED'
          };
          serverTransactions = [newTx, ...serverTransactions];
          resolve({ success: true });
        }
      }, 1500);
    });
  }
};

/**
 * GEMINI API UTILITY
 */
const callGeminiAPI = async (userQuery, contextData = null) => {
  // ---------------------------------------------------------
  // 🔑 KEY HIDDEN: Now using process.env for broader compatibility
  // In Vite/Vercel, ensure you set 'VITE_GEMINI_API_KEY' in your environment variables.
  // ---------------------------------------------------------
  // Fallback to import.meta.env if process.env is not defined (standard Vite behavior)
  let apiKey = "";
  try {
    // Try standard Vite access first
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    }
  } catch (e) {
    // Ignore error if import.meta is not supported
  }

  // Fallback to process.env (Standard Node/Webpack/Compatible)
  if (!apiKey && typeof process !== 'undefined' && process.env) {
    apiKey = process.env.VITE_GEMINI_API_KEY;
  }
  
  // NOTE: If both fail locally, ensure your .env file is set up and your build tool loads it.
  
  if (!apiKey) {
      return "Configuration Error: VITE_GEMINI_API_KEY is missing. Please add it to your .env file locally or Vercel Environment Variables.";
  }

  let systemContext = "";
  if (contextData) {
    systemContext = `
      CURRENT USER CONTEXT:
      - Name: ${contextData.owner}
      - Account Balance: €${contextData.balance}
      - Recent Transactions: ${JSON.stringify(contextData.transactions)}
    `;
  }

  const systemPrompt = `
    You are 'BankBot', an intelligent, secure banking assistant for the OP Bank Sandbox App.
    ${systemContext}
    INSTRUCTIONS:
    1. Answer specific questions about the user's finances.
    2. Keep answers short (under 50 words), professional, and helpful.
  `;
  
  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble connecting to the bank network right now.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Service temporarily unavailable. Please try again later.";
  }
};

/**
 * MOCK NEWS
 */
const MOCK_NEWS = [
  { id: 101, type: 'news', title: 'Market Update', desc: 'EUR/USD exchange rate remains stable at 1.08.', time: '2h ago' },
  { id: 102, type: 'security', title: 'Security Alert', desc: 'Enable 2FA to protect your sandbox account.', time: '5h ago' },
  { id: 103, type: 'promo', title: 'Student Savings', desc: 'New high-yield savings vault available for students.', time: '1d ago' },
  { id: 104, type: 'system', title: 'Maintenance', desc: 'Scheduled maintenance on Sunday 02:00 - 04:00.', time: '2d ago' }
];

export default function BankingApp() {
  const [activeTab, setActiveTab] = useState('wallet');
  const [userData, setUserData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState(null);
  
  // Feature States
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  
  // Menu State with Timed Interactions
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canCloseMenu, setCanCloseMenu] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Customization State
  const [customBackground, setCustomBackground] = useState(null);
  const [bgBrightness, setBgBrightness] = useState(5);
  const fileInputRef = useRef(null);

  // Animation State
  const [animDirection, setAnimDirection] = useState('right');

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    { role: 'model', text: "Hello! I'm your Bank Assistance AI. I can see your account details. How can I help?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Transfer & Top Up Form State
  const [transferAmount, setTransferAmount] = useState('');
  const [topUpAmount, setTopUpAmount] = useState(''); 
  const [recipientName, setRecipientName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);

  // --- TAB NAVIGATION LOGIC ---
  const handleTabChange = (newTab) => {
    const tabOrder = ['wallet', 'transfer', 'topup', 'history', 'account'];
    const prevIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(newTab);

    if (newIndex > prevIndex) {
      setAnimDirection('right');
    } else {
      setAnimDirection('left');
    }
    setActiveTab(newTab);
    handleCloseMenu();
  };

  // --- MENU CLOSE ANIMATION LOGIC ---
  const handleCloseMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsMenuOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const balanceData = await fakeBankAPI.getBalance();
      const txData = await fakeBankAPI.getTransactions();
      setUserData(balanceData);
      setTransactions(txData);
    } catch (error) {
      console.error("Failed to refresh bank data", error);
      setNotification({ type: 'error', message: "Failed to refresh data" });
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const normalizedUser = {
          ...user,
          displayName: user.displayName || "Alex Student (Guest)",
          photoURL: user.photoURL || null,
          email: user.email || "guest@op-sandbox.com"
        };
        setCurrentUser(normalizedUser);
        if (userData) {
          setUserData(prev => ({ ...prev, owner: normalizedUser.displayName }));
        }
      } else {
        setCurrentUser(null);
        if (userData) {
           setUserData(prev => ({ ...prev, owner: "Alex Student" }));
        }
      }
    });
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  // --- MENU TIMEOUT LOGIC ---
  useEffect(() => {
    let timer;
    if (isMenuOpen) {
      setCanCloseMenu(false);
      timer = setTimeout(() => {
        setCanCloseMenu(true);
      }, 2000);
    } else {
      setCanCloseMenu(false);
    }
    return () => clearTimeout(timer);
  }, [isMenuOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, showAssistant]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setNotification(null);
    const amountNum = parseFloat(transferAmount);

    if (userData.balance < amountNum) {
      setNotification({ type: 'error', message: 'Insufficient funds.' });
      setIsProcessing(false);
      return;
    }

    try {
      await fakeBankAPI.processTransaction(amountNum, recipientName);
      const newTx = {
        id: Date.now(),
        type: 'debit',
        name: recipientName,
        date: new Date().toISOString().split('T')[0],
        amount: amountNum,
        status: 'PENDING'
      };
      setUserData(prev => ({ ...prev, balance: prev.balance - amountNum }));
      setTransactions(prev => [newTx, ...prev]);
      setTransferAmount('');
      setRecipientName('');
      setNotification({ type: 'success', message: 'Payment Initiated' });
    } catch (error) {
      setNotification({ type: 'error', message: "API Error: " + error });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTopUp = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setNotification(null);
    const amountNum = parseFloat(topUpAmount);

    try {
      await fakeBankAPI.depositTransaction(amountNum);
      const newTx = {
        id: Date.now(),
        type: 'credit',
        name: 'Account Top Up',
        date: new Date().toISOString().split('T')[0],
        amount: amountNum,
        status: 'PENDING'
      };
      setUserData(prev => ({ ...prev, balance: prev.balance + amountNum }));
      setTransactions(prev => [newTx, ...prev]);
      setTopUpAmount('');
      setNotification({ type: 'success', message: 'Top Up Successful' });
    } catch (error) {
      setNotification({ type: 'error', message: "API Error: " + error });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    const contextData = {
      owner: currentUser ? currentUser.displayName : userData?.owner,
      balance: userData?.balance,
      transactions: transactions
    };

    try {
      const replyText = await callGeminiAPI(userMsg.text, contextData);
      setChatMessages(prev => [...prev, { role: 'model', text: replyText }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I lost connection to the server." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateInsights = async () => {
    setIsGeneratingInsight(true);
    setAiInsight(null);
    const contextData = {
      owner: currentUser ? currentUser.displayName : userData?.owner,
      balance: userData?.balance,
      transactions: transactions
    };

    try {
      const prompt = "Analyze my recent transactions and balance. Give me one single, valuable financial insight or tip based on this specific data. Be encouraging.";
      const insight = await callGeminiAPI(prompt, contextData);
      setAiInsight(insight);
      if (activeTab !== 'wallet') handleTabChange('wallet');
    } catch (error) {
      setAiInsight("Unable to generate insights at this moment.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const handleLogin = async () => {
    try {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (error) {
      console.error("Login failed", error);
      try {
        await signInAnonymously(auth);
      } catch (anonError) {
        setNotification({ type: 'error', message: 'Login failed. Please try again.' });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      handleCloseMenu();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomBackground(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getOverlayOpacity = () => {
    return (5 - bgBrightness) * 0.15; 
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-blue-500 to-teal-400 flex items-center justify-center flex-col gap-4 text-white">
        <Loader2 className="animate-spin w-12 h-12" />
        <p className="font-semibold tracking-wide">Connecting to OP Sandbox...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans p-4">
       <style>{`
        .slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
        .slide-in-left { animation: slideInLeft 0.3s ease-out forwards; }
        .slide-menu { animation: slideMenu 0.3s ease-out forwards; }
        .slide-menu-out { animation: slideMenuOut 0.3s ease-in forwards; }
        
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideMenu {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideMenuOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
      `}</style>

      {/* APP CONTAINER - DYNAMIC BACKGROUND */}
      <div 
        className={`w-full max-w-md min-h-[850px] rounded-[3rem] shadow-2xl overflow-hidden relative text-white transition-all duration-500 ${!customBackground ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-teal-400' : ''}`}
        style={customBackground ? { 
          backgroundImage: `url(${customBackground})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        } : {}}
      >
        
        {/* DYNAMIC BRIGHTNESS OVERLAY */}
        <div 
          className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300"
          style={{ opacity: getOverlayOpacity() }}
        ></div>

        {/* Default Decor */}
        {!customBackground && (
          <>
            <div className="absolute top-[-10%] right-[-20%] w-80 h-80 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[10%] left-[-10%] w-60 h-60 bg-teal-300 opacity-20 rounded-full blur-3xl pointer-events-none"></div>
          </>
        )}

        {/* --- SIDE MENU DRAWER (Hover Activated) --- */}
        {isMenuOpen && (
          <div className="absolute inset-0 z-[60] flex">
            {/* Backdrop Area */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
              onClick={handleCloseMenu}
              onMouseEnter={() => {
                // Only allow hover-close after the delay timer expires and if not already closing
                if (canCloseMenu && !isClosing) {
                  handleCloseMenu();
                }
              }}
            ></div>
            
            {/* Drawer Content */}
            <div className={`relative w-3/4 max-w-xs bg-white/90 backdrop-blur-xl h-full shadow-2xl p-6 text-slate-800 flex flex-col rounded-r-[2rem] ${isClosing ? 'slide-menu-out' : 'slide-menu'}`}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-bold text-xl text-blue-900">Menu</h2>
                <button onClick={handleCloseMenu} className="p-2 bg-blue-100 rounded-full text-blue-600 hover:bg-blue-200">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Banking</p>
                  <button onClick={() => handleTabChange('wallet')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition text-left font-medium text-slate-700">
                    <Wallet size={20} className="text-blue-500" /> Balance & Wallet
                  </button>
                  <button onClick={() => handleTabChange('transfer')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition text-left font-medium text-slate-700">
                    <ArrowRightLeft size={20} className="text-blue-500" /> Transfer
                  </button>
                  <button onClick={() => handleTabChange('topup')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition text-left font-medium text-slate-700">
                    <Plus size={20} className="text-blue-500" /> Top Up
                  </button>
                  <button onClick={() => handleTabChange('history')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition text-left font-medium text-slate-700">
                    <History size={20} className="text-blue-500" /> Transaction History
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Smart Features</p>
                  <button onClick={() => { handleCloseMenu(); generateInsights(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition text-left font-medium text-slate-700">
                    <BrainCircuit size={20} className="text-purple-500" /> AI Analyze
                  </button>
                  <button onClick={() => { handleCloseMenu(); setShowNotifications(true); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition text-left font-medium text-slate-700">
                    <Bell size={20} className="text-blue-500" /> Notifications
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Profile</p>
                  <button onClick={() => handleTabChange('account')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition text-left font-medium text-slate-700">
                    <User size={20} className="text-blue-500" /> Account Settings
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Personalization</p>
                   <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 space-y-4">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                           <ImageIcon size={20} className="text-slate-500" />
                           <span className="text-sm font-semibold">App Background</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          ref={fileInputRef} 
                          className="hidden" 
                          onChange={handleImageUpload} 
                        />
                        <button 
                          onClick={() => fileInputRef.current.click()}
                          className="w-full bg-white border border-slate-300 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2"
                        >
                           <Upload size={14} /> Upload Image
                        </button>
                        {customBackground && (
                          <button 
                            onClick={() => setCustomBackground(null)}
                            className="w-full mt-2 text-xs text-red-500 hover:text-red-600 underline"
                          >
                            Reset to Default
                          </button>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-3 mb-2">
                           <Sun size={20} className="text-slate-500" />
                           <span className="text-sm font-semibold">Background Brightness</span>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                           <Moon size={16} className="text-slate-400" />
                           {[1, 2, 3, 4, 5].map((level) => (
                             <button
                               key={level}
                               onClick={() => setBgBrightness(level)}
                               className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                 bgBrightness === level 
                                   ? 'bg-blue-600 text-white scale-110 shadow-md' 
                                   : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                               }`}
                             >
                               {level}
                             </button>
                           ))}
                           <Sun size={16} className="text-amber-500" />
                        </div>
                      </div>

                   </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200 mt-4">
                 <button onClick={handleLogout} className="w-full flex items-center gap-2 text-red-500 font-bold p-2 hover:bg-red-50 rounded-lg transition">
                    <LogOut size={18} /> Sign Out
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* --- NOTIFICATIONS --- */}
        {showNotifications && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-6 animate-fade-in" onClick={() => setShowNotifications(false)}>
            <div className="bg-white/20 backdrop-blur-xl border border-white/40 w-full rounded-3xl p-6 shadow-2xl text-white max-h-[60%] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Bell size={20} className="fill-white" /> Notifications
                </h3>
                <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-white/20 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {MOCK_NEWS.map((item) => (
                  <div key={item.id} className="bg-white/10 p-3 rounded-xl border border-white/10 hover:bg-white/20 transition">
                    <div className="flex items-center gap-2 mb-1">
                      {item.type === 'news' ? <Newspaper size={14} className="text-yellow-300"/> : <ShieldCheck size={14} className="text-green-300"/>}
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">{item.type} • {item.time}</span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                    <p className="text-xs opacity-80 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- AI ASSISTANT --- */}
        {showAssistant && (
          <div className="absolute inset-0 z-50 flex items-end justify-center pb-24 px-4 animate-slide-up">
            <div className="bg-white/90 backdrop-blur-xl w-full h-[60%] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-800 relative">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Bank Assistant</h3>
                    <p className="text-[10px] opacity-80">Powered by Gemini AI</p>
                  </div>
                </div>
                <button onClick={() => setShowAssistant(false)} className="hover:bg-white/20 p-2 rounded-full transition">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-slate-700 rounded-bl-none border border-gray-100'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-100 flex gap-1">
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75"></span>
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 shrink-0 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask: 'Can I afford this?'" 
                  className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button type="submit" className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition shadow-lg disabled:opacity-50" disabled={isTyping || !chatInput.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </div>
            <div className="absolute inset-0 z-[-1] bg-black/20 backdrop-blur-[1px]" onClick={() => setShowAssistant(false)}></div>
          </div>
        )}

        {/* --- HEADER --- */}
        <header className="p-8 pt-12 relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div 
                onMouseEnter={() => setIsMenuOpen(true)}
                className="bg-white/20 backdrop-blur-md p-2 rounded-xl hover:bg-white/30 transition cursor-pointer"
              >
                <Menu size={24} />
              </div>
              <button onClick={refreshData} disabled={isRefreshing} className="bg-white/20 backdrop-blur-md p-2 rounded-xl hover:bg-white/30 transition">
                <RefreshCw size={24} className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-xs uppercase tracking-widest opacity-80">Welcome Back</span>
              <span className="font-bold text-lg">
                {currentUser ? currentUser.displayName : (userData ? userData.owner : 'Guest')}
              </span>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1 text-[10px] font-mono opacity-90 bg-black/10 px-2 py-1 rounded-lg">
                <Clock size={10} />
                {currentTime.toLocaleTimeString('en-US', { 
                  timeZone: 'Asia/Bangkok', 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false
                })}
              </div>

              <button 
                onClick={() => setShowNotifications(true)}
                className="bg-white/20 backdrop-blur-md p-2 rounded-xl relative hover:bg-white/30 transition"
              >
                <Bell size={24} />
                <div className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              </button>
            </div>
          </div>

          <div className="relative mb-8">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-70">
              <Search size={20} />
            </div>
            <input 
              type="text" 
              placeholder="Search transactions..." 
              className="w-full bg-white/20 backdrop-blur-lg border border-white/30 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/70 focus:outline-none focus:bg-white/30 transition shadow-lg"
            />
          </div>

          {/* Balance Card */}
          <div className="bg-white/20 backdrop-blur-xl border border-white/40 p-6 rounded-3xl shadow-xl relative overflow-hidden group">
            <div className="absolute -right-12 -top-12 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition duration-700"></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <Wifi className="rotate-90 opacity-80" size={24} />
              <span className="font-mono opacity-80 italic">OP Corporate</span>
            </div>
            
            <div className="space-y-1 relative z-10">
              <p className="text-sm opacity-80">Total Balance</p>
              <h1 className="text-4xl font-bold tracking-tight">€ {userData.balance.toLocaleString()}</h1>
            </div>

            <div className="flex justify-between items-end mt-8 relative z-10">
              <div>
                <p className="text-xs opacity-70 uppercase mb-1">Card Holder</p>
                <p className="font-semibold tracking-wide">
                  {currentUser ? currentUser.displayName : (userData ? userData.owner : 'Guest')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70 uppercase mb-1">Expires</p>
                <p className="font-semibold tracking-wide">12/28</p>
              </div>
            </div>
          </div>
        </header>

        {/* --- MAIN CONTENT (With Sliding Transitions) --- */}
        <main className="bg-white/10 backdrop-blur-md min-h-screen rounded-t-[3rem] p-8 relative z-10 -mt-4 border-t border-white/20 overflow-hidden">
          
          {notification && (
            <div className={`mb-6 p-4 rounded-2xl backdrop-blur-xl border flex items-center gap-3 text-sm animate-bounce-short shadow-lg ${notification.type === 'success' ? 'bg-green-400/20 border-green-200 text-white' : 'bg-red-400/20 border-red-200 text-white'}`}>
              <ShieldCheck size={16} />
              {notification.message}
            </div>
          )}

          {/* Render content based on activeTab with animations */}
          {/* Using 'key' to force re-render and trigger animation when tab changes */}
          <div key={activeTab} className={animDirection === 'right' ? 'slide-in-right' : 'slide-in-left'}>
            
            {/* VIEW: WALLET */}
            {activeTab === 'wallet' && (
              <div className="space-y-6">
                <div className="flex justify-between gap-4">
                  <button onClick={() => handleTabChange('transfer')} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center gap-2 transition border border-white/20 shadow-lg group">
                    <div className="bg-white text-blue-500 p-2 rounded-full group-hover:scale-110 transition">
                      <ArrowRightLeft size={20} />
                    </div>
                    <span className="text-xs font-semibold">Transfer</span>
                  </button>
                  <button onClick={() => handleTabChange('topup')} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center gap-2 transition border border-white/20 shadow-lg group">
                    <div className="bg-white text-blue-500 p-2 rounded-full group-hover:scale-110 transition">
                      <CreditCard size={20} />
                    </div>
                    <span className="text-xs font-semibold">Top Up</span>
                  </button>
                  <button 
                    onClick={generateInsights}
                    disabled={isGeneratingInsight}
                    className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center gap-2 transition border border-white/20 shadow-lg group"
                  >
                    <div className="bg-white text-purple-600 p-2 rounded-full group-hover:scale-110 transition relative">
                      {isGeneratingInsight ? <Loader2 size={20} className="animate-spin" /> : <BrainCircuit size={20} />}
                    </div>
                    <span className="text-xs font-semibold">AI Analyze ✨</span>
                  </button>
                </div>

                {aiInsight && (
                  <div className="animate-slide-up bg-purple-600/20 backdrop-blur-xl border border-purple-200/40 p-4 rounded-2xl relative">
                    <button onClick={() => setAiInsight(null)} className="absolute top-2 right-2 opacity-50 hover:opacity-100"><X size={16}/></button>
                    <div className="flex items-start gap-3">
                      <Sparkles className="text-yellow-300 shrink-0 mt-1" size={18} />
                      <div>
                        <h4 className="font-bold text-sm mb-1 text-purple-100">Financial Insight</h4>
                        <p className="text-xs text-white leading-relaxed">{aiInsight}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Transactions</h3>
                    <button onClick={() => handleTabChange('history')} className="text-xs opacity-70 hover:opacity-100 transition">View All</button>
                  </div>
                  
                  <div className="space-y-3 pb-32">
                    {transactions.slice(0, 4).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm hover:scale-[1.02] transition duration-300 text-slate-800">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {tx.type === 'credit' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">{tx.name}</p>
                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{tx.status}</p>
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${tx.type === 'credit' ? 'text-green-600' : 'text-slate-900'}`}>
                          {tx.type === 'credit' ? '+' : '-'}€{tx.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: TRANSFER */}
            {activeTab === 'transfer' && (
              <div className="pb-24">
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => handleTabChange('wallet')} className="bg-white/20 p-2 rounded-full backdrop-blur-md">
                     <ArrowRightLeft className="rotate-180" size={20} />
                  </button>
                  <h2 className="text-xl font-bold">New Payment</h2>
                </div>
                
                <form onSubmit={handleTransfer} className="space-y-6">
                  <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-1 rounded-2xl">
                    <div className="bg-white/10 p-4 rounded-xl">
                      <label className="block text-xs font-bold opacity-70 uppercase tracking-wider mb-2">Recipient</label>
                      <div className="flex items-center gap-3">
                        <User size={20} className="opacity-70" />
                        <input 
                          type="text" 
                          required
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Name or IBAN"
                          className="w-full bg-transparent border-none text-white placeholder-white/50 focus:outline-none font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-1 rounded-2xl">
                    <div className="bg-white/10 p-4 rounded-xl">
                      <label className="block text-xs font-bold opacity-70 uppercase tracking-wider mb-2">Amount (EUR)</label>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">€</span>
                        <input 
                          type="number" 
                          required
                          min="0.01"
                          step="0.01"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent border-none text-white placeholder-white/50 focus:outline-none font-bold text-3xl"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isProcessing}
                    className="w-full bg-white text-blue-600 py-4 rounded-2xl font-bold shadow-xl active:scale-[0.98] transition disabled:opacity-70 flex items-center justify-center gap-2 hover:bg-blue-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        Confirm Payment
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* VIEW: TOP UP */}
            {activeTab === 'topup' && (
              <div className="pb-24">
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => handleTabChange('wallet')} className="bg-white/20 p-2 rounded-full backdrop-blur-md">
                     <ArrowRightLeft className="rotate-180" size={20} />
                  </button>
                  <h2 className="text-xl font-bold">Top Up Account</h2>
                </div>
                
                <form onSubmit={handleTopUp} className="space-y-6">
                   <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-1 rounded-2xl">
                    <div className="bg-white/10 p-4 rounded-xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <CreditCard size={20} className="opacity-70" />
                          <div>
                              <p className="text-xs font-bold opacity-70 uppercase tracking-wider">Source</p>
                              <p className="font-medium">Debit Card (**** 8821)</p>
                          </div>
                      </div>
                    </div>
                   </div>

                   <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-1 rounded-2xl">
                    <div className="bg-white/10 p-4 rounded-xl">
                      <label className="block text-xs font-bold opacity-70 uppercase tracking-wider mb-2">Amount (EUR)</label>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">€</span>
                        <input 
                          type="number" 
                          required
                          min="0.01"
                          step="0.01"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent border-none text-white placeholder-white/50 focus:outline-none font-bold text-3xl"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isProcessing}
                    className="w-full bg-white text-blue-600 py-4 rounded-2xl font-bold shadow-xl active:scale-[0.98] transition disabled:opacity-70 flex items-center justify-center gap-2 hover:bg-blue-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Processing...
                      </>
                    ) : (
                      <>
                        Add Funds
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* VIEW: ACCOUNT */}
            {activeTab === 'account' && (
              <div className="pb-24 flex flex-col items-center justify-center h-full">
                {currentUser ? (
                  <div className="w-full bg-white/20 backdrop-blur-xl border border-white/30 p-6 rounded-3xl text-center space-y-6">
                    <div className="relative inline-block">
                      {currentUser.photoURL ? (
                         <img src={currentUser.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white/50 shadow-xl mx-auto" />
                      ) : (
                         <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-4xl font-bold mx-auto border-4 border-white/50 shadow-xl">
                           {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                         </div>
                      )}
                      <div className="absolute bottom-0 right-0 bg-green-400 w-6 h-6 rounded-full border-2 border-white"></div>
                    </div>
                    
                    <div>
                      <h2 className="text-2xl font-bold">{currentUser.displayName}</h2>
                      <p className="text-sm opacity-70 flex items-center justify-center gap-2 mt-1">
                        <Mail size={14}/> {currentUser.email}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                       <div className="bg-white/10 p-3 rounded-xl">
                          <p className="text-xs opacity-70 uppercase">Account Status</p>
                          <p className="font-bold text-green-300">Active</p>
                       </div>
                       <div className="bg-white/10 p-3 rounded-xl">
                          <p className="text-xs opacity-70 uppercase">Member Since</p>
                          <p className="font-bold">2023</p>
                       </div>
                    </div>

                    <button 
                      onClick={handleLogout}
                      className="w-full bg-red-500/80 hover:bg-red-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition"
                    >
                      <LogOut size={18} /> Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-6 p-6">
                    <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                      <User size={48} className="opacity-80" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Welcome to OP Bank</h2>
                      <p className="opacity-80 text-sm max-w-xs mx-auto">Sign in to sync your preferences and secure your account.</p>
                    </div>
                    <button 
                      onClick={handleLogin}
                      className="w-full bg-white text-blue-600 py-4 px-8 rounded-2xl font-bold shadow-xl active:scale-[0.98] transition hover:bg-blue-50 flex items-center justify-center gap-3"
                    >
                       <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                       Sign in with Google
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW: HISTORY */}
            {activeTab === 'history' && (
               <div className="pb-24">
                  <h3 className="font-bold text-lg mb-4">Transaction History</h3>
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm hover:scale-[1.02] transition duration-300 text-slate-800">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {tx.type === 'credit' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">{tx.name}</p>
                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{tx.status}</p>
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${tx.type === 'credit' ? 'text-green-600' : 'text-slate-900'}`}>
                          {tx.type === 'credit' ? '+' : '-'}€{tx.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
               </div>
            )}

          </div>

        </main>

        {/* --- FLOATING AI BUTTON --- */}
        <button 
          onClick={() => setShowAssistant(!showAssistant)}
          className="absolute bottom-24 right-6 z-40 bg-white text-blue-600 p-4 rounded-full shadow-2xl hover:scale-110 transition duration-300 border border-blue-100 flex items-center justify-center"
        >
          {showAssistant ? <X size={24} /> : <MessageCircle size={24} />}
        </button>

        {/* --- BOTTOM NAV --- */}
        <nav className="absolute bottom-6 left-6 right-6 bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl p-2 flex justify-around shadow-2xl z-30">
          <button onClick={() => handleTabChange('wallet')} className={`p-3 rounded-xl transition ${activeTab === 'wallet' ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-white/10'}`}>
            <Wallet size={24} />
          </button>
          <button onClick={() => handleTabChange('transfer')} className={`p-3 rounded-xl transition ${activeTab === 'transfer' ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-white/10'}`}>
            <ArrowRightLeft size={24} />
          </button>
          <button onClick={() => handleTabChange('history')} className={`p-3 rounded-xl transition ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-white/10'}`}>
            <History size={24} />
          </button>
          <button onClick={() => handleTabChange('account')} className={`p-3 rounded-xl transition ${activeTab === 'account' ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-white/10'}`}>
            <User size={24} />
          </button>
        </nav>

      </div>
    </div>
  );
}
