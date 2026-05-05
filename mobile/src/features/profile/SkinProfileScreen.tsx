import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TextInput, Switch, Alert, ActivityIndicator } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { PageHeader } from '@components/PageHeader';
import { CustomButton } from '@components/CustomButton';
import { SkinTypeCard } from '@components/SkinTypeCard';
import { ConcernChip } from '@components/ConcernChip';
import { Droplets, Wind, Zap, ShieldAlert, Sun, Sparkles, User, AlertCircle, Baby } from 'lucide-react-native';
import { theme } from '@constants/theme';
import { useUpdateUserProfile, useGetCurrentUser } from '@services/api';

export const SkinProfileScreen = () => {
    const [age, setAge] = useState('24');
    const [selectedType, setSelectedType] = useState('combination');
    const [concerns, setConcerns] = useState(['Acne', 'Spots']);
    const [isPregnancyMode, setIsPregnancyMode] = useState(false);
    const [allergens, setAllergens] = useState('');

    const authInstance = getAuth();
    const updateMutation = useUpdateUserProfile();
    const { data: currentUser, isLoading: isLoadingUser } = useGetCurrentUser();

    // Load user data when page opens or when currentUser data arrives
    useEffect(() => {
        if (currentUser) {
            if (currentUser.skinType) setSelectedType(currentUser.skinType);
            if (currentUser.allergens) setAllergens(currentUser.allergens);
        }
    }, [currentUser]);

    const skinTypes = [
        { id: 'oily', title: 'Oily', description: 'Excess sebum', icon: <Droplets size={24} color={theme.colors.primary} /> },
        { id: 'dry', title: 'Dry', description: 'Lacks moisture', icon: <Wind size={24} color={theme.colors.primary} /> },
        { id: 'combination', title: 'Combination', description: 'Mix of types', icon: <Zap size={24} color={theme.colors.primary} /> },
        { id: 'sensitive', title: 'Sensitive', description: 'Easily irritated', icon: <ShieldAlert size={24} color={theme.colors.primary} /> },
        { id: 'normal', title: 'Normal', description: 'Well balanced', icon: <Sun size={24} color={theme.colors.primary} /> },
        { id: 'stained', title: 'Stained', description: 'Unique needs', icon: <Sparkles size={24} color={theme.colors.primary} /> },
    ];

    const toggleConcern = (val: string) => {
        setConcerns(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);
    };

    const handleSaveProfile = async () => {
        try {
            if (!authInstance.currentUser?.uid) {
                Alert.alert('Error', 'User not authenticated');
                return;
            }

            await updateMutation.mutateAsync({
                userId: authInstance.currentUser.uid,
                profileData: {
                    skinType: selectedType,
                    allergens: allergens.trim() || undefined,
                    name: currentUser?.name || authInstance.currentUser.displayName || undefined,
                    picture: authInstance.currentUser.photoURL || undefined,
                }
            });

            Alert.alert('Success', 'Skin profile saved successfully!');
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save profile');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <PageHeader title="Skin Profile" showBackButton align="left" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* PROFILE BASICS */}
                <View style={styles.sectionHeader}>
                    <User size={18} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>Profile Basics</Text>
                </View>
                <Text style={styles.inputLabel}>Your Age</Text>
                <View style={styles.ageInputWrapper}>
                    <TextInput style={styles.ageInput} value={age} onChangeText={setAge} keyboardType="numeric" />
                    <Text style={styles.ageUnit}>years</Text>
                </View>

                {/* SKIN TYPE */}
                <Text style={styles.mainLabel}>Skin Type</Text>
                <Text style={styles.subLabel}>Select the one that best describes your skin.</Text>
                <View style={styles.grid}>
                    {skinTypes.map(type => (
                        <SkinTypeCard
                            key={type.id}
                            item={type}
                            isSelected={selectedType === type.id}
                            onSelect={() => setSelectedType(type.id)}
                        />
                    ))}
                </View>

                {/* PRIMARY CONCERNS */}
                <Text style={styles.mainLabel}>Primary Concerns</Text>
                <Text style={styles.subLabel}>What would you like to focus on? (Multi-select)</Text>
                <View style={styles.chipGroup}>
                    {['Acne', 'Wrinkles', 'Spots', 'Redness', 'Texture', 'Large Pores'].map(item => (
                        <ConcernChip
                            key={item}
                            label={item}
                            isSelected={concerns.includes(item)}
                            onPress={() => toggleConcern(item)}
                        />
                    ))}
                </View>

                {/* SAFETY & PREFERENCES */}
                <View style={styles.safetyCard}>
                    <View style={styles.safetyHeader}>
                        <AlertCircle size={20} color={theme.colors.primary} />
                        <Text style={styles.safetyTitle}>Safety & Preferences</Text>
                    </View>

                    <Text style={styles.safetyLabel}>ALLERGENS</Text>
                    <TextInput
                        style={styles.safetyInput}
                        placeholder="e.g., Peanuts, Fragrance, Alcohol"
                        placeholderTextColor="#94A3B8"
                        value={allergens}
                        onChangeText={setAllergens}
                    />

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleIconBox}>
                            <Baby size={20} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.toggleTitle}>Pregnancy Safe Mode</Text>
                            <Text style={styles.toggleDesc}>Exclude harsh retinoids & acids</Text>
                        </View>
                        <Switch
                            value={isPregnancyMode}
                            onValueChange={setIsPregnancyMode}
                            trackColor={{ false: '#E2E8F0', true: theme.colors.secondary + '80' }}
                            thumbColor={isPregnancyMode ? theme.colors.secondary : '#F4F3F4'}
                        />
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                {updateMutation.isPending ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                ) : (
                    <CustomButton 
                        title="Save Skin Profile" 
                        onPress={handleSaveProfile}
                        disabled={updateMutation.isPending}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.deepbackground },
    scrollContent: { padding: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    inputLabel: { fontSize: 13, color: '#64748B', marginBottom: 8 },
    ageInputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
        borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 15, height: 50, marginBottom: 25
    },
    ageInput: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.colors.text },
    ageUnit: { color: '#64748B', fontSize: 14 },
    mainLabel: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 10 },
    subLabel: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 15 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    chipGroup: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
    safetyCard: {
        backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginTop: 20,
        borderWidth: 1, borderColor: '#F1F5F9', elevation: 4, shadowOpacity: 0.1
    },
    safetyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    safetyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    safetyLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 8 },
    safetyInput: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, marginBottom: 15 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary + '05', padding: 12, borderRadius: 16 },
    toggleIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    toggleTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    toggleDesc: { fontSize: 11, color: '#64748B' },
    footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' }
});