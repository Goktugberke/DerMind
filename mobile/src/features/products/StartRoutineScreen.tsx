import React from 'react';
import { StyleSheet, ScrollView, View, SafeAreaView, Text } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { useRoute } from '@react-navigation/native';
import { ProductHeroCard } from '@components/ProductHeroCard';
import { RoutineCalendar } from '@components/RoutineCalendar';
import { DateInfoCard } from '@components/DateInfoCard';
import { CustomButton } from '@components/CustomButton';
import { ExpertTipBox } from '@components/ExpertTipBox';
import { FrequencySelector, FrequencyData } from '@components/FrequencySelector';
import { ReminderRow } from '@components/ReminderRow';
import { theme } from '@constants/theme';
import { useStartStreak } from '../../services/api';
import { Alert } from 'react-native';

export const StartRoutineScreen = () => {

  const route = useRoute<any>();
  const { product } = route.params || {};
  const [dates, setDates] = React.useState({ start: '-', end: '-' });
  const [remindersEnabled, setRemindersEnabled] = React.useState(true);
  const [frequencyData, setFrequencyData] = React.useState<FrequencyData>();

  const { mutateAsync: startStreak, isPending } = useStartStreak();

  const handleRangeSelect = (start: string, end: string) => {
    setDates({ start, end });
  };

  const formatTimeForBackend = (val: string) => {
    let raw = val.trim();
    if (!raw.toLowerCase().includes('m')) return raw;

    let timePart = raw;
    let pm = false;
    if (raw.toLowerCase().includes('pm')) { pm = true; timePart = raw.replace(/pm/i, '').trim(); }
    if (raw.toLowerCase().includes('am')) { pm = false; timePart = raw.replace(/am/i, '').trim(); }

    let parts = timePart.split(':');
    let hours = parseInt(parts[0] || '0', 10);
    let minutes = parts[1] || '00';

    if (pm && hours < 12) hours += 12;
    if (!pm && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const handleStartRoutine = async () => {
    if (!product?.id) {
      Alert.alert('Error', 'Product information is missing.');
      return;
    }

    if (isPending) return;

    if (!frequencyData || !frequencyData.isValid) {
      Alert.alert('Error', 'Please enter valid time and day values.');
      return;
    }

    try {
      const payload: any = {
        productId: Number(product.id),
        usageFrequency: frequencyData.usageFrequency,
      };

      // Zamanları belirle
      if (frequencyData.frequencyId === 'twice_day') {
        payload.customTimes = [formatTimeForBackend(frequencyData.time1), formatTimeForBackend(frequencyData.time2)];
      } else {
        payload.customTimes = [formatTimeForBackend(frequencyData.time1)];
      }

      // Günleri belirle (Sadece haftalık rutinler için)
      if (frequencyData.frequencyId === 'once_week') {
        payload.daysOfWeek = [frequencyData.day1.toUpperCase()];
      } else if (frequencyData.frequencyId === 'twice_week') {
        payload.daysOfWeek = [frequencyData.day1.toUpperCase(), frequencyData.day2.toUpperCase()];
      } else {
        payload.daysOfWeek = null;
      }

      await startStreak(payload);

      Alert.alert(
        'Routine Started! \uD83C\uDF89',
        `Your ${product.name} routine has been created.`,
        // [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      const msg = error?.response?.data || 'Failed to start routine. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  // Kontrol: Tarihler seçilmediyse veya veriler geçersizse
  const isButtonDisabled = dates.start === '-' || dates.end === '-' || (frequencyData && !frequencyData.isValid);

  const formatDateDisplay = (dateString: string) => {
    if (dateString === '-') return '-';

    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader
        title="Start Routine"
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
        {/* Tasarımdaki başlıklar */}
        <Text style={styles.mainTitle}>Your Plan</Text>
        <Text style={styles.subTitle}>Customize your schedule</Text>
        {/* 2. New Plan & Product Card Bölümü buraya gelecek */}
        <View style={styles.section}>
          <ProductHeroCard
            name={product?.name || "Moisturizer"}
            brand={product?.brand || "La Roche Posay"}
            imageUrl={product?.image} // Eğer veritabanında görsel varsa
          />
        </View>

        {/* 3. Takvim Bölümü buraya gelecek */}
        <View style={styles.section}>
          <RoutineCalendar onRangeSelect={handleRangeSelect} />
        </View>

        <View style={styles.section}>
          <FrequencySelector onChange={setFrequencyData} />
        </View>

        {/* 5. Expert Tip ve Hatırlatıcılar */}
        <View style={styles.section}>
          <ExpertTipBox
            tip="Apply this moisturizer to slightly damp skin to lock in maximum hydration. Consistency is key!"
          />
          <ReminderRow
          />
        </View>

        {/* Alt boşluk: Butonun ScrollView'da kapanmaması için */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 6. Sabit Alt Buton (Footer) */}
      <View style={styles.footer}>
        <CustomButton
          title="Start Routine"

          onPress={handleStartRoutine}
          isLoading={isPending}
        />
      </View>
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
    backgroundColor: '#F8F9FA', // Sayfa arka planı hafif gri tonlu (mockup'taki gibi)
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subTitle: {
    fontSize: 14,
    color: '#7C7C7C',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  section: {
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
});