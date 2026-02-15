import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '@constants/theme';

interface CategoryItemProps {
  name: string;
  onPress?: () => void;
}

export const CategoryItem = ({ name, onPress }: CategoryItemProps) => {
  return (
    <TouchableOpacity style={styles.categoryItem} onPress={onPress}>
      <Text style={styles.categoryLabel}>{name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  categoryItem: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  categoryLabel: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
});