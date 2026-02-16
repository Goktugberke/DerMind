import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { View, Text, Image, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import { theme } from '@constants/theme';
import { CustomButton } from '@components/CustomButton';
import { CustomInput } from '@components/CustomInput';
import { authService } from '@services/api';

import { HomeScreen } from '@features/home/HomeScreen';

// Firebase Authentication instance
const auth = getAuth();


export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Google Sign-In Configuration
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "501421333036-kj31viigcrge47ulo2j3li4qedn4gtif.apps.googleusercontent.com",
    });
  }, []);

  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /\S+@\S+\.\S+/;
    if (text.length > 0 && !emailRegex.test(text) || text.length == 0) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      Alert.alert("Success", "User UID: " + userCredential.user.uid);
      navigation.navigate(HomeScreen);

    } catch (error: any) {
      console.error("Login Error:", error);
      let errorMessage = "Wrong password.";

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password.";
      }

      Alert.alert("Login Failed", errorMessage);
    }
  };

  const onGoogleButtonPress = async () => {

    try {
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      const googleUser = response.data?.user;

      if (!idToken) throw new Error("Google Sign-In failed: No ID token returned");

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);

      try {
        await authService.firebaseLogin({
          token: idToken,
          email: googleUser?.email,
          name: googleUser?.name,
          picture: googleUser?.photo,
          uid: userCredential.user.uid
        });

        console.log('Google login successful, navigating to Home');
        navigation.navigate('Home');
      } catch (backendError) {
        await auth.signOut();
        Alert.alert("Login Failed", "Database sync failed. Please try again.");
      }
    } catch (error) {
      console.error('Google Giriş Hatası:', error);
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
          <Text style={styles.logoText}>
            DerMind
          </Text>
          <Text style={styles.subtitle}>
            Welcome back! Please login to your account.
          </Text>
        </View>

        <View style={styles.mainFormContainer}>
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

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Butonu */}
          <CustomButton title="Login" onPress={handleLogin} />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={onGoogleButtonPress}
          >
            <Image
              source={require('@assets/google_logo.png')}
              style={styles.googleLogo}
            />

            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>

        </View>

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
    marginVertical: 100,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 44,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: -1,
    textTransform: 'none',
  },
  mainFormContainer: {
    width: '90%',
    alignSelf: 'center',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.gray,
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingLeft: 5,
  },
  inputArea: {
    marginBottom: 0,
    width: '100%',
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

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.gray,
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 10,
    color: theme.colors.gray,
  },
  googleButton: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#000000',
    fontWeight: '600',
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 12,
    resizeMode: 'contain',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -10,
    marginBottom: 30,
    paddingRight: 5,
  },
  forgotPasswordText: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
});