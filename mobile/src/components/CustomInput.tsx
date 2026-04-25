import React, { useState, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Pressable, KeyboardTypeOptions } from 'react-native';
import { theme } from '@constants/theme';
import { Eye, EyeOff } from 'lucide-react-native';

interface CustomInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  isPassword?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const CustomInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  isPassword = false,
  keyboardType = 'default',
  error,
  leftIcon,
}: CustomInputProps) => {
  const [isSecure, setIsSecure] = useState(isPassword);
  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        style={[
          styles.inputWrapper,
          error ? { borderColor: 'red' } : {}
        ]}
        onPress={handlePress}
      >
        {leftIcon && (
          <View style={styles.leftIconWrapper}>
            {leftIcon}
          </View>
        )}

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.gray}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          underlineColorAndroid="transparent"
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            style={styles.iconContainer}
          >
            {isSecure ? (
              <EyeOff size={20} color={theme.colors.gray} />
            ) : (
              <Eye size={20} color={theme.colors.secondary} />
            )}
          </TouchableOpacity>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: theme.spacing.m,
  },
  label: {
    fontSize: theme.fontSize.small,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.m,
    height: 55,
  },
  input: {
    flex: 1,
    height: '100%',
    color: theme.colors.text,
    fontSize: theme.fontSize.medium,
    paddingVertical: 0,
  },
  iconContainer: {
    padding: 10,
  },
  leftIconWrapper: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 2,
    marginLeft: 4,
  },
});