import React from 'react';
import { View, Text, StyleSheet, TextStyle, TouchableOpacity } from 'react-native';
import { theme } from '@constants/theme';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';

interface PageHeaderProps {
    title: string;
    color?: string;
    fontSize?: number;
    fontWeight?: TextStyle['fontWeight'];
    align?: 'left' | 'center';
    showBackButton?: boolean;
    rightIcon?: React.ReactNode;
}

export const PageHeader = ({ title, color, fontSize, fontWeight, align, showBackButton, rightIcon }: PageHeaderProps) => {

    const navigation = useNavigation();
    const overrideStyle = {
        ...(color && { color }),
        ...(fontSize && { fontSize }),
        ...(fontWeight && { fontWeight }),
        ...(align && { textAlign: align }),
    };
    return (
        <View style={styles.headerContainer}>
            {/* SOL ALAN: Geri Butonu */}
            <View style={styles.leftSlot}>
                {showBackButton && (
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <ChevronLeft size={28} color={theme.colors.text} />
                    </TouchableOpacity>
                )}
            </View>

            {/* ORTA ALAN: Başlık */}
            <View style={styles.titleSlot}>
                <Text
                    style={[
                        styles.headerTitle,
                        overrideStyle,
                        align === 'center' && { textAlign: 'center' } // Eğer center ise metni de ortala
                    ]}
                    numberOfLines={1}
                >
                    {title}
                </Text>
            </View>

            {/* SAĞ ALAN: İkon */}
            <View style={styles.rightSlot}>
                {rightIcon && rightIcon}
            </View>
        </View>
    );
};

// const styles = StyleSheet.create({
//     headerContainer: {
//         backgroundColor: '#FFFFFF',
//         paddingVertical: 10,
//         elevation: 3,
//         shadowColor: '#000000',
//         shadowOffset: { width: 0, height: 3 },
//         shadowOpacity: 0.1,
//         zIndex: 10,
//     },
//     leftSlot: {
//         width: 40, // Sol ve sağ alanı eşitleyelim ki başlık tam ortada kalsın
//     },
//     titleSlot: {
//         flex: 1, // Başlık kalan tüm alanı doldursun
//     },
//     rightSlot: {
//         width: 40,
//         alignItems: 'flex-end',
//     },
//     headerTitle: {
//         fontSize: 24,
//         fontWeight: '400',
//         color: theme.colors.text,
//         letterSpacing: -1,
//         paddingHorizontal: 30,
//         marginVertical: 5,
//     },
// });

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row', // KRİTİK: Parçaları yan yana dizer
        alignItems: 'center', // Parçaları dikeyde ortalar
        backgroundColor: '#FFFFFF',
        height: 64,
        paddingHorizontal: 15, // Kenarlardan güvenli alan
        elevation: 3,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        zIndex: 10,
    },
    leftSlot: {
        width: 45, // Geri butonu alanı
        justifyContent: 'center',
        height: '100%'
    },
    titleSlot: {
        flex: 1, // Kalan tüm orta alanı başlığa verir
        justifyContent: 'center',
        height: '100%'
    },
    rightSlot: {
        width: 45, // Sol slot ile aynı genişlikte olmalı ki başlık tam ortalansın
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: '100%'
    },
    headerTitle: {
        fontSize: 20, // Tasarıma uygun biraz daha kibar bir boyut
        fontWeight: '600',
        color: theme.colors.text,
        letterSpacing: -0.5,
        // paddingHorizontal: 30'u sildik çünkü slotlar zaten boşluğu sağlıyor
    },
});