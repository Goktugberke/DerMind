// import React from 'react';
// import { createStackNavigator } from '@react-navigation/stack';
// import { LoginScreen } from '../features/auth/LoginScreen';
// import { HomeScreen } from '../features/auth/HomeScreen';

// const Stack = createStackNavigator();

// export const RootNavigator = () => {
//   return (
//     <Stack.Navigator initialRouteName="Login">
//       <Stack.Screen 
//         name="Login" 
//         component={LoginScreen} 
//         options={{ headerShown: false }} 
//       />
//       <Stack.Screen 
//         name="Home" 
//         component={HomeScreen} 
//         options={{ title: 'DerMind Ana Sayfa' }} 
//       />
//     </Stack.Navigator>
//   );
// };

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../features/auth/LoginScreen';
import { HomeScreen } from '../features/auth/HomeScreen';
// 1. Yeni Register sayfasını import et
import { RegisterScreen } from '../features/auth/RegisterScreen'; 

const Stack = createStackNavigator();

export const RootNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }} 
      />
      
      {/* 2. Register sayfasını Stack'e ekle */}
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ headerShown: false }} // Kendi header tasarımımızı kullandığımız için kapalı tutuyoruz
      />

      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'DerMind Ana Sayfa' }} 
      />
    </Stack.Navigator>
  );
};