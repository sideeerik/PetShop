// C&V PetShop/frontend/src/Components/AdminScreen/usermanagement/ViewUser.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const ViewUserScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/users/${userId}`, {
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to load user details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const ViewUserContent = () => (
    <ScrollView style={styles.container}>
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
          <Text style={styles.headerTitle}>User Details</Text>
        </View>
        <View style={styles.headerBadge}>
          <Icon name="visibility" size={18} color="#7A4B2A" />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{user.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Role:</Text>
            <View style={[styles.roleBadge, user.role === 'admin' ? styles.adminBadge : styles.userBadge]}>
              <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <View style={styles.statusIndicatorContainer}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: user.isActive ? '#4CAF50' : '#f44336' },
                  ]}
                />
                <Text style={styles.statusLabel}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.statusItem}>
              <View style={styles.statusIndicatorContainer}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: user.isVerified ? '#4CAF50' : '#ff9800' },
                  ]}
                />
                <Text style={styles.statusLabel}>
                  {user.isVerified ? 'Verified' : 'Unverified'}
                </Text>
              </View>
            </View>
            <View style={styles.statusItem}>
              <View style={styles.statusIndicatorContainer}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: user.isDeleted ? '#f44336' : '#4CAF50' },
                  ]}
                />
                <Text style={styles.statusLabel}>
                  {user.isDeleted ? 'Deleted' : 'Not Deleted'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timestamps</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Created:</Text>
            <Text style={styles.value}>{formatDate(user.createdAt)}</Text>
          </View>
          {user.updatedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Last Updated:</Text>
              <Text style={styles.value}>{formatDate(user.updatedAt)}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('UpdateUser', { userId: user._id })}
        >
          <Icon name="edit" size={20} color="#B88B65" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {
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
                      await axios.delete(`${BACKEND_URL}/api/v1/users/${user._id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      Alert.alert('Success', 'User soft deleted');
                      navigation.goBack();
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete user');
                    }
                  },
                },
              ]
            );
          }}
        >
          <Icon name="delete" size={20} color="#C95E52" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ViewUserContent />
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
  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 24,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E7D8C8',
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E2A1F',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE0D2',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#7C6555',
    fontWeight: '700',
  },
  value: {
    fontSize: 16,
    color: '#3E2A1F',
    fontWeight: '400',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: '#8B5E3C',
  },
  userBadge: {
    backgroundColor: '#B88B65',
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statusItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicatorContainer: {
    alignItems: 'center',
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#7C6555',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFDF9',
    marginHorizontal: 16,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F9F2EB',
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#B88B65',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#C95E52',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#5C3B28',
  },
});

export default ViewUserScreen;
