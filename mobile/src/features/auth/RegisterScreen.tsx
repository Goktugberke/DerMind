import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { theme } from '@constants/theme';
import { globalStyles } from '@constants/globalstyles';
import { CustomButton } from '@components/CustomButton';
import { CustomInput } from '@components/CustomInput';

export const RegisterScreen = ({ navigation }: any) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address!");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long!");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    console.log("Kayıt başarılı, veriler hazırlanıyor...");
  };

return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
        
        {/* Header Alanı - Margiler çok yüksek olduğu için kaymama ihtimali artıyor */}
        <View style={styles.headerArea}>
          <Text style={[globalStyles.title, { color: theme.colors.primary, fontSize: 38 }]}>
            DerMind
          </Text>
          <Text style={styles.subtitle}>Create an account to start your journey.</Text>
        </View>

        <Text style={styles.registerTitle}>Register</Text>

        <View style={styles.inputArea}>
          <CustomInput label="" placeholder="Full Name" value={fullName} onChangeText={setFullName} />
          <CustomInput label="" placeholder="Email" value={email} onChangeText={setEmail} keyboardType='email-address' />
          <CustomInput label="" placeholder="Password" value={password} onChangeText={setPassword} isPassword={true} />
          <CustomInput label="" placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} isPassword={true} />
        </View>

        <CustomButton title="Register" onPress={handleRegister} />

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Login</Text>
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
  subtitle: {
    fontSize: theme.fontSize.medium,
    textAlign: 'center',
    color: theme.colors.gray,
    marginTop: theme.spacing.s,
  },
  registerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.gray,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
    paddingLeft: theme.spacing.xs,
  },
  inputArea: {
    marginBottom: theme.spacing.m,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.fontSize.small,
    color: theme.colors.text,
  },
  loginLink: {
    fontSize: theme.fontSize.small,
    color: theme.colors.secondary,
    fontWeight: 'bold',
  },
});