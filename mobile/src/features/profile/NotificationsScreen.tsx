import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '@services/api';
import { PageHeader } from '@components/PageHeader';
import { theme } from '@constants/theme';
import { Bell, BellOff, CheckCircle2, Trash2, Clock } from 'lucide-react-native';

export const NotificationsScreen = () => {
    const { data: notifications, isLoading, isError } = useNotifications();
    const { mutate: markAsRead } = useMarkAsRead();
    const { mutate: markAllAsRead } = useMarkAllAsRead();
    const { mutate: deleteNotification } = useDeleteNotification();

    const formatTime = (dateStr: string) => {
        if (!dateStr) return 'Recently';
        try {
            const date = new Date(dateStr);
            // "12 May, 14:30" formatına benzer sade bir çıktı
            return date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }) + ', ' + 
                   date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return 'Recently';
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[styles.notificationCard, !item.read && styles.unreadCard]} 
            onPress={() => !item.read && markAsRead(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <View style={[styles.statusIndicator, item.read ? styles.readIndicator : styles.unreadIndicator]} />
                <Bell size={20} color={item.read ? theme.colors.gray : theme.colors.primary} />
            </View>
            
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, !item.read && styles.unreadText]}>{item.title}</Text>
                    <TouchableOpacity onPress={() => deleteNotification(item.id)}>
                        <Trash2 size={16} color={theme.colors.gray} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.message}>{item.message}</Text>
                <View style={styles.footerRow}>
                    <Clock size={12} color={theme.colors.gray} />
                    <Text style={styles.timeText}>
                        {formatTime(item.createdAt)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <PageHeader 
                title="Notifications" 
                showBackButton={true}
                rightIcon={
                    notifications && notifications.length > 0 ? (
                        <TouchableOpacity onPress={() => markAllAsRead()}>
                            <CheckCircle2 size={22} color={theme.colors.primary} />
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            {isLoading ? (
                <View style={styles.centerItem}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : isError ? (
                <View style={styles.centerItem}>
                    <Text style={styles.errorText}>Could not load notifications</Text>
                </View>
            ) : (!notifications || notifications.length === 0) ? (
                <View style={styles.emptyContainer}>
                    <BellOff size={64} color={theme.colors.lightGray} />
                    <Text style={styles.emptyTitle}>No Notifications</Text>
                    <Text style={styles.emptySubText}>We'll notify you when something important happens.</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.deepbackground,
    },
    listContent: {
        padding: 15,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.white,
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    unreadCard: {
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    iconContainer: {
        marginRight: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusIndicator: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        zIndex: 1,
    },
    unreadIndicator: {
        backgroundColor: theme.colors.primary,
    },
    readIndicator: {
        backgroundColor: 'transparent',
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
        marginRight: 10,
    },
    unreadText: {
        fontWeight: 'bold',
    },
    message: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
        marginBottom: 8,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 12,
        color: theme.colors.gray,
    },
    centerItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: theme.colors.error,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: theme.colors.gray,
        textAlign: 'center',
        lineHeight: 20,
    }
});
