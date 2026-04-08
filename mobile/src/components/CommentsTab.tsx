import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '@constants/theme';
import { Star, SlidersHorizontal, ArrowUpDown } from 'lucide-react-native';
import { StarRating } from '@components/StarRating';

// --- Dummy Data ---
const DUMMY_COMMENTS = [
    {
        id: '1',
        user: 'Selin K.',
        rating: 9,
        date: 'Feb 20, 2025',
        text: 'Great product! My skin feels much softer and the SPF protection is no joke. Definitely repurchasing.',
        helpful: 14,
    },
    {
        id: '2',
        user: 'Ayşe D.',
        rating: 6,
        date: 'Jan 14, 2025',
        text: 'It\'s okay for the price. A bit greasy but the vitamin C effect is visible after a few weeks of use.',
        helpful: 7,
    },
    {
        id: '3',
        user: 'Mert B.',
        rating: 8,
        date: 'Dec 5, 2024',
        text: 'Works well for combination skin. Doesn\'t clog pores and blends nicely under makeup. Recommend!',
        helpful: 21,
    },
    {
        id: '4',
        user: 'Zeynep A.',
        rating: 3,
        date: 'Nov 18, 2024',
        text: 'Broke me out unfortunately. Might work for others but was too heavy for my sensitive skin.',
        helpful: 3,
    },
];

const SORT_OPTIONS = ['Most Recent', 'Highest Rated', 'Lowest Rated'];
const FILTER_OPTIONS = ['All', '5★', '4★', '3★', '≤2★'];

export const CommentsTab = () => {
    const [activeSort, setActiveSort] = useState('Most Recent');
    const [activeFilter, setActiveFilter] = useState('All');
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    const overallRating = 6.5;
    const totalReviews = DUMMY_COMMENTS.length;

    return (
        <View style={styles.container}>
            {/* Header: Overall Rating Summary */}
            <View style={styles.ratingHeader}>
                <View style={styles.ratingLeft}>
                    <Text style={styles.bigRating}>{overallRating.toFixed(1)}</Text>
                    <Text style={styles.ratingScale}>/ 10</Text>
                </View>
                <View style={styles.ratingRight}>
                    <StarRating score={overallRating} outOf={10} size={18} color="#FFB500" />
                    <Text style={styles.reviewCount}>{totalReviews} reviews</Text>
                </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Filter & Sort Row */}
            <View style={styles.controlRow}>
                {/* Star Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {FILTER_OPTIONS.map((f) => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                            onPress={() => setActiveFilter(f)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                                {f}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Sort Button */}
                <TouchableOpacity
                    style={styles.sortButton}
                    onPress={() => setShowSortDropdown(!showSortDropdown)}
                    activeOpacity={0.7}
                >
                    <ArrowUpDown size={14} color={theme.colors.gray} />
                    <Text style={styles.sortText}>Sort</Text>
                </TouchableOpacity>
            </View>

            {/* Sort Dropdown */}
            {showSortDropdown && (
                <View style={styles.dropdown}>
                    {SORT_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.dropdownItem, activeSort === opt && styles.dropdownItemActive]}
                            onPress={() => { setActiveSort(opt); setShowSortDropdown(false); }}
                        >
                            <Text style={[styles.dropdownText, activeSort === opt && styles.dropdownTextActive]}>
                                {opt}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Comments List */}
            <View style={styles.commentsList}>
                {DUMMY_COMMENTS.map((comment, index) => (
                    <View key={comment.id}>
                        <View style={styles.commentItem}>
                            {/* Avatar & User */}
                            <View style={styles.commentHeader}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {comment.user.charAt(0)}
                                    </Text>
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>{comment.user}</Text>
                                    <Text style={styles.commentDate}>{comment.date}</Text>
                                </View>
                                <StarRating score={comment.rating} outOf={10} size={12} color="#FFB500" />
                            </View>

                            {/* Comment Text */}
                            <Text style={styles.commentText}>{comment.text}</Text>

                            {/* Helpful */}
                            <Text style={styles.helpfulText}>👍 {comment.helpful} found this helpful</Text>
                        </View>

                        {index !== DUMMY_COMMENTS.length - 1 && <View style={styles.commentDivider} />}
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 5,
    },
    ratingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 5,
        paddingBottom: 15,
    },
    ratingLeft: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
    },
    bigRating: {
        fontSize: 42,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: -2,
        lineHeight: 50,
    },
    ratingScale: {
        fontSize: 14,
        color: theme.colors.gray,
        fontWeight: '500',
        marginBottom: 6,
    },
    ratingRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    reviewCount: {
        fontSize: 12,
        color: theme.colors.gray,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginBottom: 12,
    },
    controlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    filterScroll: {
        flex: 1,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginRight: 6,
        backgroundColor: '#FAFAFA',
    },
    filterChipActive: {
        backgroundColor: '#EBE4FF',
        borderColor: '#8C67F6',
    },
    filterChipText: {
        fontSize: 12,
        color: theme.colors.gray,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: '#8C67F6',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FAFAFA',
    },
    sortText: {
        fontSize: 12,
        color: theme.colors.gray,
        fontWeight: '600',
    },
    dropdown: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        marginBottom: 10,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    dropdownItemActive: {
        backgroundColor: '#EBE4FF',
    },
    dropdownText: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '500',
    },
    dropdownTextActive: {
        color: '#8C67F6',
        fontWeight: '700',
    },
    commentsList: {
        gap: 0,
    },
    commentItem: {
        paddingVertical: 14,
        gap: 8,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EBE4FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#8C67F6',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.text,
    },
    commentDate: {
        fontSize: 11,
        color: theme.colors.gray,
        marginTop: 1,
    },
    commentText: {
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 20,
    },
    helpfulText: {
        fontSize: 11,
        color: theme.colors.gray,
        fontWeight: '500',
    },
    commentDivider: {
        height: 1,
        backgroundColor: '#F5F5F5',
    },
});
