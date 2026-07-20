// ─── CTC Calculation Engine ───────────────────────────────────────────────────
// Extracted to a plain utility file (no React) so that SalaryTab.jsx can be a
// pure-component file and Vite Fast Refresh works correctly.
// Based on ctc detailed list.csv format.

// Shared between SalaryTab.jsx and MonthlySalaryDetailsTab.jsx so the two
// tabs never carry independent copies of this lookup that could drift apart.
export const STATE_PT_MAP = {
  Kerala: 200,
  Karnataka: 200,
  Maharashtra: 200,
  'Tamil Nadu': 167,
  'West Bengal': 110,
  'Andhra Pradesh': 150,
  Telangana: 150,
  Gujarat: 0,
  Delhi: 0,
  Other: 0,
}

export const computeCTC = ({
  idealBasic = 0,
  tnd = 30,
  tndw = 0,
  pt = 0,
  recovery = 0,
  centreInchargeAllowance = 0,
  rsoAllowance = 0,
}) => {
  const basic = Number(idealBasic) || 0
  const totalDays = Number(tnd) || 30
  const daysPresent = Number(tndw) || 0
  const cia = Number(centreInchargeAllowance) || 0
  const rso = Number(rsoAllowance) || 0

  // Ideal components
  const idealHRA = basic * 0.3
  const idealOA = basic * 0.1
  const idealGross = basic + idealHRA + idealOA + cia + rso

  // Actual components (prorated by attendance)
  const ratio = totalDays > 0 ? daysPresent / totalDays : 0
  const actualBasic = basic * ratio
  const actualHRA = actualBasic * 0.3
  const actualOA = actualBasic * 0.1
  const actualGross = actualBasic + actualHRA + actualOA + cia + rso

  // Employee deductions
  const empEPFO = actualBasic * 0.12
  const empESIC = idealGross < 21000 ? actualGross * 0.0075 : 0
  const ptAmt = Number(pt) || 0
  const recoveryAmt = Number(recovery) || 0
  const empLWF = 50
  const groupInsurance = idealGross < 21000 ? 0 : 200
  const totalDeduction = empEPFO + empESIC + ptAmt + recoveryAmt + empLWF + groupInsurance
  const netSalary = actualGross - totalDeduction

  // Employer contributions
  const employerPF = actualBasic * 0.12
  const pfAdmin = actualBasic * 0.005
  const edli = actualBasic * 0.005
  const employerESIC = idealGross < 21000 ? actualGross * 0.0325 : 0
  const employerLWF = 50
  const totalEmployerContribution = employerPF + pfAdmin + edli + employerESIC + employerLWF

  // CTC and Invoice
  const ctc = actualGross + totalEmployerContribution
  const serviceCharges = ctc * 0.015
  const invoiceAmount = ctc + serviceCharges
  const igst = invoiceAmount * 0.18
  const totalInvoiceAmount = invoiceAmount + igst

  return {
    idealBasic: basic,
    idealHRA,
    idealOA,
    cia,
    rso,
    idealGross,
    tnd: totalDays,
    tndw: daysPresent,
    actualBasic,
    actualHRA,
    actualOA,
    actualGross,
    empEPFO,
    empESIC,
    ptAmt,
    recoveryAmt,
    empLWF,
    groupInsurance,
    totalDeduction,
    netSalary,
    employerPF,
    pfAdmin,
    edli,
    employerESIC,
    employerLWF,
    totalEmployerContribution,
    ctc,
    serviceCharges,
    invoiceAmount,
    igst,
    totalInvoiceAmount,
  }
}
