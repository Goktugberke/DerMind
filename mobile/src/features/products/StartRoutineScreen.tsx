import React from 'react';
import { StyleSheet, ScrollView, View, SafeAreaView } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { useRoute } from '@react-navigation/native';
import { ProductHeroCard } from '@components/ProductHeroCard';
import { RoutineCalendar } from '@components/RoutineCalendar';
import { DateInfoCard } from '@components/DateInfoCard';
import { CustomButton } from '@components/CustomButton';
import { ExpertTipBox } from '@components/ExpertTipBox';
import { ReminderRow } from '@components/ReminderRow';

export const StartRoutineScreen = () => {

  const route = useRoute<any>();
  const { product } = route.params || {};
  const [dates, setDates] = React.useState({ start: '-', end: '-' });
  const [loading, setLoading] = React.useState(false);
  const [remindersEnabled, setRemindersEnabled] = React.useState(true);

  const handleRangeSelect = (start: string, end: string) => {
    setDates({ start, end });
  };

  const handleStartRoutine = () => {
    setLoading(true);
    // Burada backend'e (POST /api/streaks) istek atma mantığını kuracaksın
    console.log("Rutin Başlatılıyor:", dates);

    // Simüle etmek için 2 saniye sonra durduralım
    setTimeout(() => {
      setLoading(false);
      // Başarılıysa başka sayfaya yönlendirilebilir
    }, 2000);
  };

  // Kontrol: Tarihler seçilmediyse buton basılamasın
  const isButtonDisabled = dates.start === '-' || dates.end === '-';

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

        {/* 4. Tarih Bilgi Kartları (Yan Yana) */}
        <View style={styles.row}>
          <DateInfoCard
            label="Start Date"
            date={formatDateDisplay(dates.start)}
          // isEnd yazmazsak varsayılan olarak başlangıç ikonu gelir
          />
          <DateInfoCard
            label="End Date"
            date={formatDateDisplay(dates.end)}
            isEnd={true} // Bitiş ikonu için
          />
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
          isLoading={loading}
          disabled={isButtonDisabled}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Sayfa arka planı hafif gri tonlu (mockup'taki gibi)
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
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
});