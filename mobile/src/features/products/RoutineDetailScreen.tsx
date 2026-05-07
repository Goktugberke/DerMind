import React from 'react';
import { StyleSheet, ScrollView, View, SafeAreaView, Text, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PageHeader } from '@components/PageHeader';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ProductHeroCard } from '@components/ProductHeroCard';
import { RoutineCalendar } from '@components/RoutineCalendar';
import { CustomButton } from '@components/CustomButton';
import { theme } from '@constants/theme';
import { useGetStreak, useUseStreak } from '../../services/api';

const LOCK_DURATION = 10 * 60 * 60 * 1000; // 10 hours in milliseconds

export const RoutineDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { streak: initialStreak } = route.params || {};

  // En güncel veriyi çekelim
  const { data: streak, isLoading, refetch } = useGetStreak(initialStreak?.id);
  const { mutateAsync: useStreak, isPending: isUsing } = useUseStreak();
  const [isLocked, setIsLocked] = React.useState(false);

  React.useEffect(() => {
    let timer: any;
    const checkLockStatus = async () => {
      if (!streak?.id) return;
      try {
        const lastUsed = await AsyncStorage.getItem(`streak_lock_${streak.id}`);
        if (lastUsed) {
          const lastUsedTime = parseInt(lastUsed, 10);
          const diff = Date.now() - lastUsedTime;
          if (diff < LOCK_DURATION) {
            setIsLocked(true);
            // Re-check after the lock expires
            timer = setTimeout(() => setIsLocked(false), LOCK_DURATION - diff);
          } else {
            setIsLocked(false);
          }
        }
      } catch (e) {
        console.error('Failed to load lock status', e);
      }
    };
    checkLockStatus();
    return () => timer && clearTimeout(timer);
  }, [streak?.id]);

  const handleUseStreak = async () => {
    try {
      await useStreak(streak.id);
      
      // Save lock time
      const now = Date.now().toString();
      await AsyncStorage.setItem(`streak_lock_${streak.id}`, now);
      setIsLocked(true);

      Alert.alert('Success!', 'Usage recorded. Keep up the good work!');
      refetch(); // Veriyi yenile
    } catch (error) {
      Alert.alert('Error', 'Failed to record usage.');
    }
  };

  // Takvimde işaretlenecek günler
  const getMarkedDates = () => {
    if (!streak?.lastUsedDate) return {};

    return {
      [streak.lastUsedDate]: {
        selected: true,
        selectedColor: '#86EFAC', // Soft Green
        textColor: '#065F46', // Dark Green Text
        startingDay: true,
        endingDay: true,
        color: '#86EFAC'
      }
    };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader
        title="Your Routine"
        fontSize={20}
        fontWeight="600"
        align="left"
        showBackButton={true}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.mainTitle}>Routine Progress</Text>
        <Text style={styles.subTitle}>Check your skincare journey</Text>

        <View style={styles.section}>
          <ProductHeroCard
            name={streak?.productName || "Product"}
            brand={streak?.productBrand || "Brand"}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak?.totalUses || 0}</Text>
            <Text style={styles.statLabel}>Total Uses</Text>
          </View>
        </View>

        <View style={styles.section}>
          <RoutineCalendar markedDates={getMarkedDates()} />
        </View>

        <View style={styles.buttonSection}>
          <CustomButton
            title={isLocked ? "Already Used" : "Used"}
            onPress={handleUseStreak}
            isLoading={isUsing}
            disabled={isLocked}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.deepbackground,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subTitle: {
    fontSize: 14,
    color: '#7C7C7C',
    marginBottom: 10,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  section: {
    marginVertical: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 4,
  },
  buttonSection: {
    marginTop: 20,
  }
});
