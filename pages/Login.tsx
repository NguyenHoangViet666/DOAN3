
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User as UserIcon, Loader2, AlertCircle, ArrowRight, BookOpen } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, register, currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser) navigate('/');
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    let success = false;
    if (isRegister) {
      if (!formData.username || !formData.password || !formData.email) {
        setError('Vui lòng điền đầy đủ thông tin!');
        setIsLoading(false);
        return;
      }

      // Password Complexity Validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        setError('Mật khẩu phải ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&#).');
        setIsLoading(false);
        return;
      }

      success = await register(formData.username, formData.email, formData.password);
    } else {
      if (!formData.email || !formData.password) {
        setError('Vui lòng nhập email và mật khẩu.');
        setIsLoading(false);
        return;
      }
      success = await login(formData.email, formData.password);
    }

    if (!success) {
        if (isRegister) {
            setError("Đăng ký thất bại (Email có thể đã được sử dụng).");
        } else {
            setError("Đăng nhập thất bại. Kiểm tra lại email hoặc mật khẩu.");
        }
    }
    setIsLoading(false);
  };

  if (authLoading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="animate-spin w-10 h-10 text-primary"/></div>;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* CSS Animation for Background Blobs */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      {/* Animated Background Shapes - Mysterious Violet Theme */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-fuchsia-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      {/* Main Card */}
      <div className="max-w-4xl w-full bg-white/90 dark:bg-[#1a1b26]/90 backdrop-blur-lg rounded-2xl shadow-2xl flex overflow-hidden transform transition-all relative z-10">
        
        {/* Left Side: Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12">
          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 text-primary dark:text-purple-400 mb-4 shadow-inner">
                 <BookOpen className="w-6 h-6" />
             </div>
             <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{isRegister ? 'Tạo tài khoản mới' : 'Chào mừng trở lại'}</h2>
             <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
               {isRegister ? 'Bắt đầu hành trình khám phá thế giới Light Novel.' : 'Đăng nhập để tiếp tục đọc những bộ truyện yêu thích.'}
             </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r text-sm flex items-start animate-fadeIn">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>{error}</span>
              </div>
            )}

            {isRegister && (
              <div className="relative group">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 ml-1">Tên hiển thị</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input 
                    type="text" 
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#1a1b26] focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200" 
                    placeholder="Ví dụ: Kirito" 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                  />
                </div>
              </div>
            )}

            <div className="relative group">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 ml-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  type="email" 
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#1a1b26] focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200" 
                  placeholder="name@example.com" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            <div className="relative group">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 ml-1">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  type="password" 
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#1a1b26] focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200" 
                  placeholder="••••••••" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                />
              </div>
              {isRegister && (
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 px-1 italic">
                    * Yêu cầu: ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
                  </p>
              )}
            </div>

            <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-fuchsia-600 hover:from-fuchsia-600 hover:to-primary text-white font-bold shadow-lg shadow-primary/30 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex justify-center items-center"
            >
               {isLoading ? <Loader2 className="animate-spin w-5 h-5"/> : (
                   <>
                     {isRegister ? 'Đăng Ký Ngay' : 'Đăng Nhập'}
                     <ArrowRight className="ml-2 w-5 h-5" />
                   </>
               )}
            </button>
          </form>

          <div className="mt-8 text-center">
             <p className="text-sm text-slate-500 dark:text-slate-400">
                 {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
                 <button 
                    onClick={() => { setIsRegister(!isRegister); setError(''); }} 
                    className="font-bold text-primary dark:text-purple-400 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 hover:underline transition-colors"
                 >
                     {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
                 </button>
             </p>
          </div>
        </div>

        {/* Right Side: Decorative Banner (Hidden on mobile) */}
        <div className="hidden md:block w-1/2 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-fuchsia-700"></div>
            <img 
                src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=1628&q=80" 
                alt="Library" 
                className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
            />
            
            <div className="relative z-10 h-full flex flex-col justify-center items-center p-12 text-white text-center">
                <div className="mb-6 bg-white/10 p-4 rounded-full backdrop-blur-sm border border-white/20">
                    <BookOpen className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-4">BetoBook</h3>
                <p className="text-purple-100 text-lg leading-relaxed">
                    {isRegister 
                        ? "Gia nhập cộng đồng hàng nghìn độc giả và tác giả. Cùng nhau chia sẻ đam mê và những câu chuyện tuyệt vời." 
                        : "Nơi những câu chuyện không bao giờ kết thúc. Tiếp tục hành trình của bạn ngay hôm nay."}
                </p>
                
                {/* Decorative dots */}
                <div className="mt-12 flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-white opacity-50"></div>
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                    <div className="w-2 h-2 rounded-full bg-white opacity-50"></div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
