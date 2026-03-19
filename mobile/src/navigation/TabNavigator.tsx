import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, ShoppingBasket, Heart, User } from 'lucide-react-native';
import { theme } from '@constants/theme';

//Tabs
import { HomeScreen } from '@features/home/HomeScreen';
import { ProfileScreen } from '@features/profile/ProfileScreen';
import { ProductsScreen } from '@features/products/ProductsScreen';
import { CartScreen } from '@features/cart/CartScreen';
import { FavoritesScreen } from '@features/favorites/FavoritesScreen';

// Ekranlar (Şimdilik geçici olarak buraya tanımlayalım, sonra dosyalarına taşırsın)
const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: theme.colors.gray,
        tabBarStyle: {
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.lightGray,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductsScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{ tabBarIcon: ({ color, size }) => <ShoppingBasket color={color} size={size} /> }}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Heart color={color} size={size} /> }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
};