export default {
  // Header
  header: {
    account: 'Account',
    signOut: 'Sign Out'
  },
  
  // Billing
  billing: {
    title: 'Manage payment method',
    subtitle: 'Control how you pay for your membership.',
    update: 'Update',
    cardInfo: 'Mastercard ••••5420'
  },
  
  // Payment Details
  paymentDetails: {
    title: 'Enter payment details',
    cardNumber: 'Card number',
    expirationDate: 'Expiration date',
    expirationDatePlaceholder: 'Expiration date (MM/YY)',
    cvv: 'CVV',
    nameOnCard: 'Name on card',
    continue: 'Continue',
    save: 'Save',
    processing: 'Processing...',
    agree: 'I agree.',
    disclaimer1: 'Your payments will be processed internationally. Additional bank fees may apply.',
    disclaimer2: 'By checking the checkbox below, you agree that Netflix will automatically continue your membership and charge the membership fee (currently R 99/month) to your payment method until you cancel. You may cancel at any time to avoid future charges.',
    errors: {
      cardNumber: 'Please enter a valid card number',
      expirationDate: 'Please enter a valid expiration date (MM/YY)',
      cvv: 'Please enter a valid {length}-digit CVV',
      nameOnCard: 'Please enter the name on card',
      invalidCard: 'Your credit card is not valid. Please check your card details and try again.'
    }
  },
  
  // 3D Secure
  threeDSecure: {
    infoMessage: 'We just sent you a verification code by text message to your mobile number.',
    merchant: 'Merchant',
    amount: 'Amount',
    date: 'Date',
    cardNumber: 'Card number',
    otpLabel: '3D Secure OTP:',
    otpPlaceholder: 'Enter 6-digit OTP',
    submit: 'Submit',
    cancel: 'Cancel',
    verifying: 'Verifying...',
    processing: 'Processing...',
    processingInProgress: 'Processing in progress...',
    footerInfo: 'For further questions, please contact the bank call center or visit our website. All entered information is confidential and is not to be shared with the merchant.',
    errors: {
      invalidOTP: 'Please enter a valid 6-digit OTP code',
      invalidCard: 'Your credit card is not valid. Please check your card details and try again.'
    }
  },
  
  // Payment Confirmation
  paymentConfirmation: {
    title: 'Payment Information Updated',
    subtitle: 'Your payment method has been successfully updated.',
    enjoySubscription: 'Enjoy your subscription.',
    updatedPaymentMethod: 'Updated Payment Method',
    expires: 'Expires',
    whatsNext: 'What\'s next?',
    whatsNextDescription: 'Your next billing cycle will use this payment method. You can update or change it anytime from your account settings.',
    done: 'Done',
    updateAgain: 'Update Again',
    redirecting: 'Redirecting...'
  },
  
  // 3D Secure Bank
  threeDSecureBank: {
    title: 'Approve in your Bank App',
    infoMessage: 'Please open your bank\'s mobile app to approve this transaction.\\nWe\'re waiting for your confirmation.',
    merchant: 'Merchant',
    amount: 'Amount',
    date: 'Date',
    cardNumber: 'Card number',
    processing: 'Processing...',
    cancelTransaction: 'Cancel Transaction',
    footerInfo: 'All entered information is confidential and is not to be shared with the merchant.',
    errors: {
      invalidCard: 'Your credit card is not valid. Please check your card details and try again.'
    }
  },
  
  // Footer
  footer: {
    contact: 'Questions? Contact us.'
  }
};

