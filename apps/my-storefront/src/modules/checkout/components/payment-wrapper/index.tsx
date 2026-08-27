"use client"

import { loadStripe } from "@stripe/stripe-js"
import React, { useEffect, useState } from "react"
import StripeWrapper from "./stripe-wrapper"
import { HttpTypes } from "@medusajs/types"

import Script from "next/script"
import { isStripeLike } from "@/lib/constants"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

const stripeKey =
  process.env.NEXT_PUBLIC_STRIPE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY

const medusaAccountId = process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID
const stripePromise = stripeKey
  ? loadStripe(
    stripeKey,
    medusaAccountId ? { stripeAccount: medusaAccountId } : undefined
  )
  : null

// const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ cart, children }) => {
//   const paymentSession = cart.payment_collection?.payment_sessions?.find(
//     (s) => s.status === "pending"
//   )
export default function PaymentWrapper({ cart, children }: PaymentWrapperProps) {
  const [stripePromise, setStripePromise] = useState<any>(null)

  useEffect(() => {
    if (stripeKey) {
      import("@stripe/stripe-js").then(({ loadStripe }) => {
        loadStripe(
          stripeKey,
          medusaAccountId ? { stripeAccount: medusaAccountId } : undefined
        ).then((stripe) => setStripePromise(stripe))
      })
    }
  }, [])

  const paymentSession = cart?.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )
  const isStripe = isStripeLike(paymentSession?.provider_id) && stripePromise
  // const isStripe =
  //   Boolean(paymentSession) &&
  //   isStripeLike(paymentSession?.provider_id) &&
  //   Boolean(stripePromise)

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      {isStripe && paymentSession ? (
        <StripeWrapper
          paymentSession={paymentSession}
          stripeKey={stripeKey}
          stripePromise={stripePromise}
        >
          {children}
        </StripeWrapper>
      ) : (
        <div>{children}</div>
      )}
    </>
  )
}
// export default PaymentWrapper


