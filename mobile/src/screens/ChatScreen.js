import React, { useState, useRef, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, ScrollView, 
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import ApiService from '../services/api';

// Sectors list with coordinates — mirrors backend/src/data/sectors.json
const SECTORS = [
    { code: 'F-6',  lat: 33.7294, lng: 73.0731 },
    { code: 'F-7',  lat: 33.7200, lng: 73.0600 },
    { code: 'F-8',  lat: 33.7100, lng: 73.0400 },
    { code: 'F-10', lat: 33.6950, lng: 73.0250 },
    { code: 'F-11', lat: 33.6850, lng: 73.0150 },
    { code: 'G-6',  lat: 33.7200, lng: 73.0900 },
    { code: 'G-7',  lat: 33.7100, lng: 73.0800 },
    { code: 'G-8',  lat: 33.7000, lng: 73.0700 },
    { code: 'G-9',  lat: 33.6900, lng: 73.0600 },
    { code: 'G-10', lat: 33.6810, lng: 73.0500 },
    { code: 'G-11', lat: 33.6700, lng: 73.0400 },
    { code: 'G-13', lat: 33.6500, lng: 73.0200 },
    { code: 'G-14', lat: 33.6400, lng: 73.0100 },
    { code: 'G-15', lat: 33.6300, lng: 73.0000 },
    { code: 'H-8',  lat: 33.6900, lng: 73.0900 },
    { code: 'H-9',  lat: 33.6800, lng: 73.0800 },
    { code: 'H-13', lat: 33.6500, lng: 73.0500 },
    { code: 'I-8',  lat: 33.6850, lng: 73.0850 },
    { code: 'I-9',  lat: 33.6750, lng: 73.0750 },
    { code: 'I-10', lat: 33.6650, lng: 73.0650 },
    { code: 'I-11', lat: 33.6550, lng: 73.0550 },
    { code: 'E-7',  lat: 33.7400, lng: 73.0700 },
    { code: 'E-11', lat: 33.7000, lng: 73.0300 },
    { code: 'DHA-1', lat: 33.5200, lng: 73.0900 },
    { code: 'DHA-2', lat: 33.5100, lng: 73.1000 },
    { code: 'PWD',   lat: 33.5800, lng: 73.0600 },
    { code: 'BAHRIA', lat: 33.5300, lng: 73.1100 },
    { code: 'SCHEME-33', lat: 24.9600, lng: 67.1200 },
    { code: 'GULZAR-E-HIJRI', lat: 24.9500, lng: 67.1300 },
    { code: 'GULISTAN-E-JAUHAR', lat: 24.9200, lng: 67.1400 },
    { code: 'GULSHAN-E-IQBAL', lat: 24.9300, lng: 67.0900 },
];

function getDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearestSector(lat, lng) {
    let nearest = null;
    let minDist = Infinity;
    for (const s of SECTORS) {
        const d = getDistanceKm(lat, lng, s.lat, s.lng);
        if (d < minDist) { minDist = d; nearest = s; }
    }
    return nearest;
}

export default function ChatScreen() {
    const [messages, setMessages] = useState([
        { id: 1, type: 'system', text: "Assalam o Alaikum! I'm your Khidmat.ai orchestrator.\n\nWhat service do you need today? (e.g., \"Kal subah G-13 me AC repair krna hai, sasta wala\")" }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [detectedSector, setDetectedSector] = useState(null);
    const [locating, setLocating] = useState(false);
    const scrollViewRef = useRef();

    // Auto-detect GPS on mount
    useEffect(() => {
        detectLocation();
    }, []);

    const detectLocation = async () => {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { setLocating(false); return; }

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const nearest = getNearestSector(loc.coords.latitude, loc.coords.longitude);
            setDetectedSector(nearest?.code || null);

            if (nearest) {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    type: 'system',
                    text: `📍 GPS detected: You are near sector ${nearest.code}. I'll use this as your location. You can override it anytime by mentioning a different sector.`
                }]);
            }
        } catch (e) {
            console.log('Location error:', e.message);
        } finally {
            setLocating(false);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        // Auto-append detected sector if user didn't mention one
        let messageToSend = inputText.trim();
        if (detectedSector) {
            const sectorMentioned = SECTORS.some(s => 
                messageToSend.toUpperCase().includes(s.code.toUpperCase())
            );
            if (!sectorMentioned) {
                messageToSend = `${messageToSend} (Location: ${detectedSector})`;
            }
        }

        const userMsg = { id: Date.now(), type: 'user', text: inputText.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setLoading(true);

        const requestId = `req_${Date.now()}`;
        
        try {
            const response = await ApiService.sendRequest(messageToSend, requestId);
            
            let replyText = "Sorry, I couldn't process that.";
            if (response.status === 'SUCCESS') {
                replyText = response.message;
            } else if (response.status === 'CLARIFICATION_NEEDED') {
                replyText = response.message;
            } else if (response.status === 'NO_PROVIDERS') {
                replyText = response.message;
            } else {
                replyText = response.message || replyText;
            }

            setMessages(prev => [...prev, { id: Date.now(), type: 'system', text: replyText }]);
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now(), type: 'system', text: 'Error connecting to the server.' }]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ScrollView 
                ref={scrollViewRef}
                style={styles.chatArea} 
                contentContainerStyle={styles.chatContent}
            >
                {messages.map((msg) => (
                    <View key={msg.id} style={[styles.messageWrapper, msg.type === 'user' ? styles.userWrapper : styles.systemWrapper]}>
                        {msg.type === 'system' && (
                            <View style={styles.avatar}>
                                <Ionicons name="hardware-chip-outline" size={20} color="#00D1FF" />
                            </View>
                        )}
                        <View style={[styles.bubble, msg.type === 'user' ? styles.userBubble : styles.systemBubble]}>
                            <Text style={[styles.messageText, msg.type === 'user' && styles.userMessageText]}>{msg.text}</Text>
                        </View>
                    </View>
                ))}
                {loading && (
                    <View style={[styles.messageWrapper, styles.systemWrapper]}>
                         <View style={styles.avatar}>
                            <Ionicons name="hardware-chip-outline" size={20} color="#00D1FF" />
                        </View>
                        <View style={[styles.bubble, styles.systemBubble]}>
                            <ActivityIndicator color="#00D1FF" size="small" />
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* GPS Indicator Bar */}
            {detectedSector && (
                <View style={styles.gpsBar}>
                    <Ionicons name="location" size={14} color="#00D1FF" />
                    <Text style={styles.gpsText}>GPS: {detectedSector}</Text>
                    <TouchableOpacity onPress={detectLocation} style={styles.refreshBtn}>
                        <Ionicons name="refresh-outline" size={14} color="#8A8D93" />
                    </TouchableOpacity>
                </View>
            )}
            {locating && (
                <View style={styles.gpsBar}>
                    <ActivityIndicator size={12} color="#00D1FF" />
                    <Text style={styles.gpsText}>Detecting location...</Text>
                </View>
            )}

            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.iconBtn} onPress={detectLocation}>
                    <Ionicons name="location-outline" size={24} color={detectedSector ? "#00D1FF" : "#8A8D93"} />
                </TouchableOpacity>
                <TextInput 
                    style={styles.input}
                    placeholder="Type your request here..."
                    placeholderTextColor="#8A8D93"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={sendMessage}
                    multiline
                />
                <TouchableOpacity style={[styles.iconBtn, styles.primaryBtn]} onPress={sendMessage}>
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    chatArea: {
        flex: 1,
    },
    chatContent: {
        padding: 16,
        paddingBottom: 20,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
        maxWidth: '85%',
    },
    systemWrapper: {
        alignSelf: 'flex-start',
    },
    userWrapper: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1E1F24',
        borderWidth: 1,
        borderColor: '#2C2D35',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    bubble: {
        padding: 14,
        borderRadius: 18,
    },
    systemBubble: {
        backgroundColor: '#1E1F24',
        borderWidth: 1,
        borderColor: '#2C2D35',
        borderBottomLeftRadius: 4,
    },
    userBubble: {
        backgroundColor: '#00D1FF',
        borderBottomRightRadius: 4,
        marginLeft: 10,
    },
    messageText: {
        color: '#E0E0E0',
        fontSize: 15,
        lineHeight: 22,
    },
    userMessageText: {
        color: '#121212',
    },
    gpsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1D24',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: '#2C2D35',
        gap: 6,
    },
    gpsText: {
        color: '#00D1FF',
        fontSize: 12,
        flex: 1,
    },
    refreshBtn: {
        padding: 4,
    },
    inputArea: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#1E1F24',
        borderTopWidth: 1,
        borderTopColor: '#2C2D35',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#121212',
        borderWidth: 1,
        borderColor: '#2C2D35',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 15,
        marginHorizontal: 8,
        maxHeight: 100,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryBtn: {
        backgroundColor: '#00D1FF',
    }
});
