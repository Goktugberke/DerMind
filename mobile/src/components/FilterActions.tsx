import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@constants/theme';

interface FilterActionsProps {
  onSort: () => void;
  onFilter: () => void;
}

export const FilterActions = ({ onSort, onFilter }: FilterActionsProps) => {
  return (
    <View style={styles.filterRow}>
      <TouchableOpacity style={styles.filterButton} onPress={onSort} activeOpacity={0.7}>
        <Text style={styles.filterButtonText}>Sırala</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.filterButton} onPress={onFilter} activeOpacity={0.7}>
        <Text style={styles.filterButtonText}>Filtrele</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 45,
    alignItems: 'center',
  },
  filterButton: {
    flex: 0.48,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
});