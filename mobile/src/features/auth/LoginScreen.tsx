import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export const LoginScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DerMind'a Hoş Geldiniz</Text>
      <Text style={styles.subtitle}>Zihinsel sağlık yolculuğunuz burada başlıyor.</Text>
      <Button 
        title="Giriş Yap" 
        onPress={() => navigation.navigate('Home')} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#666' }
});