import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '@constants/theme';
import { Minus, Plus, ShoppingCart, Check, Truck, RotateCcw, Shield } from 'lucide-react-native';
import { cartService } from '@services/api';

interface CartTabProps {
    productId: string;
    price: string;
    productName?: string;
}

export const CartTab = ({ productId, price, productName = 'This Product' }: CartTabProps) => {
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const priceNum = parseFloat(price);
    const totalPrice = (priceNum * quantity).toFixed(2);

    const handleAddToCart = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await cartService.addItem(productId, quantity);
            setAdded(true);
            setTimeout(() => setAdded(false), 2500);
        } catch (error) {
            console.error("Failed to add to cart:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <View style={styles.container}>

            {/* Quantity Selector */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Quantity</Text>
                <View style={styles.quantityControl}>
                    <TouchableOpacity
                        style={[styles.qtyButton, quantity <= 1 && styles.qtyButtonDisabled]}
                        onPress={() => setQuantity(q => Math.max(1, q - 1))}
                        activeOpacity={0.7}
                        disabled={quantity <= 1}
                    >
                        <Minus size={14} color={quantity <= 1 ? '#C0C0C0' : theme.colors.text} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{quantity}</Text>
                    <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => setQuantity(q => q + 1)}
                        activeOpacity={0.7}
                    >
                        <Plus size={14} color={theme.colors.text} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Price Breakdown */}
            <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                    <Text style={styles.priceRowLabel}>Unit price</Text>
                    <Text style={styles.priceRowVal}>${price}</Text>
                </View>
                {quantity > 1 && (
                    <View style={styles.priceRow}>
                        <Text style={styles.priceRowLabel}>× {quantity} items</Text>
                        <Text style={styles.priceRowVal}>${totalPrice}</Text>
                    </View>
                )}
                <View style={styles.divider} />
                <View style={styles.priceRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${totalPrice}</Text>
                </View>
            </View>

            {/* Trust Badges */}
            <View style={styles.badgeRow}>
                <View style={styles.badge}>
                    <Truck size={14} color={theme.colors.gray} />
                    <Text style={styles.badgeText}>Free Shipping</Text>
                </View>
                <View style={styles.badge}>
                    <RotateCcw size={14} color={theme.colors.gray} />
                    <Text style={styles.badgeText}>30-day return</Text>
                </View>
                <View style={styles.badge}>
                    <Shield size={14} color={theme.colors.gray} />
                    <Text style={styles.badgeText}>Secure payment</Text>
                </View>
            </View>

            {/* Add to Cart Button */}
            <TouchableOpacity
                style={[styles.addButton, added && styles.addButtonSuccess]}
                onPress={handleAddToCart}
                activeOpacity={0.85}
            >
                {isProcessing ? (
                    <ActivityIndicator color="#FFF" />
                ) : added ? (
                    <Check size={20} color="#FFF" strokeWidth={3} />
                ) : (
                    <ShoppingCart size={20} color="#FFF" strokeWidth={2.5} />
                )}
                <Text style={styles.addButtonText}>
                    {isProcessing ? 'Adding...' : added ? 'Added to Cart!' : 'Add to Cart'}
                </Text>
            </TouchableOpacity>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 8,
        gap: 16,
    },
    section: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.deepbackground,
        borderRadius: 50,
        paddingHorizontal: 4,
        paddingVertical: 4,
        gap: 4,
    },
    qtyButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    qtyButtonDisabled: {
        backgroundColor: '#F0F0F0',
        shadowOpacity: 0,
        elevation: 0,
    },
    qtyValue: {
        fontSize: 17,
        fontWeight: '800',
        color: theme.colors.text,
        minWidth: 36,
        textAlign: 'center',
    },
    priceCard: {
        backgroundColor: theme.colors.deepbackground,
        borderRadius: 16,
        padding: 15,
        gap: 10,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceRowLabel: {
        fontSize: 13,
        color: theme.colors.gray,
        fontWeight: '500',
    },
    priceRowVal: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E8E8E8',
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    badgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
    },
    badge: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        backgroundColor: theme.colors.deepbackground,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 6,
    },
    badgeText: {
        fontSize: 10,
        color: theme.colors.gray,
        fontWeight: '600',
        textAlign: 'center',
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 18,
        gap: 10,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    addButtonSuccess: {
        backgroundColor: '#34C759',
        shadowColor: '#34C759',
    },
    addButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 0.3,
    },
});
