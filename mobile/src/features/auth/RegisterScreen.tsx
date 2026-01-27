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
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

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

  const handleRegister = () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    if(Object.values(errors).some(error => error !== '')) {
      Alert.alert("Error", "Please fix the errors before registering.");
      return;
    }

    console.log("successfully registered");
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
          <Text style={[globalStyles.title, { color: theme.colors.primary, fontSize: 38 }]}>
            DerMind
          </Text>
          <Text style={styles.subtitle}>Create an account to start your journey.</Text>
        </View>

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
    marginBottom: theme.spacing.l,
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