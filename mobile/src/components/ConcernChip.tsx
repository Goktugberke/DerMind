import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { theme } from "@constants/theme";

export const ConcernChip = ({ label, isSelected, onPress }: any) => (
    <TouchableOpacity
        style={[
            styles.chip,
            isSelected ? { backgroundColor: theme.colors.secondary } : { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' }
        ]}
        onPress={onPress}
    >
        <Text style={[styles.chipText, isSelected ? { color: '#FFF' } : { color: '#475569' }]}>
            {label}
        </Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
    chipText: { fontSize: 14, fontWeight: '600' }
});