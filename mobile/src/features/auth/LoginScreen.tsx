import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform
} from 'react-native';
import { theme } from '@constants/theme';
import { globalStyles } from '@constants/globalstyles';
import { CustomButton } from '@components/CustomButton';
import { CustomInput } from '@components/CustomInput';

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

    const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /\S+@\S+\.\S+/;
    if (text.length > 0 && !emailRegex.test(text) || text.length == 0) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingBottom: 40
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Header Alanı */}
        <View style={styles.headerArea}>
          <Text style={[globalStyles.title, {
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
            onChangeText={validateEmail}
            keyboardType='email-address'
            error={errors.email}
          />

          <CustomInput
            label=""
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            isPassword={true}
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

        {/* Footer Alanı */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don't you have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: theme.spacing.l,
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
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.fontSize.small,
    color: theme.colors.text,
  },
  registerLink: {
    fontSize: theme.fontSize.small,
    color: theme.colors.secondary,
    fontWeight: 'bold',
  },
});