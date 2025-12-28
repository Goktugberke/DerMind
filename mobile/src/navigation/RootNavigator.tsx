import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../features/auth/LoginScreen';
import { HomeScreen } from '../features/auth/HomeScreen';

const Stack = createStackNavigator();

export const RootNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'DerMind Ana Sayfa' }} 
      />
    </Stack.Navigator>
  );
};