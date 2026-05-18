import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';

export default function LogsScreen() {
    // In a real app, you might pass the current requestId via React Context or Redux
    // For now, we will just show a placeholder or try to fetch the latest if possible
    const [logs, setLogs] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [requestId, setRequestId] = useState(null);

    const loadLogs = async () => {
        if (!requestId) return;
        setRefreshing(true);
        const data = await ApiService.getLogs(requestId);
        setLogs(data);
        setRefreshing(false);
    };

    useEffect(() => {
        const checkRequest = () => {
            if (ApiService.lastRequestId !== requestId) {
                setRequestId(ApiService.lastRequestId);
            }
        };

        checkRequest();
        loadLogs();
        
        // Polling logs every 2 seconds if active
        const interval = setInterval(() => {
            if (ApiService.lastRequestId) {
                loadLogs();
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [requestId]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Live Agent Trace</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{requestId || 'No active session'}</Text>
                </View>
            </View>
            
            <ScrollView 
                style={styles.logsArea}
                contentContainerStyle={styles.logsContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadLogs} tintColor="#00D1FF" />}
            >
                {logs.length === 0 ? (
                    <Text style={styles.emptyText}>Make a request in the Chat tab to see agent reasoning here.</Text>
                ) : (
                    logs.map((log, index) => (
                        <View key={index} style={styles.logItem}>
                            <View style={styles.logLine} />
                            <View style={styles.logDot}>
                                <Ionicons name="git-commit-outline" size={16} color="#00D1FF" />
                            </View>
                            <View style={styles.logContent}>
                                <Text style={styles.logAction}>{log.action}</Text>
                                <Text style={styles.logDetail}>{JSON.stringify(log.details, null, 2)}</Text>
                                <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2D35',
        backgroundColor: '#1E1F24',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    badge: {
        backgroundColor: '#2C2D35',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#8A8D93',
        fontSize: 12,
    },
    logsArea: {
        flex: 1,
    },
    logsContent: {
        padding: 16,
    },
    emptyText: {
        color: '#8A8D93',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 15,
    },
    logItem: {
        flexDirection: 'row',
        marginBottom: 20,
        position: 'relative',
    },
    logLine: {
        position: 'absolute',
        left: 11,
        top: 24,
        bottom: -20,
        width: 2,
        backgroundColor: '#2C2D35',
    },
    logDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1E1F24',
        borderWidth: 1,
        borderColor: '#2C2D35',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        zIndex: 1,
    },
    logContent: {
        flex: 1,
        backgroundColor: '#1E1F24',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2C2D35',
    },
    logAction: {
        color: '#00D1FF',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    logDetail: {
        color: '#E0E0E0',
        fontSize: 13,
        fontFamily: 'monospace',
        marginBottom: 8,
    },
    logTime: {
        color: '#8A8D93',
        fontSize: 11,
        textAlign: 'right',
    }
});
