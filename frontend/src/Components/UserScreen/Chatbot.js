import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import * as SQLite from 'expo-sqlite';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getToken } from '../../utils/helper';
import UserDrawer from './UserDrawer';
import Header from '../layouts/Header';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Supported pets with emojis (matching backend)
const SUPPORTED_PETS = [
  { emoji: '🐶', name: 'Dog', full: '🐶 Dog' },
  { emoji: '🐱', name: 'Cat', full: '🐱 Cat' },
  { emoji: '🐹', name: 'Hamster', full: '🐹 Hamster' },
  { emoji: '🐰', name: 'Rabbit', full: '🐰 Rabbit' },
  { emoji: '🐦', name: 'Parrot', full: '🐦 Parrot' },
  { emoji: '🐠', name: 'Goldfish', full: '🐠 Goldfish' },
];

// Predefined quick questions
const QUICK_QUESTIONS = [
  { icon: 'pets', text: 'How to hold a dog?' },
  { icon: 'pets', text: 'Cat first-time owner tips' },
  { icon: 'pets', text: 'Hamster safety tips' },
  { icon: 'pets', text: 'Rabbit handling guide' },
  { icon: 'pets', text: 'Parrot care essentials' },
  { icon: 'pets', text: 'Goldfish tank setup' },
  { icon: 'shopping-bag', text: 'What categories do you sell?' },
  { icon: 'help', text: 'What pets do you support?' },
];

// ─── SQLite helpers ───────────────────────────────────────────────────────────

let _db = null;

const getDB = async () => {
  if (_db) return _db;
  
  try {
    _db = await SQLite.openDatabaseAsync('cvpetshop.db');
    
    // Check if chat_history table exists
    const tableExists = await _db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_history';"
    );
    
    if (!tableExists) {
      // Create chat history table
      await _db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS chat_history (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          sessionId   TEXT NOT NULL,
          role        TEXT NOT NULL,
          content     TEXT NOT NULL,
          timestamp   INTEGER NOT NULL,
          petType     TEXT
        );
      `);
      console.log('Created chat_history table');
    } else {
      // Check for missing columns
      const tableInfo = await _db.getAllAsync('PRAGMA table_info(chat_history);');
      const columns = tableInfo.map(col => col.name);
      
      if (!columns.includes('petType')) {
        console.log('Adding petType column to chat_history...');
        await _db.execAsync('ALTER TABLE chat_history ADD COLUMN petType TEXT;');
      }
    }
    
    // Create pet_preference table
    const prefExists = await _db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pet_preference';"
    );
    
    if (!prefExists) {
      await _db.execAsync(`
        CREATE TABLE IF NOT EXISTS pet_preference (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          sessionId   TEXT NOT NULL UNIQUE,
          petType     TEXT,
          updatedAt   INTEGER NOT NULL
        );
      `);
    }
  } catch (err) {
    console.error('Error setting up database:', err);
  }
  
  return _db;
};

// Save message to SQLite
const saveMessageToSQLite = async (sessionId, role, content, petType = null) => {
  try {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO chat_history (sessionId, role, content, timestamp, petType)
       VALUES (?, ?, ?, ?, ?);`,
      [sessionId, role, content, Date.now(), petType]
    );
  } catch (err) {
    console.error('SQLite save message error:', err);
  }
};

// Load chat history from SQLite
const loadHistoryFromSQLite = async (sessionId) => {
  try {
    const db = await getDB();
    const rows = await db.getAllAsync(
      'SELECT * FROM chat_history WHERE sessionId = ? ORDER BY timestamp ASC;',
      [sessionId]
    );
    return rows;
  } catch (err) {
    console.error('SQLite load history error:', err);
    return [];
  }
};

// Save pet preference
const savePetPreference = async (sessionId, petType) => {
  try {
    const db = await getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO pet_preference (sessionId, petType, updatedAt)
       VALUES (?, ?, ?);`,
      [sessionId, petType, Date.now()]
    );
  } catch (err) {
    console.error('SQLite save pet preference error:', err);
  }
};

// Load pet preference
const loadPetPreference = async (sessionId) => {
  try {
    const db = await getDB();
    const row = await db.getFirstAsync(
      'SELECT petType FROM pet_preference WHERE sessionId = ?;',
      [sessionId]
    );
    return row?.petType || null;
  } catch (err) {
    console.error('SQLite load pet preference error:', err);
    return null;
  }
};

// Clear old messages (keep last 50)
const cleanupOldMessages = async (sessionId) => {
  try {
    const db = await getDB();
    // Get count
    const countRow = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM chat_history WHERE sessionId = ?;',
      [sessionId]
    );
    
    if (countRow.count > 50) {
      // Delete oldest messages
      await db.runAsync(
        `DELETE FROM chat_history 
         WHERE sessionId = ? AND id IN (
           SELECT id FROM chat_history 
           WHERE sessionId = ? 
           ORDER BY timestamp ASC 
           LIMIT ?
         );`,
        [sessionId, sessionId, countRow.count - 50]
      );
    }
  } catch (err) {
    console.error('SQLite cleanup error:', err);
  }
};

// ─── Chat Message Component ───────────────────────────────────────────────────

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  const hasPetType = message.petType && !isUser;
  
  return (
    <View style={[
      styles.messageContainer,
      isUser ? styles.userMessageContainer : styles.botMessageContainer
    ]}>
      {!isUser && (
        <View style={styles.botAvatar}>
          <Icon name="pets" size={18} color="#8B5E3C" />
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.botBubble
      ]}>
        {hasPetType && (
          <Text style={styles.petTypeIndicator}>{message.petType}</Text>
        )}
        <Text style={[
          styles.messageText,
          isUser ? styles.userText : styles.botText
        ]}>
          {message.content}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      
      {isUser && (
        <View style={styles.userAvatar}>
          <Icon name="person" size={16} color="#8B5E3C" />
        </View>
      )}
    </View>
  );
};

// ─── Pet Selector Modal ───────────────────────────────────────────────────────

const PetSelectorModal = ({ visible, onClose, onSelectPet, currentPet }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Your Pet</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#B0A090" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Tell us about your pet so we can give better advice!
          </Text>
          
          <ScrollView style={styles.petList}>
            {SUPPORTED_PETS.map((pet) => (
              <TouchableOpacity
                key={pet.full}
                style={[
                  styles.petItem,
                  currentPet === pet.full && styles.petItemSelected
                ]}
                onPress={() => {
                  onSelectPet(pet.full);
                  onClose();
                }}
              >
                <Text style={styles.petEmoji}>{pet.emoji}</Text>
                <Text style={[
                  styles.petName,
                  currentPet === pet.full && styles.petNameSelected
                ]}>
                  {pet.name}
                </Text>
                {currentPet === pet.full && (
                  <Icon name="check-circle" size={20} color="#8B5E3C" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={onClose}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Quick Questions Component ────────────────────────────────────────────────

const QuickQuestions = ({ onSelect, disabled }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.quickQuestionsContainer}
      contentContainerStyle={styles.quickQuestionsContent}
    >
      {QUICK_QUESTIONS.map((q, index) => (
        <TouchableOpacity
          key={index}
          style={styles.quickQuestionBtn}
          onPress={() => onSelect(q.text)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Icon name={q.icon} size={14} color="#8B5E3C" />
          <Text style={styles.quickQuestionText}>{q.text}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// ─── Main Chatbot Screen ──────────────────────────────────────────────────────

export default function Chatbot({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionId, setSessionId] = useState(`chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [petType, setPetType] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  
  const flatListRef = useRef(null);

  // Initialize database and load history
  useEffect(() => {
    initializeChat();
  }, []);

  // Check backend health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  const initializeChat = async () => {
    try {
      await getDB();
      
      // Load pet preference
      const savedPet = await loadPetPreference(sessionId);
      if (savedPet) {
        setPetType(savedPet);
      }
      
      // Load chat history
      const history = await loadHistoryFromSQLite(sessionId);
      if (history.length > 0) {
        const formattedMessages = history.map(h => ({
          id: h.id,
          role: h.role,
          content: h.content,
          petType: h.petType,
          timestamp: h.timestamp,
        }));
        setMessages(formattedMessages);
      } else {
        // Add welcome message
        const welcome = "🐾 Welcome to PetSense AI! I'm your pet shop assistant. I can help you with:\n\n• Handling and care tips for dogs, cats, hamsters, rabbits, parrots, and goldfish\n• Product recommendations from our shop categories\n• First-time owner guides and safety tips\n\nWhich pet do you have?";
        await saveMessageToSQLite(sessionId, 'assistant', welcome);
        setMessages([{ 
          id: Date.now(), 
          role: 'assistant', 
          content: welcome,
          timestamp: Date.now()
        }]);
      }
    } catch (err) {
      console.error('Initialize error:', err);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/v1/chat/health`);
      if (res.data) {
        setHealthStatus(res.data);
        console.log('Chatbot health:', res.data);
      }
    } catch (err) {
      console.log('Health check failed - using offline mode');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkHealth();
    setRefreshing(false);
  };

  // ── POST /api/v1/chat/message ───────────────────────────────────────────────

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage = inputText.trim();
    setInputText('');
    
    // Add user message to UI
    const userMsgId = Date.now();
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    await saveMessageToSQLite(sessionId, 'user', userMessage);
    
    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    
    setLoading(true);
    
    try {
      // Try to get token if needed (optional)
      const token = await getToken().catch(() => null);
      
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/chat/message`,
        { 
          message: userMessage,
          sessionId: sessionId
        },
        { headers }
      );
      
      if (res.data.success) {
        const botResponse = res.data.response;
        const detectedPet = res.data.detectedPetType;
        
        // Update pet type if detected
        if (detectedPet && detectedPet !== petType) {
          setPetType(detectedPet);
          await savePetPreference(sessionId, detectedPet);
        }
        
        // Add bot message to UI
        const botMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: botResponse,
          petType: detectedPet,
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, botMsg]);
        await saveMessageToSQLite(sessionId, 'assistant', botResponse, detectedPet);
        
        // Cleanup old messages
        await cleanupOldMessages(sessionId);
      }
    } catch (error) {
      console.error('Send message error:', error);
      
      // Fallback response based on pet type
      let fallbackResponse = "🐾 I'm having trouble connecting right now, but I'm here to help! Tell me about your pet and I'll do my best to assist.";
      
      // Try to use cached pet type for better fallback
      if (petType) {
        fallbackResponse = `🐾 I'm currently offline, but I remember you have a ${petType}! Feel free to ask about handling tips or what categories we sell, and I'll help when we're back online.`;
      }
      
      const fallbackMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: fallbackResponse,
        petType: petType,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, fallbackMsg]);
      await saveMessageToSQLite(sessionId, 'assistant', fallbackResponse, petType);
      
      Alert.alert(
        'Connection Issue',
        'Unable to reach the AI service. Using offline mode.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  // Handle quick question selection
  const handleQuickQuestion = (question) => {
    setInputText(question);
  };

  // Handle pet selection
  const handleSelectPet = async (selectedPet) => {
    setPetType(selectedPet);
    await savePetPreference(sessionId, selectedPet);
    
    // Add a message about pet selection
    const petMsg = `I have a ${selectedPet}`;
    setInputText(petMsg);
    
    // Optionally auto-send
    setTimeout(() => sendMessage(), 500);
  };

  // ── GET /api/v1/chat/guide/:petType ─────────────────────────────────────────

  const fetchHandlingGuide = async (pet) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/v1/chat/guide/${encodeURIComponent(pet)}`);
      
      if (res.data.success) {
        const guide = res.data.handlingGuide;
        const message = `📋 **${pet} Handling Guide**\n\n` +
          `**How to Hold:** ${guide.howToHold}\n\n` +
          `**How to Carry:** ${guide.howToCarry}\n\n` +
          `**Safety Tips:**\n• ${guide.safetyTips.join('\n• ')}\n\n` +
          `**For First-Time Owners:** ${guide.firstTimeOwner}`;
        
        // Add as bot message
        const guideMsg = {
          id: Date.now(),
          role: 'assistant',
          content: message,
          petType: pet,
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, guideMsg]);
        await saveMessageToSQLite(sessionId, 'assistant', message, pet);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not fetch handling guide');
    } finally {
      setLoading(false);
    }
  };

  // ── GET /api/v1/chat/categories/:petType ────────────────────────────────────

  const fetchPetCategories = async (pet) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/v1/chat/categories/${encodeURIComponent(pet)}`);
      
      if (res.data.success) {
        const categories = res.data.categories;
        const message = `🛍️ **Shop Categories for ${pet}**\n\n` +
          `We have products in these categories:\n` +
          categories.map(c => `• ${c}`).join('\n') +
          `\n\nVisit our shop to explore all items!`;
        
        const catMsg = {
          id: Date.now(),
          role: 'assistant',
          content: message,
          petType: pet,
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, catMsg]);
        await saveMessageToSQLite(sessionId, 'assistant', message, pet);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not fetch categories');
    } finally {
      setLoading(false);
    }
  };

  // ── DELETE /api/v1/chat/clear ───────────────────────────────────────────────

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Delete all conversation history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Clear on backend
              const token = await getToken().catch(() => null);
              const headers = {};
              if (token) headers.Authorization = `Bearer ${token}`;
              
              await axios.delete(
                `${BACKEND_URL}/api/v1/chat/clear`,
                { 
                  data: { sessionId },
                  headers 
                }
              ).catch(() => {}); // Ignore backend error
              
              // Clear local SQLite
              const db = await getDB();
              await db.runAsync('DELETE FROM chat_history WHERE sessionId = ?;', [sessionId]);
              
              // Reset messages with welcome
              const welcome = "🐾 Welcome back to PetSense AI! How can I help you with your pet today?";
              await saveMessageToSQLite(sessionId, 'assistant', welcome);
              setMessages([{ 
                id: Date.now(), 
                role: 'assistant', 
                content: welcome,
                timestamp: Date.now()
              }]);
              
            } catch (err) {
              console.error('Clear chat error:', err);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Render header with pet selector
  const renderHeader = () => (
    <View style={styles.chatHeader}>
      <View style={styles.headerLeft}>
        <View style={styles.headerAvatarWrapper}>
          <Icon name="pets" size={20} color="#8B5E3C" />
        </View>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>PetSense AI</Text>
          <Text style={styles.headerSubtitle}>Your pet care assistant</Text>
          {petType && (
            <View style={styles.currentPetBadge}>
              <Text style={styles.currentPetText}>{petType}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Icon name="pets" size={20} color="#8B5E3C" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleClearChat}
          activeOpacity={0.7}
        >
          <Icon name="delete-outline" size={20} color="#FF8A8A" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        <Header />
        
        {renderHeader()}
        
        {/* Messages list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ChatMessage message={item} />}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#8B5E3C']}
              tintColor="#8B5E3C"
            />
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#8B5E3C" />
                <Text style={styles.typingText}>PetSense is thinking...</Text>
              </View>
            ) : null
          }
        />
        
        {/* Input area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <QuickQuestions 
            onSelect={handleQuickQuestion} 
            disabled={loading}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask about pet care, handling, or products..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || loading) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.7}
            >
              <Icon 
                name="send" 
                size={20} 
                color={!inputText.trim() || loading ? '#C4A882' : 'white'} 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        
        {/* Pet Selector Modal */}
        <PetSelectorModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSelectPet={handleSelectPet}
          currentPet={petType}
        />
        
        {/* Health status indicator (optional) */}
        {healthStatus && (
          <View style={styles.healthIndicator}>
            <View style={[
              styles.healthDot,
              healthStatus.groqInitialized ? styles.healthOnline : styles.healthOffline
            ]} />
            <Text style={styles.healthText}>
              {healthStatus.activeSessions || 0} active sessions
            </Text>
          </View>
        )}
      </SafeAreaView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5E9DA',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
    elevation: 2,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  headerAvatarWrapper: {
    backgroundColor: '#FDF0E6',
    borderRadius: 22,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0D6C8',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B5E3C',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#B0A090',
    marginTop: 1,
  },
  currentPetBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDF0E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    marginTop: 6,
  },
  currentPetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5E3C',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFD4D4',
  },
  quickQuestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
  },
  quickQuestionsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  quickQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FDF0E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    marginRight: 6,
    gap: 5,
  },
  quickQuestionText: {
    fontSize: 12,
    color: '#8B5E3C',
    fontWeight: '600',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FDF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E0D6C8',
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FDF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#8B5E3C',
    borderBottomRightRadius: 4,
    elevation: 2,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#333333',
  },
  petTypeIndicator: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5E3C',
    marginBottom: 4,
    backgroundColor: '#FDF0E6',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  timestamp: {
    fontSize: 9,
    color: '#B0A090',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginLeft: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#B0A090',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0D6C8',
    elevation: 4,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  input: {
    flex: 1,
    backgroundColor: '#FDF7F2',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5E3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    elevation: 3,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#F0EAE0',
    elevation: 0,
    shadowOpacity: 0,
  },
  healthIndicator: {
    position: 'absolute',
    bottom: 70,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0D6C8',
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    gap: 6,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  healthOnline: {
    backgroundColor: '#A3B18A',
  },
  healthOffline: {
    backgroundColor: '#FF8A8A',
  },
  healthText: {
    fontSize: 10,
    color: '#B0A090',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61,36,18,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5E3C',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#B0A090',
    marginBottom: 16,
    lineHeight: 20,
  },
  petList: {
    maxHeight: 400,
  },
  petItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE0',
  },
  petItemSelected: {
    backgroundColor: '#FDF0E6',
  },
  petEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  petName: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  petNameSelected: {
    color: '#8B5E3C',
    fontWeight: '700',
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0D6C8',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#8B5E3C',
    fontWeight: '600',
  },
});
