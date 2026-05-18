import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';

export default function BookingsScreen() {
    const [bookings, setBookings] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadBookings = async () => {
        setRefreshing(true);
        const data = await ApiService.getBookings();
        setBookings(data);
        setRefreshing(false);
    };

    useEffect(() => {
        loadBookings();
    }, []);

    const handleDispute = async (bookingId, type) => {
        Alert.alert(
            "Simulate Dispute",
            `Simulate ${type} for booking ${bookingId}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Confirm", 
                    onPress: async () => {
                        const res = await ApiService.simulateDispute(bookingId, type);
                        if (res.success) {
                            Alert.alert("Dispute Logged", `Dispute ID: ${res.dispute.id}\nStatus: ${res.dispute.status}`);
                            loadBookings();
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.serviceType}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'COMPLETED' ? '#4CAF50' : '#FF9800' }]}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.cardDetail}><Ionicons name="person-outline" size={14}/> {item.providerName}</Text>
            <Text style={styles.cardDetail}><Ionicons name="calendar-outline" size={14}/> {item.scheduledTime}</Text>
            <Text style={styles.cardDetail}><Ionicons name="pricetag-outline" size={14}/> {item.totalPrice} PKR</Text>
            
            {item.status === 'COMPLETED' && (
                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.btn, styles.outlineBtn]} onPress={() => handleDispute(item.id, 'poor_quality')}>
                        <Text style={styles.outlineBtnText}>Poor Quality</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.outlineBtn]} onPress={() => handleDispute(item.id, 'overcharged')}>
                        <Text style={styles.outlineBtnText}>Overcharged</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList 
                data={bookings}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadBookings} tintColor="#00D1FF" />}
                ListEmptyComponent={<Text style={styles.emptyText}>No bookings found. Chat with Khidmat.ai to make one!</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    listContainer: {
        padding: 16,
    },
    card: {
        backgroundColor: '#1E1F24',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2C2D35',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardDetail: {
        color: '#8A8D93',
        fontSize: 14,
        marginBottom: 6,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 10,
    },
    btn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: 'center',
    },
    outlineBtn: {
        borderWidth: 1,
        borderColor: '#FF5252',
    },
    outlineBtnText: {
        color: '#FF5252',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyText: {
        color: '#8A8D93',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    }
});
