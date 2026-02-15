import React from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';

import { theme } from '@constants/theme';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
}

export const SearchBar = ({ placeholder, value, onChangeText }: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <Search color={theme.colors.gray} size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder || "Search..."}
          placeholderTextColor={theme.colors.lightGray}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 15,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
  },
});