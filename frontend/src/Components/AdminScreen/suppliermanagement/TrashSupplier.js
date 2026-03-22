// CVPetShop/frontend/src/Components/AdminScreen/suppliermanagement/TrashSupplier.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import axios from 'axios';
import { getToken } from '../../../utils/helper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer'; // Import AdminDrawer

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TrashSupplierScreen({ navigation }) {
  const [deletedSuppliers, setDeletedSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeletedSuppliers = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${BACKEND_URL}/api/v1/admin/suppliers/trash`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeletedSuppliers(res.data.suppliers || []);
    } catch (error) {
      console.error('Error fetching deleted suppliers:', error);
      Alert.alert('Error', 'Failed to load deleted suppliers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDeletedSuppliers();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchDeletedSuppliers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeletedSuppliers();
  };

  const handlePermanentDelete = (supplier) => {
    Alert.alert(
      'Permanent Delete',
      `Are you sure you want to PERMANENTLY delete "${supplier.name}"? This action cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.delete(
                `${BACKEND_URL}/api/v1/admin/suppliers/delete/${supplier._id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              Alert.alert('Success', 'Supplier permanently deleted');
              fetchDeletedSuppliers();
            } catch (error) {
              console.error('Error permanently deleting supplier:', error);
              Alert.alert('Error', 'Failed to permanently delete supplier');
            }
          },
        },
      ]
    );
  };

  const handleRestore = async (supplier) => {
    try {
      const token = await getToken();
      await axios.patch(
        `${BACKEND_URL}/api/v1/admin/suppliers/restore/${supplier._id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      Alert.alert('Success', 'Supplier restored successfully');
      fetchDeletedSuppliers();
      navigation.navigate('SupplierList');
    } catch (error) {
      console.error('Error restoring supplier:', error);
      Alert.alert('Error', 'Failed to restore supplier');
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

  const showSupplierDetails = (supplier) => {
    const address = supplier.address || {};
    Alert.alert(
      'Deleted Supplier Details',
      `Name: ${supplier.name}\nEmail: ${supplier.email}\nPhone: ${supplier.phone}\nAddress: ${address.street || ''}, ${address.city || ''}\nState: ${address.state || ''}\nCountry: ${address.country || ''}\nZip Code: ${address.zipCode || ''}\nDeleted on: ${new Date(supplier.updatedAt).toLocaleDateString()}`,
      [{ text: 'OK', style: 'default' }]
    );
  };

  const renderRightActions = (supplier) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeButton, styles.restoreButton]}
        onPress={() => handleRestore(supplier)}
      >
        <Icon name="restore" size={24} color="white" />
        <Text style={styles.swipeButtonText}>Restore</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeButton, styles.deleteButton]}
        onPress={() => handlePermanentDelete(supplier)}
      >
        <Icon name="delete-forever" size={24} color="white" />
        <Text style={styles.swipeButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)}>
      <TouchableOpacity
        style={styles.supplierCard}
        onPress={() => showSupplierDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.supplierInfo}>
          <View style={styles.supplierHeader}>
            <Text style={styles.supplierName}>{item.name}</Text>
            <View style={styles.deletedBadge}>
              <Text style={styles.deletedText}>DELETED</Text>
            </View>
          </View>
          <Text style={styles.supplierEmail}>📧 {item.email}</Text>
          <Text style={styles.supplierPhone}>📞 {item.phone}</Text>
          <Text style={styles.supplierAddress}>
            📍 {item.address?.street || ''}, {item.address?.city || ''}
          </Text>
          <Text style={styles.deletedDate}>
            Deleted on: {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>
        <Icon name="info" size={24} color="#666" />
      </TouchableOpacity>
    </Swipeable>
  );

  // Main content of TrashSupplier screen
  const TrashSupplierContent = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={22} color="#7A4B2A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.headerTitle}>Deleted Suppliers</Text>
        </View>
        <View style={styles.countBadgeWrap}>
          <Text style={styles.countBadge}>{deletedSuppliers.length}</Text>
        </View>
      </View>

      <FlatList
        data={deletedSuppliers}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="delete-sweep" size={80} color="#bdc3c7" />
            <Text style={styles.emptyTitle}>No Deleted Suppliers</Text>
            <Text style={styles.emptySubtitle}>
              Trash bin is empty. All suppliers are active.
            </Text>
          </View>
        }
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <TrashSupplierContent />
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
    backgroundColor: '#FDF7F1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
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
  countBadgeWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    color: '#C95E52',
    fontSize: 14,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  supplierCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#7A4B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#C95E52',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E7D8C8',
    borderRightColor: '#E7D8C8',
    borderBottomColor: '#E7D8C8',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3E2A1F',
    flex: 1,
    textDecorationLine: 'line-through',
  },
  deletedBadge: {
    backgroundColor: '#C95E52',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  deletedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  supplierEmail: {
    fontSize: 14,
    color: '#7C6555',
    marginBottom: 4,
  },
  supplierPhone: {
    fontSize: 14,
    color: '#7C6555',
    marginBottom: 4,
  },
  supplierAddress: {
    fontSize: 14,
    color: '#8E7665',
    marginBottom: 5,
  },
  deletedDate: {
    fontSize: 12,
    color: '#9A846F',
    fontStyle: 'italic',
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  swipeButton: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginLeft: 5,
  },
  restoreButton: {
    backgroundColor: '#7C9A66',
  },
  deleteButton: {
    backgroundColor: '#C95E52',
  },
  swipeButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#5C3B28',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E7665',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
