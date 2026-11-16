import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
  SafeAreaView, Alert, Share, Switch, ScrollView, PermissionsAndroid, Platform
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';

// ========== LiveKit Imports ==========
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
  isTrackReference,
  AudioSession,
  registerGlobals,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

// تسجيل WebRTC Globals (ضروري لعمل LiveKit)
registerGlobals();

// ========== الألوان والهوية البصرية ==========
const COLORS = {
  dark: '#0B192C',
  primary: '#1E3E62',
  accent: '#00D9C0',
  light: '#F5F5F5',
  gray: '#8D99AE',
  danger: '#E63946',
  white: '#FFFFFF',
};

// ⚠️ استبدل هذه القيم ببيانات مشروع LiveKit الخاص بك
const LIVEKIT_URL = 'wss://your-livekit-server-url';
const LIVEKIT_TOKEN = 'your-generated-token';

// ========== شاشة البداية (Splash) ==========
function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('Home'), 2500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center' }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      <View style={styles.splashLogo}>
        <Icon name="call" size={80} color={COLORS.accent} />
      </View>
      <Text style={styles.splashTitle}>FriendCall</Text>
      <Text style={styles.splashSubtitle}>تواصل مع أصدقائك بسهولة</Text>
      <Text style={styles.splashDev}>المطور: أدهم ياسر محمد</Text>
    </View>
  );
}

// ========== الشاشة الرئيسية ==========
function HomeScreen({ navigation }) {
  const [roomCode, setRoomCode] = useState('');
  const [userName, setUserName] = useState('');

  const createRoom = () => {
    if (!userName.trim()) { Alert.alert('تنبيه', 'أدخل اسمك أولاً'); return; }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigation.navigate('Room', { roomCode: code, userName, isHost: true });
  };

  const joinRoom = () => {
    if (!userName.trim()) { Alert.alert('تنبيه', 'أدخل اسمك أولاً'); return; }
    if (roomCode.length < 6) { Alert.alert('تنبيه', 'كود الغرفة يجب أن يكون 6 أحرف'); return; }
    navigation.navigate('Room', { roomCode: roomCode.toUpperCase(), userName, isHost: false });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      <View style={styles.homeHeader}>
        <Icon name="call" size={40} color={COLORS.accent} />
        <Text style={styles.homeTitle}>FriendCall</Text>
      </View>

      <View style={styles.homeCard}>
        <Text style={styles.inputLabel}>اسمك</Text>
        <TextInput
          style={styles.input}
          placeholder="أدخل اسمك"
          placeholderTextColor={COLORS.gray}
          value={userName}
          onChangeText={setUserName}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={createRoom}>
          <Icon name="add-circle-outline" size={24} color={COLORS.dark} />
          <Text style={styles.primaryButtonText}>إنشاء غرفة جديدة</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>أو</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.inputLabel}>كود الغرفة</Text>
        <TextInput
          style={styles.input}
          placeholder="مثال: A1B2C3"
          placeholderTextColor={COLORS.gray}
          value={roomCode}
          onChangeText={setRoomCode}
          autoCapitalize="characters"
          maxLength={6}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={joinRoom}>
          <Icon name="enter-outline" size={24} color={COLORS.accent} />
          <Text style={styles.secondaryButtonText}>الانضمام لغرفة</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.settingsLink} onPress={() => navigation.navigate('Settings')}>
        <Icon name="settings-outline" size={20} color={COLORS.gray} />
        <Text style={styles.settingsLinkText}>الإعدادات</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ========== شاشة الغرفة (قبل المكالمة) ==========
function RoomScreen({ route, navigation }) {
  const { roomCode, userName, isHost } = route.params;
  const [participants, setParticipants] = useState([userName]);

  const copyCode = () => {
    Share.share({ message: `انضم لغرفتي على FriendCall! الكود: ${roomCode}` });
  };

  const startCall = async () => {
    // طلب صلاحيات الكاميرا والمايك (Android)
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
      } catch (err) {
        console.warn(err);
      }
    }
    navigation.navigate('Call', { roomCode, userName });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      <View style={styles.roomHeader}>
        <Text style={styles.roomTitle}>غرفة الانتظار</Text>
      </View>

      <View style={styles.roomCard}>
        <Text style={styles.roomCodeLabel}>كود الغرفة</Text>
        <View style={styles.roomCodeBox}>
          <Text style={styles.roomCodeText}>{roomCode}</Text>
        </View>
        <TouchableOpacity style={styles.copyButton} onPress={copyCode}>
          <Icon name="copy-outline" size={20} color={COLORS.accent} />
          <Text style={styles.copyButtonText}>نسخ الكود</Text>
        </TouchableOpacity>

        <Text style={styles.participantsLabel}>المشاركون ({participants.length})</Text>
        {participants.map((p, i) => (
          <View key={i} style={styles.participantRow}>
            <Icon name="person-circle" size={28} color={COLORS.accent} />
            <Text style={styles.participantName}>{p} {i === 0 ? '(أنت)' : ''}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.startCallButton} onPress={startCall}>
          <Icon name="videocam" size={24} color={COLORS.dark} />
          <Text style={styles.startCallText}>بدء المكالمة</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ========== مكون عرض الفيديو (داخل LiveKitRoom) ==========
function RoomView() {
  const tracks = useTracks([Track.Source.Camera]);
  return (
    <View style={styles.remoteVideoContainer}>
      {tracks.map((trackRef, index) => {
        if (isTrackReference(trackRef)) {
          return (
            <VideoTrack
              key={trackRef.participant.identity + index}
              trackRef={trackRef}
              style={index === 0 ? styles.remoteVideo : styles.localVideoSmall}
            />
          );
        }
        return null;
      })}
    </View>
  );
}

// ========== شاشة المكالمة (LiveKit) ==========
function CallScreen({ route, navigation }) {
  const { roomCode, userName } = route.params;

  // بدء جلسة الصوت (ضروري لـ LiveKit)
  useEffect(() => {
    let start = async () => {
      await AudioSession.startAudioSession();
    };
    start();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  const endCall = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.callContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={LIVEKIT_TOKEN}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={endCall}
        style={styles.liveKitRoom}
      >
        <RoomView />
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={endCall}>
            <Icon name="call" size={28} color={COLORS.white} />
            <Text style={styles.controlLabel}>إنهاء</Text>
          </TouchableOpacity>
        </View>
      </LiveKitRoom>
    </View>
  );
}

// ========== شاشة الإعدادات ==========
function SettingsScreen({ navigation }) {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? COLORS.dark : COLORS.light }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={darkMode ? COLORS.dark : COLORS.light} />
      <View style={styles.settingsHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color={darkMode ? COLORS.white : COLORS.dark} />
        </TouchableOpacity>
        <Text style={[styles.settingsTitle, { color: darkMode ? COLORS.white : COLORS.dark }]}>الإعدادات</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.settingsList}>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: darkMode ? COLORS.white : COLORS.dark }]}>الوضع الليلي</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: COLORS.accent }} />
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: darkMode ? COLORS.white : COLORS.dark }]}>الإشعارات</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: COLORS.accent }} />
        </View>
        <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('سياسة الخصوصية', 'هذا التطبيق لا يجمع أي بيانات شخصية. المكالمات مشفرة.')}>
          <Text style={[styles.settingLabel, { color: darkMode ? COLORS.white : COLORS.dark }]}>سياسة الخصوصية</Text>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} />
        </TouchableOpacity>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: darkMode ? COLORS.white : COLORS.dark }]}>حول التطبيق</Text>
          <Text style={{ color: COLORS.gray }}>FriendCall v1.0</Text>
        </View>
        <Text style={styles.devCredit}>المطور: أدهم ياسر محمد</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ========== التنقل ==========
const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="Call" component={CallScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ========== الأنماط ==========
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  splashLogo: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(0,217,192,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  splashTitle: { fontSize: 42, fontWeight: 'bold', color: COLORS.accent, marginBottom: 8 },
  splashSubtitle: { fontSize: 16, color: COLORS.gray, marginBottom: 40 },
  splashDev: { fontSize: 12, color: COLORS.gray, position: 'absolute', bottom: 40 },
  homeHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 10 },
  homeTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.accent },
  homeCard: { margin: 20, padding: 20, backgroundColor: COLORS.primary, borderRadius: 20 },
  inputLabel: { color: COLORS.gray, marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: COLORS.dark, color: COLORS.white, padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  primaryButton: { backgroundColor: COLORS.accent, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 8 },
  primaryButtonText: { color: COLORS.dark, fontWeight: 'bold', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: COLORS.gray, marginHorizontal: 12 },
  secondaryButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: COLORS.accent },
  secondaryButtonText: { color: COLORS.accent, fontWeight: 'bold', fontSize: 16 },
  settingsLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 6 },
  settingsLinkText: { color: COLORS.gray, fontSize: 14 },
  roomHeader: { padding: 20 },
  roomTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  roomCard: { margin: 20, padding: 20, backgroundColor: COLORS.primary, borderRadius: 20 },
  roomCodeLabel: { color: COLORS.gray, marginBottom: 8, fontSize: 14 },
  roomCodeBox: { backgroundColor: COLORS.dark, padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  roomCodeText: { fontSize: 32, fontWeight: 'bold', color: COLORS.accent, letterSpacing: 4 },
  copyButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 20 },
  copyButtonText: { color: COLORS.accent, fontSize: 14 },
  participantsLabel: { color: COLORS.gray, marginBottom: 12, fontSize: 14 },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  participantName: { color: COLORS.white, fontSize: 16 },
  startCallButton: { backgroundColor: COLORS.accent, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 8, marginTop: 20 },
  startCallText: { color: COLORS.dark, fontWeight: 'bold', fontSize: 16 },
  callContainer: { flex: 1, backgroundColor: '#000' },
  liveKitRoom: { flex: 1 },
  remoteVideoContainer: { flex: 1, position: 'relative' },
  remoteVideo: { flex: 1, width: '100%', height: '100%' },
  localVideoSmall: { position: 'absolute', top: 20, right: 20, width: 100, height: 150, borderRadius: 12, borderWidth: 2, borderColor: COLORS.accent },
  controlsContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20 },
  controlButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 50, width: 70, height: 70, justifyContent: 'center' },
  controlLabel: { color: COLORS.white, fontSize: 10, marginTop: 4, textAlign: 'center' },
  endCallButton: { backgroundColor: COLORS.danger },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  settingsTitle: { fontSize: 22, fontWeight: 'bold' },
  settingsList: { paddingHorizontal: 20 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  settingLabel: { fontSize: 16 },
  devCredit: { color: COLORS.gray, textAlign: 'center', marginTop: 30, fontSize: 12 },
});