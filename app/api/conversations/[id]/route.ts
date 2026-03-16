import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DELETE - Delete a conversation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Get team member
    const { data: teamMember } = await admin
      .from('team_members')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Verify conversation belongs to same organization
    const { data: conversation } = await admin
      .from('conversations')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.organization_id !== teamMember.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete all messages first (due to foreign key)
    await admin
      .from('messages')
      .delete()
      .eq('conversation_id', id)

    // Delete the conversation
    const { error: deleteError } = await admin
      .from('conversations')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting conversation:', deleteError)
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update conversation (status, assignment, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const admin = createAdminClient()

    // Get team member
    const { data: teamMember } = await admin
      .from('team_members')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Verify conversation belongs to same organization
    const { data: conversation } = await admin
      .from('conversations')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.organization_id !== teamMember.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (body.status) updateData.status = body.status
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to

    // Update conversation
    const { data: updated, error: updateError } = await admin
      .from('conversations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating conversation:', updateError)
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation: updated })
  } catch (error) {
    console.error('Error in PATCH conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
