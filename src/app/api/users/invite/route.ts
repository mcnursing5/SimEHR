import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email, first_name, last_name, role, course_id } = await req.json()

    if (!email || !first_name || !last_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user: caller } } = await supabase.auth.getUser()
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || !['faculty', 'admin'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    // Check if user already exists
    const { data: existing } = await adminSupabase
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .single()

    let userId: string

    if (existing) {
      userId = existing.id
    } else {
      // Invite via Supabase - redirectTo must point to our callback route
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
        data: { first_name, last_name, role },
        redirectTo: `${appUrl}/auth/callback`,
      })

      if (inviteError) {
        return NextResponse.json({ error: inviteError.message }, { status: 400 })
      }

      userId = inviteData.user.id

      // Upsert profile (trigger may already have created it)
      await adminSupabase.from('profiles').upsert({
        id: userId,
        email,
        first_name,
        last_name,
        role,
        is_active: true,
      })

      if (role === 'student') {
        await adminSupabase.from('student_details').upsert({ id: userId })
      } else if (role === 'faculty') {
        await adminSupabase.from('faculty_details').upsert({ id: userId })
      }
    }

    // Enroll in course if provided
    if (course_id && role === 'student') {
      await adminSupabase
        .from('enrollments')
        .upsert({ student_id: userId, course_id, status: 'active' }, { onConflict: 'student_id,course_id' })
    }

    return NextResponse.json({
      success: true,
      message: existing
        ? `${first_name} ${last_name} already exists and has been enrolled.`
        : `Invitation sent to ${email}`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
