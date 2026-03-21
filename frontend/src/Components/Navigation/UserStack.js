// CVPetShop/frontend/src/Components/Navigation/UserStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../UserScreen/Home';
import ProfileScreen from '../UserScreen/Profile';
import ChangePassword from '../UserScreen/ChangePassword';
import SingleProduct from '../UserScreen/SingleProduct';
import Cart from '../UserScreen/Cart';
import Checkout from '../UserScreen/Checkout'; 
import OrderSuccess from '../UserScreen/Orders/OrderSuccess';
import OrderHistory from '../UserScreen/Orders/OrderHistory';
import OrderDetails from '../UserScreen/Orders/OrderDetails';
import OrderNotification from '../UserScreen/Notification/OrderNotification.js'
import ProductNotification from '../UserScreen/Notification/ProductNotification.js'
import WishlistScreen from '../UserScreen/WishlistScreen'; 
import Chatbot from '../UserScreen/Chatbot';

const Stack = createNativeStackNavigator();

export default function UserStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, 
        animation: 'slide_from_right',
      }}
    >

        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePassword} />
        <Stack.Screen name="SingleProduct" component={SingleProduct} />
        <Stack.Screen name="Cart" component={Cart} />
        <Stack.Screen name="Checkout" component={Checkout} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccess} />
        <Stack.Screen name="OrderHistory" component={OrderHistory} />
        <Stack.Screen name="OrderDetails" component={OrderDetails} />
        <Stack.Screen name="OrderNotification" component={OrderNotification} />
        <Stack.Screen name='ProductNotification' component={ProductNotification} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen name="Chatbot" component={Chatbot} />


    </Stack.Navigator>
  );
}