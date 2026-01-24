import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@constants/theme';
import { globalStyles } from '@constants/globalstyles';
import { CustomButton } from '@components/CustomButton';
import { CustomInput } from '@components/CustomInput';

export const LoginScreen = ({ navigation }: any) => {
  // Input değerlerini tutmak için state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={globalStyles.container}>
      {/* Header Alanı */}
      <View style={styles.headerArea}>
        <Text style={[globalStyles.title,
        {
          color: theme.colors.primary,
          fontSize: 38,
          fontWeight: '800',
          letterSpacing: 1.2
        }]}>
          DerMind
        </Text>
        <Text style={styles.subtitle}>
          Welcome back! Please login to your account.
        </Text>
      </View>

      <Text style={styles.loginTitle}>Login</Text>

      {/* Input Alanları */}
      <View style={styles.inputArea}>
        <CustomInput
          label=""
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType='email-address'
        />

        <CustomInput
          label=""
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          isPassword={true} // Göz ikonu için
        />
      </View>

      {/* Login Butonu */}
      <CustomButton
        title="Login"
        onPress={() => {
          console.log("Giriş denemesi:", email, password);
          navigation.navigate('Home');
        }}
      />

      <Text style={styles.footerText}>
        Don't you have an account? <Text style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>Register</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerArea: {
    marginTop: 100,
    marginBottom: 160,
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.gray,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
    paddingLeft: theme.spacing.xs,
  },
  inputArea: {
    marginBottom: theme.spacing.l,
  },
  subtitle: {
    fontSize: theme.fontSize.medium,
    textAlign: 'center',
    color: theme.colors.gray,
    marginTop: theme.spacing.s,
  },
  footerText: {
    textAlign: 'center',
    marginTop: theme.spacing.l,
    fontSize: theme.fontSize.small,
    color: theme.colors.text,
  }
});