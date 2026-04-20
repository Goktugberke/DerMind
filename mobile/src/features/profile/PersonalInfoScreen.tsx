import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Image, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { PageHeader } from '@components/PageHeader';
import { CustomInput } from '@components/CustomInput';
import { CustomButton } from '@components/CustomButton';
import { ProfileMenuItem } from '@components/ProfileMenuItem';
import { User, Mail, Phone, Lock, Bell, AlertTriangle, Trash2, ShieldCheck } from 'lucide-react-native';
import { theme } from '@constants/theme';
import { useUpdateUserProfile, useGetCurrentUser } from '@services/api';

export const PersonalInfoScreen = () => {

    const [marketingEmails, setMarketingEmails] = useState(true);
    const authInstance = getAuth();
    const updateMutation = useUpdateUserProfile();
    
    // Fetch current user data
    const { data: currentUserData, isLoading: isLoadingUser } = useGetCurrentUser(!!authInstance.currentUser?.uid);

    const [form, setForm] = useState({
        fullName: authInstance.currentUser?.displayName || 'User',
        email: authInstance.currentUser?.email || 'test@example.com',
        phone: '+90 555 555 55 55',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Update form when currentUserData changes
    useEffect(() => {
        if (currentUserData) {
            setForm(prev => ({
                ...prev,
                fullName: currentUserData.name || prev.fullName,
                email: currentUserData.email || prev.email,
            }));
        }
    }, [currentUserData]);

    const handleInputChange = (name: string, value: string) => {
        setForm(prev => ({
            ...prev,      // Eski değerleri koru
            [name]: value // Sadece değişen alanı güncelle
        }));
    };

    const handleSavePersonalInfo = async () => {
        try {
            if (!authInstance.currentUser?.uid) {
                Alert.alert('Error', 'User not authenticated');
                return;
            }

            // Validate inputs
            if (!form.fullName.trim()) {
                Alert.alert('Error', 'Full name is required');
                return;
            }

            await updateMutation.mutateAsync({
                userId: authInstance.currentUser.uid,
                profileData: {
                    name: form.fullName,
                    allergens: undefined,
                    skinType: currentUserData?.skinType || undefined,
                    picture: authInstance.currentUser.photoURL || '',
                }
            });

            Alert.alert('Success', 'Personal information saved successfully!');
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save personal info');
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (authInstance.currentUser) {
                                // TODO: Call backend DELETE /api/users/{id} endpoint
                                await authInstance.currentUser.delete();
                                Alert.alert('Success', 'Account deleted successfully');
                            }
                        } catch (error) {
                            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete account');
                        }
                    }
                }
            ]
        );
    };

    if (isLoadingUser) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <PageHeader title="Personal Information" showBackButton align="left" />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* PROFIL FOTO VE ISIM */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarWrapper}>
                        <Image 
                            source={{ uri: authInstance.currentUser?.photoURL || 'https://i.pravatar.cc/300' }} 
                            style={styles.avatar} 
                        />
                    </View>
                    <Text style={styles.name}>{form.fullName}</Text>
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

                {/* SAVE BUTTON */}
                <View style={{ marginTop: 20 }}>
                    {updateMutation.isPending ? (
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    ) : (
                        <CustomButton
                            title="Save Personal Information"
                            onPress={handleSavePersonalInfo}
                            disabled={updateMutation.isPending}
                        />
                    )}
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
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
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