// ==== ./src/modules/account/components/register/index.tsx ====
"use client"

import { useActionState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW, USER_ROLE } from "@modules/account/templates/login-template" // Ensure USER_ROLE is imported
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"
import { signupVendor } from "@lib/data/vendor"

// 🛠️ Update the interface to include activeRole
type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  activeRole: USER_ROLE
}

const Register = ({ setCurrentView, activeRole }: Props) => {
  // Select the appropriate backend action based on the top-level toggle state
  const currentAction = activeRole === "vendor" ? signupVendor : signup
  const [message, formAction] = useActionState(currentAction, null)

  return (
    <div className="max-w-sm flex flex-col items-center" data-testid="register-page">
      <h1 className="text-large-semi uppercase mb-6 text-center">
        {activeRole === "vendor" ? "Register Vendor Account" : "Become a Medusa Member"}
      </h1>
      
      <p className="text-center text-base-regular text-ui-fg-base mb-6">
        {activeRole === "vendor"
          ? "Register your corporate profile to list products and manage marketplace payouts."
          : "Create your member profile to save addresses, track orders, and checkout seamlessly."}
      </p>

      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          {/* 🚀 Dynamic input injection: Shows up automatically if user toggles to Vendor */}
          {activeRole === "vendor" && (
            <Input
              label="Brand / Company Name"
              name="brand_name"
              required
              autoComplete="organization"
            />
          )}
          
          <div className="flex gap-x-2">
            <Input
              label="First name"
              name="first_name"
              required
              autoComplete="given-name"
            />
            <Input
              label="Last name"
              name="last_name"
              required
              autoComplete="family-name"
            />
          </div>
          <Input
            label="Email"
            name="email"
            required
            type="email"
            autoComplete="email"
          />
          <Input
            label="Password"
            name="password"
            required
            type="password"
            autoComplete="new-password"
          />
        </div>
        
        <ErrorMessage error={message} data-testid="register-error" />
        
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          {activeRole === "vendor" ? "Initialize Merchant Account" : "Join"}
        </SubmitButton>
      </form>
      
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        Already a member?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          Sign in
        </button>
        .
      </span>
    </div>
  )
}

export default Register