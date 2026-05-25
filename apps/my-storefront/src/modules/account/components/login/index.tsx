// ==== ./src/modules/account/components/login/index.tsx ====
"use client"

import { login } from "@lib/data/customer"
import { LOGIN_VIEW, USER_ROLE } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState } from "react"
import { useParams } from "next/navigation" // Added for geo-location tracking

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  activeRole: USER_ROLE
}

const Login = ({ setCurrentView, activeRole }: Props) => {
  const [message, formAction] = useActionState(login, null)
  const params = useParams()
  
  // Safely extract active country from your dynamic routing framework (e.g., /[countryCode]/account)
  const countryCode = (params?.countryCode as string) || "in"

  return (
    <div className="max-w-sm w-full flex flex-col items-center" data-testid="login-page">
      <h1 className="text-large-semi uppercase mb-6">
        {activeRole === "vendor" ? "Vendor Portal" : "Welcome back"}
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        {activeRole === "vendor" 
          ? "Sign in to manage your inventory, orders, and storefront payouts." 
          : "Sign in to access an enhanced shopping experience."}
      </p>

      <form className="w-full" action={formAction}>
        {/* 🚀 HIDDEN INJECTIONS: Passes both authorization contexts straight to the Server Action */}
        <input type="hidden" name="user_role" value={activeRole} />
        <input type="hidden" name="country_code" value={countryCode} />

        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="Email"
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton data-testid="sign-in-button" className="w-full mt-6">
          {activeRole === "vendor" ? "Access Dashboard" : "Sign in"}
        </SubmitButton>
      </form>

      {activeRole === "customer" && (
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          Not a member?{" "}
          <button
            onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
            className="underline"
            data-testid="register-button"
          >
            Join us
          </button>
        </span>
      )}
    </div>
  )
}

export default Login