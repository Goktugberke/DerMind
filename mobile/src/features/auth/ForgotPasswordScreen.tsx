import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';
import { theme } from '@constants/theme';
import { CustomButton } from '@components/CustomButton';
import { CustomInput } from '@components/CustomInput';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const auth = getAuth();

  const handleReset = async () => {
    if (!email) {
      Alert.alert("Hata", "Lütfen kayıtlı e-posta adresinizi girin.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      
      Alert.alert(
        "E-posta Gönderildi",
        "Şifre sıfırlama bağlantısı gönderildi. Lütfen mail kutunuzu kontrol edin.",
        [{ text: "Tamam", onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert("Hata", "Sıfırlama maili gönderilemedi. Mail adresini kontrol edin.");
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainFormContainer}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <View style={styles.inputArea}>
            <CustomInput
              label=""
              placeholder="example@mail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.buttonWrapper}>
            <CustomButton title="Send Link" onPress={handleReset} />
          </View>

          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  mainFormContainer: {
    width: '90%',
    alignSelf: 'center',
    paddingVertical: 20,
  },
  title: { 
    fontSize: 24,
    fontWeight: 'bold', 
    color: theme.colors.gray, 
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingLeft: 5
  },
  subtitle: { 
    fontSize: 16, 
    color: theme.colors.gray, 
    marginBottom: 30,
    paddingLeft: 5 
  },
  inputArea: {
    width: '100%',
    marginBottom: 0,
  },
  buttonWrapper: {
    marginTop: 10,
    width: '100%',
  },
  backButton: { 
    marginTop:15, 
    alignItems: 'center' 
  },
  backText: { 
    color: theme.colors.secondary, 
    fontWeight: '600',
    fontSize: 15
  }
});