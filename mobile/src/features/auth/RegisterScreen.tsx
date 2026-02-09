import React, { useState, useEffect } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { theme } from '@constants/theme';
import { CustomButton } from '@components/CustomButton';
import { CustomInput } from '@components/CustomInput';
import { authService } from '@services/api';

const auth = getAuth();

export const RegisterScreen = ({ navigation }: any) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "501421333036-kj31viigcrge47ulo2j3li4qedn4gtif.apps.googleusercontent.com",
    });
  }, []);

  const validateFullName = (text: string) => {
    setFullName(text);
    if (text.length == 0 || text.length == 1) {
      setErrors(prev => ({ ...prev, fullName: 'Name is too short' }));
    } else {
      setErrors(prev => ({ ...prev, fullName: '' }));
    }
  };

  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /\S+@\S+\.\S+/;
    if (text.length > 0 && !emailRegex.test(text) || text.length == 0) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const validatePassword = (text: string) => {
    setPassword(text);
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*.,:;~<|>_-])[a-zA-Z0-9!@#$%^&*]{6,}$/;

    if (text.length === 0) {
      setErrors(prev => ({ ...prev, password: '' }));
    } else if (text.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Min. 6 characters required' }));
    } else if (!/(?=.*[0-9])/.test(text)) {
      setErrors(prev => ({ ...prev, password: 'Must include at least one number' }));
    } else if (!/(?=.*[!@#$%^&*.,:;~<|>_-])/.test(text)) {
      setErrors(prev => ({ ...prev, password: 'Must include one special character (@#$!..)' }));
    } else {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const validateConfirmPassword = (text: string) => {
    setConfirmPassword(text);
    if (text.length > 0 && text !== password) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  const onGoogleButtonPress = async () => {
    try {
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      const googleUser = response.data?.user;
      if (!idToken) return;

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);

      await authService.firebaseLogin({
        token: idToken,
        email: googleUser?.email,
        name: googleUser?.name,
        picture: googleUser?.photo,
        uid: userCredential.user.uid
      });
      navigation.navigate('Home');

    } catch (error) {
      console.error('Google Register Error:', error);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    try {

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      const userData = {
        id: uid,
        email: email,
        name: fullName,
        password: "",
        skinType: "",
        allergens: "",
        picture: ""
      };

      await authService.register(userData);
      navigation.navigate('Home');

    } catch (error: any) {
      console.error("Kayıt Hatası:", error);
      const msg = error.code ? "Firebase: " + error.message : "Backend: Bağlantı hatası";
      Alert.alert("Hata", msg);
    }
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

        {/* Header Alanı */}
        <View style={styles.headerArea}>
          <Text style={styles.logoText}>
            DerMind
          </Text>
          <Text style={styles.subtitle}>Create an account to start your journey.</Text>
        </View>

        <View style={styles.mainFormContainer}>
          <Text style={styles.registerTitle}>Register</Text>

          <View style={styles.inputArea}>
            <CustomInput
              label=""
              placeholder="Full Name"
              value={fullName}
              onChangeText={validateFullName}
              error={errors.fullName}
            />
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
              onChangeText={validatePassword}
              isPassword={true}
              error={errors.password}
            />
            <CustomInput
              label=""
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={validateConfirmPassword}
              isPassword={true}
              error={errors.confirmPassword}
            />
          </View>


          <CustomButton title="Register" onPress={handleRegister} />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.googleButton} onPress={onGoogleButtonPress}>

            <Image
              source={require('@assets/google_logo.png')}
              style={styles.googleLogo}
            />

            <Text style={styles.googleButtonText}>Sign up with Google</Text>
          </TouchableOpacity>
        </View>

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
  subtitle: {
    fontSize: theme.fontSize.medium,
    textAlign: 'center',
    color: theme.colors.gray,
    marginTop: theme.spacing.s,
  },
  registerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.gray,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.l,
    paddingLeft: theme.spacing.xs,
  },
  inputArea: {
    marginBottom: 0,
    width: '100%',
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
});