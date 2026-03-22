// C&V PetShop/frontend/src/Components/AdminScreen/usermanagement/TrashUser.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const TrashUserScreen = ({ navigation }) => {
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeletedUsers = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/users/deleted`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeletedUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching deleted users:', error);
      Alert.alert('Error', 'Failed to load deleted users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeletedUsers();
  };

  const handleRestoreUser = async (userId, userName) => {
    Alert.alert(
      'Restore User',
      `Are you sure you want to restore "${userName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'default',
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.patch(
                `${BACKEND_URL}/api/v1/users/restore/${userId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              setDeletedUsers(prev => prev.filter(user => user._id !== userId));
              
              Alert.alert('Success', 'User restored successfully', [
                {
                  text: 'OK',
                },
              ]);
            } catch (error) {
              console.error('Error restoring user:', error);
              Alert.alert('Error', 'Failed to restore user');
            }
          },
        },
      ]
    );
  };

  const handlePermanentDelete = async (userId, userName) => {
    Alert.alert(
      'Permanent Delete',
      `Are you sure you want to PERMANENTLY delete "${userName}"?\n\nThis action cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.delete(
                `${BACKEND_URL}/api/v1/users/delete/${userId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              setDeletedUsers(prev => prev.filter(user => user._id !== userId));
              
              Alert.alert('Success', 'User permanently deleted');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user permanently');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            const { logout } = await import('../../../utils/helper');
            await logout();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderRightActions = (user) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.restoreButton]}
        onPress={() => handleRestoreUser(user._id, user.name)}
      >
        <Icon name="restore" size={20} color="#fff" />
        <Text style={styles.swipeButtonText}>Restore</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handlePermanentDelete(user._id, user.name)}
      >
        <Icon name="delete-forever" size={20} color="#fff" />
        <Text style={styles.swipeButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.name}</Text>
              {item.role === 'admin' && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminText}>ADMIN</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail}>{item.email}</Text>
            
            <View style={styles.deletedInfoContainer}>
              <Icon name="delete" size={14} color="#f44336" />
              <Text style={styles.deletedText}>
                Deleted on: {formatDate(item.deletedAt || item.updatedAt)}
              </Text>
            </View>
            
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.isActive ? '#4CAF50' : '#f44336' },
                ]}
              />
              <Text style={styles.statusText}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
              <View style={[styles.statusDot, { backgroundColor: '#ff9800' }]} />
              <Text style={styles.statusText}>
                {item.isVerified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          </View>
          
          <View style={styles.deletedBadge}>
            <Icon name="delete" size={16} color="#fff" />
            <Text style={styles.deletedBadgeText}>Deleted</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const TrashUserContent = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon
          name="arrow-back"
          size={24}
          color="#7A4B2A"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Deleted Users</Text>
        </View>
        <View style={styles.headerBadge}>
          <Icon name="delete-sweep" size={18} color="#7A4B2A" />
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Icon name="info" size={20} color="#7A4B2A" />
        <Text style={styles.infoText}>
          Swipe left on a user to restore or permanently delete.
        </Text>
      </View>

      <FlatList
        data={deletedUsers}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="delete-sweep" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No Deleted Users</Text>
            <Text style={styles.emptySubtitle}>
              Users that are soft-deleted will appear here
            </Text>
          </View>
        }
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <TrashUserContent />
    </AdminDrawer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6EDE3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6EDE3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FDF7F1',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D6C3',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8D6C3',
    overflow: 'hidden',
  },
  headerCopy: {
    flex: 1,
    marginLeft: 14,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A87B54',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5E7D7',
    margin: 16,
    padding: 14,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#B88B65',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#7A4B2A',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 22,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#C95E52',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E7D8C8',
    borderRightColor: '#E7D8C8',
    borderBottomColor: '#E7D8C8',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E2A1F',
  },
  adminBadge: {
    backgroundColor: '#8B5E3C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  adminText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#7C6555',
    marginBottom: 8,
  },
  deletedInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deletedText: {
    fontSize: 12,
    color: '#C95E52',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#7C6555',
    marginRight: 12,
  },
  deletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C95E52',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  deletedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  swipeButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    marginLeft: 8,
  },
  restoreButton: {
    backgroundColor: '#7C9A66',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  deleteButton: {
    backgroundColor: '#C95E52',
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  swipeButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#5C3B28',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E7665',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TrashUserScreen;
