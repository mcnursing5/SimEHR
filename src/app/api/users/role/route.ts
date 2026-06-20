import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await req.json()
    if (!userId || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user: caller } } = await supabase.auth.getUser()
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', caller.id).single()
    if (!['admin', 'sim_coordinator'].includes(callerProfile?.role)) {
      return NextResponse.json({ error: 'Admins and Sim Coordinators only' }, { status: 403 })
    }

    // Sim coordinators cannot promote to admin
    if (callerProfile?.role === 'sim_coordinator' && role === 'admin') {
      return NextResponse.json({ error: 'Sim Coordinators cannot assign admin role' }, { status: 403 })
    }

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
