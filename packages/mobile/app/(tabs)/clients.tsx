import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'

const clients = [
  { id: '1', name: 'Alex Johnson', initials: 'AJ', email: 'alex.j@email.com', status: 'active', goal: 'Weight Loss', compliance: 0, lastActive: '1h ago' },
  { id: '2', name: 'Sarah Kim', initials: 'SK', email: 'sarah.k@email.com', status: 'active', goal: 'Muscle Gain', compliance: 29, lastActive: '2w ago' },
  { id: '3', name: 'Marcus Reid', initials: 'MR', email: 'marcus.r@email.com', status: 'active', goal: 'Performance', compliance: 91, lastActive: '6d ago' },
  { id: '4', name: 'Emily Torres', initials: 'ET', email: 'emily.t@email.com', status: 'pending', goal: 'General', compliance: 50, lastActive: '3d ago' },
  { id: '5', name: 'David Park', initials: 'DP', email: 'david.p@email.com', status: 'inactive', goal: 'Weight Loss', compliance: 10, lastActive: '3w ago' },
]

const statusColors: Record<string, string> = {
  active: '#10b981',
  pending: '#f59e0b',
  inactive: '#6b7280',
}

export default function Clients() {
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Clients ({filtered.length})</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="person-add-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#6b7280" style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search client..."
          placeholderTextColor="#6b7280"
          style={styles.searchInput}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {filtered.map(client => (
            <Pressable key={client.id} style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{client.initials}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.clientName}>{client.name}</Text>
                  <Text style={styles.clientEmail}>{client.email}</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: statusColors[client.status] }]} />
              </View>

              <View style={styles.cardStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{client.goal}</Text>
                  <Text style={styles.statLabel}>Goal</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: client.compliance >= 80 ? '#10b981' : client.compliance >= 50 ? '#f59e0b' : '#9ca3af' }]}>
                    {client.compliance}%
                  </Text>
                  <Text style={styles.statLabel}>30d Training</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{client.lastActive}</Text>
                  <Text style={styles.statLabel}>Last Active</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="chatbubble-outline" size={16} color="#6366f1" />
                  <Text style={styles.actionText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]}>
                  <Ionicons name="person-outline" size={16} color="#9ca3af" />
                  <Text style={[styles.actionText, { color: '#9ca3af' }]}>Profile</Text>
                </TouchableOpacity>
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e35', borderRadius: 12, marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff' },
  list: { paddingHorizontal: 20, gap: 12 },
  card: { backgroundColor: '#1e1e35', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  clientEmail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#2e2e45', paddingTop: 12, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 13, fontWeight: '600', color: '#fff' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#eef2ff20', borderRadius: 10, paddingVertical: 8 },
  actionBtnSecondary: { backgroundColor: '#2e2e45' },
  actionText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
})
