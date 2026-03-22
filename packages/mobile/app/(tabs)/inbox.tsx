import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

const conversations = [
  { id: '1', name: 'Marcus Reid', initials: 'MR', last: 'Just finished the leg day!', time: '10:30 AM', unread: 1 },
  { id: '2', name: 'Alex Johnson', initials: 'AJ', last: 'Can we schedule a check-in?', time: 'Yesterday', unread: 1 },
  { id: '3', name: 'Sarah Kim', initials: 'SK', last: 'I uploaded my progress photos.', time: 'Mon', unread: 0 },
]

export default function Inbox() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <TouchableOpacity style={styles.composeBtn}>
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#6b7280" />
        <TextInput placeholder="Search messages..." placeholderTextColor="#6b7280" style={styles.searchInput} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {conversations.map((convo) => (
          <Pressable key={convo.id} style={({ pressed }) => [styles.convoItem, pressed && { backgroundColor: '#1a1a30' }]}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{convo.initials}</Text>
              </View>
              {convo.unread > 0 && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.convoInfo}>
              <View style={styles.convoTop}>
                <Text style={styles.convoName}>{convo.name}</Text>
                <Text style={styles.convoTime}>{convo.time}</Text>
              </View>
              <View style={styles.convoBottom}>
                <Text style={[styles.convoLast, convo.unread > 0 && { color: '#d1d5db' }]} numberOfLines={1}>
                  {convo.last}
                </Text>
                {convo.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{convo.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  composeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e1e35', borderRadius: 12, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff' },
  convoItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e1e35' },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#13131f' },
  convoInfo: { flex: 1 },
  convoTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convoName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  convoTime: { fontSize: 12, color: '#6b7280' },
  convoBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convoLast: { flex: 1, fontSize: 13, color: '#6b7280' },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#fff' },
})
