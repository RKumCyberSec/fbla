import { GoogleSignInButton } from '@/components/GoogleSignInButton'
import { useSignIn } from '@clerk/expo'
import { type Href, Link, useRouter } from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'

function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <View className="mt-2 flex-row items-start rounded-xl border border-red-100 bg-red-50 px-3 py-2">
      <View className="mr-2 mt-1 h-2 w-2 rounded-full bg-red-500" />
      <Text className="flex-1 text-[12px] leading-4 text-red-600">{message}</Text>
    </View>
  )
}

export default function SignInPage() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [code, setCode] = React.useState('')
  const [keepSignedIn, setKeepSignedIn] = React.useState(true)

  const loading = fetchStatus === 'fetching'

  const emailError = errors?.fields?.identifier?.message
  const passwordError = errors?.fields?.password?.message
  const codeError = errors?.fields?.code?.message

  const navigateAfterSignIn = async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return

        const url = decorateUrl('/')
        if (url.startsWith('http')) {
          window.location.href = url
        } else {
          router.push(url as Href)
        }
      },
    })
  }

  const handleSubmit = async () => {
    const { error } = await signIn.password({
      emailAddress,
      password,
    })

    if (error) return

    if (signIn.status === 'complete') {
      await navigateAfterSignIn()
      return
    }

    if (signIn.status === 'needs_client_trust') {
      const emailCodeFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === 'email_code'
      )

      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode()
      }
    }
  }

  const handleVerify = async () => {
    const { error } = await signIn.mfa.verifyEmailCode({ code })

    if (error) return

    if (signIn.status === 'complete') {
      await navigateAfterSignIn()
    }
  }

  if (signIn.status === 'needs_client_trust') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-16 pb-10">
            <View className="mt-8">
              <Text className="text-[34px] font-bold text-[#1F2937]">Verify</Text>
              <Text className="mt-2 text-[14px] leading-5 text-[#9CA3AF]">
                Enter the code sent to your email to continue.
              </Text>
            </View>

            <View className="mt-10">
              <Text className="mb-2 text-[13px] font-medium text-[#374151]">
                Verification Code
              </Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter code"
                placeholderTextColor="#C4C7CE"
                keyboardType="number-pad"
                className={`h-[50px] rounded-xl px-4 text-[14px] text-[#111827] ${
                  codeError
                    ? 'border border-red-300 bg-red-50'
                    : 'border border-[#E5E7EB] bg-white'
                }`}
              />
              <FieldError message={codeError} />
            </View>

            <Pressable
              onPress={handleVerify}
              disabled={!code || loading}
              className={`mt-6 h-[50px] items-center justify-center rounded-full ${
                !code || loading ? 'bg-[#AFC0FF]' : 'bg-[#3D5AFE]'
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-[14px] font-semibold text-white">Verify</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => signIn.mfa.sendEmailCode()}
              className="mt-4 items-center"
            >
              <Text className="text-[13px] font-medium text-[#3D5AFE]">
                Resend code
              </Text>
            </Pressable>

            <Pressable
              onPress={() => signIn.reset()}
              className="mt-3 items-center"
            >
              <Text className="text-[13px] text-[#9CA3AF]">Start over</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 pt-20 pb-10">
          <View className="mt-8">
            <Text className="text-[34px] font-bold text-[#1F2937]">Login</Text>
            <Text className="mt-2 text-[14px] leading-5 text-[#9CA3AF]">
              Welcome back to the app
            </Text>
          </View>

          <View className="mt-10">
            <Text className="mb-2 text-[13px] font-medium text-[#374151]">
              Email Address
            </Text>
            <TextInput
              value={emailAddress}
              onChangeText={setEmailAddress}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="hello@example.com"
              placeholderTextColor="#C4C7CE"
              className={`h-[50px] rounded-xl px-4 text-[14px] text-[#111827] ${
                emailError
                  ? 'border border-red-300 bg-red-50'
                  : 'border border-[#E5E7EB] bg-white'
              }`}
            />
            <FieldError message={emailError} />
          </View>

          <View className="mt-5">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[13px] font-medium text-[#374151]">
                Password
              </Text>

              <Pressable>
                <Text className="text-[11px] font-medium text-[#6C7CFF]">
                  Forgot Password?
                </Text>
              </Pressable>
            </View>

            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#C4C7CE"
                className={`h-[50px] rounded-xl px-4 pr-12 text-[14px] text-[#111827] ${
                  passwordError
                    ? 'border border-red-300 bg-red-50'
                    : 'border border-[#E5E7EB] bg-white'
                }`}
              />

              <View className="absolute right-4 top-0 h-[50px] items-center justify-center">
                <Text className="text-[16px] text-[#9CA3AF]">◉</Text>
              </View>
            </View>

            <FieldError message={passwordError} />
          </View>

          <Pressable
            onPress={() => setKeepSignedIn((prev) => !prev)}
            className="mt-5 flex-row items-center"
          >
            <View
              className={`h-[16px] w-[16px] items-center justify-center rounded-[4px] border ${
                keepSignedIn
                  ? 'border-[#3D5AFE] bg-[#3D5AFE]'
                  : 'border-[#D1D5DB] bg-white'
              }`}
            >
              {keepSignedIn ? (
                <Text className="text-[10px] font-bold text-white">✓</Text>
              ) : null}
            </View>

            <Text className="ml-2 text-[13px] text-[#9CA3AF]">
              Keep me signed in
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={!emailAddress || !password || loading}
            className={`mt-6 h-[50px] items-center justify-center rounded-full ${
              !emailAddress || !password || loading
                ? 'bg-[#AFC0FF]'
                : 'bg-[#3D5AFE]'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-[14px] font-semibold text-white">Login</Text>
            )}
          </Pressable>

          <View className="mt-6 flex-row items-center">
            <View className="h-px flex-1 bg-[#F0F1F3]" />
            <Text className="mx-3 text-[12px] text-[#C4C7CE]">or sign in with</Text>
            <View className="h-px flex-1 bg-[#F0F1F3]" />
          </View>

          <View className="mt-5 ">
            <GoogleSignInButton />
          </View>

          <View className="mt-8 items-center">
            <Link href="/sign-up">
              <Text className="text-[13px] font-semibold text-[#3D5AFE]">
                Create an account
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}