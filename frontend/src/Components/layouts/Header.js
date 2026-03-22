// CVPetshop/frontend/src/Components/layouts/Header.js
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  SafeAreaView
} from 'react-native';

const { width } = Dimensions.get('window');

const Header = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.navContainer}>
          <View style={styles.navLogo}>
            <Image 
              source={require('./logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.shopName}>CVPetShop</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D6C8',
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    position: 'relative',
    top: 0,
    zIndex: 1000,
  },
  navContainer: {
    maxWidth: 1400,
    marginHorizontal: 'auto',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  navLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF0E6',
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#E0D6C8',
  },
  shopName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B5E3C',
    letterSpacing: 0.8,
  },
});

export default Header;
