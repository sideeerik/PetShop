// CVPetShop/frontend/src/Components/UserScreen/Notification/NotificationDetails.js
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function NotificationDetails({ route, navigation }) {
  // Add safety check for route.params
  if (!route?.params) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={60} color="#e74c3c" />
          <Text style={styles.errorText}>Unable to load notification details</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { notification, type = 'order' } = route.params;
  
  // Handle different notification structures
  const content = notification?.request?.content || notification || {};
  const { title, body, data } = content;
  const timestamp = notification?.date || notification?.timestamp || new Date().toISOString();

  useEffect(() => {
    console.log('NotificationDetails received:', { type, data });
  }, []);

  const getIcon = () => {
    if (type === 'order') return 'local-shipping';
    if (type === 'wishlist') return 'favorite';
    if (type === 'product') return 'local-offer';
    return 'notifications';
  };

  const getColor = () => {
    if (type === 'order') return '#f39c12';
    if (type === 'wishlist') return '#FF6B6B';
    if (type === 'product') return '#3498db';
    return '#666';
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date unavailable';
    }
  };

  const handleActionPress = () => {
    if (type === 'order' && data?.orderId) {
      navigation.navigate('OrderDetailsNotif', { orderId: data.orderId });
    } else if (type === 'wishlist' && data?.productId) {
      navigation.navigate('ProductDetailsNotif', { productId: data.productId });
    } else if (type === 'product' && data?.productId) {
      navigation.navigate('ProductDetailsNotif', { productId: data.productId });
    } else {
      Alert.alert('Info', 'No additional action available');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: getColor() + '20' }]}>
          <Icon name={getIcon()} size={60} color={getColor()} />
        </View>

        <Text style={styles.title}>{title || 'Notification'}</Text>
        
        <Text style={styles.time}>{formatDate(timestamp)}</Text>

        <View style={styles.divider} />

        <Text style={styles.body}>{body || 'No additional details'}</Text>

        {data && Object.keys(data).length > 0 && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>Additional Information:</Text>
            {Object.entries(data).map(([key, value]) => (
              <View key={key} style={styles.dataRow}>
                <Text style={styles.dataKey}>{key}:</Text>
                <Text style={styles.dataValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {(data?.orderId || data?.productId) && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: getColor() }]}
            onPress={handleActionPress}
          >
            <Icon name="visibility" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              {type === 'order' ? 'View Order' : 'View Product'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    padding: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  time: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  body: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  dataContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dataKey: {
    width: 120,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  dataValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
    marginTop: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});