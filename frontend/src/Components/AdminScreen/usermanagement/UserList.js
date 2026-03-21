// C&V PetShop/frontend/src/Components/AdminScreen/usermanagement/UserList.js
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
  Dimensions,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer'; // Import AdminDrawer

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const { width } = Dimensions.get('window');

const UserListScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/users/all`, {
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const token = await getToken();
      await axios.patch(
        `${BACKEND_URL}/api/v1/users/status/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers();
      Alert.alert('Success', `User ${currentStatus ? 'deactivated' : 'activated'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleSoftDelete = async (userId) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to soft delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.delete(`${BACKEND_URL}/api/v1/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchUsers();
              Alert.alert('Success', 'User soft deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    // You can import and use your logout function here
    // This will be passed to AdminDrawer
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
        style={[styles.swipeButton, styles.editButton]}
        onPress={() => navigation.navigate('UpdateUser', { userId: user._id })}
      >
        <Icon name="edit" size={20} color="#fff" />
        <Text style={styles.swipeButtonText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handleSoftDelete(user._id)}
      >
        <Icon name="delete-outline" size={20} color="#fff" />
        <Text style={styles.swipeButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ViewUser', { userId: item._id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <View style={[
              styles.avatar,
              { backgroundColor: item.role === 'admin' ? '#6200ee' : '#2196F3' }
            ]}>
              <Text style={styles.avatarText}>
                {item.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
          <View style={styles.userMainInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
              {item.role === 'admin' && (
                <View style={styles.adminBadge}>
                  <Icon name="admin-panel-settings" size={12} color="#fff" />
                  <Text style={styles.adminText}>ADMIN</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>
              <Icon name="email" size={12} color="#666" /> {item.email}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.isActive ? '#4CAF50' : '#f44336' },
                ]}
              />
              <Text style={styles.statusText}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.isVerified ? '#4CAF50' : '#ff9800' },
                ]}
              />
              <Text style={styles.statusText}>
                {item.isVerified ? 'Verified' : 'Not verified'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: item.isActive ? '#FFEBEE' : '#E8F5E9' },
            ]}
            onPress={() => handleToggleStatus(item._id, item.isActive)}
          >
            <Icon
              name={item.isActive ? 'toggle-off' : 'toggle-on'}
              size={16}
              color={item.isActive ? '#f44336' : '#4CAF50'}
            />
            <Text style={[
              styles.toggleButtonText,
              { color: item.isActive ? '#f44336' : '#4CAF50' }
            ]}>
              {item.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  // The main content of the UserList screen
  const UserListContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="people" size={28} color="#6200ee" />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSubtitle}>
              {users.length} {users.length === 1 ? 'user' : 'users'} total
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6200ee']}
            tintColor="#6200ee"
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="people-outline" size={80} color="#E0E0E0" />
            </View>
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptySubtitle}>
              Start by adding your first user
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateUser')}
            >
              <Text style={styles.emptyButtonText}>Add User</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.trashFab]}
          onPress={() => navigation.navigate('TrashUser')}
          activeOpacity={0.8}
        >
          <Icon name="delete" size={24} color="#fff" />
          <View style={styles.fabLabel}>
            <Text style={styles.fabLabelText}>Trash</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fab, styles.createFab]}
          onPress={() => navigation.navigate('CreateUser')}
          activeOpacity={0.8}
        >
          <Icon name="add" size={28} color="#fff" />
          <View style={styles.fabLabel}>
            <Text style={styles.fabLabelText}>Create</Text>
          </View>
        </TouchableOpacity>
      </View>
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
      <UserListContent />
    </AdminDrawer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: {
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3436',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userMainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  adminText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#636E72',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '500',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  swipeButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
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
  emptyIconContainer: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 50,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    position: 'relative',
  },
  trashFab: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 100,
  },
  createFab: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 100,
  },
  fabLabel: {
    marginLeft: 8,
  },
  fabLabelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UserListScreen;