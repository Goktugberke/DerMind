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

  return (
    // 1. En dışta KeyboardAvoidingView: Tüm ekranı kaplar
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        // 2. ScrollView: İçeriğin taşmasına izin verir
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          flexGrow: 1, // İçeriğin ekran boyundan daha fazla uzayabilmesini sağlar
          paddingHorizontal: 20, // globalStyles'daki padding değerin
          paddingBottom: 40 // En altta mola payı
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Header Alanı - 100/160 Değerlerin Korundu */}
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
            onChangeText={setEmail}
            keyboardType='email-address'
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