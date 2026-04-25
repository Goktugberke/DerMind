import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { theme } from '@constants/theme';
import { Circle, CheckCircle2, Clock, RefreshCw } from 'lucide-react-native';

const FREQUENCIES = [
    { id: 'once_day', label: 'Once per day' },
    { id: 'twice_day', label: 'Twice per day' },
    { id: 'once_week', label: 'Once per week' },
    { id: 'twice_week', label: 'Twice per week' },
    { id: 'alternate', label: 'On alternate days' },
    { id: 'twice_month', label: 'Twice in month' },
];

export const FrequencySelector = () => {
    const [selected, setSelected] = useState('twice_day');

    return (
        <View style={styles.card}>
            {/* Header Bölümü */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>How often will you use this?</Text>
                </View>
            </View>

            {/* Liste Bölümü */}
            <View style={styles.listContainer}>
                {FREQUENCIES.map((item, index) => {
                    const isActive = selected === item.id;
                    const isLast = index === FREQUENCIES.length - 1;

                    return (
                        <View key={item.id}>
                            <TouchableOpacity
                                style={[styles.row, !isLast && styles.borderBottom]}
                                onPress={() => setSelected(item.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.rowLabel, isActive && styles.activeText]}>
                                    {item.label}
                                </Text>
                                {isActive ? (
                                    <CheckCircle2 size={24} color={theme.colors.secondary} />
                                ) : (
                                    <Circle size={24} color="#E2E8F0" />
                                )}
                            </TouchableOpacity>

                            {/* Twice per day seçiliyse açılan saat seçiciler */}
                            {isActive && item.id === 'twice_day' && (
                                <View style={styles.timePickerContainer}>
                                    <TouchableOpacity style={styles.timeInput}>
                                        <Clock size={18} color={theme.colors.text} style={styles.clockIcon} />
                                        <Text style={styles.timeText}>10:00 AM</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.timeInput}>
                                        <Clock size={18} color={theme.colors.text} style={styles.clockIcon} />
                                        <Text style={styles.timeText}>10:00 PM</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: theme.colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        flex: 1,
        lineHeight: 22,
    },
    listContainer: {
        marginTop: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#64748B',
    },
    activeText: {
        color: theme.colors.secondary,
        fontWeight: '700',
    },
    timePickerContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingBottom: 16,
        paddingTop: 4,
    },
    timeInput: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    clockIcon: {
        marginRight: 8,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
});