import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';

export default function ProvidersScreen() {
    const [providers, setProviders] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadProviders = async () => {
        setRefreshing(true);
        const data = await ApiService.getProviders();
        setProviders(data);
        setRefreshing(false);
    };

    useEffect(() => {
        loadProviders();
    }, []);

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#8A8D93" />
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.skill}>{item.skill} • {item.location}</Text>
                <View style={styles.stats}>
                    <Text style={styles.statText}><Ionicons name="star" color="#FFD700" /> {item.rating}</Text>
                    <Text style={styles.statText}>Rs. {item.rate}/hr</Text>
                    <View style={[styles.statusDot, { backgroundColor: item.status === 'available' ? '#4CAF50' : '#F44336' }]} />
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList 
                data={providers}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadProviders} tintColor="#00D1FF" />}
                ListEmptyComponent={<Text style={styles.emptyText}>No providers found.</Text>}
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
        flexDirection: 'row',
        backgroundColor: '#1E1F24',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2D35',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#2C2D35',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    info: {
        flex: 1,
    },
    name: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    skill: {
        color: '#8A8D93',
        fontSize: 13,
        marginVertical: 4,
        textTransform: 'capitalize',
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statText: {
        color: '#E0E0E0',
        fontSize: 13,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 'auto',
    },
    emptyText: {
        color: '#8A8D93',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    }
});
