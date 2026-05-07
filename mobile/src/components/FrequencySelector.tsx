import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';
import { theme } from '@constants/theme';
import { Circle, CheckCircle2, Clock, Calendar } from 'lucide-react-native';

export interface FrequencyData {
    frequencyId: string;
    usageFrequency: string;
    time1: string;
    time2: string;
    day1: string;
    day2: string;
    isValid: boolean;
}

interface FrequencySelectorProps {
    onChange?: (data: FrequencyData) => void;
}

const FREQUENCIES = [
    { id: 'once_day',   label: 'Once per day',     backendEnum: 'DAILY' },
    { id: 'twice_day',  label: 'Twice per day',    backendEnum: 'TWICE_DAILY' },
    { id: 'once_week',  label: 'Once per week',    backendEnum: 'ONCE_WEEKLY' },
    { id: 'twice_week', label: 'Twice per week',   backendEnum: 'TWICE_WEEKLY' },
    { id: 'alternate',  label: 'On alternate days', backendEnum: 'ALTERNATE_DAYS' },
];

const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]\s?([AaPp][Mm])?$/;
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const isValidTime = (val: string) => val ? TIME_REGEX.test(val.trim()) : false;
const isValidDay = (val: string) => val ? DAYS.includes(val.trim().toLowerCase()) : false;

const InputField = ({ 
    value, 
    onChange, 
    placeholder, 
    type 
}: { 
    value: string; 
    onChange: (t: string) => void; 
    placeholder: string; 
    type: 'time' | 'day' 
}) => {
    const isValid = type === 'time' ? isValidTime(value) : isValidDay(value);
    const showError = !isValid && value.length > 0;
    const Icon = type === 'time' ? Clock : Calendar;

    return (
        <View style={{ flex: 1 }}>
            <View style={[styles.timeInput, showError && styles.inputError]}>
                <Icon size={18} color={theme.colors.text} style={styles.icon} />
                <TextInput
                    style={styles.timeText}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                />
            </View>
            {showError && (
                <Text style={styles.errorText}>
                    {type === 'time' ? 'Format must be HH:MM or HH:MM AM/PM' : 'Please enter a valid day (e.g. Monday)'}
                </Text>
            )}
        </View>
    );
};

export const FrequencySelector = ({ onChange }: FrequencySelectorProps) => {
    const [selected, setSelected] = useState('once_day');
    const [time1, setTime1] = useState('10:00 AM');
    const [time2, setTime2] = useState('10:00 PM');
    const [day1, setDay1]   = useState('Monday');
    const [day2, setDay2]   = useState('Thursday');

    useEffect(() => {
        const freq = FREQUENCIES.find(f => f.id === selected)!;
        
        let valid = true;
        if (selected === 'once_day') valid = isValidTime(time1);
        if (selected === 'twice_day') valid = isValidTime(time1) && isValidTime(time2);
        if (selected === 'once_week') valid = isValidDay(day1);
        if (selected === 'twice_week') valid = isValidDay(day1) && isValidDay(day2);
        
        onChange?.({
            frequencyId: selected,
            usageFrequency: freq.backendEnum,
            time1,
            time2,
            day1,
            day2,
            isValid: valid
        });
    }, [selected, time1, time2, day1, day2]);

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>How often will you use this?</Text>
                </View>
            </View>

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

                            {isActive && item.id === 'once_day' && (
                                <View style={styles.timePickerContainer}>
                                    <InputField value={time1} onChange={setTime1} placeholder="10:00 AM" type="time" />
                                </View>
                            )}

                            {isActive && item.id === 'twice_day' && (
                                <View style={styles.timePickerContainer}>
                                    <InputField value={time1} onChange={setTime1} placeholder="10:00 AM" type="time" />
                                    <InputField value={time2} onChange={setTime2} placeholder="10:00 PM" type="time" />
                                </View>
                            )}

                            {isActive && item.id === 'once_week' && (
                                <View style={styles.timePickerContainer}>
                                    <InputField value={day1} onChange={setDay1} placeholder="Monday" type="day" />
                                    <InputField value={time1} onChange={setTime1} placeholder="10:00 AM" type="time" />
                                </View>
                            )}
                            {isActive && item.id === 'twice_week' && (
                                <View style={styles.timePickerContainer}>
                                    <InputField value={day1} onChange={setDay1} placeholder="Monday" type="day" />
                                    <InputField value={day2} onChange={setDay2} placeholder="Thursday" type="day" />
                                    <InputField value={time1} onChange={setTime1} placeholder="10:00 AM" type="time" />
                                </View>
                            )}
                            {isActive && item.id === 'alternate' && (
                                <View style={styles.timePickerContainer}>
                                    <InputField value={time1} onChange={setTime1} placeholder="10:00 AM" type="time" />
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
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    icon: {
        marginRight: 8,
    },
    timeText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
        padding: 0,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 11,
        marginTop: 4,
        marginLeft: 16,
    }
});