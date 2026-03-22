import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

const stats = [
  { label: 'Total Clients', value: '5', icon: 'people', color: '#6366f1', bg: '#eef2ff' },
  { label: 'Workouts', value: '14', icon: 'barbell', color: '#10b981', bg: '#ecfdf5' },
  { label: 'Compliance', value: '73%', icon: 'trending-up', color: '#f59e0b', bg: '#fffbeb' },
  { label: 'Messages', value: '2', icon: 'chatbubble', color: '#ef4444', bg: '#fef2f2' },
]

const recentClients = [
  { id: '1', name: 'Alex Johnson', initials: 'AJ', goal: 'Weight Loss', compliance: 0, lastActive: '1h ago', status: 'active' },
  { id: '2', name: 'Sarah Kim', initials: 'SK', goal: 'Muscle Gain', compliance: 29, lastActive: '2w ago', status: 'active' },
  { id: '3', name: 'Marcus Reid', initials: 'MR', goal: 'Performance', compliance: 91, lastActive: '6d ago', status: 'active' },
]

export default function Dashboard() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.name}>Christian Roach</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <View style={styles.notifBadge} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: '#1e1e35' }]}>
              <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Clients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Clients</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/clients')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentClients.map((client) => (
            <Pressable key={client.id} style={({ pressed }) => [styles.clientCard, pressed && styles.clientCardPressed]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{client.initials}</Text>
              </View>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientGoal}>{client.goal} · {client.lastActive}</Text>
              </View>
              <View style={styles.complianceContainer}>
                <Text style={[styles.compliancePct, { color: client.compliance >= 80 ? '#10b981' : client.compliance >= 50 ? '#f59e0b' : '#9ca3af' }]}>
                  {client.compliance}%
                </Text>
                <Text style={styles.complianceLabel}>30d</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  scroll: { paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  greeting: { fontSize: 14, color: '#9ca3af', marginBottom: 2 },
  name: { fontSize: 22, fontWeight: '700', color: '#fff' },
  notifBtn: { position: 'relative', padding: 4 },
  notifBadge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, gap: 8 },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  section: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  seeAll: { fontSize: 14, color: '#6366f1', fontWeight: '600' },
  clientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e35', borderRadius: 14, padding: 14, marginBottom: 10 },
  clientCardPressed: { opacity: 0.7 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  clientGoal: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  complianceContainer: { alignItems: 'flex-end' },
  compliancePct: { fontSize: 16, fontWeight: '700' },
  complianceLabel: { fontSize: 11, color: '#6b7280' },
})
