import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@constants/theme';
import { FlaskConical, MessageSquareText, ShoppingCart } from 'lucide-react-native';

interface TabItem {
    id: string;
    label: string;
    icon: React.ElementType;
}

const TABS: TabItem[] = [
    { id: 'ingredients', label: 'Ingredients', icon: FlaskConical },
    { id: 'comments', label: 'Comments', icon: MessageSquareText },
    { id: 'cart', label: 'Add to Cart', icon: ShoppingCart },
];

interface TabSelectorProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export const TabSelector = ({ activeTab, onTabChange }: TabSelectorProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.pillBackground}>
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const IconComponent = tab.icon;

                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.tabButton,
                                isActive && styles.activeTabButton
                            ]}
                            onPress={() => onTabChange(tab.id)}
                            activeOpacity={0.7}
                        >
                            <IconComponent
                                size={22}
                                color={isActive ? '#8C67F6' : theme.colors.gray} // Soft purple/indigo for active
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <Text style={[
                                styles.tabLabel,
                                isActive && styles.activeTabLabel
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 15,
        marginVertical: 5,
    },
    pillBackground: {
        flexDirection: 'row',
        backgroundColor: '#ffffffff', // Very light gray/white background
        borderRadius: 24,
        padding: 6,
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 2,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 20,
        gap: 6, // space between icon and text
    },
    activeTabButton: {
        backgroundColor: '#EBE4FF', // Soft purple background for active state
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.gray,
    },
    activeTabLabel: {
        color: '#8C67F6',
        fontWeight: 'bold',
    }
});
