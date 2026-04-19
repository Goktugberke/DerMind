import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Check } from 'lucide-react-native'; // Lucide ikonları kullandığını varsayıyorum

interface SortOption {
    id: string;
    label: string;
}

interface SortModalProps {
    visible: boolean;
    onClose: () => void;
    options: SortOption[];
    selectedOption: string;
    onSelect: (id: string) => void;
    theme: any; // Teman için özel bir interface'in varsa onu buraya yazabilirsin (örn: Theme)
}

export const SortModal = ({
    visible,
    onClose,
    options,
    selectedOption,
    onSelect,
    theme
}: SortModalProps) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>

                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Sort</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.sortOption}
                            onPress={() => {
                                onSelect(option.id);
                                onClose();
                            }}
                        >
                            <Text style={[
                                styles.optionText,
                                { color: theme.colors.text },
                                selectedOption === option.id && { color: theme.colors.secondary, fontWeight: 'bold' }
                            ]}>
                                {option.label}
                            </Text>
                            {selectedOption === option.id && (
                                <Check size={20} color={theme.colors.secondary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        borderRadius: 15,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sortOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    },
    optionText: {
        fontSize: 16,
    },
});