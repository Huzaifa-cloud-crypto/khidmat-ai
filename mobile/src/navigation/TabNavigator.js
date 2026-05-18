import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import ChatScreen from '../screens/ChatScreen';
import BookingsScreen from '../screens/BookingsScreen';
import MapScreen from '../screens/MapScreen';
import ProvidersScreen from '../screens/ProvidersScreen';
import LogsScreen from '../screens/LogsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Bookings') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Providers') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Logs') {
            iconName = focused ? 'code-slash' : 'code-slash-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00D1FF',
        tabBarInactiveTintColor: '#8A8D93',
        tabBarStyle: {
          backgroundColor: '#1E1F24',
          borderTopColor: '#2C2D35',
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#1E1F24',
          borderBottomColor: '#2C2D35',
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
          fontFamily: 'sans-serif-medium',
        },
      })}
    >
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Khidmat.ai' }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Nearby Help' }} />
      <Tab.Screen name="Providers" component={ProvidersScreen} />
      <Tab.Screen name="Logs" component={LogsScreen} options={{ title: 'Live Trace' }} />
    </Tab.Navigator>
  );
}
