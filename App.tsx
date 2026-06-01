
import React from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Lazy load page components
const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage').then(m => ({ default: m.CategoryPage })));
const Profile = React.lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const NovelDetail = React.lazy(() => import('./pages/NovelDetail').then(m => ({ default: m.NovelDetail })));
const ChapterDetail = React.lazy(() => import('./pages/ChapterDetail').then(m => ({ default: m.ChapterDetail })));
const SearchPage = React.lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const ForumPage = React.lazy(() => import('./pages/ForumPage').then(m => ({ default: m.ForumPage })));
const PostDetail = React.lazy(() => import('./pages/PostDetail').then(m => ({ default: m.PostDetail })));
const About = React.lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Messages = React.lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));

// Premium loading fallback spinner for Suspense
const LoadingSpinner = () => (
  <div className="flex h-[80vh] w-full items-center justify-center bg-slate-50 dark:bg-[#0f1016]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500 animate-pulse">Đang tải trang...</p>
    </div>
  </div>
);

// Protected Route Wrapper
const ProtectedUserRoute = ({ children }: { children?: React.ReactNode }) => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const showFooter = location.pathname !== '/messages';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-slate-50 dark:bg-[#0f1016]">
        <React.Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<About />} />
            
            <Route path="/category/translated" element={<CategoryPage type="translated" />} />
            <Route path="/category/original" element={<CategoryPage type="original" />} />
            
            <Route path="/novel/:novelId/chapter/:chapterId" element={<ChapterDetail />} />
            <Route path="/novel/:id" element={<NovelDetail />} />
            
            <Route path="/search" element={<SearchPage />} />

            {/* Forum Routes */}
            <Route path="/forum/:id" element={<PostDetail />} />
            <Route path="/forum" element={<ForumPage />} />

            {/* User Profiles */}
            <Route path="/user/:userId" element={<Profile />} />
            <Route path="/profile" element={
              <ProtectedUserRoute>
                  <Profile />
              </ProtectedUserRoute>
            } />
            
            {/* Messaging */}
            <Route path="/messages" element={
              <ProtectedUserRoute>
                  <Messages />
              </ProtectedUserRoute>
            } />
          </Routes>
        </React.Suspense>
      </main>



      {showFooter && (
        <footer className="bg-white dark:bg-[#1a1b26] border-t border-slate-200 dark:border-slate-800 py-8 mt-auto relative z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">BetoBook</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  Nền tảng đọc truyện chữ online hàng đầu. Nơi kết nối đam mê giữa độc giả, dịch giả và tác giả.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Liên kết nhanh</h3>
                <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                  <li><Link to="/" className="hover:text-primary dark:hover:text-purple-400">Trang chủ</Link></li>
                  <li><Link to="/category/translated" className="hover:text-primary dark:hover:text-purple-400">Truyện dịch</Link></li>
                  <li><Link to="/category/original" className="hover:text-primary dark:hover:text-purple-400">Sáng tác</Link></li>
                  <li><Link to="/forum" className="hover:text-primary dark:hover:text-purple-400">Diễn đàn</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Thông tin</h3>
                <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                  <li><Link to="/about" className="hover:text-primary dark:hover:text-purple-400">Về chúng tôi</Link></li>
                  <li><a href="#" className="hover:text-primary dark:hover:text-purple-400">Điều khoản sử dụng</a></li>
                  <li><a href="#" className="hover:text-primary dark:hover:text-purple-400">Chính sách bảo mật</a></li>
                  <li><a href="#" className="hover:text-primary dark:hover:text-purple-400">Liên hệ quảng cáo</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 text-center text-slate-400 dark:text-slate-500 text-sm">
              &copy; 2025 BetoBook. All rights reserved.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

function App() {
  // Dọn rác Firebase/Firestore cũ tồn đọng trong LocalStorage từ thời kỳ đồ đá =)))
  React.useEffect(() => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.toLowerCase().includes('firebase') || key.toLowerCase().includes('firestore')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage).forEach(key => {
        if (key.toLowerCase().includes('firebase') || key.toLowerCase().includes('firestore')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {}
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
