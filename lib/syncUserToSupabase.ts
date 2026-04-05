import { supabase } from './supabase'

type ClerkUserData = {
  clerkUserId: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string | null
}

export async function syncUserToSupabase(user: ClerkUserData) {
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', user.clerkUserId)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (!existingUser) {
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        clerk_user_id: user.clerkUserId,
        email: user.email ?? null,
        first_name: user.firstName ?? null,
        last_name: user.lastName ?? null,
        image_url: user.imageUrl ?? null,
        onboarding_completed: false,
        onboarding_step: 0,
      })
      .select()
      .single()

    if (insertError) throw insertError
    return newUser
  }

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      email: user.email ?? existingUser.email,
      first_name: user.firstName ?? existingUser.first_name,
      last_name: user.lastName ?? existingUser.last_name,
      image_url: user.imageUrl ?? existingUser.image_url,
    })
    .eq('id', existingUser.id)
    .select()
    .single()

  if (updateError) throw updateError
  return updatedUser
}