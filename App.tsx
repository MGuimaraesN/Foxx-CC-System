import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Receipt, CreditCard, Settings, Plus, Sun, Moon, LogOut, X, Newspaper, PieChart, Upload, Menu } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TransactionTable } from './components/TransactionTable';
import { TransactionForm } from './components/TransactionForm';
import { CardsView } from './components/CardsView';
import { SettingsView } from './components/SettingsView';
import { TransactionsView } from './components/TransactionsView';
import { NewsView } from './components/NewsView';
import { BudgetView } from './components/BudgetView';
import { ImportView } from './components/ImportView';
import { LoginView } from './components/LoginView';
import { UserManagementView } from './components/UserManagementView';
import { useTransactions, useCards, useDashboardStats, useCreateTransaction, useDeleteTransaction } from './hooks/useTransactions';
import { isAuthenticated, logout, getUserProfile } from './services/userService';
import { Toaster, toast } from 'sonner';

type ViewState = 'dashboard' | 'transactions' | 'cards' | 'budgets' | 'news' | 'import' | 'settings' | 'user';

// Sidebar Item Component
const NavItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [isAuth, setIsAuth] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(getUserProfile());

  // Check Auth on Mount & Fix F5 Refresh Logic
  useEffect(() => {
    const authStatus = isAuthenticated();
    setIsAuth(authStatus);
    if (!authStatus && window.location.pathname !== '/' && window.location.pathname !== '/login') {
       // Simple hash routing protection or state reset
       setCurrentView('dashboard');
    }
  }, []);

  // Update Profile when view changes (simple sync)
  useEffect(() => {
    if(currentView === 'dashboard' || currentView === 'user') {
        setUserProfile(getUserProfile());
    }
  }, [currentView]);

  // Data State via React Query Hooks (only enabled if auth)
  const deleteMutation = useDeleteTransaction({
    onSuccess: () => toast.success('Transaction deleted successfully'),
    onError: () => toast.error('Failed to delete transaction'),
  });

  const { data: transactions = [], isLoading: loadingTransactions, isError, error } = useTransactions();
  const { data: stats = null, isLoading: loadingStats } = useDashboardStats();
  const { data: cards = [], isLoading: loadingCards } = useCards();
  
  const isLoading = loadingTransactions || loadingStats || loadingCards;

  // Calculate unique tags for autocomplete
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    transactions.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [transactions]);

  // Global Error Handler for Query
  useEffect(() => {
    if (isError && error && isAuth) {
      toast.error(error.message || 'Failed to fetch data');
    }
  }, [isError, error, isAuth]);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleCreateSuccess = () => {
    toast.success('Transaction saved successfully');
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleNavClick = (view: ViewState) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsAuth(false);
    toast.info('Logged out successfully');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <Dashboard stats={stats} isLoading={isLoading} />
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                <button 
                  onClick={() => setCurrentView('transactions')}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View All
                </button>
              </div>
              <TransactionTable 
                transactions={transactions.slice(0, 5)} 
                loading={isLoading} 
                cards={cards} 
              />
            </div>
          </div>
        );
      case 'transactions':
        return (
          <TransactionsView 
            transactions={transactions} 
            loading={isLoading} 
            cards={cards} 
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
            error={isError ? error : null}
            showToast={(msg, type) => type === 'success' ? toast.success(msg) : toast.error(msg)}
          />
        );
      case 'cards':
        return (
          <CardsView cards={cards} loading={isLoading} />
        );
      case 'budgets':
        return (
          <BudgetView />
        );
      case 'news':
        return (
          <NewsView />
        );
      case 'import':
        return (
          <ImportView />
        );
      case 'settings':
        return (
          <SettingsView darkMode={darkMode} setDarkMode={setDarkMode} />
        );
      case 'user':
        return (
          <UserManagementView />
        );
      default:
        return null;
    }
  };

  const getHeaderTitle = () => {
    switch(currentView) {
      case 'dashboard': return 'Financial Overview';
      case 'transactions': return 'All Transactions';
      case 'cards': return 'My Cards';
      case 'budgets': return 'Budget Management';
      case 'news': return 'Market News';
      case 'import': return 'Import Data';
      case 'settings': return 'System Settings';
      case 'user': return 'User Profile';
    }
  };

  // Login View Wrapper
  if (!isAuth) {
    return (
        <div className="text-slate-900 dark:text-slate-100 dark:bg-slate-950 transition-colors duration-200">
             <LoginView onLoginSuccess={() => setIsAuth(true)} />
             <div className="absolute top-4 right-4 z-50">
               <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-slate-500 dark:text-slate-300 transition-colors"
               >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
             </div>
        </div>
    );
  }

  const NavigationContent = () => (
    <>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">C</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">CC-Expense</h1>
        </div>
        
        <nav className="space-y-2">
          <NavItem 
            onClick={() => handleNavClick('dashboard')} 
            active={currentView === 'dashboard'} 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
          />
          <NavItem 
            onClick={() => handleNavClick('transactions')} 
            active={currentView === 'transactions'} 
            icon={<Receipt size={20} />} 
            label="Transactions" 
          />
          <NavItem 
            onClick={() => handleNavClick('cards')} 
            active={currentView === 'cards'} 
            icon={<CreditCard size={20} />} 
            label="Cards" 
          />
          <NavItem 
            onClick={() => handleNavClick('budgets')} 
            active={currentView === 'budgets'} 
            icon={<PieChart size={20} />} 
            label="Budgets" 
          />
          <NavItem 
            onClick={() => handleNavClick('news')} 
            active={currentView === 'news'} 
            icon={<Newspaper size={20} />} 
            label="News & AI" 
          />
          <NavItem 
            onClick={() => handleNavClick('import')} 
            active={currentView === 'import'} 
            icon={<Upload size={20} />} 
            label="Import Data" 
          />
          <NavItem 
            onClick={() => handleNavClick('settings')} 
            active={currentView === 'settings'} 
            icon={<Settings size={20} />} 
            label="Settings" 
          />
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group" onClick={() => handleNavClick('user')}>
           <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden">
             {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
             ) : (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{userProfile.name.charAt(0)}</span>
             )}
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{userProfile.name}</p>
             <p className="text-xs text-slate-500 truncate">{userProfile.email}</p>
           </div>
           <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="text-slate-400 hover:text-red-500 transition-colors">
             <LogOut size={16} />
           </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden font-sans">
        
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col">
           <NavigationContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
             <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
                 <div className="absolute right-4 top-4">
                   <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                     <X size={24} />
                   </button>
                 </div>
                 <NavigationContent />
             </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Header */}
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setMobileMenuOpen(true)}
                 className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400"
               >
                 <Menu size={24} />
               </button>
               <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">{getHeaderTitle()}</h2>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <button 
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Expense</span>
              </button>
            </div>
          </header>

          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {renderContent()}
            </div>
          </div>

        </main>

        {/* Modals */}
        {showModal && (
          <TransactionForm 
            onClose={() => setShowModal(false)} 
            onSuccess={handleCreateSuccess}
            cards={cards}
            availableTags={availableTags}
          />
        )}
      </div>
    </>
  );
};

export default App;