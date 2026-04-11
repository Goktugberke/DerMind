import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Image, TouchableOpacity, Switch, Alert } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { CustomInput } from '@components/CustomInput';
import { CustomButton } from '@components/CustomButton';
import { ProfileMenuItem } from '@components/ProfileMenuItem';
import { User, Mail, Phone, Lock, Bell, AlertTriangle, Trash2, ShieldCheck } from 'lucide-react-native';
import { theme } from '@constants/theme';

export const PersonalInfoScreen = () => {

    const [marketingEmails, setMarketingEmails] = useState(true);

    const [form, setForm] = useState({
        fullName: 'Ayşe Yılmaz',
        email: 'test@3.com',
        phone: '+90 555 555 55 55',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleInputChange = (name: string, value: string) => {
        setForm(prev => ({
            ...prev,      // Eski değerleri koru
            [name]: value // Sadece değişen alanı güncelle
        }));
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <PageHeader title="Personal Information" showBackButton align="left" />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* PROFIL FOTO VE ISIM */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarWrapper}>
                        <Image source={{ uri: 'https://i.pravatar.cc/300' }} style={styles.avatar} />
                    </View>
                    <Text style={styles.name}>Sarah Johnson</Text>
                </View>

                {/* ACCOUNT DETAILS */}
                <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
                <CustomInput
                    label="Full Name"
                    placeholder="Sarah Johnson"
                    value={form.fullName}
                    onChangeText={(text) => handleInputChange('fullName', text)}
                    leftIcon={<User size={18} color={theme.colors.secondary} />} // Senin renginle çok şık durur
                />
                <CustomInput
                    label="Email Address"
                    placeholder="sarah.j@example.com"
                    value={form.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    keyboardType="email-address"
                    leftIcon={<Mail size={18} color={theme.colors.secondary} />}
                />
                <CustomInput
                    label="Phone Number"
                    placeholder="+90 555 555 55 55"
                    value={form.phone}
                    onChangeText={(text) => handleInputChange('phone', text)}
                    keyboardType="phone-pad"
                    leftIcon={<Phone size={18} color={theme.colors.secondary} />}
                />

                {/* SECURITY */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>SECURITY</Text>
                <CustomInput
                    label="Current Password"
                    placeholder="••••••••"
                    value={form.currentPassword}
                    onChangeText={(text) => handleInputChange('currentPassword', text)}
                    isPassword={true}
                    leftIcon={<Lock size={18} color={theme.colors.secondary} />}
                />
                <CustomInput
                    label="New Password"
                    placeholder="Minimum 8 characters"
                    value={form.newPassword}
                    isPassword={true}
                    onChangeText={(text) => handleInputChange('newPassword', text)}
                    keyboardType="email-address"
                    leftIcon={<Lock size={18} color={theme.colors.secondary} />}
                />
                <CustomInput
                    label="Confirm New Password"
                    placeholder="Repeat new password"
                    value={form.confirmPassword}
                    isPassword={true}
                    onChangeText={(text) => handleInputChange('confirmPassword', text)}
                    keyboardType="email-address"
                    leftIcon={<Lock size={18} color={theme.colors.secondary} />}
                />

                <CustomButton
                    title="Save Password"
                    onPress={() => Alert.alert("Success", "Password updated!")}
                />

                {/* PREFERENCES */}
                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>PREFERENCES</Text>
                <View style={styles.card}>
                    <ProfileMenuItem
                        label="Marketing Emails"
                        icon={<Bell size={18} color={theme.colors.secondary} />}
                        isLast
                        rightElement={
                            <Switch
                                value={marketingEmails}
                                onValueChange={setMarketingEmails}
                                trackColor={{ false: '#E2E8F0', true: theme.colors.secondary + '40' }}
                                thumbColor={marketingEmails ? theme.colors.secondary : '#F4F3F4'}
                            />
                        }
                    />
                </View>

                {/* DANGER ZONE */}
                <Text style={[styles.sectionTitle, { color: '#DC2626', marginTop: 30 }]}>DANGER ZONE</Text>
                <View style={styles.dangerCard}>
                    <View style={styles.dangerHeader}>
                        <AlertTriangle size={20} color="#DC2626" />
                        <Text style={styles.dangerTitle}>Account Deletion</Text>
                    </View>
                    <Text style={styles.dangerDesc}>
                        Once you delete your account, there is no going back. All your skincare routines and purchase history will be permanently removed.
                    </Text>
                    <TouchableOpacity style={styles.deleteBtn}>
                        <Trash2 size={18} color="#FFF" />
                        <Text style={styles.deleteBtnText}>Delete Account</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.deepbackground },
    container: { padding: 20 },
    profileSection: { alignItems: 'center', marginBottom: 30 },
    avatarWrapper: { width: 100, height: 100, borderRadius: 50, marginBottom: 15 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    name: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.secondary, letterSpacing: 1, marginBottom: 15 },
    card: { backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 16, elevation: 2, shadowOpacity: 0.05, borderWidth: 1, borderColor: '#F1F5F9' },
    dangerCard: { backgroundColor: '#FEF2F2', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#FEE2E2' },
    dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    dangerTitle: { fontSize: 16, fontWeight: 'bold', color: '#DC2626' },
    dangerDesc: { fontSize: 13, color: '#991B1B', lineHeight: 18, marginBottom: 20 },
    deleteBtn: { backgroundColor: '#DC2626', flexDirection: 'row', height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8 },
    deleteBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});