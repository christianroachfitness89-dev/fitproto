import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'

const sections = [
  { key: 'exercises', label: 'Exercises', icon: 'barbell-outline', count: 8, color: '#6366f1' },
  { key: 'workouts', label: 'Workouts', icon: 'fitness-outline', count: 3, color: '#10b981' },
  { key: 'programs', label: 'Programs', icon: 'stats-chart-outline', count: 3, color: '#f59e0b' },
  { key: 'tasks', label: 'Tasks', icon: 'checkmark-circle-outline', count: 0, color: '#06b6d4' },
  { key: 'forms', label: 'Forms', icon: 'document-text-outline', count: 0, color: '#8b5cf6' },
  { key: 'meals', label: 'Meal Plans', icon: 'nutrition-outline', count: 0, color: '#ec4899' },
  { key: 'metrics', label: 'Metrics', icon: 'analytics-outline', count: 0, color: '#14b8a6' },
]

const exercises = [
  { name: 'Barbell Back Squat', muscle: 'Legs', equipment: 'Barbell' },
  { name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell' },
  { name: 'Deadlift', muscle: 'Back', equipment: 'Barbell' },
  { name: 'Pull-ups', muscle: 'Back', equipment: 'Bodyweight' },
  { name: 'Plank', muscle: 'Core', equipment: 'Bodyweight' },
]

export default function Library() {
  const [active, setActive] = useState('exercises')

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Section tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {sections.map(s => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setActive(s.key)}
            style={[styles.tab, active === s.key && { backgroundColor: s.color + '22', borderColor: s.color }]}
          >
            <Ionicons name={s.icon as any} size={14} color={active === s.key ? s.color : '#6b7280'} />
            <Text style={[styles.tabText, active === s.key && { color: s.color }]}>{s.label}</Text>
            {s.count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: active === s.key ? s.color : '#2e2e45' }]}>
                <Text style={styles.tabBadgeText}>{s.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {active === 'exercises' && exercises.map(ex => (
          <Pressable key={ex.name} style={({ pressed }) => [styles.exerciseCard, pressed && { opacity: 0.7 }]}>
            <View style={styles.exerciseIcon}>
              <Ionicons name="barbell-outline" size={22} color="#6366f1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <Text style={styles.exerciseMeta}>{ex.muscle} · {ex.equipment}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4b5563" />
          </Pressable>
        ))}
        {active !== 'exercises' && (
          <View style={styles.empty}>
            <Ionicons name="add-circle-outline" size={48} color="#2e2e45" />
            <Text style={styles.emptyText}>No {sections.find(s => s.key === active)?.label} yet</Text>
            <TouchableOpacity style={styles.createBtn}>
              <Text style={styles.createBtnText}>Create your first one</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13131f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  tabsScroll: { marginBottom: 16 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2e2e45', backgroundColor: '#1e1e35' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e35', borderRadius: 14, padding: 14, marginBottom: 10 },
  exerciseIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#6366f115', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  exerciseMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15, color: '#6b7280' },
  createBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#4f46e5', borderRadius: 12 },
  createBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
})
