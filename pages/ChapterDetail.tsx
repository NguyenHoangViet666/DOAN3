
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getChapterDetail, getChapters, getNovelById, updateChapter, deleteChapter } from '../services/dbService';
import { Chapter, Novel, Role, ReadingHistoryItem } from '../types';
import { Loader2, ChevronLeft, ChevronRight, List, Home, Edit, Save, X, Trash2, AlignLeft, Settings, Type, Moon, Sun, Coffee, ArrowUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { RichTextEditor } from '../components/RichTextEditor';

export const ChapterDetail: React.FC = () => {
    const { novelId, chapterId } = useParams<{ novelId: string; chapterId: string }>();
    const navigate = useNavigate();
    const { currentUser, isAdmin, isMod } = useAuth();
    const { showToast, showConfirm } = useNotification();

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [novel, setNovel] = useState<Novel | null>(null);
    const [allChapters, setAllChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editVolume, setEditVolume] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [updating, setUpdating] = useState(false);

    // Reading Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [readSettings, setReadSettings] = useState({
        theme: 'light', // light, dark, sepia
        fontSize: 20,
        fontFamily: 'serif', // serif, sans
        lineHeight: 1.8,
    });

    const [scrollProgress, setScrollProgress] = useState(0);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const h = document.documentElement;
            const b = document.body;
            const scroll = (h.scrollTop || b.scrollTop);
            const max = (h.scrollHeight || b.scrollHeight) - h.clientHeight;
            const progress = max > 0 ? (scroll / max) * 100 : 0;

            setScrollProgress(progress);
            setShowScrollTop(scroll > 500);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const saved = localStorage.getItem('readSettings');
        if (saved) {
            try {
                setReadSettings(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('readSettings', JSON.stringify(readSettings));
    }, [readSettings]);

    const themes = {
        light: { bg: 'bg-[#ffffff]', text: 'text-slate-800', nav: 'bg-white/80', border: 'border-slate-200/50' },
        dark: { bg: 'bg-[#0a0a0c]', text: 'text-white', nav: 'bg-[#1a1b26]/80', border: 'border-slate-800/50' },
        sepia: { bg: 'bg-[#f4ecd8]', text: 'text-[#433422]', nav: 'bg-[#f4ecd8]/90', border: 'border-[#d3c4a3]/60' },
        twilight: { bg: 'bg-[#0f172a]', text: 'text-white', nav: 'bg-[#0f172a]/80', border: 'border-slate-700/50' }
    };

    const currentTheme = themes[readSettings.theme as keyof typeof themes] || themes.light;

    useEffect(() => {
        const fetch = async () => {
            if (!novelId || !chapterId) return;
            setLoading(true);
            try {
                // Fetch current chapter content
                const chapData = await getChapterDetail(chapterId);
                setChapter(chapData);

                // Fetch novel info
                const novelData = await getNovelById(novelId);
                setNovel(novelData);

                // Fetch list for navigation
                const list = await getChapters(novelId);
                setAllChapters(list);

                // Save to Reading History LocalStorage
                if (chapData && novelData) {
                    try {
                        const savedHistory = localStorage.getItem('readingHistory');
                        let historyList: ReadingHistoryItem[] = savedHistory ? JSON.parse(savedHistory) : [];
                        
                        // Remove if already exists so we can bump it to the front
                        historyList = historyList.filter(item => item.novelId !== novelId);
                        
                        historyList.unshift({
                            novelId: novelId,
                            novelTitle: novelData.title,
                            novelCoverUrl: novelData.coverUrl,
                            chapterId: chapterId,
                            chapterTitle: chapData.title,
                            timestamp: Date.now()
                        });
                        
                        // Keep max 10 items
                        localStorage.setItem('readingHistory', JSON.stringify(historyList.slice(0, 10)));
                    } catch (err) {
                        console.error('Lỗi khi lưu lịch sử đọc:', err);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
        // Scroll to top when chapter changes
        window.scrollTo(0, 0);
    }, [novelId, chapterId]);

    const navigateChapter = (direction: 'next' | 'prev') => {
        const currentIndex = allChapters.findIndex(c => c.id === chapterId);
        if (currentIndex === -1) return;

        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (nextIndex >= 0 && nextIndex < allChapters.length) {
            navigate(`/novel/${novelId}/chapter/${allChapters[nextIndex].id}`);
        }
    };

    const handleOpenEdit = () => {
        if (chapter) {
            const match = chapter.title.match(/^\[(.*?)\]\s*(.*)$/);
            if (match) {
                setEditVolume(match[1]);
                setEditTitle(match[2]);
            } else {
                setEditVolume('');
                setEditTitle(chapter.title);
            }
            setEditContent(chapter.content);
            setIsEditOpen(true);
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chapter || !chapterId) return;
        
        const finalTitle = editVolume.trim() ? `[${editVolume.trim()}] ${editTitle}` : editTitle;
        
        setUpdating(true);
        try {
            const result = await updateChapter(chapterId, finalTitle, editContent);
            setChapter({ ...chapter, title: finalTitle, content: editContent, wordCount: result.wordCount });
            setIsEditOpen(false);
            showToast("Cập nhật chương thành công!", 'success');
        } catch (e) {
            console.error(e);
            showToast("Lỗi cập nhật chương.", 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        showConfirm("Bạn có chắc chắn muốn xóa chương này không? Hành động này không thể hoàn tác.", async () => {
            setLoading(true);
            try {
                if (chapterId) await deleteChapter(chapterId);
                showToast("Đã xóa chương.", 'success');
                navigate(`/novel/${novelId}`);
            } catch (e) {
                console.error(e);
                showToast("Lỗi khi xóa.", 'error');
                setLoading(false);
            }
        });
    };

    if (loading) return <div className="h-screen flex justify-center items-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
    if (!chapter || !novel) return <div className="p-10 text-center">Không tìm thấy nội dung.</div>;

    const currentIndex = allChapters.findIndex(c => c.id === chapterId);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < allChapters.length - 1;

    // Permissions: Uploader of this novel OR Admin OR Mod
    const canEdit = currentUser && (
        currentUser.id === novel.uploaderId ||
        isAdmin ||
        isMod
    );

    return (
        <div className={`${currentTheme.bg} min-h-screen ${currentTheme.text} transition-colors duration-300`}>
            {/* Reading Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-1 z-50 bg-black/5 dark:bg-white/5">
                <div
                    className="h-full bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500 transition-all duration-150 ease-out shadow-[0_0_10px_rgba(124,58,237,0.8)]"
                    style={{ width: `${scrollProgress}%` }}
                ></div>
            </div>

            {/* Edge-to-Edge Nav Bar (to prevent text slipping underneath on the sides) */}
            <div className={`${currentTheme.nav} sticky top-0 z-40 shadow-sm backdrop-blur-2xl border-b ${currentTheme.border} transition-colors duration-300`}>
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to={`/novel/${novel.id}`} className="flex items-center hover:opacity-70 font-bold transition-opacity">
                        <ChevronLeft className="w-5 h-5 mr-1" />
                        <span className="hidden sm:inline truncate max-w-[200px]">{novel.title}</span>
                        <span className="sm:hidden">Trở về</span>
                    </Link>
                    <h1 className="font-bold text-[15px] truncate px-4 flex-1 text-center opacity-80">{chapter.title}</h1>
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="p-2 hover:bg-black/5 rounded-full mr-1 transition-colors relative"
                            title="Cài đặt hiển thị"
                        >
                            <Settings className={`w-5 h-5 transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`} />
                        </button>
                        {canEdit && (
                            <>
                                <button
                                    onClick={handleOpenEdit}
                                    className="p-2 hover:bg-black/5 rounded-full mr-1 transition-colors"
                                    title="Sửa nội dung"
                                >
                                    <Edit className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-2 hover:bg-red-500/10 rounded-full mr-1 text-red-500 transition-colors"
                                    title="Xóa chương"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        <Link to="/" className="p-2 hover:bg-black/5 rounded-full transition-colors"><Home className="w-5 h-5" /></Link>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-10">
                {chapter.wordCount !== undefined && (
                    <div className="flex justify-center mb-6">
                        <span className="text-xs flex items-center px-3 py-1 rounded-full border opacity-60">
                            <AlignLeft className="w-3 h-3 mr-1" /> {chapter.wordCount.toLocaleString()} chữ
                        </span>
                    </div>
                )}
                <div 
                    className={`prose max-w-none leading-relaxed text-left [&_p]:mb-6 [&_p]:min-h-[1rem] ${readSettings.fontFamily === 'serif' ? 'font-serif' : 'font-sans'} ${readSettings.theme === 'dark' || readSettings.theme === 'twilight' ? 'prose-invert !text-white [&_*]:!text-white' : ''}`}
                    style={{
                        fontSize: `${readSettings.fontSize}px`,
                        lineHeight: readSettings.lineHeight,
                        color: 'inherit'
                    }}
                    dangerouslySetInnerHTML={{ __html: chapter.content }}
                />
            </div>

            {/* Footer Navigation */}
            <div className="max-w-4xl mx-auto px-4 pb-12">
                <div className={`flex justify-between items-center gap-4 mt-8 pt-8 border-t ${currentTheme.border}`}>
                    <button
                        onClick={() => navigateChapter('prev')}
                        disabled={!hasPrev}
                        className={`flex items-center px-5 py-2.5 rounded-2xl border transition-all duration-300 ${hasPrev ? `${currentTheme.nav} hover:shadow-md cursor-pointer ${currentTheme.border}` : 'opacity-30 cursor-not-allowed border-transparent'}`}
                    >
                        <ChevronLeft className="w-5 h-5 mr-2" /> Chương trước
                    </button>

                    <button onClick={() => navigate(`/novel/${novelId}`)} className="flex flex-col items-center text-sm hover:opacity-70 transition-opacity">
                        <List className="w-6 h-6 mb-1" />
                        Mục lục
                    </button>

                    <button
                        onClick={() => navigateChapter('next')}
                        disabled={!hasNext}
                        className={`flex items-center px-5 py-2.5 rounded-2xl border transition-all duration-300 ${hasNext ? `${currentTheme.nav} hover:shadow-md cursor-pointer ${currentTheme.border}` : 'opacity-30 cursor-not-allowed border-transparent'}`}
                    >
                        Chương sau <ChevronRight className="w-5 h-5 ml-2" />
                    </button>
                </div>
            </div>

            {/* SETTINGS POPOVER */}
            {isSettingsOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsSettingsOpen(false)}></div>
                    <div className={`fixed top-20 right-4 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 sm:translate-x-[20%] z-40 ${currentTheme.bg} ${currentTheme.text} rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] max-w-[320px] w-full overflow-hidden animate-scaleIn border ${currentTheme.border}`}>
                        <div className={`flex justify-between items-center p-4 border-b ${currentTheme.border} bg-black/5`}>
                            <h3 className="font-bold text-[15px] flex items-center"><Settings className="w-4 h-4 mr-2" /> Hiển thị</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="hover:opacity-70"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Theme */}
                            <div>
                                <label className="block text-sm font-medium mb-3 opacity-80">Màu nền</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, theme: 'light' })}
                                        className={`py-2.5 flex flex-col items-center justify-center rounded-2xl border-2 transition-all bg-[#ffffff] text-slate-800 shadow-sm ${readSettings.theme === 'light' ? 'border-primary shadow-primary/20 scale-105' : 'border-transparent hover:border-slate-200'}`}
                                    >
                                        <Sun className="w-4 h-4 mb-1" /> Sáng
                                    </button>
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, theme: 'sepia' })}
                                        className={`py-2.5 flex flex-col items-center justify-center rounded-2xl border-2 transition-all bg-[#f4ecd8] text-[#5b4636] shadow-sm ${readSettings.theme === 'sepia' ? 'border-primary shadow-primary/20 scale-105' : 'border-transparent hover:border-[#d3c4a3]'}`}
                                    >
                                        <Coffee className="w-4 h-4 mb-1" /> Giấy cũ
                                    </button>
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, theme: 'dark' })}
                                        className={`py-2.5 flex flex-col items-center justify-center rounded-2xl border-2 transition-all bg-[#0a0a0c] text-white shadow-sm ${readSettings.theme === 'dark' ? 'border-primary shadow-primary/20 scale-105' : 'border-transparent hover:border-slate-800'}`}
                                    >
                                        <Moon className="w-4 h-4 mb-1" /> Đen
                                    </button>
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, theme: 'twilight' })}
                                        className={`py-2.5 flex flex-col items-center justify-center rounded-2xl border-2 transition-all bg-[#0f172a] text-white shadow-sm ${readSettings.theme === 'twilight' ? 'border-primary shadow-primary/20 scale-105' : 'border-transparent hover:border-slate-700'}`}
                                    >
                                        <Moon className="w-4 h-4 mb-1" /> Chạng vạng
                                    </button>
                                </div>
                            </div>

                            {/* Font Family */}
                            <div>
                                <label className="block text-sm font-medium mb-3 opacity-80">Kiểu chữ</label>
                                <div className="flex bg-black/10 rounded-lg p-1">
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, fontFamily: 'serif' })}
                                        className={`flex-1 py-2 rounded-md font-serif transition-colors ${readSettings.fontFamily === 'serif' ? 'bg-white dark:bg-[#1a1b26] text-black shadow-sm' : 'hover:bg-black/5'}`}
                                    >
                                        Có chân
                                    </button>
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, fontFamily: 'sans' })}
                                        className={`flex-1 py-2 rounded-md font-sans transition-colors ${readSettings.fontFamily === 'sans' ? 'bg-white dark:bg-[#1a1b26] text-black shadow-sm' : 'hover:bg-black/5'}`}
                                    >
                                        Không chân
                                    </button>
                                </div>
                            </div>

                            {/* Font Size */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm font-medium opacity-80">Cỡ chữ</label>
                                    <span className="text-sm font-bold">{readSettings.fontSize}px</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, fontSize: Math.max(12, readSettings.fontSize - 2) })}
                                        className={`p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors`}
                                    >
                                        <Type className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="range"
                                        min="12" max="32" step="2"
                                        value={readSettings.fontSize}
                                        onChange={(e) => setReadSettings({ ...readSettings, fontSize: parseInt(e.target.value) })}
                                        className="flex-1 accent-blue-500"
                                    />
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, fontSize: Math.min(32, readSettings.fontSize + 2) })}
                                        className={`p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors`}
                                    >
                                        <Type className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Line Height */}
                            <div>
                                <label className="block text-sm font-medium mb-3 opacity-80">Khoảng cách dòng</label>
                                <div className="flex bg-black/10 rounded-lg p-1">
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, lineHeight: 1.4 })}
                                        className={`flex-1 py-2 rounded-md transition-colors ${readSettings.lineHeight === 1.4 ? 'bg-white dark:bg-[#1a1b26] text-black shadow-sm' : 'hover:bg-black/5'}`}
                                    >
                                        Hẹp
                                    </button>
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, lineHeight: 1.8 })}
                                        className={`flex-1 py-2 rounded-md transition-colors ${readSettings.lineHeight === 1.8 ? 'bg-white dark:bg-[#1a1b26] text-black shadow-sm' : 'hover:bg-black/5'}`}
                                    >
                                        Vừa
                                    </button>
                                    <button
                                        onClick={() => setReadSettings({ ...readSettings, lineHeight: 2.2 })}
                                        className={`flex-1 py-2 rounded-md transition-colors ${readSettings.lineHeight === 2.2 ? 'bg-white dark:bg-[#1a1b26] text-black shadow-sm' : 'hover:bg-black/5'}`}
                                    >
                                        Rộng
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* EDIT MODAL */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white/95 dark:bg-[#1a1b26]/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-purple-100/50 dark:border-purple-900/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-purple-100/50 dark:border-purple-900/50 sticky top-0 bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-md z-10">
                            <h3 className="font-bold text-xl flex items-center text-slate-800 dark:text-slate-100"><Edit className="w-5 h-5 mr-2 text-primary" /> Sửa nội dung chương</h3>
                            <button type="button" onClick={() => setIsEditOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="p-6 flex-1 flex flex-col space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium mb-1">Tên Tập</label>
                                    <input
                                        value={editVolume}
                                        onChange={e => setEditVolume(e.target.value)}
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-primary/50 outline-none"
                                        placeholder="VD: Tập 1"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium mb-1">Tên chương <span className="text-red-500">*</span></label>
                                    <input
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-primary/50 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-medium mb-1">Nội dung <span className="text-red-500">*</span></label>
                                <RichTextEditor
                                    value={editContent}
                                    onChange={setEditContent}
                                    className="flex-1 min-h-[400px]"
                                />
                            </div>

                            <div className="pt-4 border-t flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsEditOpen(false)} className="px-5 py-2 border rounded font-medium hover:bg-slate-50 dark:bg-[#0f1016]">Hủy bỏ</button>
                                <button type="submit" disabled={updating} className="px-5 py-2 bg-primary text-white rounded font-bold hover:bg-blue-600 flex items-center">
                                    {updating ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                    {updating ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Scroll to Top Button */}
            <button
                onClick={scrollToTop}
                className={`fixed bottom-8 right-8 p-4 rounded-full bg-primary/90 text-white shadow-[0_10px_30px_rgba(124,58,237,0.4)] backdrop-blur-md transition-all duration-500 z-50 flex items-center justify-center hover:bg-primary hover:scale-110 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'}`}
                title="Cuộn lên đầu"
            >
                <ArrowUp className="w-6 h-6" />
            </button>
        </div>
    );
};