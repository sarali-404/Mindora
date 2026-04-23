import { useState, useEffect, useRef } from "react";
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
  MdExitToApp
} from "react-icons/md";
import { FaCircle } from "react-icons/fa";
import styles from "./CommunityPage.module.css";
import friendService, { formatLastSeen, getDisplayName, getInitials } from "../services/friendService";
import chatService, { formatMessageTime, formatConversationTime, isImageFile, getFileIcon, formatFileSize } from "../services/chatService";
import socketService from "../services/socketService";
import authService from "../services/authService";
import groupService from "../services/groupService";

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
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
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

  // Initialize socket and fetch initial data
  useEffect(() => {
    const socket = socketService.connect();
    fetchInitialData();

    // Socket listeners with refs to get latest state
    socketService.onNewMessage((message) => {
      const currentChat = selectedChatRef.current;
      console.log('📩 New message received:', message);
      
      if (currentChat && 
          (message.sender._id === currentChat._id || message.receiver._id === currentChat._id)) {
        setMessages(prev => [...prev, message]);
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
        alert(`${displayName} has removed you from their friends list. You can no longer chat with them.`);
      } else {
        // Show notification
        alert(`${displayName} has removed you from their friends list.`);
      }
      
      // Refresh conversations to remove this chat
      fetchConversations();
    });

    // Group socket listeners
    socketService.onNewGroupMessage(({ groupId, message }) => {
      const currentGroup = selectedGroupChatRef.current;
      if (currentGroup?._id === groupId) {
        setGroupMessages(prev => [...prev, message]);
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
    try {
      await friendService.sendFriendRequest(userId);
      fetchDiscoverUsers(searchQuery);
      fetchPendingRequests();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    try {
      await friendService.acceptFriendRequest(friendshipId);
      fetchFriends();
      fetchPendingRequests();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeclineRequest = async (friendshipId) => {
    try {
      await friendService.declineFriendRequest(friendshipId);
      fetchPendingRequests();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCancelRequest = async (friendshipId) => {
    try {
      await friendService.cancelFriendRequest(friendshipId);
      fetchPendingRequests();
      fetchDiscoverUsers(searchQuery);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUnfriend = async (userId) => {
    if (!confirm('Are you sure you want to unfriend this user?')) return;
    try {
      await friendService.unfriend(userId);
      fetchFriends();
    } catch (error) {
      alert(error.message);
    }
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
    try {
      let response;
      if (attachmentFile) {
        response = await groupService.sendGroupMessageWithAttachment(
          selectedGroupChat._id, messageInput, attachmentFile
        );
        setAttachmentFile(null);
      } else {
        response = await groupService.sendGroupMessage(selectedGroupChat._id, messageInput);
      }
      setGroupMessages(prev => [...prev, response.data]);
      setMessageInput('');
      fetchGroups();
    } catch (error) {
      alert(error.message);
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
      alert(error.message);
    }
  };

  const handleLeaveGroup = async (groupId) => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await groupService.leaveGroup(groupId);
      setSelectedGroupChat(null);
      setGroupMessages([]);
      fetchGroups();
    } catch (error) {
      alert(error.message);
    }
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
          attachmentFile
        );
        setAttachmentFile(null);
      } else {
        response = await chatService.sendMessage(selectedChat._id, messageInput);
      }
      
      setMessages(prev => [...prev, response.data]);
      setMessageInput('');
      fetchConversations();
    } catch (error) {
      alert(error.message);
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
      alert(error.message);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab === 'discover') {
      fetchDiscoverUsers(searchQuery);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'discover') {
      fetchDiscoverUsers(searchQuery);
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
            placeholder={activeTab === 'discover' ? "Search users by name or university..." : "Search..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                  friends.map(({ user }) => (
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
                      {pendingRequests.map((request) => (
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
                      {sentRequests.map((request) => (
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
              <div className={styles.chatContainer}>
                {/* Sidebar: sub-tab toggle + list */}
                <div className={styles.conversationsList}>
                  <div className={styles.chatSubTabs}>
                    <button
                      className={`${styles.chatSubTab} ${chatSubTab === 'dms' ? styles.chatSubTabActive : ''}`}
                      onClick={() => setChatSubTab('dms')}
                    >
                      <MdChat size={15} /> DMs
                    </button>
                    <button
                      className={`${styles.chatSubTab} ${chatSubTab === 'groups' ? styles.chatSubTabActive : ''}`}
                      onClick={() => setChatSubTab('groups')}
                    >
                      <MdGroup size={15} /> Groups
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
                      {conversations.length === 0 ? (
                        <div className={styles.emptyConversations}>
                          <p>No conversations yet</p>
                          <small>Message a friend to start chatting</small>
                        </div>
                      ) : (
                        conversations.map((conv) => (
                          <div
                            key={conv.conversationId}
                            className={`${styles.conversationItem} ${
                              selectedChat?._id === conv.otherUser._id ? styles.conversationActive : ''
                            }`}
                            onClick={() => { openChat(conv.otherUser); setSelectedGroupChat(null); }}
                          >
                            <div className={styles.conversationAvatar}>
                              {conv.otherUser.profile?.avatar ? (
                                <img src={conv.otherUser.profile.avatar} alt="" />
                              ) : (
                                <span>{getInitials(conv.otherUser)}</span>
                              )}
                              {conv.otherUser.isOnline && <span className={styles.onlineDot}></span>}
                            </div>
                            <div className={styles.conversationInfo}>
                              <div className={styles.conversationTop}>
                                <span className={styles.conversationName}>
                                  {getDisplayName(conv.otherUser)}
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
                      {groups.length === 0 ? (
                        <div className={styles.emptyConversations}>
                          <p>No groups yet</p>
                          <button className={styles.newGroupBtn} onClick={() => setShowNewGroupModal(true)}>
                            <MdGroupAdd size={14} /> Create Group
                          </button>
                        </div>
                      ) : (
                        groups.map((group) => (
                          <div
                            key={group._id}
                            className={`${styles.conversationItem} ${
                              selectedGroupChat?._id === group._id ? styles.conversationActive : ''
                            }`}
                            onClick={() => { openGroupChat(group); setSelectedChat(null); }}
                          >
                            <div className={`${styles.conversationAvatar} ${styles.groupAvatarThumb}`}>
                              <MdGroup size={18} />
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
                        <div className={styles.chatHeaderInfo}>
                          <div className={styles.chatAvatar}>
                            {selectedChat.profile?.avatar ? (
                              <img src={selectedChat.profile.avatar} alt="" />
                            ) : (
                              <span>{getInitials(selectedChat)}</span>
                            )}
                          </div>
                          <div>
                            <h4>{getDisplayName(selectedChat)}</h4>
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

                      <div className={styles.messagesContainer}>
                        {chatLoading ? (
                          <div className={styles.loadingMessages}>
                            <div className={styles.spinner}></div>
                          </div>
                        ) : (
                          <>
                            {messages.map((message) => (
                              <MessageBubble
                                key={message._id}
                                message={message}
                                isOwn={message.sender._id === currentUser?.id || message.sender._id === currentUser?._id}
                                onDelete={handleDeleteMessage}
                              />
                            ))}
                            {typingUsers[selectedChat._id] && (
                              <div className={styles.typingIndicator}>
                                {typingUsers[selectedChat._id]} is typing...
                              </div>
                            )}
                            <div ref={messagesEndRef} />
                          </>
                        )}
                      </div>

                      <form className={styles.messageForm} onSubmit={handleSendMessage}>
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
                            placeholder="Type a message..."
                            value={messageInput}
                            onChange={(e) => {
                              setMessageInput(e.target.value);
                              handleTyping();
                            }}
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
                  ) : (
                    /* Group Chat Window */
                    <>
                      <div className={styles.chatHeader}>
                        <div className={styles.chatHeaderInfo}>
                          <div className={`${styles.chatAvatar} ${styles.groupAvatar}`}>
                            <MdGroup size={22} />
                          </div>
                          <div>
                            <h4>{selectedGroupChat.name}</h4>
                            <p className={styles.chatStatus}>
                              {selectedGroupChat.members.length} members
                            </p>
                          </div>
                        </div>
                        <button
                          className={styles.leaveGroupBtn}
                          onClick={() => handleLeaveGroup(selectedGroupChat._id)}
                          title="Leave group"
                        >
                          <MdExitToApp size={20} />
                        </button>
                      </div>

                      <div className={styles.messagesContainer}>
                        {chatLoading ? (
                          <div className={styles.loadingMessages}>
                            <div className={styles.spinner}></div>
                          </div>
                        ) : (
                          <>
                            {groupMessages.map((message) => (
                              <GroupMessageBubble
                                key={message._id}
                                message={message}
                                isOwn={message.sender._id === currentUser?.id || message.sender._id === currentUser?._id}
                              />
                            ))}
                            <div ref={messagesEndRef} />
                          </>
                        )}
                      </div>

                      <form className={styles.messageForm} onSubmit={handleSendGroupMessage}>
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
                            <img src={user.profile.avatar} alt="" />
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
            <img src={user.profile.avatar} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarCircle}>{getInitials(user)}</div>
          )}
          {user.isOnline && <span className={styles.onlineBadge}></span>}
        </div>
        <div className={styles.friendInfo}>
          <p className={styles.friendName}>
            {getDisplayName(user)}
            {user.verificationStatus === 'verified' && (
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
            <img src={user.profile.avatar} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarCircle}>{getInitials(user)}</div>
          )}
        </div>
        <div className={styles.friendInfo}>
          <p className={styles.friendName}>
            {getDisplayName(user)}
            {user.verificationStatus === 'verified' && (
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
            <img src={user.profile.avatar} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarCircle}>{getInitials(user)}</div>
          )}
        </div>
        <div>
          <p className={styles.friendName}>
            {getDisplayName(user)}
            {user.verificationStatus === 'verified' && (
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

function MessageBubble({ message, isOwn, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  if (message.deletedForEveryone) {
    return (
      <div className={`${styles.messageBubble} ${isOwn ? styles.messageOwn : ''} ${styles.messageDeleted}`}>
        <em>This message was deleted</em>
      </div>
    );
  }

  return (
    <div className={`${styles.messageBubble} ${isOwn ? styles.messageOwn : ''}`}>
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

      {isOwn && (
        <div className={styles.messageMenu}>
          <button onClick={() => setShowMenu(!showMenu)}>
            <MdMoreVert size={14} />
          </button>
          {showMenu && (
            <div className={styles.messageMenuDropdown}>
              <button onClick={() => { onDelete(message._id, false); setShowMenu(false); }}>
                Delete for me
              </button>
              <button onClick={() => { onDelete(message._id, true); setShowMenu(false); }}>
                Delete for everyone
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupMessageBubble({ message, isOwn }) {
  if (message.deletedForEveryone) {
    return (
      <div className={`${styles.messageBubble} ${isOwn ? styles.messageOwn : ''} ${styles.messageDeleted}`}>
        <em>This message was deleted</em>
      </div>
    );
  }

  return (
    <div className={`${styles.messageBubble} ${isOwn ? styles.messageOwn : ''}`}>
      {!isOwn && (
        <span className={styles.groupSenderName}>
          {message.sender?.profile?.firstName || message.sender?.username}
        </span>
      )}
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
    </div>
  );
}
