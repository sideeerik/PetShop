// C&V PetShop/frontend/src/Components/AdminScreen/usermanagement/CreateUser.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CreateUserContent = React.memo(({
  formData,
  updateField,
  loading,
  errors,
  handleSubmit,
  navigation,
  nameInputRef,
  emailInputRef,
  passwordInputRef,
  confirmPasswordInputRef
}) => {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#7A4B2A" />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>Admin</Text>
              <Text style={styles.headerTitle}>Create New User</Text>
            </View>
            <View style={styles.headerBadge}>
              <Icon name="person-add" size={18} color="#7A4B2A" />
            </View>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              ref={nameInputRef}
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="Enter full name"
              placeholderTextColor="#999"
              returnKeyType="next"
              onSubmitEditing={() => emailInputRef.current?.focus()}
              blurOnSubmit={false}
              editable={!loading}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              ref={emailInputRef}
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => updateField('email', text)}
              placeholder="Enter email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
              editable={!loading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={styles.label}>Password *</Text>
            <TextInput
              ref={passwordInputRef}
              style={[styles.input, errors.password && styles.inputError]}
              value={formData.password}
              onChangeText={(text) => updateField('password', text)}
              placeholder="Enter password (min. 6 characters)"
              placeholderTextColor="#999"
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              blurOnSubmit={false}
              editable={!loading}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              ref={confirmPasswordInputRef}
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              value={formData.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              placeholder="Confirm password"
              placeholderTextColor="#999"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Select Role</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === 'user' && styles.roleButtonActive,
                  ]}
                  onPress={() => updateField('role', 'user')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.roleButtonText,
                    formData.role === 'user' && styles.roleButtonTextActive,
                  ]}>
                    User
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === 'admin' && styles.roleButtonActive,
                  ]}
                  onPress={() => updateField('role', 'admin')}
                  disabled={loading}
                >
                  <Text style={[
                    styles.roleButtonText,
                    formData.role === 'admin' && styles.roleButtonTextActive,
                  ]}>
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Icon name="info" size={20} color="#7A4B2A" />
              <Text style={styles.infoText}>
                New users will be automatically verified upon creation.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Create User</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
});

const CreateUserScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await getToken();
      await axios.post(
        `${BACKEND_URL}/api/v1/users`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        'Success',
        'User created successfully and automatically verified!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.response?.status === 400) {
        Alert.alert('Error', error.response.data.message || 'Email already exists');
      } else {
        Alert.alert('Error', 'Failed to create user');
      }
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, navigation]);

  const handleLogout = useCallback(async () => {
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
  }, []);

  const contentProps = useMemo(() => ({
    formData,
    updateField,
    loading,
    errors,
    handleSubmit,
    navigation,
    nameInputRef,
    emailInputRef,
    passwordInputRef,
    confirmPasswordInputRef
  }), [formData, updateField, loading, errors, handleSubmit, navigation]);

  return (
    <AdminDrawer onLogout={handleLogout}>
      <CreateUserContent {...contentProps} />
    </AdminDrawer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6EDE3',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 24,
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8D6C3',
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
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
  formContainer: {
    padding: 22,
    backgroundColor: '#FFFDF9',
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7D8C8',
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 7,
    color: '#5C3B28',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDC8B5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 6,
    fontSize: 16,
    color: '#3E2A1F',
  },
  inputError: {
    borderColor: '#C95E52',
  },
  errorText: {
    color: '#C95E52',
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 2,
  },
  roleContainer: {
    marginBottom: 24,
    marginTop: 6,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5C3B28',
    marginBottom: 14,
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    borderWidth: 1,
    borderColor: '#D7B99A',
    borderRadius: 16,
    paddingVertical: 14,
    width: '48%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  roleButtonActive: {
    backgroundColor: '#8B5E3C',
    borderColor: '#8B5E3C',
  },
  roleButtonText: {
    color: '#7A4B2A',
    fontWeight: '700',
    fontSize: 16,
  },
  roleButtonTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5E7D7',
    padding: 14,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5CBAF',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#7A4B2A',
  },
  submitButton: {
    backgroundColor: '#8B5E3C',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#BFA994',
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
});

export default CreateUserScreen;
