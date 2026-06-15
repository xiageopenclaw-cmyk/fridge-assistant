import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Image, Alert, Platform, ActionSheetIOS,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HeaderWithFridge } from '../../components/PageHeader';
import { Colors, Fonts, Spacing, Radius } from '../../theme';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useChat, useRecords } from '../../hooks/useLiveData';

const PAGE_PX = 20;
let msgCounter = 10;

interface Msg { id: string; role: 'user' | 'assistant'; text: string }

export default function RecordScreen() {
  const { send, sending } = useChat();
  const { records } = useRecords(5);
  const [messages, setMessages] = useState<Msg[]>([
    { id: '1', role: 'assistant', text: '嘿！今天冰箱补了西兰花和鸡胸肉，晚上想做什么菜呀？😋' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const handleCapture = useCallback(() => {
    const options = ['拍照', '从相册选', '取消'];
    const cancelIdx = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIdx, title: '添加食材' },
        async (idx) => {
          if (idx === 0) await takePhoto();
          else if (idx === 1) await pickFromGallery();
        }
      );
    } else {
      // Android: simple alert
      Alert.alert('添加食材', '', [
        { text: '拍照', onPress: () => takePhoto() },
        { text: '从相册选', onPress: () => pickFromGallery() },
        { text: '取消', style: 'cancel' },
      ]);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('权限不足', '需要相机权限才能拍照'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false });
    if (!result.canceled && result.assets?.[0]) {
      setMessages((prev) => [...prev, { id: String(++msgCounter), role: 'user', text: '[拍照] 已添加食材图片' }]);
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: String(++msgCounter), role: 'assistant', text: '收到！看起来你添加了新的食材，我会更新库存清单 📋' }]);
      }, 800);
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('权限不足', '需要相册权限才能选择照片'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false });
    if (!result.canceled && result.assets?.[0]) {
      setMessages((prev) => [...prev, { id: String(++msgCounter), role: 'user', text: '[相册] 已添加食材图片' }]);
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: String(++msgCounter), role: 'assistant', text: '已识别图片中的食材：西兰花、胡萝卜。已加入库存 ✅' }]);
      }, 800);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('权限不足', '需要麦克风权限'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch { Alert.alert('录音失败', '请重试'); }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      // Simulate voice-to-text
      setMessages((prev) => [...prev, { id: String(++msgCounter), role: 'user', text: '[语音] 🎤 语音消息' }]);
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: String(++msgCounter), role: 'assistant', text: '收到你的语音啦！后续会接入语音识别 🎧' }]);
      }, 600);
    } catch { /* ignore */ }
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setMessages((prev) => [...prev, { id: String(++msgCounter), role: 'user', text }]);
    setInputText('');
    const reply = await send(text);
    setMessages((prev) => [...prev, { id: String(++msgCounter), role: 'assistant', text: reply }]);
  }, [inputText, send, sending]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#CDE4B9', '#d5e8c4', '#f5f5f3']}
        locations={[0, 0.4, 1]}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <HeaderWithFridge title="记录" subtitle="拍照识别 · 语音补充" />

        {/* Recent Records */}
        <Text style={styles.sectionTitle}>最近记录</Text>
        {records.length === 0 ? (
          <Text style={{ paddingHorizontal: PAGE_PX, color: Colors.subtitle, marginBottom: 12 }}>
            暂无记录，开始使用吧！
          </Text>
        ) : (
          records.map((r) => (
            <View key={r.id} style={styles.recordCard}>
              <View style={styles.recordIcon}>
                <Text style={styles.recordIconText}>
                  {r.type === 'cooking' ? '🍳' : r.type === 'shopping' ? '🛒' : '📦'}
                </Text>
              </View>
              <View style={styles.recordBody}>
                <Text style={styles.recordTitle}>
                  {r.type === 'cooking' ? '做饭' : r.type === 'shopping' ? '采购' : '记录'}
                </Text>
                <Text style={styles.recordDesc}>{r.description}</Text>
                <Text style={styles.recordTime}>
                  {new Date(r.created_at).toLocaleDateString('zh-CN')}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Capture */}
        <TouchableOpacity style={styles.captureBtn} activeOpacity={0.85} onPress={handleCapture}>
          <View style={styles.captureBtnInner}>
            <View style={styles.captureCircle}>
              <Text style={styles.captureIcon}>📷</Text>
            </View>
            <View style={styles.captureBtnTextBlock}>
              <Text style={styles.captureLabel}>拍照识别</Text>
              <Text style={styles.captureHint}>记录新增食材、每餐饮食</Text>
            </View>
            <Text style={styles.captureArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* AI Chat */}
        <Text style={styles.sectionTitle}>AI 小助手</Text>
        <View style={styles.chatCard}>
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.chatBubble,
                msg.role === 'user' ? styles.chatRight : styles.chatLeft,
              ]}
            >
              {msg.role === 'assistant' && (
                <Text style={styles.chatAvatar}>🤖</Text>
              )}
              <View
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Input */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.micBtn, isRecording && styles.micBtnOn]}
            activeOpacity={0.7}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <Text style={styles.micIcon}>{isRecording ? '🔴' : '🎤'}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="记录买了什么、做了什么菜..."
            placeholderTextColor={Colors.hint}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnOff]}
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendArrow}>➤</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  sectionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.title,
    paddingHorizontal: PAGE_PX,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: PAGE_PX,
    marginBottom: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef4ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordIconText: { fontSize: 20 },
  recordBody: { flex: 1 },
  recordTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.title,
  },
  recordDesc: {
    fontSize: Fonts.sizes.sm,
    color: Colors.subtitle,
    marginTop: 3,
  },
  recordTime: {
    fontSize: Fonts.sizes.xs,
    color: Colors.hint,
    marginTop: 4,
  },
  recordThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
  },

  captureBtn: {
    marginHorizontal: PAGE_PX,
    marginTop: 20,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  captureBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  captureCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef4ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureIcon: { fontSize: 22 },
  captureBtnTextBlock: { flex: 1 },
  captureLabel: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.title,
  },
  captureHint: {
    fontSize: Fonts.sizes.xs,
    color: Colors.subtitle,
    marginTop: 2,
  },
  captureArrow: {
    fontSize: 24,
    color: Colors.hint,
  },

  chatCard: { marginHorizontal: PAGE_PX, paddingVertical: 8 },
  chatBubble: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  chatRight: { justifyContent: 'flex-end' },
  chatLeft: { justifyContent: 'flex-start' },
  chatAvatar: { fontSize: 24, marginRight: 8 },
  bubble: {
    maxWidth: '75%',
    borderRadius: Radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: Colors.greenLight,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  bubbleText: { fontSize: Fonts.sizes.base, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: Colors.body },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: PAGE_PX,
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: Fonts.sizes.base,
    color: Colors.body,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.greenPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: Colors.divider },
  sendArrow: { fontSize: 16, color: '#fff' },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eef4ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnOn: { backgroundColor: '#fdeded' },
  micIcon: { fontSize: 16 },
});
