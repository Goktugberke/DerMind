import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, Switch } from 'react-native';
import { PageHeader } from '@components/PageHeader';
import { theme } from '@constants/theme';
import { MapPin, Plus, Edit2, Trash2, X } from 'lucide-react-native';
import { CustomButton } from '@components/CustomButton';
import { useGetAddresses, useDeleteAddress, useSetDefaultAddress, useCreateAddress, useUpdateAddress } from '@services/api';
import { useNavigation } from '@react-navigation/native';

export const AddressesScreen = () => {
    const { data: addresses = [], isLoading } = useGetAddresses();
    const deleteAddress = useDeleteAddress();
    const setDefaultAddress = useSetDefaultAddress();
    const createAddress = useCreateAddress();
    const updateAddress = useUpdateAddress();
    const navigation = useNavigation();

    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
    const [newAddress, setNewAddress] = useState({
        title: '',
        city: '',
        zipCode: '',
        addressString: '',
        default: false
    });

    const handleDelete = (id: number) => {
        Alert.alert(
            "Delete Address",
            "Are you sure you want to delete this address?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: () => {
                        deleteAddress.mutate(id);
                    }
                }
            ]
        );
    };

    const handleSetDefault = (id: number) => {
        setDefaultAddress.mutate(id);
    };

    const handleEdit = (item: any) => {
        setEditingAddressId(item.id);
        setNewAddress({
            title: item.title || item.name || '',
            city: item.city || '',
            zipCode: item.zipCode || '',
            addressString: item.address || item.addressString || item.fullAddress || '',
            default: item.isDefault || item.default || false
        });
        setAddModalVisible(true);
    };

    const handleOpenAddModal = () => {
        setEditingAddressId(null);
        setNewAddress({ title: '', city: '', zipCode: '', addressString: '', default: false });
        setAddModalVisible(true);
    };

    const handleSaveAddress = () => {
        if (!newAddress.title || !newAddress.city || !newAddress.addressString) {
            Alert.alert("Error", "Please fill in all required fields.");
            return;
        }

        if (editingAddressId) {
            updateAddress.mutate({ id: editingAddressId, data: newAddress }, {
                onSuccess: () => {
                    setAddModalVisible(false);
                    setEditingAddressId(null);
                    setNewAddress({ title: '', city: '', zipCode: '', addressString: '', default: false });
                }
            });
        } else {
            createAddress.mutate(newAddress, {
                onSuccess: () => {
                    setAddModalVisible(false);
                    setNewAddress({ title: '', city: '', zipCode: '', addressString: '', default: false });
                }
            });
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <PageHeader title="Delivery Addresses" showBackButton align="left" />

            <ScrollView contentContainerStyle={styles.container}>
                {isLoading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
                ) : addresses.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No addresses found.</Text>
                    </View>
                ) : (
                    addresses.map((item) => (
                        <View key={item.id} style={styles.addressCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.titleRow}>
                                    <MapPin size={18} color={theme.colors.primary} />
                                    <Text style={styles.addressTitle}>{item.title || item.name || 'Address'}</Text>
                                    {item.isDefault && (
                                        <View style={styles.defaultBadge}>
                                            <Text style={styles.defaultText}>DEFAULT</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.actionRow}>
                                    {!item.isDefault && (
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleSetDefault(item.id)}>
                                            <Text style={styles.setDefaultText}>Set Default</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                                        <Edit2 size={16} color={theme.colors.gray} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                                        <Trash2 size={16} color="#F43F5E" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.cityText}>{item.city}</Text>
                            <Text style={styles.addressText}>{item.address || item.addressString || item.fullAddress}</Text>
                        </View>
                    ))
                )}

                <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
                    <Plus size={20} color={theme.colors.primary} />
                    <Text style={styles.addText}>Add New Address</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ADD ADDRESS MODAL */}
            <Modal
                visible={isAddModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingAddressId ? 'Edit Address' : 'Add New Address'}</Text>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                                <X size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Address Title (e.g. Home, Work)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Home"
                                value={newAddress.title}
                                onChangeText={(text) => setNewAddress({ ...newAddress, title: text })}
                            />

                            <Text style={styles.label}>City</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Istanbul"
                                value={newAddress.city}
                                onChangeText={(text) => setNewAddress({ ...newAddress, city: text })}
                            />

                            <Text style={styles.label}>Zip Code</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="34000"
                                keyboardType="numeric"
                                value={newAddress.zipCode}
                                onChangeText={(text) => setNewAddress({ ...newAddress, zipCode: text })}
                            />

                            <Text style={styles.label}>Full Address</Text>
                            <TextInput
                                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                placeholder="Street, building, apartment..."
                                multiline
                                value={newAddress.addressString}
                                onChangeText={(text) => setNewAddress({ ...newAddress, addressString: text })}
                            />

                            <View style={styles.switchRow}>
                                <Text style={styles.label}>Set as Default Address</Text>
                                <Switch
                                    value={newAddress.default}
                                    onValueChange={(value) => setNewAddress({ ...newAddress, default: value })}
                                    trackColor={{ false: '#767577', true: theme.colors.primary }}
                                />
                            </View>

                            <View style={{ marginTop: 20 }}>
                                <CustomButton
                                    title={editingAddressId ? "Update Address" : "Save Address"}
                                    onPress={handleSaveAddress}
                                    isLoading={editingAddressId ? updateAddress.isPending : createAddress.isPending}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <View style={styles.footer}>
                <CustomButton title="Done" onPress={() => navigation.goBack()} />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.deepbackground },
    container: { padding: 20 },
    addressCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2, shadowOpacity: 0.05, borderWidth: 1, borderColor: '#F1F5F9' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addressTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    defaultBadge: { backgroundColor: theme.colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    defaultText: { fontSize: 10, fontWeight: '800', color: theme.colors.primary },
    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { padding: 4 },
    cityText: { fontSize: 13, color: '#1E293B', fontWeight: '600', marginBottom: 2 },
    addressText: { fontSize: 14, color: '#64748B', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: theme.colors.primary + '40', marginTop: 10 },
    addText: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
    footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    setDefaultText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', marginRight: 5 },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: theme.colors.gray, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
    label: { fontSize: 14, fontWeight: '600', color: theme.colors.gray, marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 15, fontSize: 16, color: theme.colors.text, borderWidth: 1, borderColor: '#F1F5F9' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }
});
