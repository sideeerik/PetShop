// CVPetShop/frontend/src/Components/AdminScreen/suppliermanagement/ViewSupplier.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer'; // Import AdminDrawer

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ViewSupplierScreen({ navigation, route }) {
  const { supplierId } = route.params;
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchSupplierDetails();
  }, [supplierId]);

  const fetchSupplierDetails = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${BACKEND_URL}/api/v1/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSupplier(res.data.supplier);
      setProducts(res.data.supplier.products || []);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      Alert.alert('Error', 'Failed to load supplier details');
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!supplier) {
    return (
      <View style={styles.centered}>
        <Text>Supplier not found</Text>
      </View>
    );
  }

  // Main content of ViewSupplier screen
  const ViewSupplierContent = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#7A4B2A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Supplier Details</Text>
        </View>
        <View style={styles.headerBadge}>
          <Icon name="storefront" size={18} color="#7A4B2A" />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{supplier.name}</Text>
        
        <View style={styles.infoRow}>
          <Icon name="email" size={20} color="#666" />
          <Text style={styles.infoText}>{supplier.email}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Icon name="phone" size={20} color="#666" />
          <Text style={styles.infoText}>{supplier.phone}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.text}>{supplier.address?.street}</Text>
          <Text style={styles.text}>{supplier.address?.city}, {supplier.address?.state}</Text>
          <Text style={styles.text}>{supplier.address?.country} - {supplier.address?.zipCode}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Associated Products ({products.length})</Text>
        {products.length === 0 ? (
          <Text style={styles.emptyText}>No products associated</Text>
        ) : (
          products.map((product) => (
            <View key={product._id} style={styles.productItem}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>₱{product.price}</Text>
              <Text style={styles.productCategory}>{product.category}</Text>
              <Text style={styles.productStock}>Stock: {product.stock}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('UpdateSupplier', { supplier })}
        >
          <Icon name="edit" size={20} color="white" />
          <Text style={styles.buttonText}>Edit Supplier</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={20} color="#7A4B2A" />
          <Text style={styles.backButtonText}>Back to List</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ViewSupplierContent />
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6EDE3',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerBackButton: {
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
  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 22,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 15,
    color: '#3E2A1F',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#5C3B28',
  },
  section: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EFE0D2',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    color: '#3E2A1F',
  },
  text: {
    fontSize: 16,
    color: '#5C3B28',
    marginBottom: 5,
  },
  productItem: {
    backgroundColor: '#F9F2EB',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E7D8C8',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3E2A1F',
  },
  productPrice: {
    fontSize: 14,
    color: '#8B5E3C',
    marginTop: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#7C6555',
    marginTop: 2,
  },
  productStock: {
    fontSize: 12,
    color: '#A87B54',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#7C6555',
    textAlign: 'center',
    paddingVertical: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginBottom: 30,
  },
  editButton: {
    backgroundColor: '#8B5E3C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 16,
    flex: 1,
    marginRight: 5,
  },
  backButton: {
    backgroundColor: '#EEE2D6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 16,
    flex: 1,
    marginLeft: 5,
    borderWidth: 1,
    borderColor: '#D7B99A',
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '800',
  },
  backButtonText: {
    color: '#7A4B2A',
    marginLeft: 5,
    fontWeight: '800',
  },
});
