// CVPetShop/frontend/src/Components/UserScreen/Profile.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import UserDrawer from './UserDrawer';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const Profile = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [zipcode, setZipcode] = useState('');

  // Helper function to get token from any possible key
  const getToken = async () => {
    // Try all possible token keys
    const possibleKeys = [
      'userToken',
      'token',
      'accessToken',
      'access_token',
      'authToken',
      'jwt'
    ];
    
    for (const key of possibleKeys) {
      const token = await AsyncStorage.getItem(key);
      if (token) {
        console.log(`Found token with key: ${key}`);
        return token;
      }
    }
    
    // Also check if token is stored inside userData
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed.token) return parsed.token;
        if (parsed.accessToken) return parsed.accessToken;
      }
    } catch (e) {
      console.error('Error parsing userData:', e);
    }
    
    return null;
  };

  useEffect(() => {
    fetchProfile();
    
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfile();
    });

    return unsubscribe;
  }, [navigation]);

  // Debug function to check all stored data
  const debugStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const result = await AsyncStorage.multiGet(keys);
      console.log('=== ALL STORED DATA ===');
      result.forEach(([key, value]) => {
        if (value) {
          console.log(`${key}:`, value.substring(0, 50) + '...');
        } else {
          console.log(`${key}: null`);
        }
      });
      console.log('=== END STORED DATA ===');
    } catch (error) {
      console.error('Error checking storage:', error);
    }
  };

  // Call debug on mount
  useEffect(() => {
    debugStorage();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Use the helper function to get token
      const token = await getToken();
      
      if (!token) {
        console.log('No token found in any storage key');
        setLoading(false);
        Alert.alert(
          'Session Expired',
          'Please login again',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
        return;
      }

      console.log('Fetching profile with token:', token.substring(0, 10) + '...');
      
      const response = await axios.get(`${BACKEND_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Profile response:', response.data);
      
      // Handle different response structures
      const userData = response.data.user || response.data;
      setUser(userData);
      
      // Initialize form fields - access address fields correctly
      setName(userData.name || '');
      setContact(userData.contact || '');
      setCity(userData.address?.city || '');
      setBarangay(userData.address?.barangay || '');
      setStreet(userData.address?.street || '');
      setZipcode(userData.address?.zipcode || '');
      
      // Update stored user data
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
    } catch (error) {
      console.error('Fetch profile error:', error.response?.data || error.message);
      
      // Try to get user from AsyncStorage as fallback
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setName(userData.name || '');
          setContact(userData.contact || '');
          setCity(userData.address?.city || '');
          setBarangay(userData.address?.barangay || '');
          setStreet(userData.address?.street || '');
          setZipcode(userData.address?.zipcode || '');
        }
      } catch (storageError) {
        console.error('Error reading from storage:', storageError);
      }
      
      // Check if error is due to invalid token
      if (error.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load profile from server');
      }
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to change your avatar');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAvatar = async (imageUri) => {
    setUploadingImage(true);
    try {
      // Manipulate image to reduce size
      const manipulatedImage = await manipulateAsync(
        imageUri,
        [{ resize: { width: 500 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const token = await getToken();
      
      // Create form data
      const formData = new FormData();
      formData.append('avatar', {
        uri: manipulatedImage.uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      const response = await axios.put(
        `${BACKEND_URL}/api/v1/users/me/update`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const updatedUser = response.data.user || response.data;
      setUser(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      
      Alert.alert('Success', 'Avatar updated successfully');
      
    } catch (error) {
      console.error('Upload avatar error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setUploadingImage(false);
    }
  };

  // FIXED: Updated to send flat address fields as expected by backend
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setUpdating(true);
    try {
      const token = await getToken();
      
      // Prepare update data - FLAT structure as expected by backend
      const updatedData = {
        name: name.trim(),
      };

      // Add contact if provided
      if (contact.trim()) {
        updatedData.contact = contact.trim();
      }

      // Add address fields directly as flat fields (NOT nested)
      // Only include fields that have values
      if (city.trim()) {
        updatedData.city = city.trim();
      }
      
      if (barangay.trim()) {
        updatedData.barangay = barangay.trim();
      }
      
      if (street.trim()) {
        updatedData.street = street.trim();
      }
      
      if (zipcode.trim()) {
        // Validate zipcode format (4 digits)
        if (!/^\d{4}$/.test(zipcode.trim())) {
          Alert.alert('Error', 'Please enter a valid 4-digit zipcode');
          setUpdating(false);
          return;
        }
        updatedData.zipcode = zipcode.trim();
      }

      console.log('Updating profile with flat data:', updatedData);

      const response = await axios.put(
        `${BACKEND_URL}/api/v1/users/me/update`,
        updatedData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const updatedUser = response.data.user || response.data;
      setUser(updatedUser);
      
      // Update stored user data
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
      
    } catch (error) {
      console.error('Update profile error:', error.response?.data || error.message);
      
      // Show specific validation errors from backend
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      Alert.alert('Error', errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const getProviderIcon = () => {
    switch (user?.authProvider) {
      case 'google':
        return <Ionicons name="logo-google" size={15} color="#DB4437" />;
      case 'facebook':
        return <Ionicons name="logo-facebook" size={15} color="#4267B2" />;
      default:
        return <Ionicons name="mail" size={15} color="#8B5E3C" />;
    }
  };

  if (loading) {
    return (
      <UserDrawer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5E3C" />
        </View>
      </UserDrawer>
    );
  }

  return (
    <UserDrawer>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={pickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <View style={[styles.avatar, styles.avatarUploading]}>
                <ActivityIndicator size="large" color="#8B5E3C" />
              </View>
            ) : user?.avatar?.url ? (
              <Image
                source={{ uri: user.avatar.url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {getUserInitials()}
                </Text>
              </View>
            )}
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.providerBadge}>
            {getProviderIcon()}
            <Text style={styles.providerText}>
              {user?.authProvider === 'local' ? 'Email' : user?.authProvider}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={18} color="#8B5E3C" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Info Cards */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconWrapper}>
                <Ionicons name="mail-outline" size={18} color="#8B5E3C" />
              </View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || '-'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.iconWrapper}>
                <Ionicons name="call-outline" size={18} color="#8B5E3C" />
              </View>
              <Text style={styles.infoLabel}>Contact</Text>
              <Text style={styles.infoValue}>{user?.contact || 'Not provided'}</Text>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.iconWrapper}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.infoLabel}>Verified</Text>
              <Text style={[styles.infoValue, user?.isVerified ? styles.verifiedText : styles.unverifiedText]}>
                {user?.isVerified ? 'Yes ✓' : 'No'}
              </Text>
            </View>
          </View>
        </View>

        {/* Address Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Address Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconWrapper}>
                <Ionicons name="location-outline" size={18} color="#A3B18A" />
              </View>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>{user?.address?.city || 'Not provided'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.iconWrapper}>
                <Ionicons name="map-outline" size={18} color="#A3B18A" />
              </View>
              <Text style={styles.infoLabel}>Barangay</Text>
              <Text style={styles.infoValue}>{user?.address?.barangay || 'Not provided'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.iconWrapper}>
                <Ionicons name="home-outline" size={18} color="#A3B18A" />
              </View>
              <Text style={styles.infoLabel}>Street</Text>
              <Text style={styles.infoValue}>{user?.address?.street || 'Not provided'}</Text>
            </View>
            
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.iconWrapper}>
                <Ionicons name="mail-unread-outline" size={18} color="#A3B18A" />
              </View>
              <Text style={styles.infoLabel}>Zip Code</Text>
              <Text style={styles.infoValue}>{user?.address?.zipcode || 'Not provided'}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={handleChangePassword}
            activeOpacity={0.8}
          >
            <Ionicons name="key-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Profile Modal */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#8B5E3C" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalBody}>
                  {/* Personal Information */}
                  <Text style={styles.modalSectionTitle}>Personal Information</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#B0A090"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      value={user?.email}
                      editable={false}
                      placeholderTextColor="#B0A090"
                    />
                    <Text style={styles.inputHint}>Email cannot be changed</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Contact Number</Text>
                    <TextInput
                      style={styles.input}
                      value={contact}
                      onChangeText={setContact}
                      placeholder="Enter your contact number"
                      placeholderTextColor="#B0A090"
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* Address Information */}
                  <Text style={styles.modalSectionTitle}>Address Information</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={city}
                      onChangeText={setCity}
                      placeholder="Enter your city"
                      placeholderTextColor="#B0A090"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Barangay</Text>
                    <TextInput
                      style={styles.input}
                      value={barangay}
                      onChangeText={setBarangay}
                      placeholder="Enter your barangay"
                      placeholderTextColor="#B0A090"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Street</Text>
                    <TextInput
                      style={styles.input}
                      value={street}
                      onChangeText={setStreet}
                      placeholder="Enter your street"
                      placeholderTextColor="#B0A090"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Zip Code</Text>
                    <TextInput
                      style={styles.input}
                      value={zipcode}
                      onChangeText={setZipcode}
                      placeholder="Enter your zip code"
                      placeholderTextColor="#B0A090"
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.inputHint}>4-digit zip code</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateProfile}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </UserDrawer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E9DA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5E9DA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
    elevation: 2,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: '#8B5E3C',
  },
  avatarUploading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#8B5E3C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E0D6C8',
  },
  avatarPlaceholderText: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#8B5E3C',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333333',
    marginBottom: 6,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0E6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 16,
    gap: 5,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  providerText: {
    fontSize: 12,
    color: '#8B5E3C',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#FDF0E6',
    borderWidth: 1,
    borderColor: '#E0D6C8',
    gap: 6,
  },
  editProfileText: {
    fontSize: 14,
    color: '#8B5E3C',
    fontWeight: '700',
  },
  infoSection: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B5E3C',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    elevation: 2,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE0',
  },
  iconWrapper: {
    backgroundColor: '#FDF0E6',
    borderRadius: 8,
    padding: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  infoLabel: {
    fontSize: 13,
    color: '#B0A090',
    width: 70,
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  verifiedText: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  unverifiedText: {
    color: '#FF8A8A',
    fontWeight: '700',
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#8B5E3C',
    gap: 8,
    elevation: 3,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(61,36,18,0.45)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: '#E0D6C8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
    backgroundColor: '#FDF7F2',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5E3C',
  },
  modalCloseBtn: {
    backgroundColor: '#FDF0E6',
    borderRadius: 8,
    padding: 5,
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  modalBody: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B5E3C',
    marginTop: 10,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: '#777777',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FDF7F2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  disabledInput: {
    backgroundColor: '#F0EAE0',
    color: '#B0A090',
  },
  inputHint: {
    fontSize: 11,
    color: '#B0A090',
    marginTop: 4,
    marginLeft: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0D6C8',
    gap: 12,
    backgroundColor: '#FDF7F2',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F0EAE0',
    borderWidth: 1,
    borderColor: '#E0D6C8',
  },
  cancelButtonText: {
    color: '#777777',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#8B5E3C',
    elevation: 2,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default Profile;
