"use client"

import { isManual, isStripeLike, isRazorpay } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import React, { useState } from "react"
import ErrorMessage from "../error-message"

declare global {
  interface Window {
    Razorpay: any
  }
}

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )
  // 1. Add a direct provider validation string check
  const isRazorpay = (providerId?: string) => {
    return providerId?.startsWith("pp_razorpay") || providerId?.includes("razorpay")
  }

  // 2. Insert the case criteria within your main PaymentButton switch statement
  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isRazorpay(paymentSession?.provider_id):
      return (
        <RazorpayPaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton
          notReady={notReady}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled className="w-full">Select a payment method</Button>
  }
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("card")

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const disabled = !stripe || !elements ? true : false

  const handlePayment = async () => {
    setSubmitting(true)

    if (!stripe || !elements || !card || !cart) {
      setSubmitting(false)
      return
    }

    await stripe
      .confirmCardPayment(session?.data.client_secret as string, {
        payment_method: {
          card: card,
          billing_details: {
            name:
              cart.billing_address?.first_name +
              " " +
              cart.billing_address?.last_name,
            address: {
              city: cart.billing_address?.city ?? undefined,
              country: cart.billing_address?.country_code ?? undefined,
              line1: cart.billing_address?.address_1 ?? undefined,
              line2: cart.billing_address?.address_2 ?? undefined,
              postal_code: cart.billing_address?.postal_code ?? undefined,
              state: cart.billing_address?.province ?? undefined,
            },
            email: cart.email,
            phone: cart.billing_address?.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            onPaymentCompleted()
          }

          setErrorMessage(error.message || null)
          return
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent.status === "succeeded"
        ) {
          return onPaymentCompleted()
        }

        return
      })
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

export const RazorpayPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )
  // Extract amount safely: use paymentSession.amount or fallback to cart total
  const amountInUnits = paymentSession?.amount ?? cart.total ?? 0
  const razorpayAmountInPaise = Math.round(Number(amountInUnits) * 100)
  const razorpayOrderId = paymentSession?.data?.razorpay_order_id as string | undefined

  const handlePayment = async () => {
    setSubmitting(true)
    setErrorMessage(null)

    if (!razorpayOrderId) {
      setErrorMessage("Razorpay order ID missing. Please refresh and try again.")
      setSubmitting(false)
      return
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
      amount: razorpayAmountInPaise,
      currency: cart.currency_code?.toUpperCase() ?? "INR",
      name: "Healer",
      description: `Order #${cart.id}`,
      order_id: razorpayOrderId,
      prefill: {
        name: `${cart.billing_address?.first_name ?? ""} ${cart.billing_address?.last_name ?? ""}`.trim(),
        email: cart.email,
        contact: cart.billing_address?.phone ?? "",
      },
      theme: {
        color: "#0F172A",
      },
      handler: async function (response: {
        razorpay_payment_id: string
        razorpay_order_id: string
        razorpay_signature: string
      }) {
        try {
          // Complete order creation in Medusa
          await placeOrder()
        } catch (err: any) {
          setErrorMessage(err.message || "Failed to finalize order.")
          setSubmitting(false)
        }
      },
      modal: {
        ondismiss: function () {
          setSubmitting(false)
        },
      },
    }

    if (typeof window !== "undefined" && window.Razorpay) {
      const rzp = new window.Razorpay(options)
      rzp.open()
    } else {
      setErrorMessage("Razorpay SDK failed to load. Check your internet connection.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={notReady || submitting}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        className="w-full"
        data-testid={dataTestId}
      >
        Pay with Razorpay
      </Button>
      {errorMessage && (
        <div className="text-small-regular text-rose-500 mt-2">
          {errorMessage}
        </div>
      )}
    </>
  )
}
const ManualTestPaymentButton = ({
  notReady,
  "data-testid": dataTestId,
}: {
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)

  const handlePayment = async () => {
    setSubmitting(true)
    await placeOrder()
  }

  return (
    <Button
      disabled={notReady || submitting}
      isLoading={submitting}
      onClick={handlePayment}
      size="large"
      className="w-full"
      data-testid={dataTestId}
    >
      Place order
    </Button>
  )
}

export default PaymentButton
