// CVPetShop/frontend/src/Components/UserScreen/Orders/OrderSuccess.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import UserDrawer from '../UserDrawer';  // Changed: went up 1 level then to UserDrawer
import Header from '../../layouts/Header';  // Changed: went up 2 levels then to layouts/Header

export default function OrderSuccess({ route, navigation }) {
  const { order, orderId, orderNumber } = route.params || {};

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        <Header />
        
        <View style={styles.container}>
          <View style={styles.successIcon}>
            <Icon name="check-circle" size={100} color="#4CAF50" />
          </View>
          
          <Text style={styles.title}>Order Placed Successfully!</Text>
          <Text style={styles.subtitle}>
            Thank you for your purchase. Your order has been received.
          </Text>
          
          <View style={styles.orderInfo}>
            <Text style={styles.orderInfoText}>
              Order ID: {orderId || order?._id || 'N/A'}
            </Text>
            {orderNumber && (
              <Text style={styles.orderInfoText}>
                Order Number: {orderNumber}
              </Text>
            )}
            <Text style={styles.orderInfoText}>
              Total: ₱{order?.totalPrice?.toFixed(2) || '0.00'}
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => navigation.navigate('Home')}
            >
              <Icon name="home" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate('OrderHistory')}
            >
              <Icon name="history" size={20} color="#FF6B6B" />
              <Text style={styles.secondaryButtonText}>View Order History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  orderInfo: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  orderInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  secondaryButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});