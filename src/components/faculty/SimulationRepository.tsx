'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getCategoryColor, getDifficultyColor, formatDate } from '@/lib/utils'
import { Database, Plus, Search, Filter, Clock, BookOpen, Eye, Archive, CheckCircle, X } from 'lucide-react'

const CATEGORIES = ['cardiac','respiratory','neurological','obstetric','pediatric','trauma','sepsis','diabetes','renal','psychiatric','postoperative','general']
const DIFFICULTIES = ['beginner','intermediate','advanced']

export default function SimulationRepository({
  scenarios: initialScenarios, userId, userRole
}: {
  scenarios: any[], userId: string, userRole: string
}) {
  const supabase = createClient()
  const [scenarios, setScenarios] = useState(initialScenarios)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterDiff, setFilterDiff] = useState('')
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all')

  async function togglePublish(id: string, current: boolean) {
    const { error } = await supabase
      .from('simulation_scenarios')
      .update({ is_published: !current })
      .eq('id', id)
    if (!error) {
      setScenarios(s => s.map(sc => sc.id === id ? { ...sc, is_published: !current } : sc))
      toast.success(`Scenario ${!current ? 'published' : 'unpublished'}`)
    }
  }

  async function archiveScenario(id: string) {
    if (!confirm('Archive this scenario? It will be removed from the repository.')) return
    const { error } = await supabase
      .from('simulation_scenarios')
      .update({ is_archived: true })
      .eq('id', id)
    if (!error) {
      setScenarios(s => s.filter(sc => sc.id !== id))
      toast.success('Scenario archived')
    }
  }

  const filtered = scenarios.filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || s.category === filterCat
    const matchDiff = !filterDiff || s.difficulty === filterDiff
    const matchPub = filterPublished === 'all' ? true :
      filterPublished === 'published' ? s.is_published : !s.is_published
    return matchSearch && matchCat && matchDiff && matchPub
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Simulation Repository
          </h1>
          <p className="text-gray-500 text-sm mt-1">{scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} · {scenarios.filter(s => s.is_published).length} published</p>
        </div>
        <Link href="/faculty/scenarios/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> Create Scenario
        </Link>
      </div>

      {/* Filters */}
      <div className="ehr-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="form-input pl-9"
              placeholder="Search scenarios..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select className="form-select" value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
            <option value="">All difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
          <select className="form-select" value={filterPublished} onChange={e => setFilterPublished(e.target.value as any)}>
            <option value="all">All statuses</option>
            <option value="published">Published only</option>
            <option value="draft">Drafts only</option>
          </select>
        </div>
        {(search || filterCat || filterDiff || filterPublished !== 'all') && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            <button onClick={() => { setSearch(''); setFilterCat(''); setFilterDiff(''); setFilterPublished('all') }}
              className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Scenario cards */}
      {filtered.length === 0 && (
        <div className="ehr-card p-12 text-center">
          <Database className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <div className="text-gray-400">No scenarios match your filters.</div>
          <Link href="/faculty/scenarios/new" className="btn btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" /> Create First Scenario
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(scenario => (
          <div key={scenario.id} className="ehr-card hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{scenario.title}</span>
                    <span className={`badge text-xs ${scenario.is_published ? 'badge-green' : 'badge-amber'}`}>
                      {scenario.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{scenario.description}</p>

                  {scenario.patient && (
                    <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                      <span className="font-medium text-gray-700">Patient:</span>
                      {scenario.patient.last_name}, {scenario.patient.first_name} · MRN: {scenario.patient.mrn}
                    </div>
                  )}

                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`badge text-xs ${getCategoryColor(scenario.category)}`}>{scenario.category}</span>
                    <span className={`badge text-xs ${getDifficultyColor(scenario.difficulty)}`}>{scenario.difficulty}</span>
                    <span className="badge badge-gray text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {scenario.estimated_duration_minutes} min
                    </span>
                  </div>

                  {scenario.learning_objectives?.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-400">{scenario.learning_objectives.length} learning objectives</div>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-2">
                    By {scenario.creator?.first_name} {scenario.creator?.last_name}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <Link href={`/faculty/scenarios/${scenario.id}`} className="btn btn-secondary btn-sm">
                  <Eye className="w-3.5 h-3.5" /> View
                </Link>
                {(scenario.created_by === userId || userRole === 'admin') && (
                  <>
                    <button
                      onClick={() => togglePublish(scenario.id, scenario.is_published)}
                      className={`btn btn-sm ${scenario.is_published ? 'btn-secondary' : 'btn-success'}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {scenario.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <Link href={`/faculty/scenarios/${scenario.id}/edit`} className="btn btn-secondary btn-sm">
                      Edit
                    </Link>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => archiveScenario(scenario.id)}
                        className="btn btn-secondary btn-sm text-red-500 ml-auto"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
