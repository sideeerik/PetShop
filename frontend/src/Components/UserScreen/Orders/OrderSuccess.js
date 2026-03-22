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
import UserDrawer from '../UserDrawer';
import Header from '../../layouts/Header';

export default function OrderSuccess({ route, navigation }) {
  const { order, orderId, orderNumber } = route.params || {};

  return (
    <UserDrawer>
      <SafeAreaView style={styles.safeArea}>
        <Header />
        
        <View style={styles.container}>
          <View style={styles.successIconWrapper}>
            <Icon name="check-circle" size={72} color="#A3B18A" />
          </View>
          
          <Text style={styles.title}>Order Placed! 🎉</Text>
          <Text style={styles.subtitle}>
            Thank you for your purchase. Your order has been received and is being processed.
          </Text>
          
          <View style={styles.orderInfo}>
            <View style={styles.orderInfoRow}>
              <Icon name="receipt" size={16} color="#8B5E3C" />
              <Text style={styles.orderInfoLabel}>Order ID</Text>
              <Text style={styles.orderInfoValue} numberOfLines={1}>
                {orderId || order?._id || 'N/A'}
              </Text>
            </View>
            {orderNumber && (
              <View style={styles.orderInfoRow}>
                <Icon name="tag" size={16} color="#8B5E3C" />
                <Text style={styles.orderInfoLabel}>Order No.</Text>
                <Text style={styles.orderInfoValue}>{orderNumber}</Text>
              </View>
            )}
            <View style={[styles.orderInfoRow, { marginBottom: 0 }]}>
              <Icon name="payments" size={16} color="#8B5E3C" />
              <Text style={styles.orderInfoLabel}>Total Paid</Text>
              <Text style={styles.orderInfoValueBold}>
                ₱{order?.totalPrice?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Icon name="home" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('OrderHistory')}
            >
              <Icon name="history" size={20} color="#8B5E3C" />
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
    backgroundColor: '#F5E9DA',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successIconWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E0D6C8',
    elevation: 4,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8B5E3C',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  orderInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E0D6C8',
    elevation: 3,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfoLabel: {
    fontSize: 13,
    color: '#B0A090',
    marginLeft: 8,
    width: 70,
  },
  orderInfoValue: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  orderInfoValueBold: {
    flex: 1,
    fontSize: 15,
    color: '#8B5E3C',
    fontWeight: '800',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#8B5E3C',
    elevation: 3,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8B5E3C',
  },
  secondaryButtonText: {
    color: '#8B5E3C',
    fontSize: 15,
    fontWeight: '700',
  },
});
