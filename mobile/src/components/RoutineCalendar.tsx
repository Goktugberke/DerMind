import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { theme } from '@constants/theme';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface RoutineCalendarProps {
    onRangeSelect?: (start: string, end: string) => void;
}

export const RoutineCalendar = ({ onRangeSelect }: RoutineCalendarProps) => {
    const [markedDates, setMarkedDates] = useState<any>({});
    const [startDate, setStartDate] = useState<string | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        // İstediğin dummy veriyi burada oluşturuyoruz
        generateDummyRoutine();
    }, []);

    const generateDummyRoutine = () => {
        const markings: any = {};

        // 1. BLOK: 2 Nisan - 7 Nisan arası YEŞİL (Başarı)
        for (let i = 2; i <= 7; i++) {
            const date = `2026-04-${i < 10 ? '0' + i : i}`;
            markings[date] = {
                color: theme.colors.success, // Pastel Yeşil
                textColor: '#000000',
                startingDay: i === 2,
                endingDay: i === 7
            };
        }

        // 2. ÖZEL GÜN: 8 Nisan KIRMIZI (Kaçırıldı)
        // İstediğin gibi theme.colors.secondary kullanıldı
        markings['2026-04-08'] = {
            color: theme.colors.error,
            textColor: '#000000ff',
            startingDay: true,
            endingDay: true
        };

        // 3. BLOK: 9 Nisan - 12 Nisan arası YEŞİL (Başarı Devam)
        for (let i = 9; i <= 12; i++) {
            const date = `2026-04-${i < 10 ? '0' + i : i}`;
            markings[date] = {
                color: theme.colors.success,
                textColor: '#000000',
                startingDay: i === 9,
                endingDay: i === 12
            };
        }

        // 4. BLOK: 13 Nisan - 22 Nisan arası PEMBE (Planlanan / Kalan)
        for (let i = 13; i <= 22; i++) {
            const date = `2026-04-${i < 10 ? '0' + i : i}`;
            markings[date] = {
                color: '#FDE2E4', // Çok açık pembe
                textColor: '#000000',
                startingDay: i === 13,
                endingDay: i === 22
            };
        }

        setMarkedDates(markings);
    };

    // const onDayPress = (day: DateData) => {
    //     if (!startDate || (startDate && day.dateString < startDate)) {
    //         // İlk tıklama veya başlangıçtan daha eski bir tarihe tıklama (Sıfırla ve yeni başlangıç yap)
    //         setStartDate(day.dateString);
    //         const newMarked = {
    //             [day.dateString]: { startingDay: true, color: 'black', textColor: 'white', endingDay: true }
    //         };
    //         setMarkedDates(newMarked);
    //         onRangeSelect(day.dateString, day.dateString);
    //     } else {
    //         // İkinci tıklama (Bitiş tarihini belirle ve arayı doldur)
    //         const range: any = {};
    //         let curr = new Date(startDate);
    //         const end = new Date(day.dateString);

    //         while (curr <= end) {
    //             const dateStr = curr.toISOString().split('T')[0];
    //             range[dateStr] = {
    //                 color: dateStr === startDate || dateStr === day.dateString ? 'black' : '#F0F0F0',
    //                 textColor: dateStr === startDate || dateStr === day.dateString ? 'white' : 'black',
    //                 startingDay: dateStr === startDate,
    //                 endingDay: dateStr === day.dateString
    //             };
    //             curr.setDate(curr.getDate() + 1);
    //         }
    //         setMarkedDates(range);
    //         setStartDate(null); // Bir sonraki seçim için sıfırla
    //         onRangeSelect(startDate, day.dateString);
    //     }
    // };

    return (

        <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Select Dates</Text>
            </View>
            <Calendar
                markingType={'period'}
                markedDates={markedDates}
                // onDayPress={onDayPress}
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
    calendarHeader: {
        marginBottom: 10,
    },
    calendarTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginLeft: 10,
    }
});