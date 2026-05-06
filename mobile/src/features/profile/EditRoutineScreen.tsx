import React from 'react';
import { StyleSheet, ScrollView, View, SafeAreaView, Text, Alert } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ProductHeroCard } from '@components/ProductHeroCard';
import { CustomButton } from '@components/CustomButton';
import { FrequencySelector, FrequencyData } from '@components/FrequencySelector';
import { theme } from '@constants/theme';
import { useUpdateStreak } from '../../services/api';

export const EditRoutineScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { streak } = route.params || {};
  const [frequencyData, setFrequencyData] = React.useState<FrequencyData>();

  const { mutateAsync: updateStreak, isPending } = useUpdateStreak();

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

  const handleEditRoutine = async () => {
    if (!streak?.id) {
      Alert.alert('Error', 'Routine information is missing.');
      return;
    }

    if (!frequencyData || !frequencyData.isValid) {
      Alert.alert('Error', 'Please enter valid time and day values.');
      return;
    }

    try {
      const payload: any = {
        usageFrequency: frequencyData.usageFrequency,
      };

      let times: string[] = [];
      if (frequencyData.frequencyId === 'once_day') times.push(frequencyData.time1);
      if (frequencyData.frequencyId === 'twice_day') times.push(frequencyData.time1, frequencyData.time2);

      if (times.length > 0) {
        payload.customTimes = times.map(formatTimeForBackend);
      }

      let days: string[] = [];
      if (frequencyData.frequencyId === 'once_week') days.push(frequencyData.day1.toUpperCase());
      if (frequencyData.frequencyId === 'twice_week') days.push(frequencyData.day1.toUpperCase(), frequencyData.day2.toUpperCase());

      if (days.length > 0) {
        payload.daysOfWeek = days;
      }

      Alert.alert(
        'Confirm Update',
        'Are you sure you want to update your routine schedule?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            onPress: async () => {
              try {
                await updateStreak({ id: streak.id, data: payload });
                Alert.alert(
                  'Success \uD83C\uDF89',
                  `Your routine has been updated.`,
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } catch (error: any) {
                const msg = error?.response?.data || 'Failed to update routine.';
                Alert.alert('Error', msg);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error(error);
    }
  };

  const isButtonDisabled = (frequencyData && !frequencyData.isValid);

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader
        title="Edit Routine"
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
        <Text style={styles.mainTitle}>Your Plan</Text>
        <Text style={styles.subTitle}>Customize your schedule</Text>
        <View style={styles.section}>
          <ProductHeroCard
            name={streak?.productName || "Unknown Product"}
            brand={streak?.productBrand || "Unknown Brand"}
          />
        </View>

        <View style={styles.section}>
          <FrequencySelector onChange={setFrequencyData} />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title="Save Changes"
          onPress={handleEditRoutine}
          isLoading={isPending}
          disabled={isButtonDisabled}
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
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  section: {
    marginVertical: 10,
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
