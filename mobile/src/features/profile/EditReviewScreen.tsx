import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Image } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { CustomButton } from '@components/CustomButton';
import { FeedbackInput } from '@components/FeedbackInput';
import { StarRating } from '@components/StarRating';
import { ProductHeroCard } from '@components/ProductHeroCard';
import { ShieldCheck, MessageSquare, Info } from 'lucide-react-native';
import { theme } from '../../constants/theme';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useUpdateRating } from '../../services/api';
import { Alert } from 'react-native';

export const EditReviewScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { product } = route.params || {};

    const [often, setOften] = useState(product?.usageFrequencyString);
    const [amount, setAmount] = useState(product?.usageAmountString);
    const [rating, setRating] = useState(product?.rating);
    const [comment, setComment] = useState(product?.review);

    const { mutateAsync: updateRating, isPending } = useUpdateRating();

    const handleSubmit = async () => {
        if (!rating) {
            Alert.alert("Error", "Please select a rating.");
            return;
        }

        try {
            await updateRating({ id: product.id, data: { rating, review: comment, wouldRecommend: true, usageFrequencyString: often, usageAmountString: amount } });
            Alert.alert("Success", "Your review has been submitted!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert("Error", "Failed to submit review.");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <PageHeader title="Edit Your Review" showBackButton align="left" />

            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* 1. ÜRÜN BİLGİ KARTI */}
                <View style={styles.section}>
                    <ProductHeroCard
                        name={product?.name || "Moisturizer"}
                        brand={product?.brand || "La Roche"}
                        imageUrl={product?.image}
                    />
                </View>

                {/* 2. KART: Usage Feedback */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Usage Feedback</Text>
                    <Text style={styles.cardSubtitle}>Please provide details about your experience.</Text>

                    <FeedbackInput
                        label="How often did you use it?"
                        placeholder=" "
                        value={often}
                        onChangeText={setOften}
                    />
                    <FeedbackInput
                        label="How much did you use?"
                        placeholder=" "
                        value={amount}
                        onChangeText={setAmount}
                    />

                    <TouchableOpacity style={styles.inlineButton}>
                        <Text style={styles.inlineButtonText}>Submit Response</Text>
                    </TouchableOpacity>
                </View>

                {/* 3. KART: Rating & Comment */}
                <View style={styles.card}>
                    <View style={styles.userRow}>
                        {/* Burası sabit kalabilir veya kullanıcı profili çekilebilir */}
                        <Image source={{ uri: 'https://i.pravatar.cc/300' }} style={styles.avatarPlaceholder} />
                        <View>
                            <Text style={styles.userName}>Ayşe Yılmaz</Text>
                            <Text style={styles.userSub}>Rating your experience</Text>
                        </View>
                    </View>

                    <View style={styles.ratingSection}>
                        <View style={styles.ratingLabelRow}>
                            <Text style={styles.ratingLabel}>Overall Rating</Text>
                            <Info size={16} color="#94A3B8" />
                        </View>

                        {/* YENİ STAR RATING KULLANIMI */}
                        <StarRating
                            score={rating}
                            isInteractive={true} // Tıklanabilir yaptık!
                            onRate={setRating}   // Puan değişince state'i güncelliyoruz
                            size={32}
                            color={theme.colors.secondary} // Görseldeki gibi koyu renk
                        />
                    </View>

                    <View style={styles.commentBox}>
                        <View style={styles.commentHeader}>
                            <MessageSquare size={18} color={theme.colors.text} />
                            <Text style={styles.commentLabel}>Your Comment</Text>
                        </View>
                        <TextInput
                            style={styles.commentInput}
                            placeholder={""}
                            multiline
                            numberOfLines={4}
                            value={comment}
                            onChangeText={setComment}
                        />
                    </View>
                </View>

                {/* 4. KART: Community Guideline */}
                <View style={styles.guidelineCard}>
                    <View style={styles.guidelineIcon}>
                        <ShieldCheck size={24} color="#64748B" />
                    </View>
                    <View style={styles.guidelineTextContent}>
                        <Text style={styles.guidelineTitle}>Community Guideline</Text>
                        <Text style={styles.guidelineText}>
                            Your review helps others choose better. Keep it honest and detailed for the best impact!
                        </Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* 5. FOOTER: Submit Review */}
            <View style={styles.footer}>
                <CustomButton
                    title="Submit Review"
                    onPress={handleSubmit}
                    isLoading={isPending}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.deepbackground },
    container: { padding: 20, backgroundColor: '#F8F9FA' },
    section: { marginBottom: 20 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    cardSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 20, marginTop: 4 },
    inlineButton: {
        backgroundColor: theme.colors.secondary,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        alignSelf: 'flex-end',
        paddingHorizontal: 20
    },
    inlineButtonText: { color: '#FFF', fontWeight: '600' },
    userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#E2E8F0', marginRight: 12 },
    userName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    userSub: { fontSize: 12, color: '#64748B' },
    ratingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    ratingLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    commentBox: { marginTop: 15 },
    commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    commentLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    commentInput: {
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        padding: 15,
        height: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    guidelineCard: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        padding: 15,
        alignItems: 'center'
    },
    guidelineIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    guidelineTextContent: { flex: 1 },
    guidelineTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    guidelineText: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 18 },
    footer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        padding: 20,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    ratingSection: {},
});