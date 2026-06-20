'use client'
import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Users, Activity, ChevronRight, GraduationCap, Info } from 'lucide-react'

export default function CoursesManager({ facultyId, courses, academicYears, catalog }: {
  facultyId: string; courses: any[]; academicYears: any[]; catalog: any[]
}) {
  const grouped = courses.reduce((acc, c) => {
    const key = `${c.semester?.academic_year?.year_label ?? 'Unknown'} — ${c.semester?.name ?? ''}`
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          My Courses
        </h1>
        <p className="text-gray-500 text-sm mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} assigned to you</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2 text-sm text-emerald-700">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        Course offerings are created and assigned by your Sim Coordinator or Administrator.
        If a course is missing or you need a new course offering set up, contact them.
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="ehr-card p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <div className="text-gray-400">No courses assigned to you yet.</div>
          <div className="text-gray-400 text-sm mt-1">Your Sim Coordinator or Administrator will assign you to course offerings.</div>
        </div>
      )}

      {Object.entries(grouped).map(([group, groupCourses]: [string, any]) => (
        <div key={group}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{group}</h2>
          <div className="space-y-3">
            {groupCourses.map((c: any) => (
              <div key={c.id} className="ehr-card hover:shadow-md transition-shadow">
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-emerald-700 font-mono">{c.course_code}</span>
                      {c.section && c.section !== '001' && <span className="badge badge-gray text-xs">§{c.section}</span>}
                      <span className="font-semibold">{c.title}</span>
                      <span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                      {c.assignment_role && c.assignment_role !== 'instructor' && (
                        <span className="badge badge-purple text-xs capitalize">{c.assignment_role.replace('_', ' ')}</span>
                      )}
                    </div>
                    {c.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{c.description}</p>}
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.enrollments?.[0]?.count ?? 0} students</span>
                      <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" />{c.course_simulations?.[0]?.count ?? 0} sims</span>
                    </div>
                  </div>
                  <Link href={`/faculty/courses/${c.id}`} className="btn btn-primary btn-sm flex-shrink-0">
                    Manage <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
