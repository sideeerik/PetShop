// C&V PetShop/frontend/src/Components/Navigation/AuthenticationStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from '../AuthenticationScreen/Login';
import Register from '../AuthenticationScreen/Register';
import ForgotPassword from '../AuthenticationScreen/ForgotPassword';
import LandingPage from '../AuthenticationScreen/LandingPage';

const Stack = createNativeStackNavigator();

export default function AuthenticationStack() {
  return (
    <Stack.Navigator
      initialRouteName="LandingPage"
      screenOptions={{
        headerShown: false, // Hide headers since your screens have their own headers
        animation: 'slide_from_right', // Smooth transitions between screens
        contentStyle: {
          backgroundColor: '#f5f5f5', // Match your app's background color
        },
      }}
    >
      <Stack.Screen name="LandingPage" component={LandingPage} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
    </Stack.Navigator>
  );
}