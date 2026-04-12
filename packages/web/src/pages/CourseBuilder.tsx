import { BookOpen, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { CoursesTab } from './Community'

export default function CourseBuilder() {
  const { profile } = useAuth()

  if (!profile?.org_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <BookOpen size={18} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-[#e8edf5]" style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>Courses</h1>
        </div>
        <p className="text-sm text-[#4a5a75] ml-12">Build modules and lessons, then assign them to communities.</p>
      </div>

      <CoursesTab orgId={profile.org_id} communityId={null} />
    </div>
  )
}
