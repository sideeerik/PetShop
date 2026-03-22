// CVPetShop/frontend/src/Components/AdminScreen/suppliermanagement/CreateSupplier.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import AdminDrawer from '../AdminDrawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CreateSupplierContent = React.memo(({
  formData,
  setFormData,
  loading,
  handleSubmit,
  navigation
}) => {
  const handleInputChange = useCallback((field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#7A4B2A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Create Supplier</Text>
        </View>
        <View style={styles.headerBadge}>
          <Icon name="local-shipping" size={18} color="#7A4B2A" />
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Supplier Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => handleInputChange('name', text)}
          placeholder="Enter supplier name"
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => handleInputChange('email', text)}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(text) => handleInputChange('phone', text)}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />

        <Text style={styles.sectionTitle}>Address</Text>
        <Text style={styles.sectionSubtitle}>Fill in the supplier contact location details.</Text>
        
        <Text style={styles.label}>Street *</Text>
        <TextInput
          style={styles.input}
          value={formData.address.street}
          onChangeText={(text) => handleInputChange('address.street', text)}
          placeholder="Enter street address"
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          value={formData.address.city}
          onChangeText={(text) => handleInputChange('address.city', text)}
          placeholder="Enter city"
        />

        <Text style={styles.label}>State *</Text>
        <TextInput
          style={styles.input}
          value={formData.address.state}
          onChangeText={(text) => handleInputChange('address.state', text)}
          placeholder="Enter state"
        />

        <Text style={styles.label}>Country *</Text>
        <TextInput
          style={styles.input}
          value={formData.address.country}
          onChangeText={(text) => handleInputChange('address.country', text)}
          placeholder="Enter country"
        />

        <Text style={styles.label}>Zip Code *</Text>
        <TextInput
          style={styles.input}
          value={formData.address.zipCode}
          onChangeText={(text) => handleInputChange('address.zipCode', text)}
          placeholder="Enter zip code"
          keyboardType="numeric"
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create Supplier</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
});

export default function CreateSupplierScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
  });

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Supplier name is required');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Validation Error', 'Phone number is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await getToken();
      await axios.post(
        `${BACKEND_URL}/api/v1/admin/suppliers`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      Alert.alert(
        'Success',
        'Supplier created successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating supplier:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create supplier';
      Alert.alert('Error', errorMessage);
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

  return (
    <AdminDrawer onLogout={handleLogout}>
      <CreateSupplierContent
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        handleSubmit={handleSubmit}
        navigation={navigation}
      />
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8D6C3',
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
  form: {
    margin: 16,
    padding: 22,
    backgroundColor: '#FFFDF9',
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
    marginBottom: 15,
    fontSize: 16,
    color: '#3E2A1F',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
    color: '#3E2A1F',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E7665',
    marginBottom: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  cancelButton: {
    backgroundColor: '#EEE2D6',
    padding: 15,
    borderRadius: 16,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7B99A',
  },
  cancelButtonText: {
    color: '#7A4B2A',
    fontWeight: '800',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#8B5E3C',
    padding: 15,
    borderRadius: 16,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
});
