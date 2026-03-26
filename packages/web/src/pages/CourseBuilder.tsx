import { BookOpen, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { CoursesTab } from './Community'

export default function CourseBuilder() {
  const { profile } = useAuth()

  if (!profile?.org_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">Build modules and lessons, then assign them to communities.</p>
      </div>

      <CoursesTab orgId={profile.org_id} communityId={null} />
    </div>
  )
}
