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
          size={28}
          color="#333"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <Text style={styles.headerTitle}>Update User Role</Text>
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
              color={selectedRole === 'user' ? '#fff' : '#6200ee'}
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
              color={selectedRole === 'admin' ? '#fff' : '#6200ee'}
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  currentRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentRoleLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminBadge: {
    backgroundColor: '#6200ee',
  },
  userBadge: {
    backgroundColor: '#2196F3',
  },
  roleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleSelectorContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  roleOptions: {
    marginBottom: 20,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  roleOptionActive: {
    backgroundColor: '#6200ee',
  },
  roleOptionText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#6200ee',
    fontWeight: '500',
  },
  roleOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  roleDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  descriptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    padding: 15,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginBottom: 30,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#E65100',
  },
});

export default UpdateUserScreen;