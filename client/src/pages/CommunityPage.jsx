import { useState, useEffect, useRef, useCallback } from "react";
import { 
  MdSearch, 
  MdPersonAdd, 
  MdCheck, 
  MdClose, 
  MdChat, 
  MdPeople,
  MdPersonSearch,
  MdNotifications,
  MdSend,
  MdAttachFile,
  MdMoreVert,
  MdDelete,
  MdVerified,
  MdRefresh,
  MdGroupAdd,
  MdGroup,
  MdExitToApp,
  MdArrowBack,
  MdSettings,
  MdArrowDownward,
  MdPersonRemove,
  MdEdit,
  MdCameraAlt,
  MdWarning,
  MdReply,
  MdPerson,
  MdCalendarToday
} from "react-icons/md";
import { FaCircle } from "react-icons/fa";
import styles from "./CommunityPage.module.css";
import friendService, { formatLastSeen, getDisplayName, getInitials } from "../services/friendService";
import chatService, { formatMessageTime, formatConversationTime, isImageFile, getFileIcon, formatFileSize } from "../services/chatService";
import socketService from "../services/socketService";
import authService from "../services/authService";
import groupService from "../services/groupService";

const SERVER_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
const avatarUrl = (src) => !src ? null : src.startsWith('http') ? src : `${SERVER_BASE}${src}`;

export default function CommunityPage() {
  const currentUser = authService.getUser();
  const [activeTab, setActiveTab] = useState('friends');
  
  // Data states
  const [friends, setFriends] = useState([]);
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatSearch, setChatSearch] = useState('');

  // Chat states
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [attachmentFile, setAttachmentFile] = useState(null);

  // Group chat states
  const [groups, setGroups] = useState([]);
  const [selectedGroupChat, setSelectedGroupChat] = useState(null);
  const [chatSubTab, setChatSubTab] = useState('dms');
  const [groupMessages, setGroupMessages] = useState([]);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembersForGroup, setSelectedMembersForGroup] = useState([]);

  // Group settings states
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [settingsGroupName, setSettingsGroupName] = useState('');
  const [settingsIconFile, setSettingsIconFile] = useState(null);
  const [settingsIconPreview, setSettingsIconPreview] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsAddMemberQuery, setSettingsAddMemberQuery] = useState('');

  // Confirm modal state (replaces browser confirm())
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }

  // Reply and reactions
  const [replyingTo, setReplyingTo] = useState(null); // { _id, content, sender }
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null); // which msg has picker open

  // Scroll-to-bottom button
  const [showScrollDown, setShowScrollDown] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const groupIconInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedChatRef = useRef(null);
  const selectedGroupChatRef = useRef(null);

  // Keep selectedChatRef in sync with selectedChat state
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    selectedGroupChatRef.current = selectedGroupChat;
  }, [selectedGroupChat]);

  // Scroll-to-bottom detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 120);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedChat, selectedGroupChat]);

  // Helper: dispatch a toast notification
  const dispatchToast = useCallback((message, type = 'default') => {
    window.dispatchEvent(new CustomEvent('mindora:newNotification', {
      detail: { title: message, type }
    }));
  }, []);

  // Helper: open confirm modal
  const openConfirm = useCallback((title, message, onConfirm) => {
    setConfirmModal({ title, message, onConfirm });
  }, []);

  // Helper: get date label for message date separators
  const getDateLabel = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  // Helper: inject date separators into messages array
  const withDateSeparators = (msgs) => {
    const result = [];
    let lastLabel = null;
    msgs.forEach(msg => {
      const label = getDateLabel(msg.createdAt);
      if (label !== lastLabel) {
        result.push({ _id: `sep-${msg._id}`, type: 'separator', label });
        lastLabel = label;
      }
      result.push(msg);
    });
    return result;
  };

  // Initialize socket and fetch initial data
  useEffect(() => {
    const socket = socketService.connect();
    fetchInitialData();

    // Clear message unread badge when user opens community page
    window.dispatchEvent(new CustomEvent('mindora:messagesRead'));

    // Socket listeners with refs to get latest state
    socketService.onNewMessage((message) => {
      const currentChat = selectedChatRef.current;
      console.log('📩 New message received:', message);
      
      if (currentChat && 
          (message.sender._id === currentChat._id || message.receiver._id === currentChat._id)) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        chatService.markAsRead(currentChat._id);
      } else {
        setUnreadCount(prev => prev + 1);
      }
      fetchConversations();
    });

    socketService.onMessageDeleted(({ messageId }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m
      ));
    });

    socketService.onMessagesRead(({ readBy }) => {
      const currentChat = selectedChatRef.current;
      if (currentChat?._id === readBy) {
        setMessages(prev => prev.map(m => ({ ...m, read: true })));
      }
    });

    socketService.onUserTyping(({ senderId, senderName }) => {
      setTypingUsers(prev => ({ ...prev, [senderId]: senderName }));
    });

    socketService.onUserStopTyping(({ senderId }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        delete updated[senderId];
        return updated;
      });
    });

    socketService.onPresenceUpdate(({ userId, isOnline, lastSeen }) => {
      setFriends(prev => prev.map(f => 
        f.user._id === userId ? { ...f, user: { ...f.user, isOnline, lastSeen } } : f
      ));
      
      const currentChat = selectedChatRef.current;
      if (currentChat?._id === userId) {
        setSelectedChat(prev => prev ? { ...prev, isOnline, lastSeen } : null);
      }
    });

    socketService.onFriendRemoved(({ userId, displayName }) => {
      // Remove from friends list
      setFriends(prev => prev.filter(f => f.user._id !== userId));
      
      // If currently chatting with this user, close the chat
      const currentChat = selectedChatRef.current;
      if (currentChat?._id === userId) {
        setSelectedChat(null);
        setMessages([]);
        window.dispatchEvent(new CustomEvent('mindora:newNotification', {
          detail: { title: `${displayName} has removed you from their friends list.`, type: 'social' }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('mindora:newNotification', {
          detail: { title: `${displayName} has removed you from their friends list.`, type: 'social' }
        }));
      }
      
      // Refresh conversations to remove this chat
      fetchConversations();
    });

    // Group socket listeners
    socketService.onNewGroupMessage(({ groupId, message }) => {
      const currentGroup = selectedGroupChatRef.current;
      if (currentGroup?._id === groupId) {
        setGroupMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
      fetchGroups();
    });

    socketService.onGroupJoined(() => {
      fetchGroups();
    });

    socketService.onGroupLeft(({ groupId }) => {
      const currentGroup = selectedGroupChatRef.current;
      if (currentGroup?._id === groupId) {
        setSelectedGroupChat(null);
        setGroupMessages([]);
      }
      fetchGroups();
    });

    socketService.onGroupUpdated(({ group }) => {
      setGroups(prev => prev.map(g => g._id === group._id ? group : g));
      const currentGroup = selectedGroupChatRef.current;
      if (currentGroup?._id === group._id) {
        setSelectedGroupChat(group);
      }
    });

    // Reaction socket listeners
    socketService.on('message_reaction', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions } : m
      ));
    });

    socketService.on('group_message_reaction', ({ messageId, reactions }) => {
      setGroupMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions } : m
      ));
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchFriends(),
        fetchPendingRequests(),
        fetchConversations(),
        fetchGroups(),
        fetchUnreadCount()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await friendService.getFriends();
      setFriends(response.data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchDiscoverUsers = async (search = '') => {
    try {
      const response = await friendService.discoverUsers({ search, limit: 20 });
      setDiscoverUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching discover users:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const [pending, sent] = await Promise.all([
        friendService.getPendingRequests(),
        friendService.getSentRequests()
      ]);
      setPendingRequests(pending.data || []);
      setSentRequests(sent.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await chatService.getConversations();
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await groupService.getMyGroups();
      setGroups(response.data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await chatService.getUnreadCount();
      setUnreadCount(response.data?.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Friend actions
  const handleSendFriendRequest = async (userId) => {
    if (!authService.isFullyVerified()) {
      dispatchToast('Verify your account to add friends.', 'default');
      return;
    }
    try {
      await friendService.sendFriendRequest(userId);
      fetchDiscoverUsers(searchQuery);
      fetchPendingRequests();
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    try {
      await friendService.acceptFriendRequest(friendshipId);
      fetchFriends();
      fetchPendingRequests();
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
  };

  const handleDeclineRequest = async (friendshipId) => {
    try {
      await friendService.declineFriendRequest(friendshipId);
      fetchPendingRequests();
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
  };

  const handleCancelRequest = async (friendshipId) => {
    try {
      await friendService.cancelFriendRequest(friendshipId);
      fetchPendingRequests();
      fetchDiscoverUsers(searchQuery);
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
  };

  const handleUnfriend = async (userId) => {
    openConfirm('Unfriend', 'Are you sure you want to unfriend this user?', async () => {
      try {
        await friendService.unfriend(userId);
        fetchFriends();
      } catch (error) {
        dispatchToast(error.message, 'default');
      }
    });
  };

  // Group actions
  const openGroupChat = async (group) => {
    setSelectedGroupChat(group);
    setSelectedChat(null);
    setActiveTab('chat');
    setChatSubTab('groups');
    setChatLoading(true);
    try {
      const response = await groupService.getGroupMessages(group._id);
      setGroupMessages(response.data || []);
    } catch (error) {
      console.error('Error loading group chat:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendGroupMessage = async (e) => {
    e.preventDefault();
    if ((!messageInput.trim() && !attachmentFile) || !selectedGroupChat) return;
    const replyId = replyingTo?._id || null;
    setReplyingTo(null);
    try {
      let response;
      if (attachmentFile) {
        response = await groupService.sendGroupMessageWithAttachment(
          selectedGroupChat._id, messageInput, attachmentFile, replyId
        );
        setAttachmentFile(null);
      } else {
        response = await groupService.sendGroupMessage(selectedGroupChat._id, messageInput, replyId);
      }
      setGroupMessages(prev => {
        if (prev.some(m => m._id === response.data._id)) return prev;
        return [...prev, response.data];
      });
      setMessageInput('');
      fetchGroups();
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedMembersForGroup.length === 0) return;
    try {
      await groupService.createGroup(newGroupName.trim(), selectedMembersForGroup);
      setShowNewGroupModal(false);
      setNewGroupName('');
      setSelectedMembersForGroup([]);
      fetchGroups();
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
  };

  const handleLeaveGroup = async (groupId) => {
    openConfirm('Leave Group', 'Are you sure you want to leave this group?', async () => {
      try {
        await groupService.leaveGroup(groupId);
        setSelectedGroupChat(null);
        setGroupMessages([]);
        fetchGroups();
      } catch (error) {
        dispatchToast(error.message, 'default');
      }
    });
  };

  const handleUpdateGroup = async () => {
    if (!settingsGroupName.trim() && !settingsIconFile) return;
    setSettingsLoading(true);
    try {
      const response = await groupService.updateGroupWithIcon(
        selectedGroupChat._id,
        settingsGroupName.trim() || selectedGroupChat.name,
        settingsIconFile
      );
      setSelectedGroupChat(response.data);
      setGroups(prev => prev.map(g => g._id === response.data._id ? response.data : g));
      setShowGroupSettings(false);
      setSettingsIconFile(null);
      setSettingsIconPreview(null);
    } catch (error) {
      dispatchToast(error.message, 'default');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleRemoveMember = async (userId, displayName) => {
    openConfirm('Remove Member', `Remove ${displayName} from the group?`, async () => {
      try {
        await groupService.removeMember(selectedGroupChat._id, userId);
      } catch (error) {
        dispatchToast(error.message, 'default');
      }
    });
  };

  const handleAddMember = async (userId) => {
    try {
      await groupService.addMember(selectedGroupChat._id, userId);
      fetchGroups();
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
  };

  const openGroupSettings = () => {
    setSettingsGroupName(selectedGroupChat.name);
    setSettingsIconFile(null);
    setSettingsIconPreview(selectedGroupChat.icon ? `http://localhost:5000${selectedGroupChat.icon}` : null);
    setSettingsAddMemberQuery('');
    setShowGroupSettings(true);
  };

  const handleSettingsIconChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSettingsIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSettingsIconPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const toggleMemberForGroup = (userId) => {
    setSelectedMembersForGroup(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Chat actions
  const openChat = async (user) => {
    setSelectedChat(user);
    setActiveTab('chat');
    setChatLoading(true);
    
    try {
      const response = await chatService.getConversation(user._id);
      setMessages(response.data || []);
      await chatService.markAsRead(user._id);
      fetchUnreadCount();
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageInput.trim() && !attachmentFile) || !selectedChat) return;

    try {
      let response;
      if (attachmentFile) {
        response = await chatService.sendMessageWithAttachment(
          selectedChat._id, 
          messageInput, 
          attachmentFile,
          replyingTo?._id || null
        );
        setAttachmentFile(null);
      } else {
        response = await chatService.sendMessage(selectedChat._id, messageInput, replyingTo?._id || null);
      }
      setReplyingTo(null);
      
      setMessages(prev => {
        if (prev.some(m => m._id === response.data._id)) return prev;
        return [...prev, response.data];
      });
      setMessageInput('');
      fetchConversations();
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
  };

  const handleTyping = () => {
    if (!selectedChat) return;
    
    socketService.emitTyping(selectedChat._id);
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.emitStopTyping(selectedChat._id);
    }, 2000);
  };

  const handleDeleteMessage = async (messageId, forEveryone = false) => {
    try {
      if (forEveryone) {
        await chatService.deleteMessageForEveryone(messageId);
        setMessages(prev => prev.map(m => 
          m._id === messageId ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m
        ));
      } else {
        await chatService.deleteMessageForSelf(messageId);
        setMessages(prev => prev.filter(m => m._id !== messageId));
      }
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
  };

  const handleToggleDmReaction = async (messageId, emoji) => {
    try {
      const res = await chatService.toggleReaction(messageId, emoji);
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions: res.data } : m
      ));
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
    setReactionPickerMsgId(null);
  };

  const handleToggleGroupReaction = async (messageId, emoji) => {
    try {
      const res = await groupService.toggleGroupReaction(messageId, emoji);
      setGroupMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions: res.data } : m
      ));
    } catch (error) {
      dispatchToast(error.message, 'default');
    }
    setReactionPickerMsgId(null);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab === 'discover') {
      fetchDiscoverUsers(searchQuery);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setChatSearch('');
    if (tab === 'discover') {
      fetchDiscoverUsers('');
    }
    if (tab !== 'chat') {
      setSelectedChat(null);
      setSelectedGroupChat(null);
    }
  };

  const totalRequestsCount = pendingRequests.length + sentRequests.length;

  return (
    <>
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <form className={styles.searchContainer} onSubmit={handleSearch}>
          <MdSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={
              activeTab === 'discover' ? "Search users by name or university..." :
              activeTab === 'friends' ? "Search friends..." :
              activeTab === 'requests' ? "Search requests..." :
              "Search..."
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeTab === 'discover') fetchDiscoverUsers(e.target.value);
            }}
          />
        </form>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'friends' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('friends')}
        >
          <MdPeople size={18} />
          Friends
          <span className={styles.tabBadge}>{friends.length}</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'discover' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('discover')}
        >
          <MdPersonSearch size={18} />
          Discover
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'requests' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('requests')}
        >
          <MdNotifications size={18} />
          Requests
          {totalRequestsCount > 0 && (
            <span className={styles.tabBadgeAlert}>{totalRequestsCount}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'chat' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('chat')}
        >
          <MdChat size={18} />
          Chat
          {unreadCount > 0 && (
            <span className={styles.tabBadgeAlert}>{unreadCount}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className={styles.friendsGrid}>
                {friends.length === 0 ? (
                  <div className={styles.emptyState}>
                    <MdPeople size={48} />
                    <h3>No friends yet</h3>
                    <p>Start discovering people and send friend requests!</p>
                    <button 
                      className={styles.primaryButton}
                      onClick={() => handleTabChange('discover')}
                    >
                      Discover People
                    </button>
                  </div>
                ) : (
                  friends
                    .filter(({ user }) => !searchQuery || getDisplayName(user).toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(({ user }) => (
                      <FriendCard
                        key={user._id}
                        user={user}
                        onMessage={() => openChat(user)}
                        onUnfriend={() => handleUnfriend(user._id)}
                      />
                    ))
                )}
              </div>
            )}

            {/* Discover Tab */}
            {activeTab === 'discover' && (
              <div className={styles.friendsGrid}>
                {discoverUsers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <MdPersonSearch size={48} />
                    <h3>No users found</h3>
                    <p>Try searching with different keywords</p>
                  </div>
                ) : (
                  discoverUsers.map((user) => (
                    <DiscoverCard
                      key={user._id}
                      user={user}
                      onSendRequest={() => handleSendFriendRequest(user._id)}
                      onCancelRequest={() => handleCancelRequest(user.friendshipId)}
                    />
                  ))
                )}
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className={styles.requestsContainer}>
                <section className={styles.requestsSection}>
                  <h3 className={styles.sectionTitle}>
                    Received Requests
                    {pendingRequests.length > 0 && (
                      <span className={styles.countBadge}>{pendingRequests.length}</span>
                    )}
                  </h3>
                  {pendingRequests.length === 0 ? (
                    <p className={styles.emptyText}>No pending requests</p>
                  ) : (
                    <div className={styles.requestsList}>
                      {pendingRequests
                        .filter(r => !searchQuery || getDisplayName(r.requester).toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((request) => (
                          <RequestCard
                            key={request._id}
                            user={request.requester}
                            type="received"
                            onAccept={() => handleAcceptRequest(request._id)}
                            onDecline={() => handleDeclineRequest(request._id)}
                          />
                        ))}
                    </div>
                  )}
                </section>

                <section className={styles.requestsSection}>
                  <h3 className={styles.sectionTitle}>
                    Sent Requests
                    {sentRequests.length > 0 && (
                      <span className={styles.countBadge}>{sentRequests.length}</span>
                    )}
                  </h3>
                  {sentRequests.length === 0 ? (
                    <p className={styles.emptyText}>No sent requests</p>
                  ) : (
                    <div className={styles.requestsList}>
                      {sentRequests
                        .filter(r => !searchQuery || getDisplayName(r.recipient).toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((request) => (
                          <RequestCard
                            key={request._id}
                            user={request.recipient}
                            type="sent"
                            onCancel={() => handleCancelRequest(request._id)}
                          />
                        ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className={`${styles.chatContainer}${(selectedChat || selectedGroupChat) ? ` ${styles.chatContainerOpen}` : ''}`}>
                {/* Sidebar: sub-tab toggle + list */}
                <div className={styles.conversationsList}>
                  <div className={styles.chatSubTabs}>
                    <button
                      className={`${styles.chatSubTab} ${chatSubTab === 'dms' ? styles.chatSubTabActive : ''}`}
                      onClick={() => { setChatSubTab('dms'); setChatSearch(''); }}
                    >
                      DMs
                    </button>
                    <div className={styles.chatSubTabDivider} />
                    <button
                      className={`${styles.chatSubTab} ${chatSubTab === 'groups' ? styles.chatSubTabActive : ''}`}
                      onClick={() => { setChatSubTab('groups'); setChatSearch(''); }}
                    >
                      Groups
                    </button>
                  </div>

                  {chatSubTab === 'dms' ? (
                    <>
                      <div className={styles.conversationsHeader}>
                        <h3>Messages</h3>
                        <button className={styles.refreshBtn} onClick={fetchConversations}>
                          <MdRefresh size={18} />
                        </button>
                      </div>
                      <div className={styles.sidebarSearchWrap}>
                        <MdSearch className={styles.sidebarSearchIcon} />
                        <input
                          className={styles.sidebarSearchInput}
                          placeholder="Search conversations..."
                          value={chatSearch}
                          onChange={e => setChatSearch(e.target.value)}
                        />
                        {chatSearch && (
                          <button className={styles.sidebarSearchClear} onClick={() => setChatSearch('')}>
                            <MdClose size={14} />
                          </button>
                        )}
                      </div>
                      {conversations.length === 0 ? (
                        <div className={styles.emptyConversations}>
                          <p>No conversations yet</p>
                          <small>Message a friend to start chatting</small>
                        </div>
                      ) : (
                        conversations
                          .filter(conv => !chatSearch || getDisplayName(conv.otherUser).toLowerCase().includes(chatSearch.toLowerCase()))
                          .map((conv) => (
                          <div
                            key={conv.conversationId}
                            className={`${styles.conversationItem} ${
                              selectedChat?._id === conv.otherUser._id ? styles.conversationActive : ''
                            }`}
                            onClick={() => { openChat(conv.otherUser); setSelectedGroupChat(null); }}
                          >
                            <div className={styles.conversationAvatar}>
                              {conv.otherUser.profile?.avatar ? (
                                <img src={avatarUrl(conv.otherUser.profile.avatar)} alt="" />
                              ) : (
                                <span>{getInitials(conv.otherUser)}</span>
                              )}
                              {conv.otherUser.isOnline && <span className={styles.onlineDot}></span>}
                            </div>
                            <div className={styles.conversationInfo}>
                              <div className={styles.conversationTop}>
                                <span className={styles.conversationName}>
                                  {getDisplayName(conv.otherUser)}
                                  {conv.otherUser?.profile?.idPhoto?.verified === true && (
                                    <MdVerified style={{ color: '#0073a0', fontSize: '0.85rem', marginLeft: '3px', verticalAlign: 'middle', flexShrink: 0 }} />
                                  )}
                                </span>
                                <span className={styles.conversationTime}>
                                  {formatConversationTime(conv.lastMessage.createdAt)}
                                </span>
                              </div>
                              <p className={styles.conversationPreview}>
                                {conv.lastMessage.attachment ? '📎 Attachment' : conv.lastMessage.content}
                              </p>
                            </div>
                            {conv.unreadCount > 0 && (
                              <span className={styles.unreadBadge}>{conv.unreadCount}</span>
                            )}
                          </div>
                        ))
                      )}
                    </>
                  ) : (
                    <>
                      <div className={styles.conversationsHeader}>
                        <h3>Groups</h3>
                        <button className={styles.refreshBtn} onClick={() => setShowNewGroupModal(true)} title="New Group">
                          <MdGroupAdd size={18} />
                        </button>
                      </div>
                      <div className={styles.sidebarSearchWrap}>
                        <MdSearch className={styles.sidebarSearchIcon} />
                        <input
                          className={styles.sidebarSearchInput}
                          placeholder="Search groups..."
                          value={chatSearch}
                          onChange={e => setChatSearch(e.target.value)}
                        />
                        {chatSearch && (
                          <button className={styles.sidebarSearchClear} onClick={() => setChatSearch('')}>
                            <MdClose size={14} />
                          </button>
                        )}
                      </div>
                      {groups.length === 0 ? (
                        <div className={styles.emptyConversations}>
                          <p>No groups yet</p>
                          <button className={styles.newGroupBtn} onClick={() => setShowNewGroupModal(true)}>
                            <MdGroupAdd size={14} /> Create Group
                          </button>
                        </div>
                      ) : (
                        groups
                          .filter(g => !chatSearch || g.name.toLowerCase().includes(chatSearch.toLowerCase()))
                          .map((group) => (
                          <div
                            key={group._id}
                            className={`${styles.conversationItem} ${
                              selectedGroupChat?._id === group._id ? styles.conversationActive : ''
                            }`}
                            onClick={() => { openGroupChat(group); setSelectedChat(null); }}
                          >
                            <div className={`${styles.conversationAvatar} ${styles.groupAvatarThumb}`}>
                              {group.icon ? (
                                <img src={`http://localhost:5000${group.icon}`} alt={group.name} />
                              ) : (
                                <MdGroup size={18} />
                              )}
                            </div>
                            <div className={styles.conversationInfo}>
                              <div className={styles.conversationTop}>
                                <span className={styles.conversationName}>{group.name}</span>
                                <span className={styles.conversationTime}>
                                  {formatConversationTime(group.lastMessageAt)}
                                </span>
                              </div>
                              <p className={styles.conversationPreview}>
                                {group.lastMessagePreview || `${group.members.length} members`}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>

                {/* Chat Window */}
                <div className={styles.chatWindow}>
                  {!selectedChat && !selectedGroupChat ? (
                    <div className={styles.noChatSelected}>
                      <MdChat size={64} />
                      <h3>Select a conversation</h3>
                      <p>Choose a DM or group to start messaging</p>
                    </div>
                  ) : selectedChat ? (
                    /* DM Window */
                    <>
                      <div className={styles.chatHeader}>
                        <button
                          className={styles.chatBackBtn}
                          onClick={() => setSelectedChat(null)}
                          aria-label="Back to conversations"
                        >
                          <MdArrowBack size={20} />
                        </button>
                        <div className={styles.chatHeaderInfo}>
                          <div className={styles.chatAvatar}>
                            {selectedChat.profile?.avatar ? (
                              <img src={avatarUrl(selectedChat.profile.avatar)} alt="" />
                            ) : (
                              <span>{getInitials(selectedChat)}</span>
                            )}
                          </div>
                          <div>
                            <h4 style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {getDisplayName(selectedChat)}
                              {selectedChat?.profile?.idPhoto?.verified === true && (
                                <MdVerified style={{ color: '#0073a0', fontSize: '1rem', flexShrink: 0 }} />
                              )}
                            </h4>
                            <p className={styles.chatStatus}>
                              {selectedChat.isOnline ? (
                                <><FaCircle className={styles.onlineIndicator} /> Online</>
                              ) : (
                                `Last seen ${formatLastSeen(selectedChat.lastSeen)}`
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={styles.messagesWrapper}>
                        <div className={styles.messagesContainer} ref={messagesContainerRef}>
                          {chatLoading ? (
                            <div className={styles.loadingMessages}>
                              <div className={styles.spinner}></div>
                            </div>
                          ) : (
                            <>
                              {withDateSeparators(messages).map((item) =>
                                item.type === 'separator' ? (
                                  <div key={item._id} className={styles.dateSeparator}>
                                    <span>{item.label}</span>
                                  </div>
                                ) : (
                                  <MessageBubble
                                    key={item._id}
                                    message={item}
                                    isOwn={item.sender._id === currentUser?.id || item.sender._id === currentUser?._id}
                                    onDelete={handleDeleteMessage}
                                    onReply={setReplyingTo}
                                    onReact={handleToggleDmReaction}
                                    showPicker={reactionPickerMsgId === item._id}
                                    onShowPicker={setReactionPickerMsgId}
                                    onHidePicker={() => setReactionPickerMsgId(null)}
                                  />
                                )
                              )}
                              {typingUsers[selectedChat._id] && (
                                <div className={styles.typingIndicator}>
                                  {typingUsers[selectedChat._id]} is typing...
                                </div>
                              )}
                              <div ref={messagesEndRef} />
                            </>
                          )}
                        </div>
                        {showScrollDown && (
                          <button
                            className={styles.scrollDownBtn}
                            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            aria-label="Scroll to bottom"
                          >
                            <MdArrowDownward size={18} />
                          </button>
                        )}
                      </div>

                      <form className={styles.messageForm} onSubmit={handleSendMessage}>
                        {!authService.isFullyVerified() && (
                          <div className={styles.msgVerifyBanner}>
                            <MdVerified size={15} /> Verify your account to send messages.{' '}
                            <a href="/app/profile">Get verified →</a>
                          </div>
                        )}
                        {replyingTo && (
                          <div className={styles.replyPreview}>
                            <div className={styles.replyPreviewBar} />
                            <div className={styles.replyPreviewContent}>
                              <span className={styles.replyPreviewLabel}>Replying to {replyingTo.sender?.profile?.firstName || replyingTo.sender?.username || 'message'}</span>
                              <span className={styles.replyPreviewText}>
                                {replyingTo.attachment && !replyingTo.content ? '📎 Attachment' : replyingTo.content}
                              </span>
                            </div>
                            <button type="button" className={styles.replyPreviewClose} onClick={() => setReplyingTo(null)}>
                              <MdClose size={16} />
                            </button>
                          </div>
                        )}
                        {attachmentFile && (
                          <div className={styles.attachmentPreview}>
                            <span>{attachmentFile.name}</span>
                            <button type="button" onClick={() => setAttachmentFile(null)}>
                              <MdClose />
                            </button>
                          </div>
                        )}
                        <div className={styles.messageInputRow}>
                          <button
                            type="button"
                            className={styles.attachButton}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <MdAttachFile size={20} />
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            onChange={(e) => setAttachmentFile(e.target.files[0])}
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                          />
                          <input
                            className={styles.messageInput}
                            placeholder={authService.isFullyVerified() ? "Type a message..." : "Verify account to message"}
                            value={messageInput}
                            onChange={(e) => {
                              setMessageInput(e.target.value);
                              handleTyping();
                            }}
                            maxLength={2000}
                            disabled={!authService.isFullyVerified()}
                          />
                          <button
                            type="submit"
                            className={styles.sendButton}
                            disabled={!authService.isFullyVerified() || (!messageInput.trim() && !attachmentFile)}
                          >
                            <MdSend size={20} />
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    /* Group Chat Window */
                    <>
                      <div className={styles.chatHeader}>
                        <button
                          className={styles.chatBackBtn}
                          onClick={() => setSelectedGroupChat(null)}
                          aria-label="Back to conversations"
                        >
                          <MdArrowBack size={20} />
                        </button>
                        <div
                          className={`${styles.chatHeaderInfo} ${styles.chatHeaderInfoClickable}`}
                          onClick={openGroupSettings}
                          title="View group info"
                        >
                          <div className={`${styles.chatAvatar} ${styles.groupAvatar}`}>
                            {selectedGroupChat.icon ? (
                              <img src={`http://localhost:5000${selectedGroupChat.icon}`} alt={selectedGroupChat.name} />
                            ) : (
                              <MdGroup size={22} />
                            )}
                          </div>
                          <div>
                            <h4>{selectedGroupChat.name}</h4>
                            <p className={styles.chatStatus}>
                              {selectedGroupChat.members.length} members
                            </p>
                          </div>
                        </div>
                        <div className={styles.groupHeaderActions}>
                          <button
                            className={styles.leaveGroupBtn}
                            onClick={() => handleLeaveGroup(selectedGroupChat._id)}
                            title="Leave group"
                          >
                            <MdExitToApp size={20} />
                          </button>
                        </div>
                      </div>

                      <div className={styles.messagesWrapper}>
                        <div className={styles.messagesContainer} ref={messagesContainerRef}>
                          {chatLoading ? (
                            <div className={styles.loadingMessages}>
                              <div className={styles.spinner}></div>
                            </div>
                          ) : (
                            <>
                              {withDateSeparators(groupMessages).map((item) =>
                                item.type === 'separator' ? (
                                  <div key={item._id} className={styles.dateSeparator}>
                                    <span>{item.label}</span>
                                  </div>
                                ) : (
                                  <GroupMessageBubble
                                    key={item._id}
                                    message={item}
                                    isOwn={item.sender._id === currentUser?.id || item.sender._id === currentUser?._id}
                                    onReply={setReplyingTo}
                                    onReact={handleToggleGroupReaction}
                                    showPicker={reactionPickerMsgId === item._id}
                                    onShowPicker={setReactionPickerMsgId}
                                    onHidePicker={() => setReactionPickerMsgId(null)}
                                  />
                                )
                              )}
                              <div ref={messagesEndRef} />
                            </>
                          )}
                        </div>
                        {showScrollDown && (
                          <button
                            className={styles.scrollDownBtn}
                            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            aria-label="Scroll to bottom"
                          >
                            <MdArrowDownward size={18} />
                          </button>
                        )}
                      </div>

                      <form className={styles.messageForm} onSubmit={handleSendGroupMessage}>
                        {replyingTo && (
                          <div className={styles.replyPreview}>
                            <div className={styles.replyPreviewBar} />
                            <div className={styles.replyPreviewContent}>
                              <span className={styles.replyPreviewLabel}>Replying to {replyingTo.sender?.profile?.firstName || replyingTo.sender?.username || 'message'}</span>
                              <span className={styles.replyPreviewText}>
                                {replyingTo.attachment && !replyingTo.content ? '📎 Attachment' : replyingTo.content}
                              </span>
                            </div>
                            <button type="button" className={styles.replyPreviewClose} onClick={() => setReplyingTo(null)}>
                              <MdClose size={16} />
                            </button>
                          </div>
                        )}
                        {attachmentFile && (
                          <div className={styles.attachmentPreview}>
                            <span>{attachmentFile.name}</span>
                            <button type="button" onClick={() => setAttachmentFile(null)}>
                              <MdClose />
                            </button>
                          </div>
                        )}
                        <div className={styles.messageInputRow}>
                          <button
                            type="button"
                            className={styles.attachButton}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <MdAttachFile size={20} />
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            onChange={(e) => setAttachmentFile(e.target.files[0])}
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                          />
                          <input
                            className={styles.messageInput}
                            placeholder={`Message ${selectedGroupChat.name}...`}
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            maxLength={2000}
                          />
                          <button
                            type="submit"
                            className={styles.sendButton}
                            disabled={!messageInput.trim() && !attachmentFile}
                          >
                            <MdSend size={20} />
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>

      {/* New Group Modal */}
      {showNewGroupModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewGroupModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>New Group</h3>
              <button onClick={() => setShowNewGroupModal(false)}><MdClose /></button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className={styles.modalBody}>
                <label className={styles.modalLabel}>Group Name</label>
                <input
                  className={styles.modalInput}
                  placeholder="Enter group name..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  maxLength={100}
                  required
                />
                <label className={styles.modalLabel}>
                  Add Friends ({selectedMembersForGroup.length} selected)
                </label>
                <div className={styles.membersList}>
                  {friends.length === 0 ? (
                    <p className={styles.emptyText}>No friends to add</p>
                  ) : (
                    friends.map(({ user }) => (
                      <label key={user._id} className={styles.memberItem}>
                        <input
                          type="checkbox"
                          checked={selectedMembersForGroup.includes(user._id)}
                          onChange={() => toggleMemberForGroup(user._id)}
                        />
                        <div className={styles.memberAvatar}>
                          {user.profile?.avatar ? (
                            <img src={avatarUrl(user.profile.avatar)} alt="" />
                          ) : (
                            <span>{getInitials(user)}</span>
                          )}
                        </div>
                        <span>{getDisplayName(user)}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelModalBtn}
                  onClick={() => setShowNewGroupModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.createGroupBtn}
                  disabled={!newGroupName.trim() || selectedMembersForGroup.length === 0}
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Settings Modal */}
      {showGroupSettings && selectedGroupChat && (
        <div className={styles.modalOverlay} onClick={() => setShowGroupSettings(false)}>
          <div className={`${styles.modal} ${styles.groupInfoModal}`} onClick={e => e.stopPropagation()}>
            {/* Group Info Header */}
            {(() => {
              const isAdmin = selectedGroupChat.creator?._id === currentUser?.id
                || selectedGroupChat.creator?._id === currentUser?._id
                || selectedGroupChat.creator === currentUser?.id
                || selectedGroupChat.creator === currentUser?._id;
              const creatorName = selectedGroupChat.creator?.profile?.firstName
                ? `${selectedGroupChat.creator.profile.firstName} ${selectedGroupChat.creator.profile.lastName || ''}`.trim()
                : selectedGroupChat.creator?.username || 'Unknown';
              const createdDate = selectedGroupChat.createdAt
                ? new Date(selectedGroupChat.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                : '';
              return (
                <>
                  {/* Top close */}
                  <button className={styles.groupInfoClose} onClick={() => setShowGroupSettings(false)}><MdClose /></button>

                  {/* Group avatar */}
                  <div className={styles.groupInfoAvatar}>
                    <div
                      className={styles.groupInfoAvatarCircle}
                      onClick={isAdmin ? () => groupIconInputRef.current?.click() : undefined}
                      style={isAdmin ? { cursor: 'pointer' } : {}}
                      title={isAdmin ? 'Change group icon' : ''}
                    >
                      {settingsIconPreview ? (
                        <img src={settingsIconPreview} alt="Group icon" />
                      ) : selectedGroupChat.icon ? (
                        <img src={`http://localhost:5000${selectedGroupChat.icon}`} alt={selectedGroupChat.name} />
                      ) : (
                        <MdGroup size={44} />
                      )}
                      {isAdmin && (
                        <div className={styles.groupIconOverlay}><MdCameraAlt size={18} /></div>
                      )}
                    </div>
                    <input type="file" ref={groupIconInputRef} hidden accept="image/*" onChange={handleSettingsIconChange} />
                    {isAdmin ? (
                      <input
                        className={styles.groupInfoNameInput}
                        value={settingsGroupName}
                        onChange={e => setSettingsGroupName(e.target.value)}
                        maxLength={100}
                        placeholder="Group name..."
                      />
                    ) : (
                      <h3 className={styles.groupInfoName}>{selectedGroupChat.name}</h3>
                    )}
                    <p className={styles.groupInfoMeta}>
                      {selectedGroupChat.members.length} members
                    </p>
                  </div>

                  {/* Created info */}
                  <div className={styles.groupInfoDetails}>
                    <div className={styles.groupInfoDetailRow}>
                      <MdPerson size={16} />
                      <span>Created by <strong>{creatorName}</strong></span>
                    </div>
                    {createdDate && (
                      <div className={styles.groupInfoDetailRow}>
                        <MdCalendarToday size={16} />
                        <span>{createdDate}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.groupInfoDivider} />

                  {/* Members */}
                  <div className={styles.groupInfoSection}>
                    <h4 className={styles.groupInfoSectionTitle}>Members</h4>
                    <div className={styles.membersList}>
                      {selectedGroupChat.members.map(member => {
                        const memberId = member._id || member;
                        const isCreator = selectedGroupChat.creator?._id === memberId || selectedGroupChat.creator === memberId;
                        const isSelf = memberId === currentUser?.id || memberId === currentUser?._id;
                        const name = member.profile?.firstName
                          ? `${member.profile.firstName} ${member.profile.lastName || ''}`.trim()
                          : member.username || memberId;
                        return (
                          <div key={memberId} className={styles.memberItem}>
                            <div className={styles.memberAvatar}>
                              {member.profile?.avatar ? (
                                <img src={avatarUrl(member.profile.avatar)} alt="" />
                              ) : (
                                <span>{name[0]?.toUpperCase()}</span>
                              )}
                            </div>
                            <span className={styles.memberName}>
                              {name}
                              {isCreator && <span className={styles.creatorBadge}>Admin</span>}
                              {isSelf && <span className={styles.selfBadge}>You</span>}
                            </span>
                            {isAdmin && !isCreator && !isSelf && (
                              <button
                                className={styles.removeMemberBtn}
                                onClick={() => handleRemoveMember(memberId, name)}
                                title="Remove member"
                              >
                                <MdPersonRemove size={16} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add members (admin only) */}
                  {isAdmin && (() => {
                    const memberIds = selectedGroupChat.members.map(m => m._id || m);
                    const addableFriends = friends.filter(({ user }) => !memberIds.includes(user._id));
                    if (addableFriends.length === 0) return null;
                    return (
                      <div className={styles.groupInfoSection}>
                        <h4 className={styles.groupInfoSectionTitle}>Add Members</h4>
                        <input
                          className={styles.modalInput}
                          placeholder="Search friends..."
                          value={settingsAddMemberQuery}
                          onChange={e => setSettingsAddMemberQuery(e.target.value)}
                        />
                        <div className={styles.membersList}>
                          {addableFriends
                            .filter(({ user }) => getDisplayName(user).toLowerCase().includes(settingsAddMemberQuery.toLowerCase()))
                            .map(({ user }) => (
                              <div key={user._id} className={styles.memberItem}>
                                <div className={styles.memberAvatar}>
                                  {user.profile?.avatar ? (
                                    <img src={avatarUrl(user.profile.avatar)} alt="" />
                                  ) : (
                                    <span>{getInitials(user)}</span>
                                  )}
                                </div>
                                <span className={styles.memberName}>{getDisplayName(user)}</span>
                                <button className={styles.addMemberBtn} onClick={() => handleAddMember(user._id)}>
                                  <MdPersonAdd size={16} />
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Footer */}
                  <div className={styles.groupInfoFooter}>
                    {isAdmin && (
                      <button className={styles.createGroupBtn} onClick={handleUpdateGroup} disabled={settingsLoading}>
                        {settingsLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    )}
                    <button className={styles.leaveGroupBtnModal} onClick={() => { setShowGroupSettings(false); handleLeaveGroup(selectedGroupChat._id); }}>
                      <MdExitToApp size={16} /> Leave Group
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Confirm Modal (replaces browser confirm()) */}
      {confirmModal && (
        <div className={styles.modalOverlay} onClick={() => setConfirmModal(null)}>
          <div className={`${styles.modal} ${styles.confirmModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}><MdWarning size={32} /></div>
            <h3 className={styles.confirmTitle}>{confirmModal.title}</h3>
            <p className={styles.confirmMessage}>{confirmModal.message}</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelModalBtn}
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDangerBtn}
                onClick={() => {
                  setConfirmModal(null);
                  confirmModal.onConfirm();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== COMPONENTS ====================

function FriendCard({ user, onMessage, onUnfriend }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <article className={styles.friendCard}>
      <div className={styles.friendTop}>
        <div className={styles.avatarContainer}>
          {user.profile?.avatar ? (
            <img src={avatarUrl(user.profile.avatar)} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarCircle}>{getInitials(user)}</div>
          )}
          {user.isOnline && <span className={styles.onlineBadge}></span>}
        </div>
        <div className={styles.friendInfo}>
          <p className={styles.friendName}>
            {getDisplayName(user)}
            {user.profile?.idPhoto?.verified === true && (
              <MdVerified className={styles.verifiedIcon} />
            )}
          </p>
          <p className={styles.friendMeta}>
            {user.profile?.university || 'University not set'}
          </p>
          <div className={styles.friendStatusRow}>
            <FaCircle 
              className={user.isOnline ? styles.statusGreen : styles.statusGray} 
              size={8}
            />
            <span className={styles.friendStatusText}>
              {user.isOnline ? 'Online' : formatLastSeen(user.lastSeen)}
            </span>
          </div>
        </div>
        <div className={styles.friendMenu}>
          <button className={styles.menuButton} onClick={() => setShowMenu(!showMenu)}>
            <MdMoreVert />
          </button>
          {showMenu && (
            <div className={styles.menuDropdown}>
              <button onClick={() => { onUnfriend(); setShowMenu(false); }}>
                <MdDelete /> Unfriend
              </button>
            </div>
          )}
        </div>
      </div>
      <button className={styles.messageButton} onClick={onMessage}>
        <MdChat size={16} /> Message
      </button>
    </article>
  );
}

function DiscoverCard({ user, onSendRequest, onCancelRequest }) {
  const isPending = user.friendshipStatus === 'pending';
  const isRequester = user.isRequester;
  const isFriend = user.friendshipStatus === 'accepted';

  return (
    <article className={styles.discoverCard}>
      <div className={styles.friendTop}>
        <div className={styles.avatarContainer}>
          {user.profile?.avatar ? (
            <img src={avatarUrl(user.profile.avatar)} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarCircle}>{getInitials(user)}</div>
          )}
        </div>
        <div className={styles.friendInfo}>
          <p className={styles.friendName}>
            {getDisplayName(user)}
            {user.profile?.idPhoto?.verified === true && (
              <MdVerified className={styles.verifiedIcon} />
            )}
          </p>
          <p className={styles.friendMeta}>
            {user.profile?.university || 'University not set'}
          </p>
          {user.profile?.bio && (
            <p className={styles.userBio}>{user.profile.bio}</p>
          )}
        </div>
      </div>
      
      {isFriend ? (
        <button className={styles.friendsButton} disabled>
          ✓ Friends
        </button>
      ) : isPending && isRequester ? (
        <button className={styles.pendingButton} onClick={onCancelRequest}>
          Pending • Cancel
        </button>
      ) : isPending && !isRequester ? (
        <button className={styles.respondButton}>Respond to Request</button>
      ) : (
        <button className={styles.addFriendButton} onClick={onSendRequest}>
          <MdPersonAdd size={16} /> Add Friend
        </button>
      )}
    </article>
  );
}

function RequestCard({ user, type, onAccept, onDecline, onCancel }) {
  return (
    <div className={styles.requestCard}>
      <div className={styles.requestInfo}>
        <div className={styles.avatarContainer}>
          {user.profile?.avatar ? (
            <img src={avatarUrl(user.profile.avatar)} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarCircle}>{getInitials(user)}</div>
          )}
        </div>
        <div>
          <p className={styles.friendName}>
            {getDisplayName(user)}
            {user.profile?.idPhoto?.verified === true && (
              <MdVerified className={styles.verifiedIcon} />
            )}
          </p>
          <p className={styles.friendMeta}>
            {user.profile?.university || 'University not set'}
          </p>
        </div>
      </div>
      
      <div className={styles.requestActions}>
        {type === 'received' ? (
          <>
            <button className={styles.acceptButton} onClick={onAccept}>
              <MdCheck /> Accept
            </button>
            <button className={styles.declineButton} onClick={onDecline}>
              <MdClose /> Decline
            </button>
          </>
        ) : (
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel Request
          </button>
        )}
      </div>
    </div>
  );
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function ReactionPicker({ onSelect, onClose, isOwn }) {
  return (
    <div className={`${styles.reactionPicker} ${isOwn ? styles.reactionPickerOwn : ''}`} onMouseLeave={onClose}>
      {REACTION_EMOJIS.map(e => (
        <button key={e} className={styles.reactionPickerEmoji} onClick={() => onSelect(e)}>{e}</button>
      ))}
    </div>
  );
}

function ReplyQuote({ replyTo, isOwn }) {
  if (!replyTo) return null;
  const name = replyTo.sender?.profile?.firstName || replyTo.sender?.username || 'Someone';
  const preview = replyTo.deletedForEveryone
    ? 'This message was deleted'
    : replyTo.attachment && !replyTo.content ? '📎 Attachment' : replyTo.content;
  return (
    <div className={`${styles.replyQuote} ${isOwn ? styles.replyQuoteOwn : ''}`}>
      <div className={styles.replyQuoteBar} />
      <div className={styles.replyQuoteBody}>
        <span className={styles.replyQuoteName}>{name}</span>
        <span className={styles.replyQuoteText}>{preview}</span>
      </div>
    </div>
  );
}

function ReactionsRow({ reactions, isOwn, onToggle }) {
  if (!reactions?.length) return null;
  return (
    <div className={`${styles.reactionsRow} ${isOwn ? styles.reactionsRowOwn : ''}`}>
      {reactions.map(r => (
        <button key={r.emoji} className={styles.reactionPill} onClick={() => onToggle(r.emoji)}>
          {r.emoji} <span>{r.users.length}</span>
        </button>
      ))}
    </div>
  );
}

function MessageBubble({ message, isOwn, onDelete, onReply, onReact, showPicker, onShowPicker, onHidePicker }) {
  const [showMenu, setShowMenu] = useState(false);

  if (message.deletedForEveryone) {
    return (
      <div className={`${styles.messageBubble} ${isOwn ? styles.messageOwn : ''} ${styles.messageDeleted}`}>
        <em>This message was deleted</em>
      </div>
    );
  }

  return (
    <div className={styles.messageWrapper}>
      <div
        className={`${styles.messageBubble} ${isOwn ? styles.messageOwn : ''}`}
      >
        <ReplyQuote replyTo={message.replyTo} isOwn={isOwn} />
        {message.attachment && (
          <div className={styles.messageAttachment}>
            {isImageFile(message.attachment.mimeType) ? (
              <img 
                src={chatService.getAttachmentUrl(message.attachment.filename)} 
                alt="attachment" 
                className={styles.attachmentImage}
              />
            ) : (
              <a 
                href={chatService.getAttachmentUrl(message.attachment.filename)}
                target="_blank"
                rel="noopener noreferrer"
                download={message.attachment.originalName}
                className={styles.attachmentFile}
              >
                <span>{getFileIcon(message.attachment.mimeType)}</span>
                <div>
                  <p>{message.attachment.originalName}</p>
                  <small>{formatFileSize(message.attachment.size)}</small>
                </div>
              </a>
            )}
          </div>
        )}
        
        {message.content && <p className={styles.messageContent}>{message.content}</p>}
        
        <div className={styles.messageFooter}>
          <span className={styles.messageTime}>{formatMessageTime(message.createdAt)}</span>
          {isOwn && message.read && <span className={styles.readReceipt}>✓✓</span>}
        </div>

        {/* Hover actions: react + reply + (owner) delete */}
        <div className={`${styles.msgHoverActions} ${isOwn ? styles.msgHoverActionsOwn : ''}`}>
          <button className={styles.msgHoverBtn} onClick={() => onShowPicker(message._id)} title="React">😊</button>
          <button className={styles.msgHoverBtn} onClick={() => onReply(message)} title="Reply"><MdReply size={15} /></button>
          {isOwn && (
            <button className={styles.msgHoverBtn} onClick={() => setShowMenu(!showMenu)} title="More"><MdMoreVert size={15} /></button>
          )}
        </div>

        {showMenu && (
          <div className={styles.messageMenuDropdown}>
            <button onClick={() => { onDelete(message._id, false); setShowMenu(false); }}>Delete for me</button>
            <button onClick={() => { onDelete(message._id, true); setShowMenu(false); }}>Delete for everyone</button>
          </div>
        )}
      </div>

      {showPicker && (
        <ReactionPicker isOwn={isOwn} onSelect={(emoji) => onReact(message._id, emoji)} onClose={onHidePicker} />
      )}

      <ReactionsRow reactions={message.reactions} isOwn={isOwn} onToggle={(emoji) => onReact(message._id, emoji)} />
    </div>
  );
}

function GroupMessageBubble({ message, isOwn, onReply, onReact, showPicker, onShowPicker, onHidePicker }) {
  if (message.deletedForEveryone) {
    return (
      <div className={`${styles.messageBubble} ${isOwn ? styles.messageOwn : ''} ${styles.messageDeleted}`}>
        <em>This message was deleted</em>
      </div>
    );
  }

  return (
    <div className={styles.messageWrapper}>
      <div
        className={`${styles.messageBubble} ${isOwn ? styles.messageOwn : ''}`}
      >
        {!isOwn && (
          <span className={styles.groupSenderName}>
            {message.sender?.profile?.firstName || message.sender?.username}
          </span>
        )}
        <ReplyQuote replyTo={message.replyTo} isOwn={isOwn} />
        {message.attachment && (
          <div className={styles.messageAttachment}>
            {isImageFile(message.attachment.mimeType) ? (
              <img
                src={groupService.getGroupAttachmentUrl(message.attachment.filename)}
                alt="attachment"
                className={styles.attachmentImage}
              />
            ) : (
              <a
                href={groupService.getGroupAttachmentUrl(message.attachment.filename)}
                target="_blank"
                rel="noopener noreferrer"
                download={message.attachment.originalName}
                className={styles.attachmentFile}
              >
                <span>{getFileIcon(message.attachment.mimeType)}</span>
                <div>
                  <p>{message.attachment.originalName}</p>
                  <small>{formatFileSize(message.attachment.size)}</small>
                </div>
              </a>
            )}
          </div>
        )}
        {message.content && <p className={styles.messageContent}>{message.content}</p>}
        <div className={styles.messageFooter}>
          <span className={styles.messageTime}>{formatMessageTime(message.createdAt)}</span>
        </div>

        {/* Hover actions: react + reply */}
        <div className={`${styles.msgHoverActions} ${isOwn ? styles.msgHoverActionsOwn : ''}`}>
          <button className={styles.msgHoverBtn} onClick={() => onShowPicker(message._id)} title="React">😊</button>
          <button className={styles.msgHoverBtn} onClick={() => onReply(message)} title="Reply"><MdReply size={15} /></button>
        </div>
      </div>

      {showPicker && (
        <ReactionPicker isOwn={isOwn} onSelect={(emoji) => onReact(message._id, emoji)} onClose={onHidePicker} />
      )}

      <ReactionsRow reactions={message.reactions} isOwn={isOwn} onToggle={(emoji) => onReact(message._id, emoji)} />
    </div>
  );
}
