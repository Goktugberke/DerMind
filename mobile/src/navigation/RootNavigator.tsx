import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { getApp } from '@react-native-firebase/app';
import { getAuth, onAuthStateChanged, FirebaseAuthTypes } from '@react-native-firebase/auth';

// Pages
import { LoginScreen } from '@features/auth/LoginScreen';
import { ForgotPasswordScreen } from '@features/auth/ForgotPasswordScreen';
import { RegisterScreen } from '@features/auth/RegisterScreen';
import { ProductDetailScreen } from '@features/product_detail/ProductDetailScreen';

// Tabs
import { TabNavigator } from './TabNavigator';

const Stack = createStackNavigator();

export const RootNavigator = () => {

  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  function handleAuthStateChanged(userState: FirebaseAuthTypes.User | null) {
    setUser(userState);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const authInstance = getAuth(getApp());
    const unsubscribe = onAuthStateChanged(authInstance, (userState) => {
      setUser(userState);
      setInitializing(false);
    });

    // Cleanup: Dinleyiciyi temizliyoruz
    return () => unsubscribe();
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#D81B60" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        /* KULLANICI GİRİŞ YAPMIŞSA: Sadece Ana Uygulamayı (Tabları) göster */
        <>
          <Stack.Screen name="MainApp" component={TabNavigator} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        </>
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