import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Novel, NovelType, NovelGenre, ReadingHistoryItem } from '../types';
import { getPublicNovels } from '../services/dbService';
import { Search, Star, Loader2, ChevronLeft, ChevronRight, Sparkles, Zap, Globe, PenTool, TrendingUp, BookOpen, Flame, CheckCircle, User, Clock, X } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';

// Helper: Seeded Random Shuffle
// Giúp trộn mảng ngẫu nhiên nhưng cố định theo một chuỗi (seed) đầu vào
const shuffleWithSeed = <T,>(array: T[], seed: string): T[] => {
  const arr = [...array];
  
  // Tạo hash số từ chuỗi seed (ví dụ: ngày hiện tại)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  // Hàm random giả lập dựa trên seed
  const seededRandom = () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };

  // Thuật toán Fisher-Yates shuffle
  let m = arr.length, t, i;
  while (m) {
    i = Math.floor(seededRandom() * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
};

// Component hiển thị Card truyện nhỏ
const NovelCard: React.FC<{ novel: Novel }> = ({ novel }) => {
  const rating = novel.ratingCount && novel.ratingCount > 0 ? (novel.ratingSum! / novel.ratingCount).toFixed(1) : 'N/A';
  return (
    <Link to={`/novel/${novel.id}`} className="group flex flex-col bg-white dark:bg-[#1a1b26] rounded-2xl shadow-sm hover:shadow-2xl dark:hover:shadow-[0_10px_40px_-10px_rgba(124,58,237,0.3)] transition-all duration-500 overflow-hidden border border-slate-100/50 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 transform hover:-translate-y-3 h-full relative">
        <div className="shine-effect"></div>
        <div className="aspect-[2/3] w-full overflow-hidden bg-slate-200 dark:bg-slate-800 relative">
            <img 
              src={novel.coverUrl} 
              alt={novel.title} 
              className="h-full w-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Status Tag */}
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-lg font-bold tracking-wide">
              {novel.status}
            </div>

            {/* Rating Tag */}
            <div className="absolute bottom-2 right-2 bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-lg flex items-center gap-1 scale-90 group-hover:scale-100 transition-transform duration-300">
              {rating !== 'N/A' && <Star className="w-3 h-3 fill-slate-900 stroke-none"/>}
              <span>{rating}</span>
            </div>
        </div>
        <div className="flex-1 p-3.5 flex flex-col bg-gradient-to-b from-white dark:from-[#1a1b26] to-slate-50/50 dark:to-[#0f1016]">
            <h3 className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-primary dark:group-hover:text-primary transition-colors min-h-[40px] leading-snug">
              {novel.title}
            </h3>
            <div className="flex flex-wrap gap-1 mt-3 mt-auto">
                {novel.genres.slice(0, 2).map(g => (
                    <span key={g} className="text-[9px] px-2 py-0.5 bg-slate-100/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded border border-slate-200/60 dark:border-slate-700/60 whitespace-nowrap font-medium">{g}</span>
                ))}
            </div>
        </div>
    </Link>
  );
};

export const Home: React.FC = () => {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sections Data
  const [featuredNovels, setFeaturedNovels] = useState<Novel[]>([]);
  const [dailyTranslated, setDailyTranslated] = useState<Novel[]>([]);
  const [dailyOriginal, setDailyOriginal] = useState<Novel[]>([]);
  const [topTranslated, setTopTranslated] = useState<Novel[]>([]);
  const [topOriginal, setTopOriginal] = useState<Novel[]>([]);

  // New Content Sections
  const [completedNovels, setCompletedNovels] = useState<Novel[]>([]);
  const [topRatedNovels, setTopRatedNovels] = useState<Novel[]>([]);
  const [spotlightNovels, setSpotlightNovels] = useState<Novel[]>([]);
  const [spotlightGenre, setSpotlightGenre] = useState<string>('');
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>([]);

  // Tabs & Pagination for "Latest Updates"
  const [activeTab, setActiveTab] = useState<NovelType>(NovelType.TRANSLATED);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getPublicNovels();
        // Nếu không có truyện nào (lần đầu chạy), tự động tạo dữ liệu mẫu
        if (data.length === 0) {
            // Database seeding is handled by backend now
        }
        setNovels(data);
        
        // 1. Featured Novels (Được Admin đánh dấu sao)
        const featured = data.filter(n => n.isFeatured);
        // Fallback: Nếu không có truyện nào được đánh dấu, lấy truyện mới nhất đã hoàn thành
        const fallback = !featured.length 
            ? (data.find(n => n.status === 'Đã hoàn thành') ? [data.find(n => n.status === 'Đã hoàn thành')!] : (data.length > 0 ? [data[0]] : [])) 
            : featured;
        setFeaturedNovels(fallback);

        // Chuỗi ngày hiện tại để làm seed (Reset vào 0h mỗi ngày theo giờ máy người dùng)
        const todaySeed = new Date().toDateString(); 

        // 2. Daily Translated Recommendation
        const translated = data.filter(n => n.type === NovelType.TRANSLATED);
        const shuffledTranslated = shuffleWithSeed(translated, todaySeed);
        setDailyTranslated(shuffledTranslated.slice(0, 12)); // Tăng lên để đủ cuộn ngang

        // 3. Daily Original Recommendation
        const original = data.filter(n => n.type === NovelType.ORIGINAL);
        const shuffledOriginal = shuffleWithSeed(original, todaySeed);
        setDailyOriginal(shuffledOriginal.slice(0, 12)); // Tăng lên để đủ cuộn ngang

        // 4. Top Novels (Sort by rating)
        const sortedTranslated = [...translated].sort((a, b) => {
            const ratingA = a.ratingCount ? (a.ratingSum! / a.ratingCount) : 0;
            const ratingB = b.ratingCount ? (b.ratingSum! / b.ratingCount) : 0;
            return ratingB - ratingA;
        });
        setTopTranslated(sortedTranslated.slice(0, 5)); // Lấy top 5

        const sortedOriginal = [...original].sort((a, b) => {
            const ratingA = a.ratingCount ? (a.ratingSum! / a.ratingCount) : 0;
            const ratingB = b.ratingCount ? (b.ratingSum! / b.ratingCount) : 0;
            return ratingB - ratingA;
        });
        setTopOriginal(sortedOriginal.slice(0, 5)); // Lấy top 5

        // --- NEW SECTIONS DATA ---
        // 5. Truyen Da Hoan Thanh (Binge Section)
        setCompletedNovels(data.filter(n => n.status === 'Đã hoàn thành').slice(0, 4));

        // 6. Top Rated (Hall of Fame). All novels sorted globally by rating
        const allSortedRating = [...data].sort((a, b) => {
            const ratingA = a.ratingCount ? (a.ratingSum! / a.ratingCount) : 0;
            const ratingB = b.ratingCount ? (b.ratingSum! / b.ratingCount) : 0;
            return ratingB - ratingA;
        });
        setTopRatedNovels(allSortedRating.slice(0, 4)); // Show 4 top rated in small cards

        // 7. Genre Spotlight
        const spotlightGenres: NovelGenre[] = [NovelGenre.ACTION, NovelGenre.ROMANCE, NovelGenre.FANTASY, NovelGenre.COMEDY, NovelGenre.ISEKAI];
        const seedGenreIndex = new Date().getDate() % spotlightGenres.length;
        const currentSpotlightGenre = spotlightGenres[seedGenreIndex];
        setSpotlightGenre(currentSpotlightGenre);
        setSpotlightNovels(data.filter(n => n.genres && n.genres.includes(currentSpotlightGenre)).slice(0, 8));

      } catch (error) {
        console.error("Failed to fetch novels", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Load Reading History from Client Local Storage
  useEffect(() => {
     try {
         const history = localStorage.getItem('readingHistory');
         if (history) setReadingHistory(JSON.parse(history));
     } catch(e) {
         console.warn("Could not parse reading history", e);
     }
  }, []);

  const removeHistoryItem = (novelId: string) => {
     try {
         const newHistory = readingHistory.filter(item => item.novelId !== novelId);
         setReadingHistory(newHistory);
         localStorage.setItem('readingHistory', JSON.stringify(newHistory));
     } catch (e) {}
  };

  // Auto-slide effect
  useEffect(() => {
    if (featuredNovels.length <= 1) return;
    const slideInterval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % featuredNovels.length);
    }, 4000); 
    return () => clearInterval(slideInterval);
  }, [featuredNovels.length]);

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % featuredNovels.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + featuredNovels.length) % featuredNovels.length);

  // Filter & Paginate for "Latest Updates" section
  const filteredNovels = novels.filter(n => n.type === activeTab);
  const totalPages = Math.ceil(filteredNovels.length / ITEMS_PER_PAGE);
  const latestNovels = filteredNovels.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  if (loading) {
      return <LoadingScreen />;
  }

  // Lấy ảnh bìa hiện tại để render nền mờ (Ambient light effect)
  const currentFeaturedCover = featuredNovels.length > 0 ? featuredNovels[currentSlide]?.coverUrl : null;

  return (
    <div className="pb-12 bg-slate-50/30 dark:bg-transparent min-h-screen relative flex flex-col -mt-[64px] overflow-hidden">
      {/* AMBIENT BLUR BACKDROP FOR CAROUSEL */}
      {currentFeaturedCover && (
          <div className="absolute inset-x-0 top-0 h-[800px] pointer-events-none z-0 overflow-hidden">
              <div className="absolute inset-0 transition-all duration-1000 ease-in-out">
                  {featuredNovels.map((slide, index) => (
                      <img 
                          key={slide.id}
                          src={slide.coverUrl} 
                          alt="" 
                          className={`absolute inset-0 w-full h-[800px] object-cover filter blur-[40px] md:blur-[60px] transform scale-125 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-40 dark:opacity-30' : 'opacity-0'}`}
                      />
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/80 to-slate-50 dark:via-[#0f1016]/80 dark:to-[#0f1016]"></div>
              </div>
          </div>
      )}

      {/* Premium Web3 Noise */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] dark:opacity-[0.03] pointer-events-none z-0"></div>
      
      <div className="flex-1 space-y-12 z-10">
      {/* SECTION 1: FEATURED BANNER */}
      {featuredNovels.length > 0 && (
        <div className="relative bg-slate-950 text-white overflow-hidden h-[500px] md:h-[550px] rounded-b-[2rem] md:rounded-b-[3rem] shadow-[0_20px_50px_-15px_rgba(124,58,237,0.4)] mb-8 mx-auto max-w-[1920px] !mt-0 z-10 pt-[64px]">
           {/* Decorative background elements */}
           <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
               <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/30 to-transparent blur-2xl"></div>
               <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-600/20 to-transparent blur-2xl"></div>
           </div>
           {featuredNovels.map((slide, index) => (
               <div 
                  key={slide.id}
                  className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'}`}
               >
                  <div className="absolute inset-0">
                    <img src={slide.coverUrl} alt="Banner" className="w-full h-full object-cover opacity-60 blur-[2px] scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/30"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/50 to-transparent"></div>
                  </div>
                  
                  <div className="relative max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 flex flex-col md:flex-row items-center h-full justify-center md:justify-start 2xl:px-16 gap-8">
                     {/* 3D Book Mockup with paper pages edge */}
                     <div className="hidden md:block perspective-container mr-6 flex-shrink-0 animate-float">
                        <div className="relative w-56 h-80 rounded-2xl group cursor-pointer book-3d">
                           <div className="shine-effect rounded-2xl"></div>
                           <img src={slide.coverUrl} alt={slide.title} className="w-full h-full object-cover rounded-2xl border border-white/10" />
                           {/* Simulated 3D pages edge */}
                           <div className="absolute inset-y-1.5 -right-2 w-2 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 dark:from-slate-700 dark:via-slate-650 dark:to-slate-800 rounded-r border-r border-y border-white/10 z-0 origin-left transform rotate-y-[90deg] skew-y-3"></div>
                        </div>
                     </div>

                     {/* Glassmorphic Info Card */}
                     <div className="flex-1 text-center md:text-left max-w-3xl bg-slate-950/40 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10">
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-300 text-[10px] md:text-xs font-bold mb-4 md:mb-6 shadow-[0_0_15px_rgba(245,158,11,0.3)] relative overflow-hidden">
                           <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300 animate-pulse" /> NỔI BẬT HÔM NAY
                        </div>
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-2xl line-clamp-2 leading-tight silver-metallic-text">
                           {slide.title}
                        </h1>
                        <p className="text-xs md:text-sm text-slate-200 mb-6 line-clamp-3 md:line-clamp-2 max-w-2xl mx-auto md:mx-0 leading-relaxed font-light">
                           {slide.description}
                        </p>
                        <div className="flex flex-wrap items-center md:justify-start justify-center gap-3">
                           <Link 
                             to={`/novel/${slide.id}`}
                             className="px-8 py-3.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-full font-bold transition-all transform hover:scale-105 hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] border border-primary/20 w-full sm:w-auto text-center flex items-center justify-center text-sm"
                           >
                             <BookOpen className="w-4 h-4 mr-2" /> Đọc Ngay
                           </Link>
                           <span className="text-slate-300 text-xs md:text-sm font-medium uppercase tracking-widest flex items-center bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
                             <PenTool className="w-3.5 h-3.5 mr-2 text-slate-400"/> {slide.author}
                           </span>
                           <span className="text-amber-400 text-xs md:text-sm font-extrabold flex items-center bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
                             <Star className="w-3.5 h-3.5 mr-1.5 fill-amber-400 stroke-none"/>
                             {slide.ratingCount && slide.ratingCount > 0 ? (slide.ratingSum! / slide.ratingCount).toFixed(1) : 'N/A'}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>
           ))}

           {featuredNovels.length > 1 && (
               <>
                   <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors hidden md:block">
                       <ChevronLeft className="w-8 h-8"/>
                   </button>
                   <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors hidden md:block">
                       <ChevronRight className="w-8 h-8"/>
                   </button>
                   <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex space-x-3 items-center min-h-[20px]">
                       {featuredNovels.map((_, idx) => (
                           <button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ease-out flex-shrink-0 ${idx === currentSlide ? 'bg-white scale-[1.5] shadow-[0_0_12px_rgba(255,255,255,0.9)] ring-[1px] ring-white/50' : 'bg-white/40 hover:bg-white/70 hover:scale-[1.2]'}`} />
                       ))}
                   </div>
               </>
           )}
        </div>
      )}

      {/* LEFT/RIGHT AMBIENT ORBS FOR ULTRAWIDE SCREENS */}
      <div className="fixed top-1/4 left-[-15%] w-[40%] h-[60vh] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-primary/5 to-transparent rounded-full pointer-events-none hidden 2xl:block z-0"></div>
      <div className="fixed top-2/3 right-[-15%] w-[35%] h-[50vh] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-fuchsia-500/10 via-fuchsia-500/5 to-transparent rounded-full pointer-events-none hidden 2xl:block z-0"></div>
      
      <div className="max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-12 md:space-y-16 relative z-10 2xl:px-16">
        
        {/* NEW PHASE 8: INSTAGRAM STORIES AUTHORS STRIP */}
        <section className="pt-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-primary animate-pulse" /> Tác Giả Ngôi Sao
                </h2>
                <span className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Hall of Fame</span>
            </div>
            <div className="flex overflow-x-auto gap-5 pb-4 scrollbar-hide snap-x">
                {Array.from(new Set(novels.filter(n => n.type === NovelType.ORIGINAL).map(n => n.author))).slice(0, 10).map((author, idx) => {
                    const levelLabel = idx === 0 ? 'Đại Thần' : idx === 1 ? 'Bạch Kim' : idx === 2 ? 'Đỉnh Phong' : 'Danh Tiếng';
                    const gradientClass = idx === 0 ? 'from-amber-400 via-rose-500 to-primary' : 
                                          idx === 1 ? 'from-purple-600 via-fuchsia-500 to-blue-400' :
                                          idx === 2 ? 'from-emerald-400 via-teal-500 to-cyan-500' :
                                          'from-slate-200 via-slate-300 to-slate-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900';
                    return (
                        <div key={idx} className="flex flex-col items-center gap-2 snap-center group cursor-pointer flex-shrink-0">
                            <div className={`relative p-[3px] rounded-full bg-gradient-to-tr ${gradientClass} transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-purple-500/5 group-hover:shadow-purple-500/20`}>
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-white dark:bg-[#1a1b26] rounded-full p-[2px] relative overflow-hidden flex items-center justify-center">
                                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${author}&backgroundColor=transparent`} className="w-full h-full object-cover rounded-full bg-slate-100 dark:bg-slate-800" alt={author} />
                                </div>
                                {idx < 3 && (
                                    <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-900 font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-white">
                                        👑
                                    </div>
                                )}
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 w-20 text-center truncate">{author}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                idx === 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                                idx === 1 ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' :
                                idx === 2 ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent'
                            }`}>{levelLabel}</span>
                        </div>
                    );
                })}
            </div>
        </section>

        {/* QUICK GENRES LINKS */}
        <section className="pt-4">
            <div className="flex overflow-x-auto scrollbar-hide gap-3 pb-4 px-1">
                {['Hành động', 'Giả tưởng', 'Lãng mạn', 'Đời thường', 'Hài hước', 'Kịch tính', 'Kinh dị', 'Dị giới'].map((genre, idx) => (
                    <Link 
                        key={genre} 
                        to={`/search?q=${encodeURIComponent(genre)}`}
                        className="flex-shrink-0 px-6 py-3 rounded-2xl text-sm font-bold shadow-sm dark:shadow-none border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#1a1b26] hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 transition-all transform hover:-translate-y-1 flex items-center gap-2"
                    >
                        <span className={`w-2 h-2 rounded-full ${
                            idx % 4 === 0 ? 'bg-blue-500' :
                            idx % 4 === 1 ? 'bg-red-500' :
                            idx % 4 === 2 ? 'bg-green-500' :
                            'bg-purple-500'
                        }`}></span>
                        {genre}
                    </Link>
                ))}
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: DAILY RECOMMENDATIONS */}
            <div className="lg:col-span-2 space-y-12 md:space-y-16">
                
                {/* NEW: CONTINUE READING (LOCAL HISTORY) */}
                {readingHistory.length > 0 && (
                    <section className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-4 md:mb-6 mt-1">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                <Clock className="w-5 h-5 md:w-6 md:h-6 mr-2 text-indigo-500"/>
                                Đang Đọc Dở
                            </h2>
                        </div>
                        <div className="flex overflow-x-auto gap-4 pb-2 px-1 scrollbar-hide snap-x">
                            {readingHistory.map(item => (
                                <div key={item.novelId} className="flex-shrink-0 w-[240px] md:w-[280px] bg-white dark:bg-[#1a1b26] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg dark:shadow-none hover:border-indigo-400/50 transition-all relative overflow-hidden group snap-start">
                                    <button 
                                        onClick={(e) => { e.preventDefault(); removeHistoryItem(item.novelId); }} 
                                        className="absolute top-2 right-2 bg-black/60 hover:bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm"
                                        title="Xóa khỏi lịch sử"
                                    >
                                        <X className="w-3.5 h-3.5"/>
                                    </button>
                                    <Link to={`/novel/${item.novelId}/chapter/${item.chapterId}`} className="flex items-center p-3 gap-3 h-full">
                                        <div className="w-14 h-18 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                                            <img src={item.novelCoverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt=""/>
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0 justify-center">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[13px] md:text-sm line-clamp-1 mb-1 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">{item.novelTitle}</h4>
                                            <div className="text-[11px] md:text-xs text-indigo-600 dark:text-indigo-400 font-medium line-clamp-1 mb-auto bg-indigo-50 dark:bg-indigo-500/10 self-start px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-500/20">{item.chapterTitle}</div>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2.5 font-bold uppercase tracking-wider flex items-center">Đọc tiếp ngay <ChevronRight className="w-3 h-3 ml-0.5"/></span>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {/* SECTION 2: DAILY TRANSLATED RECOMMENDATION */}
                {dailyTranslated.length > 0 && (
                    <section className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                <Globe className="w-5 h-5 md:w-6 md:h-6 mr-2 text-blue-500"/>
                                Đề Cử Truyện Dịch
                                <span className="ml-2 md:ml-3 text-[10px] md:text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-full flex items-center border border-slate-200 dark:border-slate-700">
                                    <Sparkles className="w-3 h-3 mr-1 text-yellow-500"/> Hôm nay
                                </span>
                            </h2>
                            <Link to="/category/translated" className="text-xs md:text-sm font-medium text-primary dark:text-purple-400 hover:underline flex items-center whitespace-nowrap">
                                Xem tất cả <ChevronRight className="w-3 h-3 md:w-4 md:h-4"/>
                            </Link>
                        </div>
                        <div className="flex overflow-x-auto gap-4 md:gap-6 pb-6 pt-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                            {dailyTranslated.map(novel => (
                                <div key={novel.id} className="min-w-[160px] md:min-w-[200px] max-w-[160px] md:max-w-[200px] snap-start flex-shrink-0">
                                    <NovelCard novel={novel} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* PROMO BANNER 1 */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 p-8 shadow-xl shadow-purple-500/20 group cursor-pointer animate-fadeIn border border-white/20 mb-12 md:mb-16">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between">
                        <div>
                            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold tracking-widest uppercase mb-3 border border-white/30">
                                Sự Kiện Mùa Xuân
                            </span>
                            <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Đại Hội Sáng Tác 2026</h3>
                            <p className="text-white/80 font-medium max-w-md">Tham gia ngay để nhận hàng triệu xu thưởng và vinh danh trên bảng vàng!</p>
                        </div>
                        <button className="mt-6 md:mt-0 bg-white text-purple-600 font-bold px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition-transform">
                            Tham Gia Giờ
                        </button>
                    </div>
                </div>

                {/* NEW: GENRE SPOTLIGHT (Asymmetrical Layout) */}
                {spotlightNovels.length >= 2 && (
                    <section className="animate-fadeIn mb-12 md:mb-16 bg-slate-900/90 dark:bg-[#111219]/90 border border-slate-800 dark:border-purple-950/40 p-5 md:p-7 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                        {/* Red glow backdrop */}
                        <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                        
                        <div className="flex items-center justify-between mb-5 md:mb-7 relative z-10">
                            <h2 className="text-lg md:text-2xl font-extrabold text-white flex items-center">
                                <Flame className="w-5 h-5 md:w-6 md:h-6 mr-2 text-rose-500 animate-pulse"/>
                                Tiêu Điểm Tuần: <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent ml-2 font-black">{spotlightGenre}</span>
                            </h2>
                            <Link to={`/search?q=${encodeURIComponent(spotlightGenre)}`} className="text-xs md:text-sm font-semibold text-rose-400 hover:text-rose-350 flex items-center">
                                Khám phá ngay <ChevronRight className="w-3.5 h-3.5 ml-0.5"/>
                            </Link>
                        </div>
                        <div className="flex flex-col md:flex-row gap-5 h-auto md:h-[360px] relative z-10">
                            {/* Left Hero Card */}
                            <Link to={`/novel/${spotlightNovels[0].id}`} className="flex-1 md:w-1/2 h-[300px] md:h-full rounded-2xl overflow-hidden relative group border border-white/5 shadow-2xl">
                                <img src={spotlightNovels[0].coverUrl} alt={spotlightNovels[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                                    <div className="inline-flex items-center bg-rose-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full mb-3 shadow-lg uppercase tracking-wider">SIÊU PHẨM</div>
                                    <h3 className="text-xl md:text-2xl font-extrabold text-white mb-2 line-clamp-2 group-hover:text-rose-400 transition-colors leading-tight">{spotlightNovels[0].title}</h3>
                                    <p className="text-slate-300 text-xs line-clamp-2 mb-4 font-light leading-relaxed">{spotlightNovels[0].description}</p>
                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase"><PenTool className="w-3 h-3 inline pb-0.5 mr-1 text-rose-500"/> {spotlightNovels[0].author}</span>
                                        <span className="text-rose-400 text-xs font-black flex items-center gap-1">
                                            {spotlightNovels[0].ratingCount && spotlightNovels[0].ratingCount > 0 ? (
                                                <>
                                                    <Star className="w-3.5 h-3.5 fill-rose-400 stroke-none"/>
                                                    {(spotlightNovels[0].ratingSum! / spotlightNovels[0].ratingCount).toFixed(1)}
                                                </>
                                            ) : (
                                                'N/A'
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                            
                            {/* Right List */}
                            <div className="flex-1 md:w-1/2 flex flex-col gap-3.5 h-auto md:h-full overflow-y-auto pr-1 scrollbar-hide">
                                {spotlightNovels.slice(1, 8).map((novel, idx) => (
                                    <Link key={novel.id} to={`/novel/${novel.id}`} className="shrink-0 h-[100px] rounded-2xl bg-white/5 border border-white/5 p-2 flex gap-4 transition-all hover:bg-white/10 hover:border-rose-500/20 group">
                                        <div className="w-[70px] h-full overflow-hidden rounded-xl shrink-0 border border-white/5">
                                            <img src={novel.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt=""/>
                                        </div>
                                        <div className="flex flex-col justify-center py-1 pr-2 w-full">
                                            <h4 className="font-bold text-slate-200 text-xs md:text-sm line-clamp-2 group-hover:text-rose-400 transition-colors leading-snug">{novel.title}</h4>
                                            <div className="flex items-center justify-between w-full mt-auto">
                                                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]"><User className="w-3 h-3 inline pb-0.5 mr-1 text-rose-500"/>{novel.author}</span>
                                                <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">{novel.type}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* SECTION 3: DAILY ORIGINAL RECOMMENDATION */}
                {dailyOriginal.length > 0 && (
                    <section className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                <PenTool className="w-5 h-5 md:w-6 md:h-6 mr-2 text-green-500"/>
                                Đề Cử Sáng Tác
                            </h2>
                            <Link to="/category/original" className="text-xs md:text-sm font-medium text-primary dark:text-purple-400 hover:underline flex items-center whitespace-nowrap">
                                Xem tất cả <ChevronRight className="w-3 h-3 md:w-4 md:h-4"/>
                            </Link>
                        </div>
                        <div className="flex overflow-x-auto gap-4 md:gap-6 pb-6 pt-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                            {dailyOriginal.map(novel => (
                                <div key={novel.id} className="min-w-[160px] md:min-w-[200px] max-w-[160px] md:max-w-[200px] snap-start flex-shrink-0">
                                    <NovelCard novel={novel} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* NEW: COMPLETED NOVELS (BINGE SECTION) */}
                {completedNovels.length > 0 && (
                    <section className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <h2 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                <CheckCircle className="w-5 h-5 md:w-6 md:h-6 mr-2 text-emerald-500"/>
                                Truyện Đã Hoàn Thành
                            </h2>
                            <Link to={`/search?q=${encodeURIComponent('Đã hoàn thành')}`} className="text-xs md:text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center">
                                Cày ngay <ChevronRight className="w-3 h-3 md:w-4 md:h-4"/>
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                            {completedNovels.map(novel => (
                                <Link key={novel.id} to={`/novel/${novel.id}`} className="flex bg-white dark:bg-[#1a1b26] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)] hover:border-emerald-500/40 transition-all duration-300 group h-[140px]">
                                    <div className="w-[100px] shrink-0 relative overflow-hidden">
                                        <img src={novel.coverUrl} alt={novel.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                        <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-br-lg font-bold uppercase tracking-wider shadow">FULL</div>
                                    </div>
                                    <div className="p-3.5 md:p-4 flex flex-col flex-1 min-w-0 bg-gradient-to-r from-emerald-50/0 to-emerald-50/30 dark:to-emerald-900/5">
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1 line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{novel.title}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 md:line-clamp-3 mb-2 flex-1 leading-relaxed font-light">
                                            {novel.description}
                                        </p>
                                        <div className="flex items-center justify-between mt-auto">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[80px]"><PenTool className="w-3 h-3 inline pb-0.5 mr-1"/> {novel.author}</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md text-[10px] font-bold border border-emerald-100 dark:border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors">Đọc luôn</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* RIGHT COLUMN: TOP NOVELS */}
            <div className="lg:col-span-1 space-y-8 sticky top-24">
                
                {/* NEW: HALL OF FAME RATING */}
                {topRatedNovels.length > 0 && (
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 dark:from-[#13141c] dark:to-[#0f1016] rounded-3xl shadow-xl shadow-slate-900/20 border border-slate-800 p-6 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-bl-full blur-2xl pointer-events-none"></div>
                        <div className="flex items-center mb-6 pb-4 border-b border-white/5 relative z-10">
                            <Star className="w-5 h-5 md:w-6 md:h-6 mr-2 text-yellow-400 fill-yellow-400 animate-pulse"/>
                            <h2 className="text-lg md:text-xl font-extrabold text-white">Đánh Giá Đỉnh Cao</h2>
                        </div>
                        <div className="space-y-4 relative z-10">
                            {topRatedNovels.map((novel, index) => {
                                const score = novel.ratingCount && novel.ratingCount > 0 ? (novel.ratingSum! / novel.ratingCount).toFixed(1) : 'N/A';
                                return (
                                    <Link key={novel.id} to={`/novel/${novel.id}`} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-2.5 rounded-2xl transition-colors border border-white/5 hover:border-yellow-500/30 group/ticket">
                                        <div className="w-12 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 relative">
                                            <img src={novel.coverUrl} className="w-full h-full object-cover group-hover/ticket:scale-110 transition-transform duration-500" alt=""/>
                                            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-slate-200 line-clamp-1 group-hover/ticket:text-yellow-400 transition-colors drop-shadow-md">{novel.title}</h3>
                                            <span className="text-[11px] text-slate-400 flex items-center mt-1 truncate"><PenTool className="w-3 h-3 mr-1 opacity-70"/> {novel.author}</span>
                                        </div>
                                        <div className="shrink-0 flex flex-col items-center justify-center bg-yellow-500/10 px-3 py-1.5 rounded-xl border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)] group-hover/ticket:scale-110 group-hover/ticket:bg-yellow-500/20 transition-all">
                                            <span className="text-yellow-400 font-black text-[13px] drop-shadow-sm">{score}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {[
                    { title: 'BXH Truyện Dịch', icon: <Globe className="w-6 h-6 mr-2 text-blue-500 fill-blue-500/20"/>, novels: topTranslated, path: '/category/translated' },
                    { title: 'BXH Sáng Tác', icon: <PenTool className="w-6 h-6 mr-2 text-green-500 fill-green-500/20"/>, novels: topOriginal, path: '/category/original' }
                ].map((board, bIdx) => board.novels.length > 0 && (
                    <div key={bIdx} className="bg-white dark:bg-[#1a1b26] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800 p-6 overflow-hidden relative">
                        {/* Decorative blob */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/10 dark:to-fuchsia-900/10 rounded-bl-full -z-10"></div>
                        
                        <div className="flex items-center justify-between mb-6 pb-4">
                            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center">
                                {board.icon}
                                {board.title}
                            </h2>
                        </div>
                        <div className="space-y-5">
                            {board.novels.map((novel, index) => {
                                if (index === 0) {
                                    return (
                                        <Link key={novel.id} to={`/novel/${novel.id}`} className="relative block rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(251,191,36,0.2)] group mb-6 hover:-translate-y-1 transition-transform border border-amber-500/30">
                                            <div className="absolute inset-0">
                                                <img src={novel.coverUrl} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" alt=""/>
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                                            </div>
                                            <div className="relative p-5 pt-20 flex items-end">
                                                <div className="absolute top-3 right-3">
                                                    <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 font-extrabold px-3 py-1 rounded-full text-xs shadow-[0_0_15px_rgba(251,191,36,0.5)] flex items-center animate-[shine_2s_infinite]">
                                                        <Sparkles className="w-3 h-3 mr-1"/> QUÁN QUÂN
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-white text-lg line-clamp-2 leading-snug drop-shadow-md group-hover:text-yellow-400 transition-colors">{novel.title}</h3>
                                                    <div className="flex items-center text-xs text-yellow-200 mt-2 font-medium">
                                                        {novel.ratingCount && novel.ratingCount > 0 ? (
                                                            <>
                                                                <Star className="w-3.5 h-3.5 fill-yellow-400 mr-1"/>
                                                                {(novel.ratingSum! / novel.ratingCount).toFixed(1)}
                                                            </>
                                                        ) : (
                                                            <span>N/A</span>
                                                        )}
                                                        <span className="mx-2 opacity-50">•</span>
                                                        <span>{novel.author}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                }
                                return (
                                    <Link key={novel.id} to={`/novel/${novel.id}`} className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-150/60 dark:hover:border-slate-800 transition-all duration-300 group">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm ${
                                            index === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 dark:text-white shadow-slate-400/10' :
                                            index === 2 ? 'bg-gradient-to-br from-amber-600/60 to-amber-700 text-white shadow-amber-500/10' :
                                            'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <div className="w-12 h-16 overflow-hidden rounded-xl shrink-0 border border-slate-100 dark:border-slate-800">
                                            <img src={novel.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt=""/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs md:text-sm line-clamp-1 group-hover:text-primary dark:group-hover:text-primary transition-colors leading-snug">{novel.title}</h3>
                                            <div className="flex items-center text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium gap-1.5">
                                                <span className="flex items-center text-amber-500 font-bold">
                                                    {novel.ratingCount && novel.ratingCount > 0 ? (
                                                        <>
                                                            <Star className="w-3 h-3 fill-amber-500 mr-0.5"/>
                                                            {(novel.ratingSum! / novel.ratingCount).toFixed(1)}
                                                        </>
                                                    ) : (
                                                        'N/A'
                                                    )}
                                                </span>
                                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                                <span className="truncate max-w-[80px]">{novel.author}</span>
                                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                                <span className="text-[10px] text-primary/80 dark:text-purple-400/80 font-bold bg-primary/5 dark:bg-purple-400/5 px-1.5 py-0.5 rounded">{novel.type}</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                        <Link to={board.path} className="block w-full text-center mt-8 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors border border-slate-200/60 dark:border-slate-700">
                            Xem đầy đủ 
                        </Link>
                    </div>
                ))}
            </div>
        </div>

        {/* SECTION 4: LATEST UPDATES (OLD TABS) */}
        <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center mb-3 md:mb-0">
                    <Zap className="w-5 h-5 md:w-6 md:h-6 mr-2 text-primary"/>
                    Mới Cập Nhật
                </h2>
                <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-1 md:pb-0">
                    <button
                        onClick={() => { setActiveTab(NovelType.TRANSLATED); setCurrentPage(1); }}
                        className={`flex-shrink-0 px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${
                            activeTab === NovelType.TRANSLATED
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-white dark:bg-[#1a1b26] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                        }`}
                    >
                        {NovelType.TRANSLATED}
                    </button>
                    <button
                        onClick={() => { setActiveTab(NovelType.ORIGINAL); setCurrentPage(1); }}
                        className={`flex-shrink-0 px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${
                            activeTab === NovelType.ORIGINAL
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-white dark:bg-[#1a1b26] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                        }`}
                    >
                        {NovelType.ORIGINAL}
                    </button>
                </div>
            </div>

            {latestNovels.length > 0 ? (
                <div className="animate-fadeIn">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-3 md:gap-5">
                        {latestNovels.map(novel => <NovelCard key={novel.id} novel={novel} />)}
                    </div>
                    
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-2 mt-10">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-[#1a1b26] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5"/>
                            </button>
                            
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                        currentPage === i + 1 
                                        ? 'bg-primary text-white shadow-md shadow-primary/20 scale-110' 
                                        : 'bg-white dark:bg-[#1a1b26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-[#1a1b26] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5"/>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-20 text-slate-500 dark:text-slate-400 bg-white dark:bg-[#1a1b26] rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <Search className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600 opacity-50" />
                    <p className="font-medium">Chưa có truyện nào trong mục này.</p>
                </div>
            )}
        </section>

        </div>
      </div>
    </div>
  );
};

export default Home;