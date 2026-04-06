import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './RoleBadge';
import { Book, LogOut, User as UserIcon, Search, Bell, CheckCircle, MessageCircle, UserPlus, Users, Menu, X, Loader2 } from 'lucide-react';
import { NovelType, Notification, NotificationType, Novel } from '../types';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadMessageCount, getPublicNovels } from '../services/dbService';


export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<Novel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounced Search
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      timeoutId = setTimeout(async () => {
        const novels = await getPublicNovels();
        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = novels.filter(n => 
          (n.title && n.title.toLowerCase().includes(lowerCaseQuery)) ||
          (n.author && n.author.toLowerCase().includes(lowerCaseQuery))
        ).slice(0, 5); // Limit to top 5 hits
        setSearchResults(filtered);
        setIsSearching(false);
      }, 500); // 500ms debounce
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Message State
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Fetch notifications & messages
  useEffect(() => {
    if (currentUser) {
        const fetchData = async () => {
            const list = await getUserNotifications(currentUser.id);
            setNotifications(list);
            setUnreadCount(list.filter(n => !n.isRead).length);
            
            const msgs = await getUnreadMessageCount(currentUser.id);
            setUnreadMsgCount(msgs);
        };
        fetchData();
        // Set interval to poll every 10 seconds for simulated real-time
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    } else {
        setNotifications([]);
        setUnreadCount(0);
        setUnreadMsgCount(0);
    }
  }, [currentUser, location.pathname]); 

  // Close dropdown when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
              setShowNotifications(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: Notification) => {
      if (!notif.isRead) {
          await markNotificationAsRead(notif.id);
          setNotifications(prev => prev.map(n => n.id === notif.id ? {...n, isRead: true} : n));
          setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setShowNotifications(false);
      navigate(notif.link);
  };

  const handleMarkAllRead = async () => {
      if (currentUser && unreadCount > 0) {
          await markAllNotificationsAsRead(currentUser.id);
          setNotifications(prev => prev.map(n => ({...n, isRead: true})));
          setUnreadCount(0);
      }
  }

  const getNotifIcon = (type: NotificationType) => {
      switch(type) {
          case NotificationType.NEW_CHAPTER: return <Book className="w-4 h-4 text-blue-500"/>;
          case NotificationType.LIKE_COMMENT: return <div className="text-red-500">❤️</div>;
          case NotificationType.REPLY_COMMENT: return <div className="text-green-500">💬</div>;
          case NotificationType.NEW_POST_COMMENT: return <MessageCircle className="w-4 h-4 text-purple-500"/>;
          case NotificationType.FRIEND_REQUEST: return <UserPlus className="w-4 h-4 text-indigo-500"/>;
          case NotificationType.FRIEND_ACCEPT: return <Users className="w-4 h-4 text-green-500"/>;
          default: return <Bell className="w-4 h-4 text-slate-500"/>;
      }
  };

  if (location.pathname.includes('/chapter/')) return null;

  return (
    <header className={`sticky top-0 z-40 navbar-transition w-full ${scrolled ? 'pt-4 px-4' : 'pt-0 px-0'}`}>
      <nav className={`mx-auto navbar-transition ${
        scrolled 
        ? 'max-w-5xl rounded-full bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
        : 'max-w-none w-full rounded-none bg-white/60 dark:bg-[#0f1016]/60 backdrop-blur-xl border-b border-white/20 dark:border-purple-900/30'
      }`}>
        <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 navbar-transition ${scrolled ? 'h-14' : 'h-16'}`}>
          <div className="flex justify-between items-center h-full relative">
          {/* Logo and Main Navigation */}
          <div className={`flex items-center navbar-transition overflow-hidden origin-left ${scrolled && isSearchFocused ? 'w-0 opacity-0 md:mr-0 scale-x-0' : 'w-auto opacity-100 scale-x-100'}`}>
            <Link to="/" className="flex items-center flex-shrink-0 mr-8 group">
              <img src="/Logof.png" className="block dark:hidden h-[43px] w-auto object-contain group-hover:scale-110 transition-transform drop-shadow-sm" alt="Logo Light" />
              <img src="/logow.png" className="hidden dark:block h-[43px] w-auto object-contain group-hover:scale-110 transition-transform drop-shadow-sm" alt="Logo Dark" />
              <span className="ml-[6px] text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight hidden md:block">BetoBook</span>
            </Link>
            
            <div className="hidden md:flex md:items-center md:space-x-2">
               <Link 
                  to="/category/translated" 
                  className={`relative px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 overflow-hidden group ${
                    isActive('/category/translated') 
                      ? 'text-primary dark:text-purple-400 bg-primary/5 dark:bg-primary/10' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <span className="relative z-10">{NovelType.TRANSLATED}</span>
                  {isActive('/category/translated') && (
                      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse-glow"></div>
                  )}
                </Link>
                <Link 
                  to="/category/original" 
                  className={`relative px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 overflow-hidden group ${
                    isActive('/category/original') 
                      ? 'text-primary dark:text-purple-400 bg-primary/5 dark:bg-primary/10' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <span className="relative z-10">{NovelType.ORIGINAL}</span>
                  {isActive('/category/original') && (
                      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse-glow"></div>
                  )}
                </Link>
                <Link 
                  to="/forum" 
                  className={`relative px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 overflow-hidden group ${
                    isActive('/forum') || location.pathname.startsWith('/forum')
                      ? 'text-primary dark:text-purple-400 bg-primary/5 dark:bg-primary/10' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <span className="relative z-10">Diễn đàn</span>
                  {(isActive('/forum') || location.pathname.startsWith('/forum')) && (
                      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse-glow"></div>
                  )}
                </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className={`flex-1 flex items-center px-2 navbar-transition ${scrolled && isSearchFocused ? 'justify-start lg:ml-0' : 'justify-center lg:ml-6 lg:justify-end'}`}>
            <div className={`w-full navbar-transition ${scrolled && isSearchFocused ? 'max-w-full' : 'max-w-lg lg:max-w-xs'}`}>
              <label htmlFor="search" className="sr-only">Tìm kiếm</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className={`h-5 w-5 transition-colors ${isSearchFocused ? 'text-primary' : 'text-slate-400'}`} />
                </div>
                <form onSubmit={handleSearch}>
                  <input
                    id="search"
                    name="search"
                    className="block w-full pl-10 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-full leading-5 bg-slate-100/90 dark:bg-slate-800/60 backdrop-blur-md placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-[#1a1b26] focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-100 sm:text-sm transition-all"
                    placeholder="Tìm truyện, tác giả..."
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                        // Delay blur so users can click links before search closes
                        setTimeout(() => setIsSearchFocused(false), 200);
                    }}
                  />
                </form>
                
                {/* Instant Search Dropdown */}
                {isSearchFocused && searchQuery.trim().length >= 2 && (
                    <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#1a1b26] rounded-xl shadow-[0_10px_40px_-10px_rgba(124,58,237,0.3)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] border border-purple-100 dark:border-purple-900/50 overflow-hidden animate-scaleIn z-50">
                        {isSearching ? (
                            <div className="p-4 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                <Loader2 className="animate-spin w-5 h-5 mr-2" /> Đang tìm...
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="max-h-80 overflow-y-auto">
                                {searchResults.map(result => (
                                    <Link 
                                        to={`/novel/${result.id}`} 
                                        key={result.id}
                                        className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-[#0f1016] border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors"
                                    >
                                        <img src={result.coverUrl} className="w-10 h-14 object-cover rounded-md shadow-sm" alt=""/>
                                        <div className="ml-3 overflow-hidden">
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{result.title}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">{result.author}</div>
                                        </div>
                                    </Link>
                                ))}
                                <Link 
                                    to={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                                    className="block text-center p-3 text-xs font-bold text-primary hover:bg-primary/5 transition-colors bg-slate-50 dark:bg-slate-900/50"
                                >
                                    Xem tất cả kết quả cho "{searchQuery}"
                                </Link>
                            </div>
                        ) : (
                            <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                                Không tìm thấy truyện hay tác giả phù hợp.
                            </div>
                        )}
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center ml-4">
            {currentUser ? (
              <div className="flex items-center space-x-2 md:space-x-4">
                
                {/* Expandable Action Group */}
                <div className={`flex items-center space-x-2 md:space-x-4 navbar-transition transform origin-right ${scrolled && isSearchFocused ? 'w-0 opacity-0 scale-x-0 mx-0 overflow-hidden' : 'w-auto opacity-100 scale-x-100'}`}>
                    {/* MESSAGES ICON */}
                    <Link 
                       to="/messages" 
                       className="flex-shrink-0 p-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors hover:bg-primary/10 rounded-full relative"
                       title="Tin nhắn"
                    >
                        <div className="relative">
                            <MessageCircle className="h-6 w-6" />
                            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white opacity-0 animate-[ping_3s_ease-in-out_infinite]"></div>
                            {unreadMsgCount > 0 && (
                                 <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white">
                                     {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                                 </span>
                            )}
                        </div>
                    </Link>
    
                    {/* NOTIFICATIONS DROPDOWN */}
                    <div className="relative flex-shrink-0" ref={notifDropdownRef}>
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors hover:bg-primary/10 rounded-full relative"
                        >
                            <Bell className="h-6 w-6" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
    
                        {showNotifications && (
                            <>
                                <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setShowNotifications(false)}></div>
                                <div className="fixed sm:absolute top-16 sm:top-auto left-4 right-4 sm:left-auto sm:right-0 sm:mt-2 sm:w-80 md:w-96 bg-white/95 dark:bg-[#1a1b26]/95 backdrop-blur-2xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(124,58,237,0.2)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-purple-100 dark:border-purple-900/50 overflow-hidden origin-top-right z-50 animate-scaleIn">
                                    <div className="p-3 border-b border-purple-50 dark:border-purple-900/50 flex justify-between items-center bg-white/50 dark:bg-black/20">
                                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">Thông báo</h3>
                                        {unreadCount > 0 && (
                                            <button onClick={handleMarkAllRead} className="text-xs text-primary dark:text-purple-400 hover:underline flex items-center">
                                                <CheckCircle className="w-3 h-3 mr-1"/> Đánh dấu đã đọc
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[60vh] overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map(notif => (
                                                <div 
                                                    key={notif.id} 
                                                    onClick={() => handleNotificationClick(notif)}
                                                    className={`p-3 border-b border-purple-50/50 dark:border-purple-900/30 last:border-0 hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-colors flex gap-3 ${!notif.isRead ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                                                >
                                                    <div className="flex-shrink-0 relative">
                                                        <img src={notif.actorAvatar || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover border dark:border-slate-700" alt=""/>
                                                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border dark:border-slate-700">
                                                            {getNotifIcon(notif.type)}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{notif.title}</div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">{notif.message}</div>
                                                        <div className="text-[10px] text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                    </div>
                                                    {!notif.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600"/>
                                                Chưa có thông báo nào.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className={`h-6 w-px bg-purple-100 dark:bg-purple-900 hidden md:block transition-all duration-300 ${scrolled && isSearchFocused ? 'w-0 opacity-0 overflow-hidden mx-0' : 'opacity-100'}`}></div>

                <Link to="/profile" className="flex items-center group flex-shrink-0 p-1.5 rounded-full hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors border border-transparent hover:border-purple-200/50 dark:hover:border-purple-800/50">
                  <div className={`hidden md:flex flex-col items-end mr-3 overflow-hidden transition-all duration-300 ${scrolled && isSearchFocused ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    <div className="flex items-center">
                       <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors max-w-[100px] truncate">{currentUser.username}</span>
                       <div className="hidden lg:block">
                           <RoleBadge roles={currentUser.roles} limit={scrolled ? 1 : undefined} />
                       </div>
                       <div className="block lg:hidden">
                           <RoleBadge roles={currentUser.roles} limit={1} />
                       </div>
                    </div>
                  </div>
                  <img 
                    src={currentUser.avatar} 
                    alt="avatar" 
                    className="flex-shrink-0 h-9 w-9 rounded-full object-cover border border-slate-200 group-hover:border-primary transition-colors"
                  />
                </Link>
                
                <button 
                  onClick={handleLogout}
                  className={`flex-shrink-0 p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full hidden md:block ${scrolled && isSearchFocused ? 'w-0 opacity-0 scale-x-0 overflow-hidden px-0 mx-0' : 'w-auto opacity-100 scale-x-100'}`}
                  title="Đăng xuất"
                >
                  <LogOut className="h-5 w-5" />
                </button>

                {/* MOBILE MENU BUTTON */}
                <button 
                  className={`flex-shrink-0 md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full ${scrolled && isSearchFocused ? 'w-0 opacity-0 scale-x-0 overflow-hidden px-0 mx-0' : 'w-auto opacity-100 scale-x-100'}`}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                  <Link 
                    to="/login" 
                    className="flex items-center px-5 py-2.5 border border-transparent text-sm font-bold rounded-full text-white bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary shadow-lg shadow-primary/30 whitespace-nowrap transition-all transform hover:scale-105"
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Đăng nhập</span>
                  </Link>
                  {/* MOBILE MENU BUTTON (LOGGED OUT) */}
                  <button 
                    className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-purple-100/50 dark:border-purple-900/50 bg-white/95 dark:bg-[#0f1016]/95 backdrop-blur-xl shadow-2xl absolute w-full left-0 animate-slide-up">
            <div className="px-4 pt-2 pb-4 space-y-2">
                <Link 
                    to="/category/translated" 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`block px-4 py-3 rounded-xl font-bold transition-colors ${isActive('/category/translated') ? 'bg-primary/10 text-primary' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                    {NovelType.TRANSLATED}
                </Link>
                <Link 
                    to="/category/original" 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`block px-4 py-3 rounded-xl font-bold transition-colors ${isActive('/category/original') ? 'bg-primary/10 text-primary' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                    {NovelType.ORIGINAL}
                </Link>
                <Link 
                    to="/forum" 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`block px-4 py-3 rounded-xl font-bold transition-colors ${isActive('/forum') || location.pathname.startsWith('/forum') ? 'bg-primary/10 text-primary' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                    Diễn đàn
                </Link>
                
                {currentUser && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                        <button 
                            onClick={() => {
                                handleLogout();
                                setIsMobileMenuOpen(false);
                            }} 
                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 font-bold text-red-600 dark:text-red-400 flex items-center transition-colors"
                        >
                            <LogOut className="w-5 h-5 mr-3"/> Đăng xuất
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
      </nav>
    </header>
  );
};
