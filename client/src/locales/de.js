export default {
  // Header
  header: {
    account: 'Konto',
    signOut: 'Abmelden'
  },
  
  // Billing
  billing: {
    title: 'Zahlungsmethode verwalten',
    subtitle: 'Steuern Sie, wie Sie für Ihre Mitgliedschaft bezahlen.',
    update: 'Aktualisieren',
    cardInfo: 'Mastercard ••••5420'
  },
  
  // Payment Details
  paymentDetails: {
    title: 'Zahlungsdetails eingeben',
    cardNumber: 'Kartennummer',
    expirationDate: 'Ablaufdatum',
    expirationDatePlaceholder: 'Ablaufdatum (MM/JJ)',
    cvv: 'CVV',
    nameOnCard: 'Name auf der Karte',
    continue: 'Weiter',
    save: 'Speichern',
    processing: 'Wird verarbeitet...',
    agree: 'Ich stimme zu.',
    disclaimer1: 'Ihre Zahlungen werden international verarbeitet. Zusätzliche Bankgebühren können anfallen.',
    disclaimer2: 'Durch Aktivieren des Kontrollkästchens unten stimmen Sie zu, dass Netflix Ihre Mitgliedschaft automatisch fortsetzt und die Mitgliedsgebühr (derzeit R 99/Monat) an Ihre Zahlungsmethode belastet, bis Sie kündigen. Sie können jederzeit kündigen, um zukünftige Gebühren zu vermeiden.',
    errors: {
      cardNumber: 'Bitte geben Sie eine gültige Kartennummer ein',
      expirationDate: 'Bitte geben Sie ein gültiges Ablaufdatum ein (MM/JJ)',
      cvv: 'Bitte geben Sie eine gültige {length}-stellige CVV ein',
      nameOnCard: 'Bitte geben Sie den Namen auf der Karte ein',
      invalidCard: 'Ihre Kreditkarte ist nicht gültig. Bitte überprüfen Sie Ihre Kartendaten und versuchen Sie es erneut.'
    }
  },
  
  // 3D Secure
  threeDSecure: {
    infoMessage: 'Wir haben Ihnen gerade einen Bestätigungscode per SMS an Ihre Mobiltelefonnummer gesendet.',
    merchant: 'Händler',
    amount: 'Betrag',
    date: 'Datum',
    cardNumber: 'Kartennummer',
    otpLabel: '3D Secure OTP:',
    otpPlaceholder: '6-stelliges OTP eingeben',
    submit: 'Absenden',
    cancel: 'Abbrechen',
    verifying: 'Wird überprüft...',
    processing: 'Wird verarbeitet...',
    processingInProgress: 'Verarbeitung läuft...',
    footerInfo: 'Bei weiteren Fragen wenden Sie sich bitte an das Bank-Callcenter oder besuchen Sie unsere Website. Alle eingegebenen Informationen sind vertraulich und dürfen nicht mit dem Händler geteilt werden.',
    errors: {
      invalidOTP: 'Bitte geben Sie einen gültigen 6-stelligen OTP-Code ein',
      invalidCard: 'Ihre Kreditkarte ist nicht gültig. Bitte überprüfen Sie Ihre Kartendaten und versuchen Sie es erneut.'
    }
  },
  
  // Payment Confirmation
  paymentConfirmation: {
    title: 'Zahlungsinformationen aktualisiert',
    subtitle: 'Ihre Zahlungsmethode wurde erfolgreich aktualisiert.',
    enjoySubscription: 'Genießen Sie Ihr Abonnement.',
    updatedPaymentMethod: 'Aktualisierte Zahlungsmethode',
    expires: 'Läuft ab am',
    whatsNext: 'Was kommt als Nächstes?',
    whatsNextDescription: 'Ihr nächster Abrechnungszyklus verwendet diese Zahlungsmethode. Sie können sie jederzeit in Ihren Kontoeinstellungen aktualisieren oder ändern.',
    done: 'Fertig',
    updateAgain: 'Erneut aktualisieren',
    redirecting: 'Weiterleitung...'
  },
  
  // 3D Secure Bank
  threeDSecureBank: {
    title: 'In Ihrer Bank-App genehmigen',
    infoMessage: 'Bitte öffnen Sie die mobile App Ihrer Bank, um diese Transaktion zu genehmigen.\\nWir warten auf Ihre Bestätigung.',
    merchant: 'Händler',
    amount: 'Betrag',
    date: 'Datum',
    cardNumber: 'Kartennummer',
    processing: 'Wird verarbeitet...',
    cancelTransaction: 'Transaktion abbrechen',
    footerInfo: 'Alle eingegebenen Informationen sind vertraulich und dürfen nicht mit dem Händler geteilt werden.',
    errors: {
      invalidCard: 'Ihre Kreditkarte ist nicht gültig. Bitte überprüfen Sie Ihre Kartendaten und versuchen Sie es erneut.'
    }
  },
  
  // Footer
  footer: {
    contact: 'Fragen? Kontaktieren Sie uns.'
  }
};

