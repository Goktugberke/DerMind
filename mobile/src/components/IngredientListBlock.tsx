import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@constants/theme';
import { ShieldCheck, ShieldAlert, Shield, Info } from 'lucide-react-native';

export type IngredientSeverity = 'safe' | 'medium' | 'risky';

export interface IngredientDetails {
    name: string;
    subName: string;
    tag: string;
    severity: IngredientSeverity;
}

interface IngredientListBlockProps {
    ingredients: IngredientDetails[];
}

export const IngredientListBlock = ({ ingredients }: IngredientListBlockProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Defensive guard: ensure ingredients is always an array
    const safeIngredients: IngredientDetails[] = Array.isArray(ingredients) ? ingredients : [];
    const displayedIngredients = isExpanded ? safeIngredients : safeIngredients.slice(0, 5);

    return (
        <View style={styles.blockContainer}>
            {/* Header */}
            <View style={styles.headerArea}>
                <View>
                    <Text style={styles.titleText}>Ingredient Analysis</Text>
                    <Text style={styles.subtitleText}>{safeIngredients.length} INGREDIENTS FOUND</Text>
                </View>
                <TouchableOpacity style={styles.infoButton}>
                    <Info size={16} color={theme.colors.gray} />
                </TouchableOpacity>
            </View>

            {/* List */}
            <View>
                {displayedIngredients.map((item, index) => (
                    <View key={index}>
                        <View style={styles.rowItem}>
                            {/* Icon Based on Severity */}
                            <View style={[styles.iconBox, getSeverityStyle(item.severity)]}>
                                {getSeverityIcon(item.severity)}
                            </View>

                            {/* Details */}
                            <View style={styles.detailsContent}>
                                <Text style={styles.ingredientName}>{item.name}</Text>
                                <Text style={styles.subName}>{item.subName}</Text>
                                <View style={styles.tagWrapper}>
                                    <Text style={styles.tagText}>{item.tag}</Text>
                                </View>
                            </View>

                            {/* Right Arrow */}
                            <Text style={styles.chevron}>›</Text>
                        </View>
                        {/* Divider except last */}
                        {index !== displayedIngredients.length - 1 && <View style={styles.divider} />}
                    </View>
                ))}

                {/* Footer Action */}
                {safeIngredients.length > 5 && (
                    <TouchableOpacity
                        style={styles.footerActionRow}
                        onPress={() => setIsExpanded(!isExpanded)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.footerText}>
                            {isExpanded ? 'Show Less' : 'View All Ingredients'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// --- Helper Functions for Severity Styles ---

const getSeverityStyle = (severity: IngredientSeverity) => {
    switch (severity) {
        case 'safe': return { backgroundColor: '#C1F8DB' }; // Very light gray
        case 'medium': return { backgroundColor: '#FFEFB3' };
        case 'risky': return { backgroundColor: '#FFDADA' }; // Light red
        default: return { backgroundColor: '#F9FAFB' };
    }
};

const getSeverityIcon = (severity: IngredientSeverity) => {
    switch (severity) {
        case 'safe':
            return <ShieldCheck size={20} color={theme.colors.text} />;
        case 'medium':
            return <ShieldAlert size={20} color={theme.colors.text} />;
        case 'risky':
            return <Shield size={20} color={theme.colors.text} />;
        default:
            return <Shield size={20} color={theme.colors.gray} />;
    }
};

const styles = StyleSheet.create({
    blockContainer: {
        marginTop: 5,
        marginBottom: 5,
    },
    headerArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 5,
        paddingRight: 0,
        marginBottom: 10,
    },
    titleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    subtitleText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.gray,
        marginTop: 2,
        letterSpacing: 0.5,
    },
    infoButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        marginLeft: 15,
    },
    listCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 15,
        borderRadius: 24,
        padding: 20,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    rowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    detailsContent: {
        flex: 1,
    },
    ingredientName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    subName: {
        fontSize: 12,
        color: theme.colors.gray,
        marginTop: 2,
    },
    tagWrapper: {
        backgroundColor: '#F5F5F5',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 6,
    },
    tagText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666',
    },
    chevron: {
        fontSize: 20,
        color: theme.colors.lightGray,
        paddingLeft: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 4,
    },
    footerActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        marginTop: 10,
    },
    footerText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    cameraButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFF0F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 'auto',
    }
});
