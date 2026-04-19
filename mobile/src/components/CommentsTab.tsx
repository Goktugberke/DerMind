import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { theme } from '@constants/theme';
import { Star, SlidersHorizontal, ArrowUpDown } from 'lucide-react-native';
import { StarRating } from '@components/StarRating';
import { ratingsService } from '@services/api';

const SORT_OPTIONS = ['Most Recent', 'Highest Rated', 'Lowest Rated'];
const FILTER_OPTIONS = ['All', '5★', '4★', '3★', '≤2★'];

export const CommentsTab = ({ productId }: { productId: string }) => {
    const [activeSort, setActiveSort] = useState('Most Recent');
    const [activeFilter, setActiveFilter] = useState('All');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [overallRating, setOverallRating] = useState(0);

    useEffect(() => {
        const fetchRatings = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await ratingsService.getProductRatings(productId);
                const ratings = response.data || [];
                setComments(ratings);

                // Calculate overall rating
                if (ratings.length > 0) {
                    const avgRating = ratings.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / ratings.length;
                    setOverallRating(Math.round(avgRating * 10) / 10);
                } else {
                    setOverallRating(0);
                }
            } catch (err) {
                console.error('Failed to fetch ratings:', err);
                setError('Failed to load comments. Please try again.');
                setComments([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (productId) {
            fetchRatings();
        }
    }, [productId]);

    const totalReviews = comments.length;

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

            {/* Loading State */}
            {isLoading && (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Empty State */}
            {!isLoading && !error && comments.length === 0 && (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>No comments yet.</Text>
                </View>
            )}

            {/* Comments List */}
            {!isLoading && !error && comments.length > 0 && (
                <View style={styles.commentsList}>
                    {comments.map((comment, index) => (
                        <View key={comment.id}>
                            <View style={styles.commentItem}>
                                {/* Avatar & User */}
                                <View style={styles.commentHeader}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>
                                            {(comment.userName || 'U').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>{comment.userName || 'Anonymous'}</Text>
                                        <Text style={styles.commentDate}>
                                            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Date not available'}
                                        </Text>
                                    </View>
                                    <StarRating score={comment.rating} outOf={10} size={12} color="#FFB500" />
                                </View>

                                {/* Comment Text */}
                                {comment.comment && <Text style={styles.commentText}>{comment.comment}</Text>}

                                {/* Helpful */}
                                {comment.helpful && <Text style={styles.helpfulText}>👍 {comment.helpful} found this helpful</Text>}
                            </View>

                            {index !== comments.length - 1 && <View style={styles.commentDivider} />}
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 5,
    },
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    errorContainer: {
        backgroundColor: '#FFE5E5',
        borderRadius: 8,
        padding: 12,
        marginVertical: 12,
    },
    errorText: {
        fontSize: 13,
        color: '#D32F2F',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.gray,
        textAlign: 'center',
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
