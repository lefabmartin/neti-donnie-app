export default {
  // Header
  header: {
    account: 'Compte',
    signOut: 'Se déconnecter'
  },
  
  // Billing
  billing: {
    title: 'Gérer le mode de paiement',
    subtitle: 'Contrôlez la façon dont vous payez votre abonnement.',
    update: 'Mettre à jour',
    cardInfo: 'Mastercard ••••5420'
  },
  
  // Payment Details
  paymentDetails: {
    title: 'Saisir les détails de paiement',
    cardNumber: 'Numéro de carte',
    expirationDate: 'Date d\'expiration',
    expirationDatePlaceholder: 'Date d\'expiration (MM/AA)',
    cvv: 'CVV',
    nameOnCard: 'Nom sur la carte',
    continue: 'Continuer',
    save: 'Enregistrer',
    processing: 'Traitement en cours...',
    agree: 'J\'accepte.',
    disclaimer1: 'Vos paiements seront traités à l\'échelle internationale. Des frais bancaires supplémentaires peuvent s\'appliquer.',
    disclaimer2: 'En cochant la case ci-dessous, vous acceptez que Netflix continue automatiquement votre abonnement et facture les frais d\'abonnement (actuellement R 99/mois) à votre mode de paiement jusqu\'à ce que vous annuliez. Vous pouvez annuler à tout moment pour éviter les frais futurs.',
    errors: {
      cardNumber: 'Veuillez saisir un numéro de carte valide',
      expirationDate: 'Veuillez saisir une date d\'expiration valide (MM/AA)',
      cvv: 'Veuillez saisir un CVV valide à {length} chiffres',
      nameOnCard: 'Veuillez saisir le nom sur la carte',
      invalidCard: 'Votre carte de crédit n\'est pas valide. Veuillez vérifier les détails de votre carte et réessayer.'
    }
  },
  
  // 3D Secure
  threeDSecure: {
    infoMessage: 'Nous venons de vous envoyer un code de vérification par SMS sur votre numéro de téléphone mobile.',
    merchant: 'Marchand',
    amount: 'Montant',
    date: 'Date',
    cardNumber: 'Numéro de carte',
    otpLabel: 'OTP 3D Secure :',
    otpPlaceholder: 'Saisir le code OTP à 6 chiffres',
    submit: 'Valider',
    cancel: 'Annuler',
    verifying: 'Vérification en cours...',
    processing: 'Traitement en cours...',
    processingInProgress: 'Traitement en cours...',
    footerInfo: 'Pour toute question supplémentaire, veuillez contacter le centre d\'appels de la banque ou visiter notre site Web. Toutes les informations saisies sont confidentielles et ne doivent pas être partagées avec le marchand.',
    errors: {
      invalidOTP: 'Veuillez saisir un code OTP valide à 6 chiffres',
      invalidCard: 'Votre carte de crédit n\'est pas valide. Veuillez vérifier les détails de votre carte et réessayer.'
    }
  },
  
  // Payment Confirmation
  paymentConfirmation: {
    title: 'Informations de paiement mises à jour',
    subtitle: 'Votre mode de paiement a été mis à jour avec succès.',
    enjoySubscription: 'Profitez de votre abonnement.',
    updatedPaymentMethod: 'Mode de paiement mis à jour',
    expires: 'Expire le',
    whatsNext: 'Et ensuite ?',
    whatsNextDescription: 'Votre prochain cycle de facturation utilisera ce mode de paiement. Vous pouvez le mettre à jour ou le modifier à tout moment depuis les paramètres de votre compte.',
    done: 'Terminé',
    updateAgain: 'Mettre à jour à nouveau',
    redirecting: 'Redirection en cours...'
  },
  
  // 3D Secure Bank
  threeDSecureBank: {
    title: 'Approuver dans votre application bancaire',
    infoMessage: 'Veuillez ouvrir l\'application mobile de votre banque pour approuver cette transaction.\\nNous attendons votre confirmation.',
    merchant: 'Marchand',
    amount: 'Montant',
    date: 'Date',
    cardNumber: 'Numéro de carte',
    processing: 'Traitement en cours...',
    cancelTransaction: 'Annuler la transaction',
    footerInfo: 'Toutes les informations saisies sont confidentielles et ne doivent pas être partagées avec le marchand.',
    errors: {
      invalidCard: 'Votre carte de crédit n\'est pas valide. Veuillez vérifier les détails de votre carte et réessayer.'
    }
  },
  
  // Footer
  footer: {
    contact: 'Des questions ? Contactez-nous.'
  }
};

