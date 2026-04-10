import React from 'react';
import { StyleSheet, Text, View, ImageBackground } from 'react-native';

interface ProductHeroProps {
    name: string;
    brand: string;
    imageUrl?: string;
}

export const ProductHeroCard = ({ name, brand, imageUrl }: ProductHeroProps) => {
    return (
        <View style={styles.container}>
            {/* Görsel Kartı */}
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&q=80&w=200' }}
                style={styles.cardContainer}
                imageStyle={{ borderRadius: 20 }}
                resizeMode='cover'
            >
                <View style={styles.overlay}>
                    <Text style={styles.productName}>{name}</Text>
                    <Text style={styles.brandName}>{brand}</Text>
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
    },
    cardContainer: {
        height: 160,
        width: '100%',
        justifyContent: 'flex-end',
        // Gölge efekti
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    overlay: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.25)', // Yazıların okunması için hafif karartma
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    productName: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    brandName: {
        color: '#E0E0E0',
        fontSize: 14,
    },
});