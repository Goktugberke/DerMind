import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CircleDot, CheckSquare, Square } from 'lucide-react-native';
import { theme } from '@constants/theme';

export const ReminderRow = () => {
    // Checkbox durumlarını tutan state
    const [options, setOptions] = useState({
        notification: true,
        email: false,
        message: false,
    });

    const toggleOption = (key: keyof typeof options) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <View style={styles.container}>
            {/* ÜST BAŞLIK SATIRI */}
            <View style={styles.headerRow}>
                <View style={styles.leftSection}>
                    <CircleDot size={20} color="#1E293B" />
                    <Text style={styles.title}>Daily Reminders</Text>
                </View>
                {/* Görseldeki o kırmızı/pembe "Enabled" yazısı */}
                <Text style={styles.statusText}>Enabled</Text>
            </View>

            {/* CHECKBOX LİSTESİ */}
            <View style={styles.optionsList}>
                <OptionItem
                    label="Notification"
                    isChecked={options.notification}
                    onPress={() => toggleOption('notification')}
                />
                <OptionItem
                    label="E-mail"
                    isChecked={options.email}
                    onPress={() => toggleOption('email')}
                />
                <OptionItem
                    label="Message"
                    isChecked={options.message}
                    onPress={() => toggleOption('message')}
                />
            </View>
        </View>
    );
};

// Küçük Checkbox satır bileşeni
const OptionItem = ({ label, isChecked, onPress }: { label: string, isChecked: boolean, onPress: () => void }) => (
    <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
        {isChecked ? (
            <CheckSquare size={20} color={theme.colors.secondary} fill={theme.colors.secondary + '20'} />
        ) : (
            <Square size={20} color="#94A3B8" />
        )}
        <Text style={[styles.optionLabel, isChecked && styles.activeLabel]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginTop: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.secondary, // Görseldeki o canlı renk
    },
    optionsList: {
        gap: 12, // Satırlar arası boşluk
        paddingLeft: 30, // İkonun hizasından başlasınlar
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    optionLabel: {
        fontSize: 15,
        color: '#475569',
    },
    activeLabel: {
        color: '#1E293B',
        fontWeight: '500',
    },
});