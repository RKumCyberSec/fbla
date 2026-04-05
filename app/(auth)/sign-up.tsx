import { useAuth, useSignUp } from '@clerk/expo'
import { Link, useRouter } from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  Image,
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

export default function SignUpPage() {
  const { signUp, errors, fetchStatus } = useSignUp()
  const { isSignedIn } = useAuth()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [code, setCode] = React.useState('')
  const [agreeToTerms, setAgreeToTerms] = React.useState(true)

  const loading = fetchStatus === 'fetching'

  const emailError = errors?.fields?.emailAddress?.message
  const passwordError = errors?.fields?.password?.message
  const codeError = errors?.fields?.code?.message

  React.useEffect(() => {
    if (isSignedIn) {
      router.replace('/onboarding')
    }
  }, [isSignedIn, router])

  const handleSubmit = async () => {
    const { error } = await signUp.password({
      emailAddress,
      password,
    })

    if (error) return

    await signUp.verifications.sendEmailCode()
  }

  const handleVerify = async () => {
    const { error } = await signUp.verifications.verifyEmailCode({
      code,
    })

    if (error) return

    if (signUp.status !== 'complete') {
      return
    }

    try {
      await signUp.finalize()
      router.replace('/onboarding')
    } catch {
      return
    }
  }

  if (signUp.status === 'complete') {
    return null
  }

  if (
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0
  ) {
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
            <View className="items-center">
              
            </View>

            <View className="mt-8 items-center">
              <Text className="text-[32px] font-bold text-[#1F2937]">
                Verify your email
              </Text>
              <Text className="mt-3 max-w-[300px] text-center text-[14px] leading-5 text-[#9CA3AF]">
                We sent a verification code to your email. Enter it below to finish
                creating your account.
              </Text>
            </View>

            <View className="mt-10">
              <Text className="mb-2 text-[13px] font-medium text-[#374151]">
                Verification Code
              </Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter verification code"
                placeholderTextColor="#C4C7CE"
                keyboardType="number-pad"
                className={`h-[52px] rounded-2xl px-4 text-[14px] text-[#111827] ${
                  codeError
                    ? 'border border-red-300 bg-red-50'
                    : 'border border-[#E5E7EB] bg-[#FAFAFA]'
                }`}
              />
              <FieldError message={codeError} />
            </View>

            <Pressable
              onPress={handleVerify}
              disabled={!code || loading}
              className={`mt-6 h-[52px] items-center justify-center rounded-full ${
                !code || loading ? 'bg-[#AFC0FF]' : 'bg-[#3D5AFE]'
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-[14px] font-semibold text-white">
                  Verify account
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => signUp.verifications.sendEmailCode()}
              className="mt-5 items-center"
            >
              <Text className="text-[13px] font-semibold text-[#3D5AFE]">
                Send a new code
              </Text>
            </Pressable>

            <View className="mt-8 items-center">
              <Link href="/sign-in">
                <Text className="text-[13px] font-medium text-[#9CA3AF]">
                  Back to sign in
                </Text>
              </Link>
            </View>
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
        <View className="flex-1 px-6 pt-16 pb-10">
          <View className="items-center">
         
          </View>

          <View className="mt-10">
            <Text className="text-center text-[32px] font-bold text-[#1F2937]">
              Create account
            </Text>
            <Text className="mt-3 text-center text-[14px] leading-5 text-[#9CA3AF]">
              Get started with FBLA Connect and set up your account in a few quick
              steps.
            </Text>
          </View>

          <View className="mt-12">
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
              className={`h-[52px] rounded-2xl px-4 text-[14px] text-[#111827] ${
                emailError
                  ? 'border border-red-300 bg-red-50'
                  : 'border border-[#E5E7EB] bg-[#FAFAFA]'
              }`}
            />
            <FieldError message={emailError} />
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-[13px] font-medium text-[#374151]">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Create a password"
              placeholderTextColor="#C4C7CE"
              className={`h-[52px] rounded-2xl px-4 text-[14px] text-[#111827] ${
                passwordError
                  ? 'border border-red-300 bg-red-50'
                  : 'border border-[#E5E7EB] bg-[#FAFAFA]'
              }`}
            />
            <FieldError message={passwordError} />
          </View>

          <View className="mt-4 rounded-2xl bg-[#F8FAFC] px-4 py-4">
            <Text className="text-[12px] leading-5 text-[#94A3B8]">
              Use at least 8 characters and choose a password you’ll remember.
            </Text>
          </View>

          <Pressable
            onPress={() => setAgreeToTerms((prev) => !prev)}
            className="mt-5 flex-row items-start"
          >
            <View
              className={`mt-[2px] h-[16px] w-[16px] items-center justify-center rounded-[4px] border ${
                agreeToTerms
                  ? 'border-[#3D5AFE] bg-[#3D5AFE]'
                  : 'border-[#D1D5DB] bg-white'
              }`}
            >
              {agreeToTerms ? (
                <Text className="text-[10px] font-bold text-white">✓</Text>
              ) : null}
            </View>

            <Text className="ml-2 flex-1 text-[13px] leading-5 text-[#9CA3AF]">
              I agree to the app terms and understand my email will be used for
              account verification.
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={!emailAddress || !password || !agreeToTerms || loading}
            className={`mt-7 h-[52px] items-center justify-center rounded-full ${
              !emailAddress || !password || !agreeToTerms || loading
                ? 'bg-[#AFC0FF]'
                : 'bg-[#3D5AFE]'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-[14px] font-semibold text-white">
                Create account
              </Text>
            )}
          </Pressable>

          <View className="mt-8 items-center">
            <View className="flex-row items-center">
              <Text className="text-[13px] text-[#9CA3AF]">
                Already have an account?
              </Text>
              <Link href="/sign-in" className="ml-2">
                <Text className="text-[13px] font-semibold text-[#3D5AFE]">
                  Sign in
                </Text>
              </Link>
            </View>
          </View>

          <View nativeID="clerk-captcha" className="mt-6" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}