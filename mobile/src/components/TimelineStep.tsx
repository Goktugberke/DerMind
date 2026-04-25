import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { theme } from '@constants/theme';

interface TimelineStepProps {
    title: string;
    time: string;
    description: string;
    status: 'completed' | 'current' | 'pending';
    isLast?: boolean;
}

export const TimelineStep = ({ title, time, description, status, isLast }: TimelineStepProps) => {
    const isCompleted = status === 'completed';
    const isCurrent = status === 'current';

    return (
        <View style={styles.container}>
            <View style={styles.indicatorContainer}>
                <View style={[
                    styles.circle,
                    isCompleted && { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
                    isCurrent && { borderColor: theme.colors.secondary, borderWidth: 2 }
                ]}>
                    {isCompleted ? <CheckCircle2 size={16} color="#FFF" /> :
                        isCurrent ? <View style={[styles.innerCircle, { backgroundColor: theme.colors.secondary }]} /> : null}
                </View>
                {!isLast && <View style={[styles.line, (isCompleted || isCurrent) && { backgroundColor: theme.colors.secondary + '40' }]} />}
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, isCurrent && { color: theme.colors.secondary }]}>{title}</Text>
                    <Text style={styles.time}>{time}</Text>
                </View>
                <Text style={styles.description}>{description}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexDirection: 'row', height: 80 },
    indicatorContainer: { alignItems: 'center', width: 30, marginRight: 15 },
    circle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    innerCircle: { width: 12, height: 12, borderRadius: 6 },
    line: { width: 2, flex: 1, backgroundColor: '#F1F5F9' },
    content: { flex: 1, paddingTop: 2 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    title: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    time: { fontSize: 12, color: '#94A3B8' },
    description: { fontSize: 13, color: '#64748B', lineHeight: 18 }
});