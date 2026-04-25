import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { Bell, MessageCircle, Settings, ShoppingBag, CreditCard, LogOut, Sparkles } from 'lucide-react-native';
import { ProfileMenuItem } from '@components/ProfileMenuItem';
import { PageHeader } from '@components/PageHeader';
import { theme } from '@constants/theme';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen = () => {
  const authInstance = getAuth();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", onPress: () => authInstance.signOut() }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Üst Header: Bildirim ve Mesaj */}
      <PageHeader
        title="Profile"
        fontSize={24}
        fontWeight="400"
        align="center"
        rightIcon={<Bell size={22} color={theme.colors.gray} />}
      />

      <ScrollView style={{ paddingHorizontal: 20 }}>
        {/* Profil Bilgileri Bölümü */}
        <View style={styles.profileInfoSection}>
          <View style={styles.imagePlaceholder}>
            {/* Varsa profil fotosu yoksa harf/ikon */}
            {/* <Text style={styles.imageLetter}>{authInstance.currentUser?.displayName?.charAt(0) || 'A'}</Text> */}
            <Image source={{ uri: 'https://i.pravatar.cc/300' }} style={styles.avatar} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.userName}>{authInstance.currentUser?.displayName || 'Ayşe Yılmaz'}</Text>
            <Text style={styles.userEmail}>{authInstance.currentUser?.email || 'ayse@example.com'}</Text>
          </View>
        </View>

        {/* Menü Listesi */}
        <View style={styles.menuSection}>
          <ProfileMenuItem
            label="My skin type"
            icon={<Sparkles size={22} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('SkinProfile')}
          />
          <ProfileMenuItem
            label="My orders"
            icon={<ShoppingBag size={22} color={theme.colors.text} />}
            onPress={() => navigation.navigate('Orders')}
          />
          <ProfileMenuItem
            label="My coupons"
            icon={<CreditCard size={22} color={theme.colors.text} />}
            onPress={() => navigation.navigate('Coupons')}
          />
          <ProfileMenuItem
            label="Settings"
            icon={<Settings size={22} color={theme.colors.text} />}
            onPress={() => navigation.navigate('Settings')}
          />
          <ProfileMenuItem
            label="Logout"
            isLast
            isLogout
            icon={<LogOut size={22} color={theme.colors.text} />}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepbackground
  },
  menuSection: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    // marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
    elevation: 2,
    shadowOpacity: 0.05,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  profileInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
    marginTop: 30,
    marginBottom: 60,
  },
  textContainer: {
    marginLeft: 20,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLetter: { fontSize: 32, fontWeight: 'bold', color: '#64748B' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  userEmail: { fontSize: 14, color: theme.colors.gray, marginTop: 4 },
  avatar: { width: 100, height: 100, borderRadius: 50 }
});