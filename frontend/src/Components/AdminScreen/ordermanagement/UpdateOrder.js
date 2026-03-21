import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminDrawer from '../AdminDrawer';
import {
  fetchOrderById,
  updateOrderStatus,
  clearError,
  clearSuccess,
  clearCurrentOrder,
} from '../../../redux/slices/orderSlice';

const ORDER_STATUSES = [
  { label: 'Processing', value: 'Processing', color: '#3498db' },
  { label: 'Accepted', value: 'Accepted', color: '#2ecc71' },
  { label: 'Out for Delivery', value: 'Out for Delivery', color: '#f39c12' },
  { label: 'Delivered', value: 'Delivered', color: '#27ae60' },
  { label: 'Cancelled', value: 'Cancelled', color: '#e74c3c' },
];

const ORDER_STATUS_TRANSITIONS = {
  Processing: ['Accepted', 'Cancelled'],
  Accepted: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

export default function UpdateOrderScreen({ route, navigation }) {
  const { orderId } = route.params;
  const dispatch = useDispatch();
  const { currentOrder: order, loading, error, success } = useSelector(
    (state) => state.orders
  );
  
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchOrderById(orderId));
    
    return () => {
      dispatch(clearCurrentOrder());
    };
  }, [dispatch, orderId]);

  useEffect(() => {
    if (order) {
      const nextStatuses = ORDER_STATUS_TRANSITIONS[order.orderStatus] || [];
      setSelectedStatus(nextStatuses[0] || '');
    }
  }, [order]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
    if (success) {
      Alert.alert(
        'Success',
        'Order status updated successfully. Notification email has been sent to the customer.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      dispatch(clearSuccess());
    }
  }, [error, success, dispatch, navigation]);

  const handleUpdateStatus = async () => {
    if (selectedStatus === order.orderStatus) {
      Alert.alert('Info', 'No changes made to order status');
      return;
    }

    Alert.alert(
      'Update Order Status',
      `Are you sure you want to change order status from ${order.orderStatus} to ${selectedStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            dispatch(updateOrderStatus({ orderId: order._id, status: selectedStatus }));
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    const statusObj = ORDER_STATUSES.find(s => s.value === status);
    return statusObj?.color || '#95a5a6';
  };

  const getStatusLabel = (status) => {
    const statusObj = ORDER_STATUSES.find(s => s.value === status);
    return statusObj?.label || status;
  };

  const availableStatuses = ORDER_STATUSES.filter((status) =>
    (ORDER_STATUS_TRANSITIONS[order?.orderStatus] || []).includes(status.value)
  );

  const hasAvailableStatusUpdates = availableStatuses.length > 0;

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

  const selectStatus = (status) => {
    setSelectedStatus(status);
    setDropdownVisible(false);
  };

  if (loading || !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f39c12" />
      </View>
    );
  }

  return (
    <AdminDrawer onLogout={handleLogout}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Order Status</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Order Info */}
        <View style={styles.orderInfoCard}>
          <Text style={styles.orderId}>Order #{order._id?.slice(-8) || 'N/A'}</Text>
          <View style={styles.infoRow}>
            <Icon name="person" size={16} color="#666" />
            <Text style={styles.infoText}>{order.user?.name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="attach-money" size={16} color="#666" />
            <Text style={styles.infoText}>₱{order.totalPrice?.toFixed(2) || order.totalAmount?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.orderStatus) }]}>
            <Text style={styles.statusText}>Current: {order.orderStatus}</Text>
          </View>
        </View>

        {/* Status Selection - Custom Dropdown */}
        <View style={styles.selectionCard}>
          <Text style={styles.label}>Select New Status</Text>
          
          {/* Dropdown Button */}
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => hasAvailableStatusUpdates && setDropdownVisible(true)}
            disabled={loading || !hasAvailableStatusUpdates}
          >
            <View style={styles.dropdownContent}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedStatus || order.orderStatus) }]} />
              <Text style={styles.dropdownText}>
                {hasAvailableStatusUpdates ? getStatusLabel(selectedStatus) : 'No more status changes allowed'}
              </Text>
            </View>
            <Icon name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>

          {/* Dropdown Modal */}
          <Modal
            visible={dropdownVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setDropdownVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setDropdownVisible(false)}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Status</Text>
                  <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={availableStatuses}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        selectedStatus === item.value && styles.selectedOption
                      ]}
                      onPress={() => selectStatus(item.value)}
                    >
                      <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                      <Text style={[
                        styles.statusOptionText,
                        selectedStatus === item.value && styles.selectedOptionText
                      ]}>
                        {item.label}
                      </Text>
                      {selectedStatus === item.value && (
                        <Icon name="check" size={20} color="#2ecc71" />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Preview of selected status */}
          {selectedStatus !== order.orderStatus && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>New Status Preview:</Text>
              <View style={[styles.previewBadge, { backgroundColor: getStatusColor(selectedStatus) }]}>
                <Text style={styles.previewText}>{selectedStatus}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Information Note */}
        <View style={styles.infoCard}>
          <Icon name="info" size={20} color="#3498db" />
          <Text style={styles.infoNote}>
            {hasAvailableStatusUpdates
              ? `Only valid next statuses are available from ${order.orderStatus}. Updating the order status will automatically send an email notification to the customer.`
              : `Orders with status ${order.orderStatus} cannot be changed anymore.`}
            {selectedStatus === 'Delivered' && ' A PDF receipt will be attached to the email.'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button, 
              styles.updateButton,
              (!hasAvailableStatusUpdates || !selectedStatus || loading) && styles.disabledButton
            ]}
            onPress={handleUpdateStatus}
            disabled={!hasAvailableStatusUpdates || !selectedStatus || loading}
          >
            <Icon name="update" size={20} color="white" />
            <Text style={styles.updateButtonText}>
              {loading ? 'Updating...' : 'Update Status'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AdminDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  placeholder: {
    width: 34,
  },
  orderInfoCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#34495e',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  statusText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  selectionCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  dropdownText: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#f0f9ff',
  },
  statusOptionText: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#2ecc71',
  },
  previewContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  previewText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#e8f4fd',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoNote: {
    flex: 1,
    fontSize: 13,
    color: '#2c3e50',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 0,
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: '#f39c12',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
