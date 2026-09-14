import type { Dictionary } from './en'

// Spanish (Spain).
//
// Typed as Dictionary, so leaving a key out will not compile.
//
// Notes on the choices: "tú" throughout rather than "usted", matching how
// Spanish banking apps address people. "Saldo" for balance, "Gastos" for
// spending, "Patrimonio" for net worth — the terms a Spanish bank statement
// actually uses, not literal translations of the English.
export const es: Dictionary = {
  nav: {
    home: 'Inicio',
    activity: 'Actividad',
    cards: 'Cuentas',
    insights: 'Análisis',
    assistant: 'Asistente',
    settings: 'Ajustes',
  },

  common: {
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Añadir',
    close: 'Cerrar',
    back: 'Atrás',
    seeAll: 'Ver todo',
    loading: 'Cargando…',
    somethingWentWrong: 'Algo ha salido mal. Inténtalo de nuevo.',
    notAvailable: 'No disponible',
    today: 'Hoy',
    yesterday: 'Ayer',
    perDay: 'al día',
    of: 'de',
  },

  dashboard: {
    balance: 'Saldo',
    allAccounts: 'Todas las cuentas',
    accountsCount: '{count} cuentas',
    moneyIn: 'Entradas',
    moneyOut: 'Salidas',
    dailySpend: 'Gasto diario',
    daysCount: '{count} días',
    whereItWent: 'En qué se ha ido',
    recent: 'Reciente',
    addTransaction: 'Añadir transacción',
    allActivity: 'Toda la actividad',
    onLastMonth: '{percent}% respecto al mes pasado',
    noBalanceYet:
      'Tu banco aún no ha comunicado un saldo. Desliza hacia abajo para actualizar, o abre una cuenta para ver su actividad reciente.',
    excludesAccounts: 'No incluye {count} cuenta(s) sin saldo comunicado',
    addFirstAccount: 'Añade tu primera cuenta',
    addFirstAccountBody: 'Conecta un banco para ver saldos y gastos en un solo sitio.',
  },

  safeToSpend: {
    title: 'Puedes gastar',
    titleNegative: 'Te falta antes de la nómina',
    how: '¿Cómo?',
    hide: 'Ocultar',
    perDayUntil: 'Unos {amount} al día durante {days} día(s) {horizon}',
    paidBy: ', cuando {source} te pague.',
    untilEndOfMonth: 'hasta final de mes',
    untilDate: 'hasta el {date}',
    shortBody:
      'Tus recibos suman {committed} {horizon}, más que los {balance} que tienes.',
    balanceRow: 'Saldo',
    billsRow: 'Recibos {horizon}',
    leftRow: 'Queda',
    reviewAccounts: 'Revisar cuentas',
  },

  transactions: {
    title: 'Transacciones',
    count: '{count} transacciones',
    income: 'Ingresos',
    expenses: 'Gastos',
    net: 'Neto',
    exportCsv: 'Exportar CSV',
    preparing: 'Preparando…',
    exportFailed: 'La exportación ha fallado.',
    searchPlaceholder: "Prueba 'café más de 5 el mes pasado' o 'ingresos este año'",
    matches: '{count} resultados',
    noResults: 'No se han encontrado transacciones.',
    pending: 'Pendiente',
    page: 'Página {page} de {pages}',
    previous: 'Anterior',
    next: 'Siguiente',
  },

  detail: {
    title: 'Transacción',
    split: 'Dividir',
    addPart: 'Añadir una parte',
    splitHelp:
      'Asigna parte de esto a otra categoría — la compra que era en parte material de trabajo, o un recibo que compartes.',
    splitAmount: 'Importe de la parte',
    splitCategory: 'Categoría de la parte',
    removePart: 'Quitar esta parte',
    markBusiness: 'Marcar estas partes como gasto de empresa',
    unassigned: '{amount} sin asignar',
    overTransaction: '{amount} más que la transacción',
    saveSplit: 'Guardar división',
    receipt: 'Recibo',
    viewReceipt: 'Ver recibo',
    attachPhoto: 'Adjuntar una foto',
    uploading: 'Subiendo…',
    receiptNote:
      'Se guarda en tu cuenta. Los recibos se adjuntan directamente a las entradas manuales; en las transacciones bancarias la foto queda junto a tus registros.',
  },

  goals: {
    title: 'Objetivos',
    toGo: 'faltan {amount}',
    completed: '¡Conseguido!',
    amount: 'Importe',
    addFunds: 'Añadir',
    takeOut: 'Retirar',
    reached: 'Con esto has alcanzado el objetivo — bien hecho.',
    couldNotRecord: 'No se ha podido registrar.',
  },

  settings: {
    title: 'Ajustes',
    language: 'Idioma',
    languageDescription: 'El idioma que se usa en toda la aplicación.',
    preferences: 'Preferencias',
  },

  auth: {
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
    email: 'Correo electrónico',
    password: 'Contraseña',
    forgotPassword: '¿Has olvidado la contraseña?',
    noAccount: '¿No tienes cuenta?',
    createOne: 'Crea una',
    invalidCredentials: 'Correo o contraseña incorrectos.',
    authCode: 'Código de verificación',
    authCodeHelp: 'De tu aplicación de autenticación. También puedes usar un código de recuperación.',
    verifyCode: 'Verificar código',
    codeWrong: 'Ese código no es correcto. Prueba con el actual de tu aplicación.',
    lockedOut: 'Demasiados intentos fallidos. Inténtalo de nuevo en unos 15 minutos.',
    signingIn: 'Iniciando sesión…',
    continueWithGoogle: 'Continuar con Google',
    or: 'o',
  },

  periods: {
    thisWeek: 'esta semana',
    thisMonth: 'este mes',
    thisQuarter: 'este trimestre',
    weekly: 'semanal',
    monthly: 'mensual',
    quarterly: 'trimestral',
  },

  alerts: {
    spendingUpTitle: 'Tus gastos han subido bastante',
    spendingUpMessage:
      'Este mes gastas un {percent}% más ({previous} → {current}). Revisa tus categorías principales para ver dónde puedes recortar.',
    budgetExceededTitle: 'Presupuesto superado: {category}',
    budgetExceededMessage:
      'Has gastado {spent} de tu presupuesto {period} de {budget} para {category} ({window}). Plantéate ajustarlo o parar los gastos que no sean necesarios.',
    onPaceTitle: 'Vas camino de superarlo: {category}',
    onPaceMessage:
      'Has usado el {used}% de tu presupuesto de {category} y aún queda el {remaining}% de {window}. Con unos {daily} al día no te pasas.',
    categorySpikeTitle: 'Repunte de gasto en {category}',
    categorySpikeMessage:
      'Tu gasto en {category} ha subido hasta {current} (un {percent}% más que {previous}). Comprueba si ha sido algo puntual o un patrón nuevo.',
    anomalyHeading: '{title}: {merchant}',
  },

  anomalies: {
    amountOutlierTitle: 'Cargo inusualmente alto en {category}',
    amountOutlierMessage:
      '{merchant} te ha cobrado {amount} — normalmente gastas unos {typical} en {category}.',
    newMerchantTitle: 'Cargo alto en un comercio nuevo',
    newMerchantMessage:
      '{merchant} te ha cobrado {amount} y no aparece antes en tu historial. Merece la pena confirmar que lo reconoces.',
    duplicateTitle: 'Posible cargo duplicado',
    duplicateMessage:
      '{merchant} te ha cobrado {amount} {count} veces el mismo día. Si fue una sola compra, merece la pena reclamarlo.',
  },

  notifications: {
    billDueToday: 'Recibo que vence hoy',
    billDueInDays: 'Recibo dentro de {days} día(s)',
    billReminderBody: '{name} — {amount} vence {when}.',
    dueToday: 'hoy',
    dueInDays: 'dentro de {days} día(s)',
    goalReached: 'Objetivo conseguido',
    goalReachedBody: 'Has alcanzado tu objetivo {name}.',
  },
}
