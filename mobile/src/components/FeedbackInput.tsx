// src/components/FeedbackInput.tsx
import React from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';

interface FeedbackInputProps {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
}

export const FeedbackInput = ({ label, placeholder, value, onChangeText }: FeedbackInputProps) => (
    <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChangeText}
        />
    </View>
);

const styles = StyleSheet.create({
    container: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#1E293B',
        backgroundColor: '#FFFFFF',
    },
});