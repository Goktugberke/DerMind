// src/screens/SettingsScreen.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Switch, Image } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { ProfileMenuItem } from '@components/ProfileMenuItem';
import { Bell, Mail, MessageCircle, User, CreditCard, Languages, ShieldCheck, Moon, Key, HelpCircle, LogOut, MapPin } from 'lucide-react-native';
import { theme } from '@constants/theme';
import { useNavigation } from '@react-navigation/native';
import { useGetCurrentUser, useUpdateUserProfile } from '@services/api';
import { getAuth } from '@react-native-firebase/auth';

export const SettingsScreen = () => {
    const navigation = useNavigation<any>();
    const { data: user } = useGetCurrentUser();
    const updateProfile = useUpdateUserProfile();
    const auth = getAuth();

    const [notifications, setNotifications] = useState({
        push: user?.notificationPreferences?.push ?? true,
        email: user?.notificationPreferences?.email ?? false,
        sms: user?.notificationPreferences?.sms ?? true
    });

    // Update local state when user data loads
    React.useEffect(() => {
        if (user?.notificationPreferences) {
            setNotifications(user.notificationPreferences);
        }
    }, [user]);

    const toggleSwitch = (key: keyof typeof notifications) => {
        const newPrefs = { ...notifications, [key]: !notifications[key] };
        setNotifications(newPrefs);

        if (user?.id) {
            updateProfile.mutate({
                userId: user.id,
                profileData: {
                    notificationPreferences: newPrefs
                }
            });
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <PageHeader title="Settings" showBackButton align="left" />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* PROFIL KARTI */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: 'https://i.pravatar.cc/300' }} style={styles.avatar} />
                        <View style={styles.onlineDot} />
                    </View>
                    <View>
                        <Text style={styles.profileName}>{user?.name || auth.currentUser?.displayName || 'User'}</Text>
                        <Text style={styles.profileEmail}>{user?.email || auth.currentUser?.email || ''}</Text>
                    </View>
                </View>

                {/* COMMUNICATIONS SECTION */}
                <Text style={styles.sectionTitle}>COMMUNICATIONS</Text>
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Bell size={18} color={theme.colors.primary} />
                        <Text style={styles.sectionHeaderTitle}>Notification Preferences</Text>
                    </View>
                    <Text style={styles.sectionDesc}>Choose how you'd like to stay updated on your skincare journey.</Text>
                    <ProfileMenuItem
                        label="Push Notifications"
                        icon={<Bell size={16} color={theme.colors.primary} />}
                        rightElement={
                            <Switch
                                value={notifications.push}
                                onValueChange={() => toggleSwitch('push')}
                                trackColor={{ false: '#E2E8F0', true: theme.colors.secondary + '40' }}
                                thumbColor={notifications.push ? theme.colors.secondary : '#F4F3F4'}

                            />
                        }
                    />
                    <ProfileMenuItem
                        label="Email Notifications"
                        icon={<Mail size={16} color={theme.colors.primary} />}
                        rightElement={
                            <Switch
                                value={notifications.email}
                                onValueChange={() => toggleSwitch('email')}
                                trackColor={{ false: '#E2E8F0', true: theme.colors.secondary + '40' }}
                                thumbColor={notifications.email ? theme.colors.secondary : '#F4F3F4'}
                            />
                        }
                    />
                    <ProfileMenuItem
                        label="SMS Notifications"
                        icon={<MessageCircle size={16} color={theme.colors.primary} />}
                        isLast={true}
                        rightElement={
                            <Switch
                                value={notifications.sms}
                                onValueChange={() => toggleSwitch('sms')}
                                trackColor={{ false: '#E2E8F0', true: theme.colors.secondary + '40' }}
                                thumbColor={notifications.sms ? theme.colors.secondary : '#F4F3F4'}

                            />
                        }
                    />
                </View>

                {/* ACCOUNT & BILLING SECTION */}
                <Text style={styles.sectionTitle}>ACCOUNT & BILLING</Text>
                <View style={styles.card}>
                    <ProfileMenuItem label="Personal Information" icon={<User size={20} color={theme.colors.primary} />} onPress={() => { navigation.navigate('PersonalInfo') }} />
                    <ProfileMenuItem label="Delivery Addresses" icon={<MapPin size={20} color={theme.colors.primary} />} onPress={() => { navigation.navigate('Addresses') }} />
                    <ProfileMenuItem label="Payment Methods" value="Visa ....4242" icon={<CreditCard size={20} color={theme.colors.primary} />} onPress={() => { navigation.navigate('PaymentMethods') }} />
                    <ProfileMenuItem label="App Language" value="English (US)" icon={<Languages size={20} color={theme.colors.primary} />} onPress={() => { }} isLast />
                </View>

                {/* SECURITY SECTION */}
                <Text style={styles.sectionTitle}>SECURITY</Text>
                <View style={styles.card}>
                    <ProfileMenuItem label="Privacy Policy" icon={<ShieldCheck size={20} color={theme.colors.primary} />} onPress={() => { }} />
                    <ProfileMenuItem label="Dark Mode" isLast value="System" icon={<Moon size={20} color={theme.colors.primary} />} onPress={() => { }} />
                </View>

                {/* HELP & FEEDBACK SECTION */}
                <Text style={styles.sectionTitle}>HELP & FEEDBACK</Text>
                <View style={styles.card}>
                    <ProfileMenuItem label="Help Center" icon={<HelpCircle size={20} color={theme.colors.primary} />} onPress={() => { }} />
                    <ProfileMenuItem label="Log Out" icon={<LogOut size={20} color="#F43F5E" />} onPress={() => { }} isLogout isLast />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.deepbackground },
    container: { padding: 20 },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 24, marginBottom: 25, elevation: 2, shadowOpacity: 0.05, borderWidth: 1, borderColor: '#F1F5F9' },
    avatarContainer: { marginRight: 15 },
    avatar: { width: 60, height: 60, borderRadius: 30 },
    onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF' },
    profileName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    profileEmail: { fontSize: 14, color: '#64748B' },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginBottom: 12, marginLeft: 5 },
    card: { backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20, elevation: 2, shadowOpacity: 0.05, borderWidth: 1, borderColor: '#F1F5F9' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    sectionHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    sectionDesc: { fontSize: 13, color: '#64748B', marginTop: 6, marginBottom: 15 },
    switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    switchLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    switchLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    switchDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2 }
});