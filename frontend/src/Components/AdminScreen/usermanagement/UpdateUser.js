// C&V PetShop/frontend/src/Components/AdminScreen/usermanagement/UpdateUser.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const UpdateUserScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedRole, setSelectedRole] = useState('user');

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${BACKEND_URL}/api/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data.user);
      setSelectedRole(response.data.user.role);
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to load user details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (selectedRole === user.role) {
      Alert.alert('No Changes', 'Role is already set to this value');
      return;
    }

    setUpdating(true);
    try {
      const token = await getToken();
      await axios.patch(
        `${BACKEND_URL}/api/v1/users/role/${userId}`,
        { role: selectedRole },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        'Success',
        `User role updated to ${selectedRole}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    } finally {
      setUpdating(false);
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

  const UpdateUserContent = () => (
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
          <Text style={styles.headerTitle}>Update User Role</Text>
        </View>
        <View style={styles.headerBadge}>
          <Icon name="manage-accounts" size={18} color="#7A4B2A" />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.currentRoleContainer}>
            <Text style={styles.currentRoleLabel}>Current Role:</Text>
            <View style={[styles.roleBadge, user.role === 'admin' ? styles.adminBadge : styles.userBadge]}>
              <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.roleSelectorContainer}>
        <Text style={styles.selectorTitle}>Select New Role</Text>
        
        <View style={styles.roleOptions}>
          <TouchableOpacity
            style={[
              styles.roleOption,
              selectedRole === 'user' && styles.roleOptionActive,
            ]}
            onPress={() => setSelectedRole('user')}
          >
            <Icon
              name="person"
              size={20}
              color={selectedRole === 'user' ? '#fff' : '#7A4B2A'}
            />
            <Text style={[
              styles.roleOptionText,
              selectedRole === 'user' && styles.roleOptionTextActive,
            ]}>
              User
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleOption,
              selectedRole === 'admin' && styles.roleOptionActive,
            ]}
            onPress={() => setSelectedRole('admin')}
          >
            <Icon
              name="admin-panel-settings"
              size={20}
              color={selectedRole === 'admin' ? '#fff' : '#7A4B2A'}
            />
            <Text style={[
              styles.roleOptionText,
              selectedRole === 'admin' && styles.roleOptionTextActive,
            ]}>
              Admin
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.roleDescription}>
          {selectedRole === 'user' ? (
            <>
              <Icon name="info" size={20} color="#4CAF50" />
              <Text style={styles.descriptionText}>
                User role has limited access to basic features.
              </Text>
            </>
          ) : (
            <>
              <Icon name="warning" size={20} color="#f44336" />
              <Text style={styles.descriptionText}>
                Admin role has full access to all management features.
              </Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdateRole}
          disabled={updating || selectedRole === user.role}
        >
          {updating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.updateButtonText}>Update Role</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.warningContainer}>
        <Icon name="warning" size={24} color="#ff9800" />
        <Text style={styles.warningText}>
          Note: You can only change the user's role. Other details must be updated by the user themselves.
        </Text>
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
      <UpdateUserContent />
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
    padding: 22,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E7D8C8',
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3E2A1F',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: '#7C6555',
    marginBottom: 16,
  },
  currentRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentRoleLabel: {
    fontSize: 16,
    color: '#7C6555',
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminBadge: {
    backgroundColor: '#8B5E3C',
  },
  userBadge: {
    backgroundColor: '#B88B65',
  },
  roleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  roleSelectorContainer: {
    backgroundColor: '#FFFDF9',
    margin: 16,
    marginTop: 0,
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7D8C8',
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E2A1F',
    marginBottom: 20,
  },
  roleOptions: {
    marginBottom: 20,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7B99A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  roleOptionActive: {
    backgroundColor: '#8B5E3C',
    borderColor: '#8B5E3C',
  },
  roleOptionText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#7A4B2A',
    fontWeight: '700',
  },
  roleOptionTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  roleDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5E7D7',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5CBAF',
  },
  descriptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#7A4B2A',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#EEE2D6',
    padding: 15,
    borderRadius: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7B99A',
  },
  cancelButtonText: {
    color: '#7A4B2A',
    fontWeight: '800',
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: '#8B5E3C',
    padding: 15,
    borderRadius: 16,
    width: '48%',
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F6E7D1',
    marginHorizontal: 16,
    marginBottom: 30,
    padding: 16,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#D79B3E',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#8A5A1F',
  },
});

export default UpdateUserScreen;
