import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Pages
import { LoginScreen } from '@features/auth/LoginScreen';
import { ForgotPasswordScreen } from '@features/auth/ForgotPasswordScreen';
import { RegisterScreen } from '@features/auth/RegisterScreen';

// Tabs
import { TabNavigator } from './TabNavigator';

const Stack = createStackNavigator();

export const RootNavigator = () => {

  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  function onAuthStateChanged(userState: FirebaseAuthTypes.User | null) {
    setUser(userState);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(onAuthStateChanged);
    return unsubscribe;
  }, []);

  if (initializing) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        /* KULLANICI GİRİŞ YAPMIŞSA: Sadece Ana Uygulamayı (Tabları) göster */
        <Stack.Screen name="MainApp" component={TabNavigator} />
      ) : (
        /* KULLANICI GİRİŞ YAPMAMIŞSA: Sadece Giriş Ekranlarını göster */
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen 
            name="ForgotPassword" 
            component={ForgotPasswordScreen} 
            options={{ headerShown: true, title: 'Şifremi Unuttum' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};