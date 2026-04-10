import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { Bell, MessageCircle, Settings, ShoppingBag, CreditCard, LogOut, Sparkles } from 'lucide-react-native';
import { ProfileMenuItem } from '@components/ProfileMenuItem';
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.roundButton}>
          <Bell size={22} color={theme.colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.roundButton, { marginLeft: 12 }]}>
          <MessageCircle size={22} color={theme.colors.gray} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Profil Bilgileri Bölümü */}
        <View style={styles.profileInfoSection}>
          <View style={styles.imagePlaceholder}>
            {/* Varsa profil fotosu yoksa harf/ikon */}
            <Text style={styles.imageLetter}>{authInstance.currentUser?.displayName?.charAt(0) || 'A'}</Text>
          </View>
          <Text style={styles.userName}>{authInstance.currentUser?.displayName || 'Ayşe Yılmaz'}</Text>
          <Text style={styles.userEmail}>{authInstance.currentUser?.email || 'ayse@example.com'}</Text>
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
            onPress={() => console.log("Kuponlar")}
          />
          <ProfileMenuItem
            label="Settings"
            icon={<Settings size={22} color={theme.colors.text} />}
            onPress={() => console.log("Ayarlar")}
          />
          <ProfileMenuItem
            label="Logout"
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
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.deepbackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  profileInfoSection: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 60,
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
    marginBottom: 20,
  },
  imageLetter: { fontSize: 32, fontWeight: 'bold', color: '#64748B' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  userEmail: { fontSize: 14, color: theme.colors.gray, marginTop: 4 },
  menuSection: { marginTop: 10 },
});