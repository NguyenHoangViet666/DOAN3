
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getNovels, getComments, addComment, toggleCommentLike, addReply, getChapters, addChapter, updateNovel, uploadImage, getNovelById, deleteChapter, rateNovel, getUserRating } from '../services/dbService';
import { Novel, Comment, Chapter, Role, NovelType, NovelStatus, NovelGenre, NovelLength, Rating } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { BookOpen, Clock, User, Heart, Send, MessageSquare, Loader2, ThumbsUp, Plus, FileText, X, Edit, UploadCloud, Trash2, AlertTriangle, ChevronLeft, ChevronRight, AlignLeft, Star } from 'lucide-react';
import { RoleBadge } from '../components/RoleBadge';
import { RichTextEditor } from '../components/RichTextEditor';
import { LoadingScreen } from '../components/LoadingScreen';

const formatDate = (dateStr: any) => {
    if (!dateStr) return 'Đang cập nhật...';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'Đang cập nhật...' : date.toLocaleDateString('vi-VN');
};

export const NovelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, toggleLike, isAdmin, isMod } = useAuth();
  const { showToast } = useNotification();
  
  const [novel, setNovel] = useState<Novel | undefined>(undefined);
  const [comments, setComments] = useState<Comment[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  // Rating States
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Pagination for Chapters
  const [chapterPage, setChapterPage] = useState(1);
  const CHAPTERS_PER_PAGE = 20;

  // Comment States
  const [commentContent, setCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [processingComment, setProcessingComment] = useState(false);

  // Modals
  const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');
  const [uploadingChapter, setUploadingChapter] = useState(false);
  const [isEditNovelOpen, setIsEditNovelOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Novel>>({});
  const [novelCoverFile, setNovelCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [updatingNovel, setUpdatingNovel] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean; chapterId: string | null; chapterTitle: string;}>({ isOpen: false, chapterId: null, chapterTitle: '' });
  const [deletingChapter, setDeletingChapter] = useState(false);

  const averageRating = useMemo(() => {
      if (!novel || !novel.ratingCount || novel.ratingCount === 0) return 0;
      return (novel.ratingSum || 0) / novel.ratingCount;
  }, [novel]);

  const fetchNovelData = async () => {
    if (!id) return;
    try {
        const found = await getNovelById(id);
        if (found) setNovel(found);
        
        const [novelComments, novelChapters] = await Promise.all([
            getComments(id),
            getChapters(id)
        ]);
        
        setComments(novelComments);
        setChapters(novelChapters);

        if (currentUser) {
            const rating = await getUserRating(id, currentUser.id);
            if (rating) setUserRating(rating.score);
        }

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNovelData();
  }, [id, currentUser?.id]);

  const handleRate = async (score: number) => {
    if (!currentUser || !id) {
        showToast("Vui lòng đăng nhập để đánh giá!", 'info');
        return;
    }
    setSubmittingRating(true);
    try {
        await rateNovel(id, currentUser.id, score);
        setUserRating(score);
        // Refresh novel data to update average rating
        const updatedNovel = await getNovelById(id);
        if (updatedNovel) setNovel(updatedNovel);
    } catch (e) {
        showToast("Lỗi khi đánh giá.", 'error');
    } finally {
        setSubmittingRating(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập!', 'info');
      return;
    }
    if (id) await toggleLike(id);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !id || !commentContent.trim()) return;

    setProcessingComment(true);
    await addComment({
        novelId: id,
        userId: currentUser.id,
        userAvatar: currentUser.avatar || '',
        username: currentUser.username,
        roles: currentUser.roles,
        content: commentContent.trim()
    } as any);
    await refreshComments();
    setCommentContent('');
    setProcessingComment(false);
  };

  const refreshComments = async () => {
      if(id) {
          const novelComments = await getComments(id);
          setComments(novelComments);
      }
  };

  const handleLikeComment = async (commentId: string) => {
      if (!currentUser) {
          showToast("Vui lòng đăng nhập để thích bình luận!", 'info');
          return;
      }
      setComments(prev => prev.map(c => {
          if (c.id === commentId) {
              const likedBy = c.likedBy || [];
              const hasLiked = likedBy.includes(currentUser.id);
              return {
                  ...c,
                  likedBy: hasLiked ? likedBy.filter(uid => uid !== currentUser.id) : [...likedBy, currentUser.id]
              };
          }
          return c;
      }));
      await toggleCommentLike(commentId, currentUser.id);
  };

  const handleReplySubmit = async (commentId: string) => {
      if (!currentUser || !replyContent.trim()) return;
      setProcessingComment(true);
      try {
          await addReply(commentId, {
              userId: currentUser.id,
              userAvatar: currentUser.avatar || '',
              username: currentUser.username,
              roles: currentUser.roles,
              content: replyContent.trim(),
          } as any);
          await refreshComments();
          setReplyingTo(null);
          setReplyContent('');
      } catch (e) {
          console.error(e);
          showToast("Lỗi khi trả lời.", 'error');
      } finally {
          setProcessingComment(false);
      }
  };

  const handleReplyToSubComment = (rootCommentId: string, usernameToTag: string) => {
      setReplyingTo(rootCommentId);
      setReplyContent(`@${usernameToTag} `);
  };

  const handleAddChapter = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id || !newChapterTitle || !newChapterContent) return;
      
      setUploadingChapter(true);
      try {
          await addChapter(id, newChapterTitle, newChapterContent);
          const updatedChapters = await getChapters(id);
          setChapters(updatedChapters);
          setIsAddChapterOpen(false);
          setNewChapterTitle('');
          setNewChapterContent('');
          showToast("Thêm chương thành công!", 'success');
      } catch (e: any) {
          console.error(e);
          showToast("Lỗi khi thêm chương: " + e.message, 'error');
      } finally {
          setUploadingChapter(false);
      }
  };

  const confirmDeleteChapter = async () => {
      if (!deleteModal.chapterId) return;
      setDeletingChapter(true);
      try {
          await deleteChapter(deleteModal.chapterId);
          showToast("Xóa chương thành công!", 'success');
          if (id) {
              const updatedChapters = await getChapters(id);
              setChapters(updatedChapters);
          }
      } catch (e: any) {
          console.error(e);
          showToast(e.message || "Lỗi khi xóa chương.", 'error');
      } finally {
          setDeletingChapter(false);
          setDeleteModal({ isOpen: false, chapterId: null, chapterTitle: '' });
      }
  };

  const handleUpdateNovel = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id || !editForm) return;
      setUpdatingNovel(true);
      try {
          let updatedData = { ...editForm };
          if (novelCoverFile) {
              setUploadingCover(true);
              const url = await uploadImage(novelCoverFile);
              updatedData.coverUrl = url;
              setUploadingCover(false);
          }
          await updateNovel(id, updatedData);
          await fetchNovelData(); 
          setIsEditNovelOpen(false);
          showToast("Cập nhật truyện thành công!", 'success');
      } catch (e) {
          console.error(e);
          showToast("Lỗi cập nhật truyện.", 'error');
      } finally {
          setUpdatingNovel(false);
      }
  };

  const currentChapters = chapters.slice((chapterPage - 1) * CHAPTERS_PER_PAGE, chapterPage * CHAPTERS_PER_PAGE);
  const totalChapterPages = Math.ceil(chapters.length / CHAPTERS_PER_PAGE);
  const canEdit = currentUser && (currentUser.id === novel?.uploaderId || isAdmin || isMod);
  const isLiked = currentUser?.likedNovelIds?.includes(id || '');

  if (loading) {
      return <LoadingScreen />;
  }
  
  if (!novel) return <div className="p-12 text-center">Không tìm thấy truyện.</div>;

  return (
    <div className="min-h-screen pb-12 font-sans selection:bg-indigo-200 relative overflow-hidden">
        {/* AMBIENT BLUR COVER BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-slate-100 dark:bg-[#0f1016] z-0"></div>
            <img src={novel.coverUrl} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-[120vw] h-[120vh] object-cover opacity-70 dark:opacity-40 blur-[100px] saturate-200 z-10 animate-float" alt="" />
            <div className="absolute inset-0 bg-white/30 dark:bg-[#0f1016]/70 backdrop-blur-3xl z-20"></div>
            {/* Decorative background orbs to fill space on large screens */}
            <div className="fixed top-1/4 left-[-10%] w-[35%] h-[60vh] bg-primary/15 rounded-full blur-[180px] pointer-events-none hidden 2xl:block mix-blend-screen z-20"></div>
            <div className="fixed top-2/3 right-[-10%] w-[30%] h-[50vh] bg-fuchsia-500/15 rounded-full blur-[150px] pointer-events-none hidden 2xl:block mix-blend-screen z-20"></div>
            {/* Premium Noise Overlay */}
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] dark:opacity-[0.03] pointer-events-none mix-blend-overlay z-20"></div>
            {/* Top dark gradient to ensure text-white Title readability */}
            <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-slate-950/80 via-slate-900/40 to-transparent z-30"></div>
        </div>

        <div className="max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-24 md:pt-32 2xl:px-16">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0 w-64 mx-auto md:mx-0 group">
                    <div className="relative overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/30 transform transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-indigo-500/30">
                        <img src={novel.coverUrl} alt={novel.title} className="w-64 h-96 object-cover bg-slate-200 dark:bg-slate-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <button onClick={handleToggleLike} className={`mt-6 w-full py-3 rounded-xl font-bold flex justify-center items-center shadow-lg transition-all duration-300 hover:-translate-y-1 ${isLiked ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-rose-500/30' : 'bg-white/90 dark:bg-[#1a1b26]/90 backdrop-blur-md text-slate-800 dark:text-slate-100 hover:bg-white dark:bg-[#1a1b26] shadow-slate-200 focus:ring-4 focus:ring-rose-200'}`}>
                        <Heart className={`w-5 h-5 mr-2 transition-transform duration-300 ${isLiked?'fill-current scale-110':''}`}/> {isLiked ? 'Đã thích' : 'Thích'}
                    </button>
                    
                    {canEdit && (
                        <div className="mt-3 space-y-3">
                             <button onClick={() => setIsAddChapterOpen(true)} className="w-full py-3 rounded-xl font-bold flex justify-center items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/50">
                                 <Plus className="w-5 h-5 mr-2"/> Thêm chương
                             </button>
                             <button onClick={() => { setEditForm({ ...novel }); setNovelCoverFile(null); setIsEditNovelOpen(true); }} className="w-full py-3 rounded-xl font-bold flex justify-center items-center bg-white/50 dark:bg-[#1a1b26]/50 backdrop-blur-md text-slate-800 dark:text-slate-100 border border-white/50 shadow-lg transition-all duration-300 hover:bg-white dark:bg-[#1a1b26] hover:-translate-y-1">
                                 <Edit className="w-5 h-5 mr-2"/> Sửa truyện
                             </button>
                        </div>
                    )}

                    {/* RATING INTERACTION */}
                    <div className="mt-4 bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/50 text-center transition-all hover:bg-white dark:bg-[#1a1b26] hover:shadow-2xl">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Đánh giá của bạn</h4>
                        <div className="flex justify-center gap-1.5">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => handleRate(star)}
                                    disabled={submittingRating}
                                    className="focus:outline-none transition-transform duration-200 hover:scale-125 hover:-translate-y-1 disabled:opacity-50"
                                >
                                    <Star 
                                        className={`w-7 h-7 ${(hoverRating || userRating) >= star ? 'fill-yellow-400 text-yellow-500 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'text-slate-300'}`} 
                                    />
                                </button>
                            ))}
                        </div>
                        {userRating > 0 && <p className="text-[11px] text-green-600 font-bold mt-3 bg-green-50 dark:bg-green-900/20 py-1 rounded-full">Đã đánh giá {userRating}/5</p>}
                    </div>
                </div>

                <div className="flex-1 pt-6 md:pt-16 text-center md:text-left flex flex-col">
                    <h1 className="text-5xl md:text-6xl font-extrabold mb-4 text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-tight leading-tight">{novel.title}</h1>
                    
                    {/* RATING DISPLAY */}
                    <div className="flex justify-center md:justify-start items-center gap-3 mb-8">
                        <div className="flex gap-1 drop-shadow-md">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star 
                                    key={star} 
                                    className={`w-6 h-6 ${averageRating >= star ? 'fill-yellow-400 text-yellow-400' : (averageRating > star - 1 ? 'fill-yellow-400 text-yellow-400' : 'text-white/30')}`} 
                                />
                            ))}
                        </div>
                        <span className="text-white font-bold text-sm bg-black/40 px-3 py-1 rounded-full backdrop-blur-md shadow-inner border border-white/10">
                            {averageRating.toFixed(1)} / 5 <span className="text-white/70 ml-1">({novel.ratingCount || 0} lượt)</span>
                        </span>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-semibold mb-10">
                        <span className="flex items-center bg-slate-900/70 text-white backdrop-blur-md px-4 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-slate-700/50"><User className="w-4 h-4 mr-2 text-slate-300"/> {novel.author}</span>
                        <span className="flex items-center bg-slate-900/70 text-white backdrop-blur-md px-4 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-slate-700/50"><Clock className="w-4 h-4 mr-2 text-slate-300"/> {formatDate(novel.createdAt)}</span>
                        <span className="flex items-center bg-gradient-to-r from-indigo-900/80 to-blue-900/80 text-white backdrop-blur-md px-4 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-indigo-700/50">{novel.status}</span>
                    </div>
                    
                    {/* DESCRIPTION CARD */}
                    <div className="bg-white/90 dark:bg-[#1a1b26]/90 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-white mb-10 text-left transition-all duration-300 hover:shadow-2xl">
                        <h3 className="font-extrabold text-xl mb-4 flex items-center text-slate-800 dark:text-slate-100"><BookOpen className="w-6 h-6 mr-3 text-indigo-500"/> Giới thiệu</h3>
                        <p className="text-slate-700 dark:text-white whitespace-pre-wrap leading-loose font-medium text-[15px]">{novel.description}</p>
                        <div className="mt-8 flex flex-wrap gap-2 pt-6 border-t border-slate-100">
                            {novel.genres.map(g => (
                                <span key={g} className="px-4 py-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 shadow-sm transition-transform hover:scale-105 cursor-default">{g}</span>
                            ))}
                        </div>
                    </div>

                    {/* CHAPTERS CARD */}
                    <div className="bg-white/90 dark:bg-[#1a1b26]/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white mb-10 text-left overflow-hidden transition-all duration-300 hover:shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-white/50 dark:bg-[#1a1b26]/50 flex justify-between items-center">
                            <h3 className="font-extrabold text-xl flex items-center text-slate-800 dark:text-slate-100"><FileText className="w-6 h-6 mr-3 text-indigo-500"/> Danh sách chương <span className="ml-3 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold shadow-inner">{chapters.length}</span></h3>
                        </div>
                        <div className="">
                            {chapters.length > 0 ? (
                                <>
                                    <ul className="divide-y divide-slate-50">
                                        {currentChapters.map((chapter, index) => {
                                            const displayIndex = (chapterPage - 1) * CHAPTERS_PER_PAGE + index + 1;
                                            return (
                                                <li key={chapter.id} className="relative group hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-transparent transition-all duration-300 border-l-4 border-transparent hover:border-indigo-500">
                                                    <Link to={`/novel/${novel.id}/chapter/${chapter.id}`} className="block px-8 py-4 w-full h-full flex items-center justify-between">
                                                        <div className="flex flex-col sm:flex-row sm:items-center truncate mr-10 flex-1">
                                                            <span className="text-slate-700 dark:text-slate-200 font-bold group-hover:text-indigo-700 group-hover:translate-x-2 transition-all duration-300 mr-2">
                                                                Chương {displayIndex}: {chapter.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center text-xs font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0 gap-4">
                                                            {chapter.wordCount !== undefined && (
                                                                <span className="flex items-center hidden sm:flex bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded" title="Số từ">
                                                                    <AlignLeft className="w-3 h-3 mr-1 text-slate-500 dark:text-slate-400 dark:text-slate-500"/> {chapter.wordCount.toLocaleString()} chữ
                                                                </span>
                                                            )}
                                                            <span className="bg-slate-50 dark:bg-[#0f1016] px-2 py-1 rounded">{formatDate(chapter.createdAt)}</span>
                                                        </div>
                                                    </Link>
                                                    {canEdit && (
                                                        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteModal({ isOpen: true, chapterId: chapter.id, chapterTitle: chapter.title }); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-white hover:bg-red-500 rounded-lg shadow-sm transition-all" title="Xóa chương">
                                                                <Trash2 className="w-4 h-4"/>
                                                            </button>
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {totalChapterPages > 1 && (
                                        <div className="p-6 border-t border-slate-100 bg-white/50 dark:bg-[#1a1b26]/50 flex justify-center items-center gap-3">
                                            <button onClick={() => setChapterPage(p => Math.max(1, p - 1))} disabled={chapterPage === 1} className="p-2.5 bg-white dark:bg-[#1a1b26] border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:bg-[#0f1016] disabled:opacity-50 shadow-sm transition-all"><ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300"/></button>
                                            <span className="text-sm text-slate-700 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">Trang {chapterPage} / {totalChapterPages}</span>
                                            <button onClick={() => setChapterPage(p => Math.min(totalChapterPages, p + 1))} disabled={chapterPage === totalChapterPages} className="p-2.5 bg-white dark:bg-[#1a1b26] border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:bg-[#0f1016] disabled:opacity-50 shadow-sm transition-all"><ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300"/></button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-12 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">Chưa có chương nào được đăng.</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/90 dark:bg-[#1a1b26]/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white p-8 text-left transition-all duration-300 hover:shadow-2xl">
                        <h3 className="font-extrabold mb-6 flex items-center text-xl text-slate-800 dark:text-slate-100"><MessageSquare className="w-6 h-6 mr-3 text-indigo-500 fill-indigo-100"/> Bình luận</h3>
                        
                        {currentUser ? (
                            <form onSubmit={handleCommentSubmit} className="mb-10 flex gap-4 bg-slate-50/50 dark:bg-[#0f1016]/50 p-4 rounded-3xl border border-slate-100 shadow-inner">
                                <img src={currentUser.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="My Avatar"/>
                                <div className="flex-1">
                                    <textarea value={commentContent} onChange={e=>setCommentContent(e.target.value)} className="w-full bg-white dark:bg-[#1a1b26] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 outline-none resize-none h-24 text-sm font-medium shadow-sm transition-all" placeholder="Chia sẻ suy nghĩ của bạn..." disabled={processingComment} />
                                    <div className="flex justify-end mt-3">
                                        <button type="submit" disabled={!commentContent.trim() || processingComment} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-indigo-500/30 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                                            {processingComment ? <Loader2 className="animate-spin w-4 h-4"/> : <Send className="w-4 h-4 mr-2"/>} Gửi bình luận
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl text-center mb-8 text-sm text-slate-600 dark:text-slate-300 font-medium border border-indigo-100 shadow-inner">
                                Vui lòng <Link to="/login" className="text-indigo-600 font-bold hover:underline">Đăng nhập</Link> để tham gia thảo luận cùng mọi người.
                            </div>
                        )}

                        <div className="space-y-8">
                            {comments.map(c => {
                                const likesCount = c.likedBy ? c.likedBy.length : 0;
                                const isCommentLiked = currentUser && c.likedBy?.includes(currentUser.id);
                                return (
                                    <div key={c.id} className="group animate-fadeInUp">
                                        <div className="flex gap-4">
                                            <Link to={`/user/${c.userId}`}><img src={c.userAvatar} className="w-12 h-12 rounded-full border-2 border-white shadow-sm flex-shrink-0 hover:border-indigo-300 hover:shadow-md transition-all" alt=""/></Link>
                                            <div className="flex-1">
                                                <div className="bg-white dark:bg-[#1a1b26] p-4 rounded-[2rem] rounded-tl-none inline-block min-w-[250px] shadow-sm border border-slate-100">
                                                    <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center mb-1">
                                                        <Link to={`/user/${c.userId}`} className="hover:text-indigo-600 mr-2 transition-colors">{c.username}</Link>
                                                        <RoleBadge roles={c.roles} />
                                                    </div>
                                                    <div className="text-[15px] font-medium text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{c.content}</div>
                                                </div>
                                                <div className="flex items-center gap-5 mt-2 ml-4 text-[13px] font-bold text-slate-400 dark:text-slate-500">
                                                    <span className="text-slate-400 dark:text-slate-500/80">{formatDate(c.createdAt)}</span>
                                                    <button onClick={() => handleLikeComment(c.id)} className={`flex items-center gap-1.5 hover:text-indigo-600 transition-colors ${isCommentLiked ? 'text-indigo-600' : ''}`}><ThumbsUp className={`w-4 h-4 ${isCommentLiked ? 'fill-current' : ''}`}/> {likesCount > 0 ? likesCount : 'Thích'}</button>
                                                    <button onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyContent(''); }} className="hover:text-indigo-600 transition-colors">Trả lời</button>
                                                </div>
                                                {replyingTo === c.id && (
                                                    <div className="mt-4 flex gap-3 animate-scaleIn ml-4">
                                                        <div className="flex-1"><div className="relative"><input autoFocus value={replyContent} onChange={e=>setReplyContent(e.target.value)} className="w-full bg-white dark:bg-[#1a1b26] border border-slate-200 dark:border-slate-800 shadow-sm rounded-full px-5 py-2.5 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" placeholder={`Trả lời ${c.username}...`} onKeyDown={(e) => { if (e.key === 'Enter') handleReplySubmit(c.id); }} /><button onClick={() => handleReplySubmit(c.id)} disabled={!replyContent.trim()} className="absolute right-1.5 top-1.5 p-2 bg-indigo-500 text-white disabled:bg-slate-300 hover:bg-indigo-600 rounded-full transition-colors shadow-sm"><Send className="w-3.5 h-3.5"/></button></div></div>
                                                    </div>
                                                )}
                                                {c.replies && c.replies.length > 0 && (
                                                    <div className="mt-4 space-y-4 pl-6 border-l-2 border-slate-100">
                                                        {c.replies.map(r => (
                                                            <div key={r.id} className="flex gap-3 relative">
                                                                <div className="absolute -left-[26px] top-4 w-4 h-4 border-b-2 border-l-2 border-slate-200 dark:border-slate-800 rounded-bl-xl"></div>
                                                                <Link to={`/user/${r.userId}`}><img src={r.userAvatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex-shrink-0 hover:border-indigo-300 transition-all" alt=""/></Link>
                                                                <div className="flex-1">
                                                                    <div className="bg-white dark:bg-[#1a1b26] p-3 px-4 rounded-[1.5rem] rounded-tl-none inline-block shadow-sm border border-slate-100"><div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center mb-1"><Link to={`/user/${r.userId}`} className="hover:text-indigo-600 mr-2 transition-colors">{r.username}</Link><RoleBadge roles={r.roles} /></div><div className="text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{r.content}</div></div>
                                                                    <div className="flex items-center gap-4 ml-3 mt-1.5 text-xs font-bold text-slate-400 dark:text-slate-500"><span>{formatDate(r.createdAt)}</span><button onClick={() => handleReplyToSubComment(c.id, r.username)} className="hover:text-indigo-600 transition-colors">Trả lời</button></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Modal components unchanged but ensured they use same styling patterns */}
        {isAddChapterOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white dark:bg-[#1a1b26] z-10">
                        <h3 className="font-bold text-xl">Thêm chương mới</h3>
                        <button type="button" onClick={()=>setIsAddChapterOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"><X className="w-6 h-6"/></button>
                    </div>
                    <form onSubmit={handleAddChapter} className="p-6 flex-1 flex flex-col space-y-4">
                        <div><label className="block text-sm font-medium mb-1">Tên chương <span className="text-red-500">*</span></label><input value={newChapterTitle} onChange={e=>setNewChapterTitle(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary/50 outline-none" placeholder="Ví dụ: Chương 1: Khởi đầu" required/></div>
                        <div className="flex-1 flex flex-col"><label className="block text-sm font-medium mb-1">Nội dung <span className="text-red-500">*</span></label><RichTextEditor value={newChapterContent} onChange={setNewChapterContent} className="flex-1 min-h-[400px]" /></div>
                        <div className="pt-4 border-t flex justify-end space-x-3"><button type="button" onClick={()=>setIsAddChapterOpen(false)} className="px-5 py-2 border rounded font-medium hover:bg-slate-50 dark:bg-[#0f1016]">Hủy bỏ</button><button type="submit" disabled={uploadingChapter || !newChapterContent} className="px-5 py-2 bg-primary text-white rounded font-bold hover:bg-blue-600 flex items-center">{uploadingChapter ? <Loader2 className="animate-spin w-5 h-5 mr-2"/> : <Plus className="w-5 h-5 mr-2"/>}{uploadingChapter ? 'Đang đăng...' : 'Đăng chương'}</button></div>
                    </form>
                </div>
            </div>
        )}

        {isEditNovelOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
                    <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white dark:bg-[#1a1b26] z-10">
                        <h3 className="font-bold text-xl">Chỉnh sửa thông tin truyện</h3>
                        <button type="button" onClick={()=>setIsEditNovelOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"><X className="w-6 h-6"/></button>
                    </div>
                    <form onSubmit={handleUpdateNovel} className="p-4 md:p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium mb-1">Tên truyện <span className="text-red-500">*</span></label><input value={editForm.title || ''} onChange={e=>setEditForm({...editForm, title: e.target.value})} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary/50 outline-none" required/></div>
                            <div><label className="block text-sm font-medium mb-1">Tác giả <span className="text-red-500">*</span></label><input value={editForm.author || ''} onChange={e=>setEditForm({...editForm, author: e.target.value})} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary/50 outline-none" required/></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Loại</label>
                            <select value={editForm.type || NovelType.TRANSLATED} onChange={e=>setEditForm({...editForm, type: e.target.value as NovelType})} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary/50 outline-none">
                                <option value={NovelType.TRANSLATED}>{NovelType.TRANSLATED}</option>
                                <option value={NovelType.ORIGINAL}>{NovelType.ORIGINAL}</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Độ dài</label>
                                <select value={editForm.length || NovelLength.SERIES} onChange={e=>setEditForm({...editForm, length: e.target.value as NovelLength})} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary/50 outline-none">
                                    <option value={NovelLength.SERIES}>{NovelLength.SERIES}</option>
                                    <option value={NovelLength.ONESHOT}>{NovelLength.ONESHOT}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tình trạng</label>
                                <select value={editForm.status || NovelStatus.ONGOING} onChange={e=>setEditForm({...editForm, status: e.target.value as NovelStatus})} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary/50 outline-none">
                                    <option value={NovelStatus.ONGOING}>{NovelStatus.ONGOING}</option>
                                    <option value={NovelStatus.COMPLETED}>{NovelStatus.COMPLETED}</option>
                                    <option value={NovelStatus.PAUSED}>{NovelStatus.PAUSED}</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Thể loại (Giữ Ctrl để chọn nhiều)</label>
                            <select multiple value={editForm.genres || []} onChange={e => setEditForm({...editForm, genres: Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value as NovelGenre)})} className="w-full border p-2 rounded h-32 focus:ring-2 focus:ring-primary/50 outline-none">
                                {Object.values(NovelGenre).map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Mô tả</label>
                            <textarea value={editForm.description || ''} onChange={e=>setEditForm({...editForm, description: e.target.value})} className="w-full border p-2 rounded h-24 focus:ring-2 focus:ring-primary/50 outline-none" required></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Cập nhật ảnh bìa (để trống nếu duyệt ảnh cũ)</label>
                            <input type="file" onChange={e => setNovelCoverFile(e.target.files ? e.target.files[0] : null)} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary/50 outline-none" accept="image/*"/>
                            {editForm.coverUrl && !novelCoverFile && <img src={editForm.coverUrl} className="mt-2 w-24 h-36 object-cover rounded shadow" alt="Current cover"/>}
                        </div>
                        <div className="pt-4 border-t flex justify-end space-x-3"><button type="button" onClick={()=>setIsEditNovelOpen(false)} className="px-5 py-2 border rounded font-medium hover:bg-slate-50 dark:bg-[#0f1016]">Hủy bỏ</button><button type="submit" disabled={updatingNovel || uploadingCover} className="px-5 py-2 bg-primary text-white rounded font-bold hover:bg-blue-600 flex items-center">{(updatingNovel || uploadingCover) ? <Loader2 className="animate-spin w-5 h-5 mr-2"/> : <Edit className="w-5 h-5 mr-2"/>}{(updatingNovel || uploadingCover) ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
                    </form>
                </div>
            </div>
        )}

        {deleteModal.isOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                <div className="bg-white dark:bg-[#1a1b26] p-8 rounded-xl shadow-2xl max-w-sm w-full text-center animate-scaleIn">
                    <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-red-100 mb-6"><AlertTriangle className="w-8 h-8 text-red-600" /></div>
                    <h3 className="font-bold text-xl mb-2">Xóa chương này?</h3>
                    <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-8">Bạn có chắc chắn muốn xóa <span className="font-bold text-slate-800 dark:text-slate-100">"{deleteModal.chapterTitle}"</span>?</p>
                    <div className="flex gap-4"><button onClick={() => setDeleteModal({ isOpen: false, chapterId: null, chapterTitle: '' })} className="flex-1 border py-2.5 rounded-lg font-medium hover:bg-slate-50 dark:bg-[#0f1016] transition-colors">Hủy</button><button onClick={confirmDeleteChapter} disabled={deletingChapter} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition-colors flex justify-center items-center">{deletingChapter ? <Loader2 className="animate-spin w-5 h-5"/> : 'Xóa ngay'}</button></div>
                </div>
            </div>
        )}
    </div>
  );
};
