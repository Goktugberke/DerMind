import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { theme } from '@constants/theme';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface RoutineCalendarProps {
    onRangeSelect?: (start: string, end: string) => void;
    markedDates?: any;
}

export const RoutineCalendar = ({ onRangeSelect, markedDates: externalMarkedDates }: RoutineCalendarProps) => {
    const [markedDates, setMarkedDates] = useState<any>({});
    const [startDate, setStartDate] = useState<string>('');
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);

    const onDayPress = (day: DateData) => {
        if (!startDate || (startDate && day.dateString < startDate)) {
            // İlk tıklama veya başlangıçtan daha eski bir tarihe tıklama (Sıfırla ve yeni başlangıç yap)
            setStartDate(day.dateString);
            const newMarked = {
                [day.dateString]: { startingDay: true, color: 'black', textColor: 'white', endingDay: true }
            };
            setMarkedDates(newMarked);
            if (onRangeSelect) onRangeSelect(day.dateString, day.dateString);

        } else {
            // İkinci tıklama (Bitiş tarihini belirle ve arayı doldur)
            const range: any = {};
            let curr = new Date(startDate);
            const end = new Date(day.dateString);

            while (curr <= end) {
                const dateStr = curr.toISOString().split('T')[0];
                range[dateStr] = {
                    color: dateStr === startDate || dateStr === day.dateString ? 'black' : '#F0F0F0',
                    textColor: dateStr === startDate || dateStr === day.dateString ? 'white' : 'black',
                    startingDay: dateStr === startDate,
                    endingDay: dateStr === day.dateString
                };
                curr.setDate(curr.getDate() + 1);
            }
            setMarkedDates(range);
            setStartDate(''); // Bir sonraki seçim için sıfırla
            if (onRangeSelect) onRangeSelect(startDate, day.dateString);
        }
    };

    return (

        <View style={styles.calendarCard}>
            <Calendar
                markingType={'period'}
                markedDates={externalMarkedDates || markedDates}
                renderArrow={(direction: 'left' | 'right') => (
                    direction === 'left'
                        ? <ChevronLeft size={20} color="#64748B" />
                        : <ChevronRight size={20} color="#64748B" />
                )}
                theme={{
                    calendarBackground: '#FFFFFF',
                    textSectionTitleColor: '#b6c1cd',
                    selectedDayBackgroundColor: 'black',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: theme.colors.primary,
                    dayTextColor: '#2d4150',
                    arrowColor: '#555',
                    monthTextColor: '#1A1A1A',
                    textMonthFontWeight: 'bold',
                    textDayFontSize: 16,
                    textMonthFontSize: 18,
                    textDayHeaderFontSize: 12,
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 10,
        // Gölge
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    calendarCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
});