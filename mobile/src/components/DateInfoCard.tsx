import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// Lucide ikonlarını kullanıyoruz (zaten yüklü olan kütüphanen)
import { CalendarDays, CalendarCheck } from 'lucide-react-native';

interface DateInfoCardProps {
    label: string;
    date: string;
    // Icon artık bir string değil, bir komponent olacak veya ismiyle seçeceğiz
    isEnd?: boolean;
}

export const DateInfoCard = ({ label, date, isEnd }: DateInfoCardProps) => {
    return (
        <View style={styles.card}>
            <View style={styles.iconContainer}>
                {/* Başlangıç için CalendarDays, bitiş için CalendarCheck */}
                {isEnd ? (
                    <CalendarCheck size={22} color="#444" />
                ) : (
                    <CalendarDays size={22} color="#444" />
                )}
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.label}>{label.toUpperCase()}</Text>
                <Text style={styles.dateText}>
                    {date !== '-' ? date : 'Select Date'}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 16,
        marginHorizontal: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: '#9E9E9E',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    dateText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1A1A',
    },
});