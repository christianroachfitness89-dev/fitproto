import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'

const menuItems = [
  { icon: 'person-outline', label: 'Edit Profile', color: '#6366f1' },
  { icon: 'notifications-outline', label: 'Notifications', color: '#10b981' },
  { icon: 'card-outline', label: 'Subscription', color: '#f59e0b' },
  { icon: 'people-outline', label: 'Teammates', color: '#06b6d4' },
  { icon: 'help-circle-outline', label: 'Help & Support', color: '#8b5cf6' },
  { icon: 'settings-outline', label: 'App Settings', color: '#6b7280' },
]

export default function Profile() {
  const [darkMode, setDarkMode] = useState(true)
  const [notifications, setNotifications] = useState(true)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>CR</Text>
          </View>
          <Text style={styles.name}>Christian Roach</Text>
          <Text style={styles.email}>christian@fitproto.com</Text>
          <View style={styles.statsRow}>
            {[{ value: '5', label: 'Clients' }, { value: '3', label: 'Programs' }, { value: '14', label: 'Workouts' }].map(s => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Toggles */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, { backgroundColor: '#6366f120' }]}>
                <Ionicons name="moon-outline" size={18} color="#6366f1" />
              </View>
              <Text style={styles.toggleLabel}>Dark Mode</Text>
            </View>
            <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: '#4f46e5' }} thumbColor="#fff" />
          </View>
          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, { backgroundColor: '#10b98120' }]}>
                <Ionicons name="notifications-outline" size={18} color="#10b981" />
              </View>
              <Text style={styles.toggleLabel}>Push Notifications</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: '#4f46e5' }} thumbColor="#fff" />
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity key={item.label} style={[styles.menuItem, idx === menuItems.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#4b5563" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  profileHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 24, paddingHorizontal: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 28 },
  name: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  email: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statBox: { alignItems: 'center', backgroundColor: '#1e1e35', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  section: { marginHorizontal: 20, backgroundColor: '#1e1e35', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2e2e45' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: 15, color: '#fff', fontWeight: '500' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2e2e45' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: '#fff', fontWeight: '500' },
  signOutBtn: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#1e1e35', borderRadius: 16 },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },
})
