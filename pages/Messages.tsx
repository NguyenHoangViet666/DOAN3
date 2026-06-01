import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages, sendMessage, markConversationAsRead, getUserById, uploadImage } from '../services/dbService';
import { Conversation, Message, User } from '../types';
import { Loader2, Send, MessageSquare, ArrowLeft, Search, Image as ImageIcon, Smile, MoreHorizontal, Phone, Video, Info, CheckCircle, Clock, MoreVertical } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const Messages: React.FC = () => {
    const { currentUser } = useAuth();
    const location = useLocation();
    const { showToast } = useNotification();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [msgContent, setMsgContent] = useState('');
    const [sending, setSending] = useState(false);
    
    // For handling new chat from profile
    const query = new URLSearchParams(location.search);
    const partnerId = query.get('userId');
    const [tempPartner, setTempPartner] = useState<User | null>(null);

    // Ref for scrollable container
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const [friends, setFriends] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const EMOJIS = ['😀', '😂', '❤️', '😍', '😭', '😊', '👍', '🙏', '🔥', '🥰', '🤔', '😎', '😢', '🎉', '✨', '💯', '👏', '🙌', '👀', '💩'];

    // Tắt mockup online theo yêu cầu của user
    const isUserOnline = (userId: string) => {
        return false;
    };

    // Initial Fetch
    useEffect(() => {
        if (!currentUser) return;
        const fetchConvsAndFriends = async () => {
            setLoading(true);
            const convs = await getConversations(currentUser.id);
            setConversations(convs);
            
            // Fetch friends for the top bar
            if (currentUser.friends && currentUser.friends.length > 0) {
                const friendsData = await Promise.all(currentUser.friends.map(id => getUserById(id)));
                setFriends(friendsData.filter(f => f !== null) as User[]);
            }
            
            // Logic to select conversation
            if (partnerId && partnerId !== currentUser.id) {
                // Check if conv exists
                const existing = convs.find(c => c.participants.includes(partnerId));
                if (existing) {
                    setSelectedConvId(existing.id);
                } else {
                    // Fetch partner info for temporary chat header
                    const p = await getUserById(partnerId);
                    if (p) setTempPartner(p);
                    // Clear selected ID so we show empty chat but with partner info
                    setSelectedConvId('new'); 
                }
            } else if (convs.length > 0 && !selectedConvId) {
                // Select first by default if not coming from profile
                setSelectedConvId(convs[0].id);
            }
            setLoading(false);
        };
        fetchConvsAndFriends();
    }, [currentUser, partnerId]);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    // Fetch Messages when active conversation changes
    useEffect(() => {
        if (!selectedConvId || selectedConvId === 'new') {
            if (selectedConvId === 'new') setMessages([]);
            return;
        }

        const fetchMsgs = async (isFirstLoad = false) => {
            const msgs = await getMessages(selectedConvId);
            setMessages(msgs);
            // Mark as read
            if (currentUser) {
                await markConversationAsRead(selectedConvId, currentUser.id);
            }
            // Only scroll to bottom on the FIRST load of a conversation
            if (isFirstLoad) {
                setTimeout(scrollToBottom, 100);
            }
        };

        fetchMsgs(true);
        // Polling for new messages
        const interval = setInterval(() => fetchMsgs(false), 3000);
        return () => clearInterval(interval);
    }, [selectedConvId, currentUser]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgContent.trim() || !currentUser) return;

        let targetId = '';
        if (selectedConvId === 'new' && tempPartner) {
            targetId = tempPartner.id;
        } else if (selectedConvId) {
            const activeConv = conversations.find(c => c.id === selectedConvId);
            if (activeConv) {
                targetId = activeConv.participants.find(p => p !== currentUser.id) || '';
            }
        }

        if (!targetId) return;

        setSending(true);
        try {
            await sendMessage(currentUser, targetId, msgContent);
            setMsgContent('');
            setShowEmojiPicker(false);
            
            // If it was new, refresh conversations to get the ID
            if (selectedConvId === 'new') {
                const convs = await getConversations(currentUser.id);
                setConversations(convs);
                const newConv = convs.find(c => c.participants.includes(targetId));
                if (newConv) setSelectedConvId(newConv.id);
            } else if (selectedConvId) {
                // Refresh messages immediately
                const msgs = await getMessages(selectedConvId);
                setMessages(msgs);
            }
            // Always scroll to bottom after sending a message
            setTimeout(scrollToBottom, 100);
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !currentUser) return;
        
        let targetId = '';
        if (selectedConvId === 'new' && tempPartner) {
            targetId = tempPartner.id;
        } else if (selectedConvId) {
            const activeConv = conversations.find(c => c.id === selectedConvId);
            if (activeConv) {
                targetId = activeConv.participants.find(p => p !== currentUser.id) || '';
            }
        }

        if (!targetId) return;

        setUploadingImage(true);
        try {
            const url = await uploadImage(e.target.files[0]);
            await sendMessage(currentUser, targetId, `[Image](${url})`);
            
            if (selectedConvId === 'new') {
                const convs = await getConversations(currentUser.id);
                setConversations(convs);
                const newConv = convs.find(c => c.participants.includes(targetId));
                if (newConv) setSelectedConvId(newConv.id);
            } else if (selectedConvId) {
                const msgs = await getMessages(selectedConvId);
                setMessages(msgs);
            }
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error("Lỗi gửi ảnh:", error);
            showToast("Lỗi gửi ảnh", 'error');
        } finally {
            setUploadingImage(false);
        }
    };

    const renderMessageContent = (content: string) => {
        const imgMatch = content.match(/^\[Image\]\((.+)\)$/);
        if (imgMatch) {
            return <img src={imgMatch[1]} alt="Sent image" className="max-w-xs rounded-lg max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(imgMatch[1], '_blank')} />;
        }
        return <div className="whitespace-pre-wrap break-words">{content}</div>;
    };

    const getPartnerInfo = (conv: Conversation) => {
        if (!currentUser) return { id: '', username: 'Unknown', avatar: '' };
        // Fallback safely if participantInfo is missing
        const info = conv.participantInfo?.find(p => p.id !== currentUser.id);
        return info || { id: '', username: 'Unknown', avatar: '' };
    };

    const filteredConversations = conversations.filter(conv => {
        const partner = getPartnerInfo(conv);
        return partner.username.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary"/></div>;

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] flex bg-white/90 dark:bg-[#1a1b26]/90 backdrop-blur-xl border-x border-purple-100/50 dark:border-purple-900/50 shadow-2xl overflow-hidden rounded-b-3xl">
            {/* LEFT SIDEBAR */}
            <div className={`w-full md:w-[360px] border-r border-purple-100/50 dark:border-purple-900/50 flex flex-col bg-white/50 dark:bg-[#1a1b26]/50 ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 pb-2">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="font-bold text-2xl text-slate-900 dark:text-slate-100">Đoạn chat</h1>
                        <div className="flex gap-2">
                            <button className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-200 transition-colors">
                                <MoreHorizontal className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"/>
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm bạn bè" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {/* Active Friends (Horizontal Scroll) */}
                    {friends.length > 0 && !searchQuery && (
                        <div className="flex overflow-x-auto gap-4 px-4 py-2 mb-2 scrollbar-hide">
                            {friends.map(friend => (
                                <div 
                                    key={friend.id} 
                                    className="flex flex-col items-center cursor-pointer flex-shrink-0 w-14"
                                    onClick={() => {
                                        // Find existing conv or start new
                                        const existing = conversations.find(c => c.participants.includes(friend.id));
                                        if (existing) {
                                            setSelectedConvId(existing.id);
                                        } else {
                                            setTempPartner(friend);
                                            setSelectedConvId('new');
                                        }
                                    }}
                                >
                                    <div className="relative mb-1">
                                        <img src={friend.avatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" alt=""/>
                                        {isUserOnline(friend.id) && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>}
                                    </div>
                                    <span className="text-xs text-slate-600 dark:text-slate-300 text-center truncate w-full">{friend.username.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Conversation List */}
                    {filteredConversations.length === 0 && !tempPartner && !searchQuery ? (
                        <div className="p-6 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm mt-10">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300"/>
                            Chưa có cuộc trò chuyện nào.
                        </div>
                    ) : filteredConversations.length === 0 && searchQuery ? (
                        <div className="p-6 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm mt-10">
                            Không tìm thấy kết quả cho "{searchQuery}"
                        </div>
                    ) : (
                        <div className="px-2">
                            {tempPartner && selectedConvId === 'new' && !searchQuery && (
                                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 cursor-pointer mb-1">
                                    <div className="flex items-center gap-3">
                                        <img src={tempPartner.avatar} className="w-14 h-14 rounded-full object-cover" alt=""/>
                                        <div>
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">{tempPartner.username}</div>
                                            <div className="text-sm text-blue-600 font-medium">Tin nhắn mới...</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {filteredConversations.map(conv => {
                                const partner = getPartnerInfo(conv);
                                const isUnread = currentUser && conv.unreadCount && conv.unreadCount[currentUser.id] > 0;
                                return (
                                    <div 
                                        key={conv.id}
                                        onClick={() => { setSelectedConvId(conv.id); setTempPartner(null); }}
                                        className={`p-2 rounded-2xl cursor-pointer transition-all mb-1 flex items-center gap-3 ${selectedConvId === conv.id ? 'bg-gradient-to-r from-primary/10 to-purple-600/10 shadow-sm border border-primary/20' : 'hover:bg-white/60 dark:bg-[#1a1b26]/60 border border-transparent'}`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img src={partner.avatar || 'https://via.placeholder.com/50'} className="w-14 h-14 rounded-full object-cover" alt=""/>
                                            {isUserOnline(partner.id) && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-[15px] truncate ${isUnread ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-800 dark:text-slate-100'}`}>
                                                {partner.username}
                                            </div>
                                            <div className="flex items-center text-[13px] mt-0.5">
                                                <span className={`truncate flex-1 ${isUnread ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500'}`}>
                                                    {conv.lastMessage}
                                                </span>
                                                <span className="mx-1 text-slate-400 dark:text-slate-500">·</span>
                                                <span className={`flex-shrink-0 ${isUnread ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                                    {new Date(conv.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        </div>
                                        {isUnread && <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mr-2"></div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT CHAT AREA */}
            <div className={`flex-1 flex flex-col h-full bg-white/40 dark:bg-[#1a1b26]/40 ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
                {selectedConvId ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-4 py-3 border-b border-purple-100/50 dark:border-purple-900/50 flex items-center justify-between shadow-sm z-10 bg-white/60 dark:bg-[#1a1b26]/60 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedConvId(null)} className="md:hidden p-2 -ml-2 hover:bg-slate-100 dark:bg-slate-800 rounded-full text-primary"><ArrowLeft className="w-6 h-6"/></button>
                                {(() => {
                                    let partnerName = '';
                                    let partnerAvatar = '';
                                    let partnerId = '';
                                    let currentConv = null;
                                    if (selectedConvId === 'new' && tempPartner) {
                                        partnerName = tempPartner.username;
                                        partnerAvatar = tempPartner.avatar || '';
                                        partnerId = tempPartner.id;
                                    } else {
                                        const activeConv = conversations.find(c => c.id === selectedConvId);
                                        if (activeConv) {
                                            currentConv = activeConv;
                                            const p = getPartnerInfo(activeConv);
                                            partnerName = p.username;
                                            partnerAvatar = p.avatar;
                                            partnerId = p.id;
                                        }
                                    }

                                    const getLastActive = () => {
                                        // Nếu có dữ liệu thật từ tin nhắn cuối cùng CỦA ĐỐI TÁC
                                        const partnerLastMsg = messages && messages.length > 0 
                                            ? [...messages].reverse().find(m => m.senderId === partnerId)
                                            : null;

                                        if (partnerLastMsg) {
                                            const diffMs = Date.now() - new Date(partnerLastMsg.createdAt).getTime();
                                            const diffMins = Math.floor(diffMs / 60000);
                                            if (diffMins < 60) return `Hoạt động ${diffMins || 1} phút trước`;
                                            const diffHours = Math.floor(diffMins / 60);
                                            if (diffHours < 24) return `Hoạt động ${diffHours} giờ trước`;
                                            return `Hoạt động ${Math.floor(diffHours / 24)} ngày trước`;
                                        }
                                        
                                        return ''; // Bỏ dòng trạng thái nếu không có hoạt động thật
                                    };

                                    return (
                                        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:bg-[#0f1016] p-1 pr-3 rounded-xl transition-colors">
                                            <div className="relative">
                                                <img src={partnerAvatar || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" alt=""/>
                                                {isUserOnline(partnerId) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#1a1b26] rounded-full"></div>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[15px] text-slate-900 dark:text-slate-100 leading-tight">{partnerName}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{getLastActive()}</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            {/* 3 Icons removed */}
                        </div>

                        {/* Messages List */}
                        <div 
                            ref={messagesContainerRef}
                            className="flex-1 overflow-y-auto p-4 space-y-1 bg-transparent"
                        >
                            {/* Partner Profile Header in Chat */}
                            {selectedConvId && (
                                <div className="flex flex-col items-center justify-center py-8 mb-4">
                                    {(() => {
                                        let pName = '';
                                        let pAvatar = '';
                                        if (selectedConvId === 'new' && tempPartner) {
                                            pName = tempPartner.username;
                                            pAvatar = tempPartner.avatar || '';
                                        } else {
                                            const activeConv = conversations.find(c => c.id === selectedConvId);
                                            if (activeConv) {
                                                const p = getPartnerInfo(activeConv);
                                                pName = p.username;
                                                pAvatar = p.avatar;
                                            }
                                        }
                                        return (
                                            <>
                                                <img src={pAvatar || 'https://via.placeholder.com/100'} className="w-24 h-24 rounded-full object-cover mb-3" alt=""/>
                                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{pName}</h2>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Các bạn là bạn bè trên BetoBook</p>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {messages.map((msg, index) => {
                                const isMe = msg.senderId === currentUser?.id;
                                const prevMsg = index > 0 ? messages[index - 1] : null;
                                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                                
                                const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
                                const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
                                
                                // Time gap logic (show time if > 10 mins difference)
                                const showTime = !prevMsg || (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 10 * 60 * 1000);

                                const timeObj = new Date(msg.createdAt);
                                const timeString = timeObj.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
                                const dateString = formatDate(msg.createdAt);
                                
                                return (
                                    <React.Fragment key={msg.id}>
                                        {showTime && (
                                            <div className="flex justify-center my-6">
                                                <span className="text-[11px] bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold px-3 py-1 rounded-full backdrop-blur-md">
                                                    {dateString} {timeString}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex group/msg ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-1'} animate-fadeIn`}>
                                            {!isMe && (
                                                <div className="w-8 flex-shrink-0 mr-2 flex items-end">
                                                    {isLastInGroup && (
                                                        <img 
                                                            src={getPartnerInfo(conversations.find(c => c.id === selectedConvId)!).avatar || 'https://via.placeholder.com/30'} 
                                                            className="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200 dark:border-slate-800" 
                                                            alt=""
                                                        />
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Timestamp for Me (left of bubble, visible on hover) */}
                                            {isMe && (
                                                <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-end mr-2 pb-1 text-[10px] text-slate-400">
                                                    {timeString}
                                                </div>
                                            )}

                                            <div 
                                                className={`relative max-w-[70%] text-[15px] leading-relaxed shadow-sm ${
                                                    msg.content.startsWith('[Image]') ? 'bg-transparent p-0 shadow-none' : 'px-4 py-2.5'
                                                } ${
                                                    isMe 
                                                    ? (msg.content.startsWith('[Image]') ? '' : 'bg-gradient-to-br from-teal-400 via-indigo-500 to-purple-600 text-white shadow-purple-500/20')
                                                    : (msg.content.startsWith('[Image]') ? '' : 'bg-white/90 dark:bg-[#1a1b26]/90 backdrop-blur-xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-black/5')
                                                } ${
                                                    msg.content.startsWith('[Image]') ? '' 
                                                    : isMe
                                                        ? `rounded-2xl ${isLastInGroup ? 'rounded-br-[4px]' : ''}`
                                                        : `rounded-2xl ${isLastInGroup ? 'rounded-bl-[4px]' : ''}`
                                                }`}
                                            >
                                                {renderMessageContent(msg.content)}
                                                
                                                {/* In-bubble Timestamp for Partner */}
                                                {!isMe && !msg.content.startsWith('[Image]') && (
                                                    <span className="float-right text-[10px] opacity-50 ml-3 mt-2 pointer-events-none">
                                                        {timeString}
                                                    </span>
                                                )}
                                                {/* In-bubble Timestamp for Me */}
                                                {isMe && !msg.content.startsWith('[Image]') && (
                                                    <span className="float-right text-[10px] opacity-70 ml-3 mt-2 pointer-events-none font-medium text-white">
                                                        {timeString}
                                                        <CheckCircle className="inline-block w-[10px] h-[10px] ml-1 mb-[2px]" />
                                                    </span>
                                                )}
                                            </div>

                                            {/* Timestamp for Partner (right of bubble, visible on hover) */}
                                            {!isMe && (
                                                <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-end ml-2 pb-1 text-[10px] text-slate-400">
                                                    {timeString}
                                                </div>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-4 bg-white/60 dark:bg-[#1a1b26]/60 backdrop-blur-md border-t border-purple-100/50 dark:border-purple-900/50 relative">
                            {showEmojiPicker && (
                                <div className="absolute bottom-full right-4 mb-2 bg-white dark:bg-[#1a1b26] border border-slate-200 dark:border-slate-800 shadow-lg rounded-xl p-3 w-64 z-50">
                                    <div className="grid grid-cols-5 gap-2">
                                        {EMOJIS.map(emoji => (
                                            <button 
                                                key={emoji} 
                                                type="button"
                                                onClick={() => {
                                                    setMsgContent(prev => prev + emoji);
                                                }}
                                                className="text-2xl hover:bg-slate-100 dark:bg-slate-800 p-1 rounded transition-colors"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-end gap-2 max-w-4xl mx-auto">
                                <div className="flex gap-1 pb-1 text-slate-500 relative">
                                    <label className={`p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer ${uploadingImage ? 'opacity-50 pointer-events-none' : 'hover:text-primary'}`}>
                                        {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6"/>}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                    </label>
                                </div>
                                <div className="flex-1 relative bg-slate-100 dark:bg-[#0f1016] border border-transparent focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/20 rounded-3xl flex items-end shadow-sm transition-all overflow-hidden">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="p-3 text-slate-400 hover:text-yellow-500 transition-colors flex-shrink-0"
                                    >
                                        <Smile className="w-6 h-6"/>
                                    </button>
                                    <textarea 
                                        rows={1}
                                        value={msgContent}
                                        onChange={(e) => {
                                            setMsgContent(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend(e);
                                            }
                                        }}
                                        placeholder="Nhập tin nhắn..."
                                        className="w-full bg-transparent text-slate-900 dark:text-slate-100 max-h-32 resize-none py-3.5 pr-4 focus:outline-none scrollbar-hide text-[15px]"
                                        style={{ minHeight: '52px' }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!msgContent.trim() || sending}
                                    className="p-3.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-full hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:hover:shadow-none transition-all flex-shrink-0 mb-0.5"
                                >
                                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5"/>}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 bg-white/40 dark:bg-[#1a1b26]/40">
                        <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                            <MessageSquare className="w-10 h-10 text-primary opacity-60"/>
                        </div>
                        <p className="text-lg font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">Chọn một cuộc trò chuyện để bắt đầu</p>
                    </div>
                )}
            </div>
        </div>
    );
};
