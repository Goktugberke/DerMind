import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const globalStyles = StyleSheet.create({
  // Tüm ekranların ana kapsayıcısı
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // 'background' değerini buradan çekiyoruz
    paddingHorizontal: theme.spacing.m,     // Kenarlardan standart 16px boşluk
  },
  
  // İçeriği ortalamak için (Örn: Login sayfasındaki logo alanı)
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Yan yana dizilimler için (Örn: Bottom tab veya buton içindeki ikon-metin)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Tasarımındaki kutucuklar için yumuşak gölge efekti
  shadow: {
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android için gölge desteği
  },

  // Ortak başlık stili
  title: {
    fontSize: theme.fontSize.title,
    color: theme.colors.text,
    fontWeight: 'bold',
    marginBottom: theme.spacing.m,
  },

  // Input alanlarının üzerindeki küçük etiketler)
  label: {
    fontSize: theme.fontSize.small,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  }
});