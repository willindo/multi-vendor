// ==== ./src/modules/account/templates/login-template.tsx ====
"use client"

import { useState } from "react"
import Register from "@modules/account/components/register"
import Login from "../components/login"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
}

export type USER_ROLE = "customer" | "vendor"

const LoginTemplate = () => {
  const [currentView, setCurrentView] = useState<string>("sign-in")
  const [activeRole, setActiveRole] = useState<USER_ROLE>("customer")

  return (
    <div className="w-full flex flex-col items-center justify-start px-8 py-8 gap-y-6">
      
      {/* 🚀 Lifted Selector Toggle: Now visible on BOTH Sign-In and Register views */}
      <div className="flex w-full max-w-sm bg-ui-bg-subtle p-1 rounded-lg border border-ui-border-base mb-2">
        <button
          type="button"
          onClick={() => setActiveRole("customer")}
          className={`flex-1 text-center py-2 text-small-semi rounded-md transition-all ${
            activeRole === "customer"
              ? "bg-white text-ui-fg-base shadow-sm"
              : "text-ui-fg-subtle hover:text-ui-fg-base"
          }`}
        >
          {currentView === "sign-in" ? "Shop as Customer" : "Join as Customer"}
        </button>
        <button
          type="button"
          onClick={() => setActiveRole("vendor")}
          className={`flex-1 text-center py-2 text-small-semi rounded-md transition-all ${
            activeRole === "vendor"
              ? "bg-black text-white shadow-sm"
              : "text-ui-fg-subtle hover:text-ui-fg-base"
          }`}
        >
          {currentView === "sign-in" ? "Manage as Vendor" : "Become a Vendor"}
        </button>
      </div>

      {currentView === "sign-in" ? (
        <Login setCurrentView={setCurrentView} activeRole={activeRole} />
      ) : (
        /* Pass activeRole down to Register so it can morph the inputs dynamically */
        <Register setCurrentView={setCurrentView} activeRole={activeRole} />
      )}
    </div>
  )
}

export default LoginTemplate