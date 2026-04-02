import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { RoleBadge } from '../components/RoleBadge';

const formatDate = (dateStr: any) => {
    if (!dateStr) return 'Đang cập nhật...';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'Đang cập nhật...' : date.toLocaleDateString('vi-VN');
};
import { Role, Novel, NovelType, NovelStatus, User, NovelGenre, NovelLength, RoleRequest, RoleRequestStatus, Post } from '../types';
import { 
  Mail, ShieldCheck, Edit2, Save, X,
  Plus, Trash2, Edit, Heart, User as UserIcon,
  FileText, CheckCircle, XCircle, Clock, Eye, AlertTriangle, Loader2, Camera, UploadCloud, Star, Award,
  LayoutDashboard, Users, Ticket, BookOpen, Search, MoreHorizontal, Shield, MessageCircle, ChevronLeft, ChevronRight,
  UserPlus, UserMinus, UserCheck, Database, LogOut, Moon, Sun, ThumbsUp, MessageSquare, Send, ArrowLeft, Calendar, Pin
} from 'lucide-react';
import { 
  getUsers, deleteUser, addRoleToUser, removeRoleFromUser, updateUserRoles,
  getNovels, deleteNovel, addNovel,
  approveNovel, uploadImage, toggleNovelFeature,
  createRoleRequest, getRoleRequests, processRoleRequest, checkUserPendingRequest,
  getPostsByAuthor, deletePost, getUserById,
  sendFriendRequest, acceptFriendRequest, cancelFriendRequest, unfriend,
  updateUserProfileData, getNovelsByUploader, getNovelById
} from '../services/dbService';

type Tab = 'overview' | 'novels' | 'posts' | 'friends' | 'admin_users' | 'admin_novels' | 'admin_requests' | 'liked_novels';

export const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUser, logout, isAdmin, isMod, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast, showConfirm } = useNotification();
  
  // State for identifying which profile to show
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const isOwnProfile = !userId || (currentUser && currentUser.id === userId);
  const isDashboard = isOwnProfile && (isAdmin || isMod);

  // Data States
  const [userNovels, setUserNovels] = useState<Novel[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [likedNovelsList, setLikedNovelsList] = useState<Novel[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Admin Data States
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [adminUsersPage, setAdminUsersPage] = useState(1);
  const adminUsersPerPage = 8;
  const [adminNovels, setAdminNovels] = useState<Novel[]>([]);
  const [adminRequests, setAdminRequests] = useState<RoleRequest[]>([]);

  // Friends Data States
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [friendRequestsList, setFriendRequestsList] = useState<User[]>([]);

  // Action States
  const [pendingRequest, setPendingRequest] = useState<RoleRequest | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Modal States
  const [showAddNovelModal, setShowAddNovelModal] = useState(false);
  const [showRoleRequestModal, setShowRoleRequestModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRoles, setEditingRoles] = useState<Role[]>([]);
  
  // New Novel Form
  const [newNovel, setNewNovel] = useState<Partial<Novel>>({
      title: '', author: '', description: '', type: NovelType.TRANSLATED, 
      status: NovelStatus.ONGOING, length: NovelLength.SERIES, genres: []
  });
  const [novelCoverFile, setNovelCoverFile] = useState<File | null>(null);
  const [submittingNovel, setSubmittingNovel] = useState(false);

  // Role Request Form
  const [roleRequestType, setRoleRequestType] = useState<Role.AUTHOR | Role.TRANSLATOR>(Role.AUTHOR);
  const [roleRequestReason, setRoleRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        let targetId = userId;
        if (!targetId && currentUser) targetId = currentUser.id;
        
        if (!targetId) {
            navigate('/login');
            return;
        }

        const user = await getUserById(targetId);
        setProfileUser(user);
        if (user) {
            setEditName(user.username);
            const [novels, posts] = await Promise.all([
                getNovelsByUploader(targetId),
                getPostsByAuthor(targetId)
            ]);
            setUserNovels(novels);
            setUserPosts(posts);

            if (isOwnProfile) {
                const req = await checkUserPendingRequest(targetId);
                setPendingRequest(req);
            }
        }
        setLoading(false);
    };
    fetchData();
  }, [userId, currentUser, navigate, isOwnProfile]);

  // Fetch Admin Data if needed
  useEffect(() => {
      if (isDashboard && (activeTab.startsWith('admin_'))) {
          const fetchAdmin = async () => {
              if (activeTab === 'admin_users') {
                  const users = await getUsers();
                  setAdminUsers(users);
              } else if (activeTab === 'admin_novels') {
                  const novels = await getNovels();
                  setAdminNovels(novels);
              } else if (activeTab === 'admin_requests') {
                  const reqs = await getRoleRequests();
                  setAdminRequests(reqs);
              }
          };
          fetchAdmin();
      }
  }, [activeTab, isDashboard]);

  // Fetch Friends Data
  useEffect(() => {
      if (activeTab === 'friends' && profileUser) {
          const fetchFriendsData = async () => {
              if (profileUser.friends?.length) {
                  const users = await Promise.all(profileUser.friends.map(id => getUserById(id)));
                  setFriendsList(users.filter(u => u !== null) as User[]);
              } else {
                  setFriendsList([]);
              }
              
              if (isOwnProfile && profileUser.friendRequests?.length) {
                  const reqUsers = await Promise.all(profileUser.friendRequests.map(id => getUserById(id)));
                  setFriendRequestsList(reqUsers.filter(u => u !== null) as User[]);
              } else {
                  setFriendRequestsList([]);
              }
          };
          fetchFriendsData();
      }
  }, [activeTab, profileUser?.friends, profileUser?.friendRequests, isOwnProfile]);
  // Fetch Liked Novels
  useEffect(() => {
      if (activeTab === 'liked_novels' && profileUser) {
          const fetchLikedNovels = async () => {
              if (profileUser.likedNovelIds && profileUser.likedNovelIds.length > 0) {
                  const novels = await Promise.all(profileUser.likedNovelIds.map(id => getNovelById(id)));
                  setLikedNovelsList(novels.filter(n => n !== null) as Novel[]);
              } else {
                  setLikedNovelsList([]);
              }
          };
          fetchLikedNovels();
      }
  }, [activeTab, profileUser?.likedNovelIds]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && profileUser) {
          setUploadingAvatar(true);
          try {
              const url = await uploadImage(e.target.files[0]);
              await updateProfile({ avatar: url });
              setProfileUser({ ...profileUser, avatar: url });
          } catch (error) {
              console.error(error);
              showToast("Lỗi upload ảnh.", 'error');
          } finally {
              setUploadingAvatar(false);
          }
      }
  };

  const handleUpdateProfile = async () => {
      if (!profileUser || !editName.trim()) return;
      try {
          await updateProfile({ username: editName });
          setProfileUser({ ...profileUser, username: editName });
          setIsEditMode(false);
      } catch (error) {
          console.error(error);
      }
  };

  const handleFriendAction = async (action: 'add' | 'accept' | 'cancel' | 'unfriend' | 'message') => {
      if (!currentUser || !profileUser) return;
      
      try {
          switch(action) {
              case 'add':
                  await sendFriendRequest(currentUser, profileUser.id);
                  setProfileUser({ ...profileUser, friendRequests: [...(profileUser.friendRequests || []), currentUser.id] });
                  break;
              case 'accept':
                  await acceptFriendRequest(currentUser, profileUser.id);
                  // Refresh to update UI state properly
                  window.location.reload(); 
                  break;
              case 'cancel':
                  await cancelFriendRequest(currentUser.id, profileUser.id);
                   setProfileUser(prev => prev ? ({ 
                      ...prev, 
                      friendRequests: (prev.friendRequests || []).filter(id => id !== currentUser.id) 
                  }) : null);
                  break;
              case 'unfriend':
                  showConfirm("Hủy kết bạn?", async () => {
                      await unfriend(currentUser.id, profileUser.id);
                      window.location.reload();
                  });
                  break;
              case 'message':
                  navigate(`/messages?userId=${profileUser.id}`);
                  break;
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleSubmitNovel = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      setSubmittingNovel(true);
      try {
          let coverUrl = 'https://via.placeholder.com/300x450';
          if (novelCoverFile) {
              coverUrl = await uploadImage(novelCoverFile);
          }
          await addNovel({
              ...newNovel as any,
              coverUrl,
              uploaderId: currentUser.id,
              genres: newNovel.genres || []
          });
          setShowAddNovelModal(false);
          // Refresh
          const allNovels = await getNovels();
          setUserNovels(allNovels.filter(n => n.uploaderId === currentUser.id));
          showToast("Đăng truyện thành công! Vui lòng chờ duyệt.", 'success');
      } catch (e) {
          console.error(e);
          showToast("Lỗi đăng truyện.", 'error');
      } finally {
          setSubmittingNovel(false);
      }
  };

  const handleSubmitRoleRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      setSubmittingRequest(true);
      try {
          await createRoleRequest(currentUser, roleRequestType, roleRequestReason);
          const req = await checkUserPendingRequest(currentUser.id);
          setPendingRequest(req);
          setShowRoleRequestModal(false);
          showToast("Gửi yêu cầu thành công!", 'success');
      } catch (e: any) {
          showToast(e.message, 'error');
      } finally {
          setSubmittingRequest(false);
      }
  };

  // Admin Actions
  const handleApproveNovel = async (novelId: string) => {
      showConfirm("Duyệt truyện này?", async () => {
          try {
              await approveNovel(novelId);
              const novels = await getNovels();
              setAdminNovels(novels);
          } catch (e: any) {
              showToast("Lỗi khi duyệt truyện: " + e.message, 'error');
          }
      });
  };

  const handleDeleteNovel = async (novelId: string) => {
      showConfirm("Xóa truyện này?", async () => {
          try {
              await deleteNovel(novelId);
              const novels = await getNovels();
              setAdminNovels(novels);
          } catch (e: any) {
              showToast("Lỗi khi xóa truyện: " + e.message, 'error');
          }
      });
  };

  const handleProcessRequest = async (reqId: string, approved: boolean, userId: string, role: Role) => {
      await processRoleRequest(reqId, approved, userId, role);
      const reqs = await getRoleRequests();
      setAdminRequests(reqs);
  };

  const handleDeleteUser = async (uid: string) => {
      showConfirm("Xóa người dùng này vĩnh viễn?", async () => {
          await deleteUser(uid);
          const users = await getUsers();
          setAdminUsers(users);
      });
  }

  const handleSaveRoles = async () => {
      if (!editingUser) return;
      await updateUserRoles(editingUser.id, editingRoles);
      setShowEditRoleModal(false);
      setEditingUser(null);
      const users = await getUsers();
      setAdminUsers(users);
  };

  const toggleEditingRole = (role: Role) => {
      setEditingRoles(prev => 
          prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
      );
  };

  // Calculate paginated users
  const totalAdminUsersPages = Math.ceil(adminUsers.length / adminUsersPerPage);
  const currentAdminUsers = adminUsers.slice((adminUsersPage - 1) * adminUsersPerPage, adminUsersPage * adminUsersPerPage);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary"/></div>;
  if (!profileUser) return <div className="p-12 text-center">Người dùng không tồn tại.</div>;

  const isFriend = currentUser?.friends?.includes(profileUser.id);
  const hasSentRequest = profileUser.friendRequests?.includes(currentUser?.id || '');
  const hasReceivedRequest = currentUser?.friendRequests?.includes(profileUser.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* HEADER */}
      <div className="relative p-[3px] rounded-[2rem] overflow-hidden mb-12 shadow-2xl shadow-purple-900/20 group animate-fadeIn">
          {/* Animated Gradient Border */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 opacity-60 blur-md transition-opacity duration-500 group-hover:opacity-100 animate-pulse-glow"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-fuchsia-500 opacity-40"></div>
          
          {/* Inner Content Dashboard */}
          <div className="relative bg-white/95 dark:bg-[#0f1016]/95 backdrop-blur-3xl rounded-[1.8rem] overflow-hidden z-10 w-full">
              <div className="h-48 md:h-64 bg-gradient-to-r from-violet-900 via-purple-800 to-indigo-900 relative border-b border-white/10">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.25] mix-blend-overlay"></div>
                  <div className="absolute inset-0 bg-mesh-grid opacity-30 pointer-events-none"></div>
                  <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse-glow"></div>
                  <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none animate-float"></div>
              </div>
              <div className="px-4 md:px-10 pb-10 flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20 gap-6 text-center md:text-left relative z-20">
                  <div className="relative group/avatar">
                      <div className="w-36 h-36 rounded-2xl border-4 border-white dark:border-[#1a1b26] bg-white dark:bg-[#1a1b26] overflow-hidden shadow-2xl shadow-black/30 mx-auto md:mx-0 transform transition-transform duration-500 group-hover/avatar:scale-105 group-hover/avatar:-rotate-3 group-hover/avatar:shadow-fuchsia-500/40">
                          <img src={profileUser.avatar || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="Avatar"/>
                      </div>
                      {isOwnProfile && (
                          <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-2xl opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity z-20">
                              <Camera className="w-8 h-8"/>
                              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar}/>
                          </label>
                      )}
                  </div>
              
              <div className="flex-1 mb-2 flex flex-col items-center md:items-start">
                  <div className="flex flex-col md:flex-row items-center gap-3 mb-2 md:mb-1">
                      {isEditMode ? (
                          <div className="flex items-center gap-2">
                              <input value={editName} onChange={e=>setEditName(e.target.value)} className="border rounded px-2 py-1 text-2xl font-bold text-slate-900 dark:text-slate-100 w-full max-w-[200px]" />
                              <button onClick={handleUpdateProfile} className="text-green-600 hover:bg-green-50 dark:bg-green-900/20 p-1 rounded"><CheckCircle className="w-6 h-6"/></button>
                              <button onClick={()=>setIsEditMode(false)} className="text-red-500 hover:bg-red-50 p-1 rounded"><XCircle className="w-6 h-6"/></button>
                          </div>
                      ) : (
                          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{profileUser.username}</h1>
                      )}
                      <RoleBadge roles={profileUser.roles} />
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm flex flex-col md:flex-row items-center gap-2 md:gap-4">
                      <span>ID: {profileUser.id}</span>
                      {profileUser.email && isOwnProfile && <span>{profileUser.email}</span>}
                  </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-2">
                  {isOwnProfile ? (
                      <>
                        <button onClick={()=>setIsEditMode(!isEditMode)} className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:bg-[#0f1016] font-medium flex items-center">
                            <Edit2 className="w-4 h-4 mr-2"/> Sửa hồ sơ
                        </button>
                        <button onClick={logout} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-red-600 rounded-lg hover:bg-red-50 font-medium flex items-center">
                            <LogOut className="w-4 h-4 mr-2"/> Đăng xuất
                        </button>
                      </>
                  ) : currentUser ? (
                      <>
                          {isFriend ? (
                              <>
                                <button onClick={()=>handleFriendAction('message')} className="px-4 py-2 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-primary font-bold flex items-center shadow-lg shadow-primary/30 transition-all">
                                    <MessageCircle className="w-4 h-4 mr-2"/> Nhắn tin
                                </button>
                                <button onClick={()=>handleFriendAction('unfriend')} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium flex items-center">
                                    <UserMinus className="w-4 h-4 mr-2"/> Hủy kết bạn
                                </button>
                              </>
                          ) : hasReceivedRequest ? (
                              <button onClick={()=>handleFriendAction('accept')} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-teal-500 hover:to-emerald-500 font-bold flex items-center shadow-lg shadow-emerald-500/30 transition-all">
                                  <UserCheck className="w-4 h-4 mr-2"/> Chấp nhận
                              </button>
                          ) : hasSentRequest ? (
                              <button onClick={()=>handleFriendAction('cancel')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:bg-slate-700 font-medium flex items-center">
                                  <X className="w-4 h-4 mr-2"/> Đã gửi lời mời
                              </button>
                          ) : (
                              <button onClick={()=>handleFriendAction('add')} className="px-4 py-2 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-primary font-bold flex items-center shadow-lg shadow-primary/30 transition-all">
                                  <UserPlus className="w-4 h-4 mr-2"/> Kết bạn
                              </button>
                          )}
                      </>
                  ) : null}
              </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
          {/* SIDEBAR NAVIGATION */}
          <div className="w-full md:w-64 flex-shrink-0">
              <div className="bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-purple-100/50 dark:border-purple-900/50 overflow-hidden md:sticky md:top-20">
                  <div className="hidden md:block p-4 bg-white/50 dark:bg-[#1a1b26]/50 border-b border-purple-100/50 dark:border-purple-900/50 font-bold text-slate-700 dark:text-slate-200">Menu</div>
                  <nav className="flex flex-row md:flex-col p-2 space-x-2 md:space-x-0 md:space-y-1 overflow-x-auto scrollbar-hide">
                      <button onClick={()=>setActiveTab('overview')} className={`flex-shrink-0 flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-md shadow-primary/20' : 'text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary'}`}>
                          <LayoutDashboard className="w-4 h-4 mr-2 md:mr-3"/> Tổng quan
                      </button>
                      <button onClick={()=>setActiveTab('novels')} className={`flex-shrink-0 flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'novels' ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-md shadow-primary/20' : 'text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary'}`}>
                          <BookOpen className="w-4 h-4 mr-2 md:mr-3"/> Truyện đã đăng
                      </button>
                      <button onClick={()=>setActiveTab('posts')} className={`flex-shrink-0 flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'posts' ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-md shadow-primary/20' : 'text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary'}`}>
                          <FileText className="w-4 h-4 mr-2 md:mr-3"/> Bài viết
                      </button>
                      <button onClick={()=>setActiveTab('friends')} className={`flex-shrink-0 flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'friends' ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-md shadow-primary/20' : 'text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary'}`}>
                          <Users className="w-4 h-4 mr-2 md:mr-3"/> Bạn bè
                      </button>
                      {isOwnProfile && (
                          <button onClick={()=>setActiveTab('liked_novels')} className={`flex-shrink-0 flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'liked_novels' ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-md shadow-primary/20' : 'text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary'}`}>
                              <Heart className="w-4 h-4 mr-2 md:mr-3"/> Truyện đã thích
                          </button>
                      )}
                      
                      {isDashboard && (
                          <>
                              <div className="hidden md:block my-2 border-t border-purple-100/50 dark:border-purple-900/50 mx-4"></div>
                              <div className="hidden md:block px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quản trị</div>
                              <button onClick={()=>setActiveTab('admin_users')} className={`flex-shrink-0 flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin_users' ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100'}`}>
                                  <Users className="w-4 h-4 mr-2 md:mr-3"/> Người dùng
                              </button>
                              <button onClick={()=>setActiveTab('admin_novels')} className={`flex-shrink-0 flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin_novels' ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100'}`}>
                                  <Database className="w-4 h-4 mr-2 md:mr-3"/> Quản lý truyện
                              </button>
                              <button onClick={()=>setActiveTab('admin_requests')} className={`flex-shrink-0 flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'admin_requests' ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100'}`}>
                                  <Ticket className="w-4 h-4 mr-2 md:mr-3"/> Yêu cầu quyền
                              </button>
                          </>
                      )}
                  </nav>
              </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1">
              {activeTab === 'overview' && (
                  <div className="space-y-6 animate-fadeIn">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-purple-100/50 dark:border-purple-900/50 text-center hover:shadow-md hover:border-purple-200 transition-all">
                              <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-transparent">{userNovels.length}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase font-bold mt-1">Truyện</div>
                          </div>
                          <div className="bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-purple-100/50 dark:border-purple-900/50 text-center hover:shadow-md hover:border-purple-200 transition-all">
                              <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-transparent">{userPosts.length}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase font-bold mt-1">Bài viết</div>
                          </div>
                          <div className="bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-purple-100/50 dark:border-purple-900/50 text-center hover:shadow-md hover:border-purple-200 transition-all">
                              <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-transparent">{profileUser.friends?.length || 0}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase font-bold mt-1">Bạn bè</div>
                          </div>
                          <div className="bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-purple-100/50 dark:border-purple-900/50 text-center hover:shadow-md hover:border-purple-200 transition-all">
                              <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-transparent">{profileUser.likedNovelIds?.length || 0}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase font-bold mt-1">Đã thích</div>
                          </div>
                      </div>

                      {isOwnProfile && (
                          <div className="bg-white dark:bg-[#1a1b26] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                              <h3 className="font-bold text-lg mb-4 flex items-center"><Award className="w-5 h-5 mr-2 text-yellow-500"/> Trạng thái tài khoản</h3>
                              
                              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50 dark:bg-[#0f1016] p-4 rounded-lg">
                                  <div>
                                      <div className="font-medium text-slate-800 dark:text-slate-100">Quyền hiện tại:</div>
                                      <div className="mt-1"><RoleBadge roles={profileUser.roles} /></div>
                                  </div>
                                  
                                  {pendingRequest ? (
                                      <div className="flex items-center text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded border border-orange-200">
                                          <Clock className="w-4 h-4 mr-2"/> Đang chờ duyệt yêu cầu {pendingRequest.requestedRole}
                                      </div>
                                  ) : (
                                      !profileUser.roles.includes(Role.AUTHOR) && !profileUser.roles.includes(Role.TRANSLATOR) && (
                                          <button onClick={()=>setShowRoleRequestModal(true)} className="px-4 py-2 bg-white dark:bg-[#1a1b26] border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:bg-[#0f1016] text-sm font-medium shadow-sm">
                                              Yêu cầu lên cấp Author/Translator
                                          </button>
                                      )
                                  )}
                              </div>
                          </div>
                      )}

                      {isOwnProfile && (
                          <div className="bg-white dark:bg-[#1a1b26] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                              <h3 className="font-bold text-lg mb-4 flex items-center"><Sun className="w-5 h-5 mr-2 text-primary"/> Giao diện hiển thị</h3>
                              
                              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50 dark:bg-[#0f1016] p-4 rounded-lg">
                                  <div>
                                      <div className="font-medium text-slate-800 dark:text-slate-100">Chế độ tối (Dark Mode)</div>
                                      <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Chuyển sang nền tối để bảo vệ mắt.</div>
                                  </div>
                                  <button onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${theme === 'dark' ? 'bg-primary' : 'bg-slate-300'}`}>
                                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#1a1b26] transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'friends' && (
                  <div className="space-y-6 animate-fadeIn">
                      {isOwnProfile && friendRequestsList.length > 0 && (
                          <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                                  <UserPlus className="w-5 h-5 mr-2 text-orange-500"/>
                                  Lời mời kết bạn ({friendRequestsList.length})
                              </h2>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {friendRequestsList.map(reqUser => (
                                      <div key={reqUser.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50/50">
                                          <Link to={`/user/${reqUser.id}`} className="flex items-center gap-3 group">
                                              <img src={reqUser.avatar || 'https://via.placeholder.com/50'} className="w-10 h-10 rounded-full object-cover group-hover:ring-2 ring-primary transition-all" alt=""/>
                                              <div>
                                                  <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">{reqUser.username}</div>
                                                  <RoleBadge roles={reqUser.roles} />
                                              </div>
                                          </Link>
                                          <div className="flex gap-2">
                                              <button onClick={async () => {
                                                  await acceptFriendRequest(currentUser!, reqUser.id);
                                                  window.location.reload();
                                              }} className="p-2 bg-green-500 text-white hover:bg-green-600 rounded-lg" title="Chấp nhận">
                                                  <UserCheck className="w-4 h-4"/>
                                              </button>
                                              <button onClick={async () => {
                                                  await cancelFriendRequest(reqUser.id, currentUser!.id);
                                                  window.location.reload();
                                              }} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 rounded-lg" title="Từ chối">
                                                  <X className="w-4 h-4"/>
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                              <Users className="w-6 h-6 mr-2 text-primary"/>
                              Danh sách bạn bè ({profileUser.friends?.length || 0})
                          </h2>
                          
                          {(!profileUser.friends || profileUser.friends.length === 0) ? (
                              <div className="text-center py-12 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                  <UserIcon className="w-12 h-12 mx-auto mb-4 text-slate-300"/>
                                  <p>Chưa có bạn bè nào.</p>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {friendsList.map(friend => (
                                      <div key={friend.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                                          <Link to={`/user/${friend.id}`} className="flex items-center gap-3 group">
                                              <img src={friend.avatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover group-hover:ring-2 ring-primary transition-all" alt=""/>
                                              <div>
                                                  <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">{friend.username}</div>
                                                  <RoleBadge roles={friend.roles} />
                                              </div>
                                          </Link>
                                          {isOwnProfile && (
                                              <div className="flex gap-2">
                                                  <button onClick={() => {
                                                      navigate(`/messages?userId=${friend.id}`);
                                                  }} className="p-2 text-blue-600 hover:bg-blue-50 dark:bg-blue-900/20 rounded-full" title="Nhắn tin">
                                                      <MessageCircle className="w-5 h-5"/>
                                                  </button>
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'liked_novels' && isOwnProfile && (
                  <div className="space-y-6 animate-fadeIn">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center mb-6">
                          <Heart className="w-6 h-6 mr-2 text-primary"/> Truyện đã thích
                      </h2>
                      
                      {likedNovelsList.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                              {likedNovelsList.map(novel => (
                                  <Link to={`/novel/${novel.id}`} key={novel.id} className="group flex flex-col bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-[0_10px_40px_-10px_rgba(124,58,237,0.3)] overflow-hidden border border-purple-100/50 dark:border-purple-900/50 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
                                      <div className="aspect-[2/3] bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                                          <img src={novel.coverUrl} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" alt={novel.title}/>
                                      </div>
                                      <div className="p-4 flex flex-col flex-1">
                                          <h3 className="font-bold text-base line-clamp-2 group-hover:text-primary mb-1 text-slate-800 dark:text-slate-100 transition-colors">{novel.title}</h3>
                                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{novel.author}</p>
                                      </div>
                                  </Link>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-[#1a1b26]/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                              <Heart className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600"/>
                              <p>Bạn chưa thích truyện nào.</p>
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'novels' && (
                  <div className="space-y-6 animate-fadeIn">
                      <div className="flex justify-between items-center">
                          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Danh sách truyện</h2>
                          {isOwnProfile && (
                              <button onClick={()=>setShowAddNovelModal(true)} className="bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg shadow-primary/30 transition-all transform hover:scale-105">
                                  <Plus className="w-5 h-5 mr-2"/> Đăng truyện mới
                              </button>
                          )}
                      </div>
                      
                      {userNovels.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {userNovels.map(novel => (
                                  <div key={novel.id} className="bg-white dark:bg-[#1a1b26] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex gap-4 group">
                                      <img src={novel.coverUrl} className="w-20 h-28 object-cover rounded shadow-sm" alt=""/>
                                      <div className="flex-1">
                                          <Link to={`/novel/${novel.id}`} className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-primary transition-colors">{novel.title}</Link>
                                          <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-2">{novel.type} • {novel.status}</div>
                                          <div className={`text-xs inline-block px-2 py-0.5 rounded ${novel.isPending ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                              {novel.isPending ? 'Chờ duyệt' : 'Đã duyệt'}
                                          </div>
                                      </div>
                                      {isOwnProfile && (
                                          <div className="flex flex-col gap-2">
                                              <Link to={`/novel/${novel.id}`} className="p-2 text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-slate-50 dark:bg-[#0f1016] rounded"><Edit className="w-4 h-4"/></Link>
                                              <button onClick={() => {
                                                  showConfirm("Xóa truyện này?", async () => {
                                                      try {
                                                          await deleteNovel(novel.id);
                                                          const updatedNovels = await getNovelsByUploader(profileUser!.id);
                                                          setUserNovels(updatedNovels);
                                                      } catch (e: any) {
                                                          showToast("Lỗi khi xóa truyện: " + e.message, 'error');
                                                      }
                                                  });
                                              }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-12 text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-white dark:bg-[#1a1b26] rounded-xl border border-dashed">
                              Chưa có truyện nào.
                          </div>
                      )}
                  </div>
              )}

              {activeTab === 'posts' && (
                  <div className="space-y-4 animate-fadeIn">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Bài viết trên diễn đàn</h2>
                      {userPosts.length > 0 ? (
                          userPosts.map(post => (
                              <Link to={`/forum/${post.id}`} key={post.id} className="block bg-white dark:bg-[#1a1b26] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{post.title}</h3>
                                          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 line-clamp-2">{post.content}</p>
                                          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 flex gap-3">
                                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{post.topic}</span>
                                              <span>{formatDate(post.createdAt)}</span>
                                              <span>{post.viewCount} views</span>
                                          </div>
                                      </div>
                                  </div>
                              </Link>
                          ))
                      ) : (
                          <div className="text-center py-12 text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-white dark:bg-[#1a1b26] rounded-xl border border-dashed">
                              Chưa có bài viết nào.
                          </div>
                      )}
                  </div>
              )}

              {/* ADMIN TABS */}
              {isDashboard && activeTab === 'admin_users' && (
                  <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto animate-fadeIn">
                      <table className="w-full text-sm text-left min-w-[600px]">
                          <thead className="bg-slate-50 dark:bg-[#0f1016] text-slate-700 dark:text-slate-200 font-bold border-b">
                              <tr>
                                  <th className="p-4">User</th>
                                  <th className="p-4">Email</th>
                                  <th className="p-4">Roles</th>
                                  <th className="p-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y">
                              {currentAdminUsers.map(u => (
                                  <tr key={u.id} className="hover:bg-slate-50 dark:bg-[#0f1016]">
                                      <td className="p-4 flex items-center gap-3">
                                          <Link to={`/user/${u.id}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                                              <img src={u.avatar} className="w-8 h-8 rounded-full" alt=""/>
                                              <span className="font-medium">{u.username}</span>
                                          </Link>
                                      </td>
                                      <td className="p-4 text-slate-500 dark:text-slate-400 dark:text-slate-500">{u.email}</td>
                                      <td className="p-4"><RoleBadge roles={u.roles}/></td>
                                      <td className="p-4 text-right space-x-2">
                                          {isAdmin && u.id !== currentUser.id && (
                                              <>
                                                  <button onClick={() => { setEditingUser(u); setEditingRoles(u.roles || []); setShowEditRoleModal(true); }} className="text-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 p-2 rounded" title="Phân quyền"><Shield className="w-4 h-4"/></button>
                                                  <button onClick={()=>handleDeleteUser(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded" title="Xóa"><Trash2 className="w-4 h-4"/></button>
                                              </>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      {adminUsers.length > adminUsersPerPage && (
                          <div className="p-4 border-t flex justify-between items-center bg-slate-50 dark:bg-[#0f1016]">
                              <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                  Hiển thị {(adminUsersPage - 1) * adminUsersPerPage + 1} - {Math.min(adminUsersPage * adminUsersPerPage, adminUsers.length)} trong {adminUsers.length} người dùng
                              </span>
                              <div className="flex gap-2">
                                  <button 
                                      onClick={() => setAdminUsersPage(p => Math.max(1, p - 1))}
                                      disabled={adminUsersPage === 1}
                                      className="px-3 py-1 border rounded bg-white dark:bg-[#1a1b26] disabled:opacity-50 hover:bg-slate-50 dark:bg-[#0f1016] text-sm font-medium"
                                  >
                                      Trước
                                  </button>
                                  <button 
                                      onClick={() => setAdminUsersPage(p => Math.min(totalAdminUsersPages, p + 1))}
                                      disabled={adminUsersPage === totalAdminUsersPages || totalAdminUsersPages === 0}
                                      className="px-3 py-1 border rounded bg-white dark:bg-[#1a1b26] disabled:opacity-50 hover:bg-slate-50 dark:bg-[#0f1016] text-sm font-medium"
                                  >
                                      Sau
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {isDashboard && activeTab === 'admin_novels' && (
                  <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto animate-fadeIn">
                      <table className="w-full text-sm text-left min-w-[600px]">
                          <thead className="bg-slate-50 dark:bg-[#0f1016] text-slate-700 dark:text-slate-200 font-bold border-b">
                              <tr>
                                  <th className="p-4">Truyện</th>
                                  <th className="p-4">Trạng thái</th>
                                  <th className="p-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y">
                              {adminNovels.map(n => (
                                  <tr key={n.id} className="hover:bg-slate-50 dark:bg-[#0f1016]">
                                      <td className="p-4">
                                          <Link to={`/novel/${n.id}`} className="font-bold hover:text-primary">{n.title}</Link>
                                          <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{n.author}</div>
                                      </td>
                                      <td className="p-4">
                                          {n.isPending ? <span className="text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded text-xs font-bold">Chờ duyệt</span> : <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded text-xs font-bold">Đã duyệt</span>}
                                          {n.isFeatured && <span className="ml-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded text-xs font-bold">Nổi bật</span>}
                                      </td>
                                      <td className="p-4 text-right space-x-2">
                                          {n.isPending && (
                                              <button onClick={()=>handleApproveNovel(n.id)} className="text-green-600 hover:bg-green-50 dark:bg-green-900/20 p-1 rounded" title="Duyệt"><CheckCircle className="w-4 h-4"/></button>
                                          )}
                                          <button onClick={async()=>{
                                              try {
                                                  await toggleNovelFeature(n.id); 
                                                  const updated=await getNovels(); 
                                                  setAdminNovels(updated);
                                              } catch (e: any) {
                                                  showToast("Lỗi: " + e.message, 'error');
                                              }
                                          }} className={`p-1 rounded ${n.isFeatured ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-yellow-500'}`} title="Nổi bật"><Star className="w-4 h-4"/></button>
                                          <button onClick={()=>handleDeleteNovel(n.id)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Xóa"><Trash2 className="w-4 h-4"/></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {isDashboard && activeTab === 'admin_requests' && (
                  <div className="space-y-4 animate-fadeIn">
                      {adminRequests.length > 0 ? (
                          adminRequests.map(req => (
                              <div key={req.id} className="bg-white dark:bg-[#1a1b26] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                      <img src={req.userAvatar} className="w-10 h-10 rounded-full" alt=""/>
                                      <div>
                                          <div className="font-bold text-slate-900 dark:text-slate-100">{req.username}</div>
                                          <div className="text-sm text-slate-600 dark:text-slate-300">Muốn làm: <span className="font-bold text-primary">{req.requestedRole}</span></div>
                                          <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 italic">"{req.reason}"</div>
                                      </div>
                                  </div>
                                  <div className="flex gap-2">
                                      {req.status === 'Chờ duyệt' ? (
                                          <>
                                              <button onClick={()=>handleProcessRequest(req.id, true, req.userId, req.requestedRole)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-bold">Chấp nhận</button>
                                              <button onClick={()=>handleProcessRequest(req.id, false, req.userId, req.requestedRole)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-bold">Từ chối</button>
                                          </>
                                      ) : (
                                          <span className={`px-2 py-1 rounded text-xs font-bold ${req.status === 'Đã duyệt' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50'}`}>
                                              {req.status}
                                          </span>
                                      )}
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-12 text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-white dark:bg-[#1a1b26] rounded-xl border border-dashed">
                              Không có yêu cầu nào.
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {/* ADD NOVEL MODAL */}
      {showAddNovelModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
                  <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white dark:bg-[#1a1b26] z-10">
                      <h3 className="font-bold text-xl">Đăng truyện mới</h3>
                      <button onClick={()=>setShowAddNovelModal(false)}><X className="w-6 h-6 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"/></button>
                  </div>
                  <form onSubmit={handleSubmitNovel} className="p-4 md:p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tên truyện</label>
                              <input value={newNovel.title} onChange={e=>setNewNovel({...newNovel, title: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none" required/>
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tác giả</label>
                              <input value={newNovel.author} onChange={e=>setNewNovel({...newNovel, author: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none" required/>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Loại</label>
                          <select value={newNovel.type} onChange={e=>setNewNovel({...newNovel, type: e.target.value as NovelType})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none">
                              <option value={NovelType.TRANSLATED}>{NovelType.TRANSLATED}</option>
                              <option value={NovelType.ORIGINAL}>{NovelType.ORIGINAL}</option>
                          </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Độ dài</label>
                              <select value={newNovel.length} onChange={e=>setNewNovel({...newNovel, length: e.target.value as NovelLength})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none">
                                  <option value={NovelLength.SERIES}>{NovelLength.SERIES}</option>
                                  <option value={NovelLength.ONESHOT}>{NovelLength.ONESHOT}</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Tình trạng</label>
                              <select value={newNovel.status} onChange={e=>setNewNovel({...newNovel, status: e.target.value as NovelStatus})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none">
                                  <option value={NovelStatus.ONGOING}>{NovelStatus.ONGOING}</option>
                                  <option value={NovelStatus.COMPLETED}>{NovelStatus.COMPLETED}</option>
                                  <option value={NovelStatus.PAUSED}>{NovelStatus.PAUSED}</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Thể loại</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {Object.values(NovelGenre).map(g => (
                                  <label key={g} className="flex items-center space-x-2 p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:bg-[#0f1016] cursor-pointer transition-colors group">
                                      <input 
                                          type="checkbox" 
                                          checked={(newNovel.genres || []).includes(g)}
                                          onChange={(e) => {
                                              const currentGenres = newNovel.genres || [];
                                              if (e.target.checked) {
                                                  setNewNovel({...newNovel, genres: [...currentGenres, g]});
                                              } else {
                                                  setNewNovel({...newNovel, genres: currentGenres.filter(genre => genre !== g)});
                                              }
                                          }}
                                          className="w-4 h-4 text-primary rounded border-slate-300 dark:border-slate-700 focus:ring-primary"
                                      />
                                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{g}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Mô tả</label>
                          <textarea value={newNovel.description} onChange={e=>setNewNovel({...newNovel, description: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none h-24" required></textarea>
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Ảnh bìa</label>
                          <input type="file" onChange={e => setNovelCoverFile(e.target.files ? e.target.files[0] : null)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-slate-900 dark:text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" accept="image/*"/>
                      </div>
                      <div className="flex justify-end pt-4">
                          <button type="submit" disabled={submittingNovel} className="bg-primary text-white px-6 py-2 rounded-lg font-bold flex items-center">
                              {submittingNovel ? <Loader2 className="animate-spin w-5 h-5"/> : 'Đăng truyện'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* ROLE REQUEST MODAL */}
      {showRoleRequestModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-2xl max-w-md w-full animate-scaleIn">
                  <div className="p-6 border-b flex justify-between items-center">
                      <h3 className="font-bold text-xl">Yêu cầu cấp quyền</h3>
                      <button onClick={()=>setShowRoleRequestModal(false)}><X className="w-6 h-6 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"/></button>
                  </div>
                  <form onSubmit={handleSubmitRoleRequest} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Loại quyền muốn nhận</label>
                          <select value={roleRequestType} onChange={e=>setRoleRequestType(e.target.value as any)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none">
                              <option value={Role.AUTHOR}>{Role.AUTHOR} (Cho tác giả sáng tác)</option>
                              <option value={Role.TRANSLATOR}>{Role.TRANSLATOR} (Cho dịch giả)</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Lý do / Kinh nghiệm</label>
                          <textarea value={roleRequestReason} onChange={e=>setRoleRequestReason(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none h-24" placeholder="Ví dụ: Tôi đã có kinh nghiệm dịch 2 bộ truyện..." required></textarea>
                      </div>
                      <div className="flex justify-end pt-4">
                          <button type="submit" disabled={submittingRequest} className="bg-primary text-white px-6 py-2 rounded-lg font-bold flex items-center">
                              {submittingRequest ? <Loader2 className="animate-spin w-5 h-5"/> : 'Gửi yêu cầu'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* EDIT ROLE MODAL */}
      {showEditRoleModal && editingUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-[#1a1b26] rounded-xl shadow-2xl max-w-md w-full animate-scaleIn">
                  <div className="p-6 border-b flex justify-between items-center">
                      <h3 className="font-bold text-xl">Phân quyền người dùng</h3>
                      <button onClick={()=>setShowEditRoleModal(false)}><X className="w-6 h-6 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                          <img src={editingUser.avatar} className="w-10 h-10 rounded-full" alt=""/>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{editingUser.username}</div>
                      </div>
                      <div className="space-y-2">
                          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Chọn quyền (Có thể chọn nhiều):</label>
                          {Object.values(Role).map(role => (
                              <label key={role} className="flex items-center space-x-3 p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:bg-[#0f1016] cursor-pointer transition-colors group">
                                  <input 
                                      type="checkbox" 
                                      checked={editingRoles.includes(role)}
                                      onChange={() => toggleEditingRole(role)}
                                      className="w-4 h-4 text-primary rounded border-slate-300 dark:border-slate-700 focus:ring-primary"
                                  />
                                  <span className="font-medium text-slate-700 dark:text-slate-200">{role}</span>
                              </label>
                          ))}
                      </div>
                      <div className="flex justify-end pt-4 gap-2">
                          <button onClick={()=>setShowEditRoleModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:bg-[#0f1016]">Hủy</button>
                          <button onClick={handleSaveRoles} className="bg-primary text-white px-6 py-2 rounded-lg font-bold flex items-center shadow-md hover:bg-blue-600">
                              Lưu thay đổi
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};