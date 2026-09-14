import type { Dictionary } from './en'

// Dutch.
//
// Typed as Dictionary, so leaving a key out will not compile.
//
// Notes on the choices: "u" is avoided throughout — Dutch banking apps settled
// on "je" years ago and "u" now reads as stiff. Amounts keep the English key
// order because Dutch puts the currency symbol first too ("€ 12,50").
export const nl: Dictionary = {
  nav: {
    home: 'Start',
    activity: 'Activiteit',
    cards: 'Rekeningen',
    insights: 'Inzichten',
    assistant: 'Assistent',
    settings: 'Instellingen',
  },

  common: {
    save: 'Opslaan',
    saving: 'Opslaan…',
    cancel: 'Annuleren',
    delete: 'Verwijderen',
    edit: 'Bewerken',
    add: 'Toevoegen',
    close: 'Sluiten',
    back: 'Terug',
    seeAll: 'Alles bekijken',
    loading: 'Laden…',
    somethingWentWrong: 'Er ging iets mis. Probeer het opnieuw.',
    notAvailable: 'Niet beschikbaar',
    today: 'Vandaag',
    yesterday: 'Gisteren',
    perDay: 'per dag',
    of: 'van',
  },

  dashboard: {
    balance: 'Saldo',
    allAccounts: 'Alle rekeningen',
    accountsCount: '{count} rekeningen',
    moneyIn: 'Erbij',
    moneyOut: 'Eraf',
    dailySpend: 'Uitgaven per dag',
    daysCount: '{count} dagen',
    whereItWent: 'Waar het heen ging',
    recent: 'Recent',
    addTransaction: 'Transactie toevoegen',
    allActivity: 'Alle activiteit',
    onLastMonth: '{percent}% ten opzichte van vorige maand',
    noBalanceYet:
      'Je bank heeft nog geen saldo doorgegeven. Trek omlaag om te vernieuwen, of open een rekening voor de recente activiteit.',
    excludesAccounts: 'Exclusief {count} rekening(en) zonder doorgegeven saldo',
    addFirstAccount: 'Voeg je eerste rekening toe',
    addFirstAccountBody: 'Koppel een bank om saldo en uitgaven op één plek te zien.',
  },

  safeToSpend: {
    title: 'Vrij te besteden',
    titleNegative: 'Tekort voor je salaris',
    how: 'Hoe dan?',
    hide: 'Verbergen',
    perDayUntil: 'Ongeveer {amount} per dag voor {days} dag(en) {horizon}',
    paidBy: ', wanneer {source} je betaalt.',
    untilEndOfMonth: 'tot het einde van de maand',
    untilDate: 'tot {date}',
    shortBody:
      'Je rekeningen komen uit op {committed} {horizon}, en dat is meer dan de {balance} die je hebt.',
    balanceRow: 'Saldo',
    billsRow: 'Rekeningen {horizon}',
    leftRow: 'Over',
    reviewAccounts: 'Rekeningen bekijken',
  },

  transactions: {
    title: 'Transacties',
    count: '{count} transacties',
    income: 'Inkomsten',
    expenses: 'Uitgaven',
    net: 'Netto',
    exportCsv: 'CSV exporteren',
    preparing: 'Voorbereiden…',
    exportFailed: 'Exporteren mislukt.',
    searchPlaceholder: "Probeer 'koffie boven 5 vorige maand' of 'inkomsten dit jaar'",
    matches: '{count} resultaten',
    noResults: 'Geen transacties gevonden.',
    pending: 'In behandeling',
    page: 'Pagina {page} van {pages}',
    previous: 'Vorige',
    next: 'Volgende',
  },

  detail: {
    title: 'Transactie',
    split: 'Splitsen',
    addPart: 'Deel toevoegen',
    splitHelp:
      'Wijs een deel hiervan toe aan een andere categorie — de boodschappen die deels werkspullen waren, of een rekening die je deelt.',
    splitAmount: 'Bedrag van het deel',
    splitCategory: 'Categorie van het deel',
    removePart: 'Dit deel verwijderen',
    markBusiness: 'Markeer deze delen als zakelijke uitgave',
    unassigned: '{amount} niet toegewezen',
    overTransaction: '{amount} meer dan de transactie',
    saveSplit: 'Splitsing opslaan',
    receipt: 'Bonnetje',
    viewReceipt: 'Bonnetje bekijken',
    attachPhoto: 'Foto toevoegen',
    uploading: 'Uploaden…',
    receiptNote:
      'Opgeslagen bij je account. Bonnetjes koppelen direct aan handmatige invoer; bij banktransacties bewaren we de foto naast je gegevens.',
  },

  goals: {
    title: 'Doelen',
    toGo: 'nog {amount} te gaan',
    completed: 'Behaald!',
    amount: 'Bedrag',
    addFunds: 'Toevoegen',
    takeOut: 'Opnemen',
    reached: 'Daarmee is dit doel behaald — netjes.',
    couldNotRecord: 'Kon dit niet verwerken.',
  },

  settings: {
    title: 'Instellingen',
    language: 'Taal',
    languageDescription: 'De taal die in de hele app wordt gebruikt.',
    preferences: 'Voorkeuren',
  },

  auth: {
    signIn: 'Inloggen',
    signOut: 'Uitloggen',
    email: 'E-mailadres',
    password: 'Wachtwoord',
    forgotPassword: 'Wachtwoord vergeten?',
    noAccount: 'Nog geen account?',
    createOne: 'Maak er een aan',
    invalidCredentials: 'Onjuist e-mailadres of wachtwoord.',
    authCode: 'Verificatiecode',
    authCodeHelp: 'Uit je authenticator-app. Je kunt ook een herstelcode gebruiken.',
    verifyCode: 'Code controleren',
    codeWrong: 'Die code klopt niet. Probeer de huidige code uit je app.',
    lockedOut: 'Te veel mislukte pogingen. Probeer het over ongeveer 15 minuten opnieuw.',
    signingIn: 'Inloggen…',
    continueWithGoogle: 'Doorgaan met Google',
    or: 'of',
  },

  periods: {
    thisWeek: 'deze week',
    thisMonth: 'deze maand',
    thisQuarter: 'dit kwartaal',
    weekly: 'wekelijkse',
    monthly: 'maandelijkse',
    quarterly: 'kwartaal-',
  },

  alerts: {
    spendingUpTitle: 'Je uitgaven zijn flink gestegen',
    spendingUpMessage:
      'Je uitgaven liggen deze maand {percent}% hoger ({previous} → {current}). Bekijk je grootste categorieën om te zien waar je kunt minderen.',
    budgetExceededTitle: 'Budget overschreden: {category}',
    budgetExceededMessage:
      'Je hebt {spent} van je {budget} {period} budget voor {category} uitgegeven ({window}). Overweeg het budget aan te passen of even te pauzeren met niet-noodzakelijke uitgaven.',
    onPaceTitle: 'Dreigt overschreden te worden: {category}',
    onPaceMessage:
      'Je hebt {used}% van je budget voor {category} gebruikt, terwijl er nog {remaining}% van {window} over is. Met ongeveer {daily} per dag blijf je binnen je budget.',
    categorySpikeTitle: 'Piek in uitgaven aan {category}',
    categorySpikeMessage:
      'Je uitgaven aan {category} zijn gestegen naar {current} ({percent}% meer dan {previous}). Kijk even of dit eenmalig was of een nieuw patroon.',
    anomalyHeading: '{title}: {merchant}',
  },

  anomalies: {
    amountOutlierTitle: 'Ongewoon hoge uitgave aan {category}',
    amountOutlierMessage:
      '{merchant} heeft {amount} afgeschreven — normaal geef je ongeveer {typical} uit aan {category}.',
    newMerchantTitle: 'Grote afschrijving bij een nieuwe winkel',
    newMerchantMessage:
      '{merchant} heeft {amount} afgeschreven en komt niet eerder voor in je overzicht. Controleer even of je dit herkent.',
    duplicateTitle: 'Mogelijk dubbele afschrijving',
    duplicateMessage:
      '{merchant} heeft {amount} {count} keer op dezelfde dag afgeschreven. Als het om één aankoop ging, is dit het betwisten waard.',
  },

  notifications: {
    billDueToday: 'Rekening moet vandaag betaald',
    billDueInDays: 'Rekening over {days} dag(en)',
    billReminderBody: '{name} — {amount} moet {when} betaald worden.',
    dueToday: 'vandaag',
    dueInDays: 'over {days} dag(en)',
    goalReached: 'Doel behaald',
    goalReachedBody: 'Je hebt je doel {name} gehaald.',
  },
}
