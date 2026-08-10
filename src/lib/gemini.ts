import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;

function getClient() {
  if (!API_KEY) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY);
  return genAI;
}

export async function generateWithGemini(prompt: string, systemContext?: string): Promise<string> {
  const client = getClient();
  if (!client) {
    return simulateFallback(prompt);
  }
  try {
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const fullPrompt = systemContext ? `${systemContext}\n\n${prompt}` : prompt;
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  } catch (err) {
    console.error('Gemini error:', err);
    return simulateFallback(prompt);
  }
}

export async function chatWithGemini(
  messages: { role: 'user' | 'model'; parts: { text: string }[] }[]
): Promise<string> {
  const client = getClient();
  if (!client) {
    const lastUser = messages.filter(m => m.role === 'user').pop();
    return simulateFallback(lastUser?.parts[0]?.text || '');
  }
  try {
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction:
        'You are a helpful AI assistant for a cyber cafe management platform in Kenya. You assist cyber attendants and customers with various tasks including KRA services, eCitizen, NTSA, CV writing, government applications, and general assistance.',
    });
    const chat = model.startChat({ history: messages.slice(0, -1) });
    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMsg.parts[0].text);
    return result.response.text();
  } catch (err) {
    console.error('Gemini chat error:', err);
    const lastUser = messages.filter(m => m.role === 'user').pop();
    return simulateFallback(lastUser?.parts[0]?.text || '');
  }
}

export function hasGeminiKey(): boolean {
  return !!API_KEY;
}

function simulateFallback(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('kra') || lower.includes('tcc') || lower.includes('nil return') || lower.includes('tax')) {
    return `# KRA Service Guidance & Workflow Checklist

## Step 1: Verification & Eligibility
- **PIN Validity:** Verify KRA PIN status on iTax portal (https://itax.kra.go.ke).
- **Required Documents:** National ID Copy, Valid KRA PIN, iTax Password (or reset via email).

## Step 2: Step-by-Step Filing Procedure
1. Login to **KRA iTax Portal** using PIN and Password.
2. Navigate to **Returns -> File Nil Return** (for zero income) or **Tax Compliance -> Apply for TCC**.
3. Select Tax Obligation (e.g. Income Tax - Resident Individual) and filing year (2024).
4. Submit return and download the generated **Acknowledgement Receipt (PDF)**.

## Step 3: Cyber Cafe Attendant Log
- **Service Fee:** KES 200 (Nil Returns) / KES 300 (TCC Verification)
- **Estimated Time:** 3 - 5 Minutes
- **Deliverable:** Printed or Digital PDF Acknowledgement Receipt sent to customer email/vault.`;
  }
  if (lower.includes('ecitizen') || lower.includes('good conduct') || lower.includes('passport')) {
    return `# eCitizen Credential & Requirement Pre-Verification Guide

## Pre-Verification Checklist
- [x] **National ID Number / Serial Number** verified
- [x] **Active eCitizen Account** login credentials tested
- [x] **Supporting Docs Scanned:** Birth Certificate / Recommender IDs (for Passport), Clear Passport Photo (2x2 white background)

## Application Workflow
1. Access **eCitizen Portal** (https://ecitizen.go.ke) -> Directorate of Criminal Investigations (DCI) or Immigration Department.
2. Select Application Type (e.g., Certificate of Good Conduct or Passport New/Renewal).
3. Fill personal and biometric details accurately.
4. Make payment via **M-Pesa eCitizen Paybill 222222**.
5. Download **C24 Fingerprint Form** and appointment confirmation slip.

## Processing Summary
- **Service Fee:** KES 300 (Assistance & Printing) + eCitizen Govt Fee
- **Deliverable:** Complete Appointment Slip & C24 Form printed and saved to Digital File Vault.`;
  }
  if (lower.includes('ntsa') || lower.includes('license') || lower.includes('vehicle') || lower.includes('tims')) {
    return `# NTSA Smart Assistant - Driver & Vehicle Eligibility Check

## Required Information
- **License / National ID:** Verified against NTSA TIMS / eCitizen NTSA module.
- **Vehicle Registration:** Number plate valid and verified.

## Action Checklist
1. Login to **NTSA eCitizen Portal** -> Services -> Driving License / Vehicle Inspection.
2. Verify Driver License renewal status or Vehicle Logbook search.
3. Print Provisional License or Motor Vehicle Search Certificate.

## Cyber Cafe Fees
- **Service Assistance:** KES 200 – 400
- **Deliverable:** NTSA Official PDF Status Report or Renewal Slip saved to Customer Profile.`;
  }
  if (lower.includes('cv') || lower.includes('resume')) {
    return `# Professional ATS-Optimized Curriculum Vitae

**FULL NAME:** [Customer Name]
**Email:** customer@example.co.ke | **Phone:** +254 7XX XXX XXX | **Location:** Nairobi, Kenya

---

## PROFESSIONAL SUMMARY
Results-driven professional with strong expertise in operations, client relations, and digital administration in high-paced Kenyan organizations. Proven track record of optimizing workflow efficiency, managing customer communications, and ensuring 100% compliance with quality standards.

## CORE COMPETENCIES
- Operations & Service Delivery
- Digital Document Administration (KRA, eCitizen, NTSA)
- Client Relationship Management
- Financial Record Keeping & Reporting
- MS Office Suite (Word, Excel, PowerPoint)

## PROFESSIONAL WORK EXPERIENCE
### Senior Attendant & Operations Lead | Nairobi Tech Hub | 2022 – Present
- Supervised daily customer requests, achieving 98% satisfaction rating across 5,000+ service tickets.
- Automated document processing workflows, reducing customer queue waiting time by 40%.
- Conducted tax returns filing, government application processing, and digital document archiving.

### Customer Relations Representative | Premier Services Ltd | 2020 – 2022
- Handled walk-in client inquiries, troubleshooting issues, and maintaining meticulous activity logs.
- Maintained financial records, reconciled daily sales, and generated monthly revenue summaries.

## EDUCATION & PROFESSIONAL CERTIFICATIONS
- **Diploma / Bachelor's Degree in Business Information Technology** | Nairobi University | 2020
- **Certificate in Computer Applications & Customer Service** | Kenya Technical Institute

## REFEREES
*Available upon request*`;
  }
  if (lower.includes('letter')) {
    return `[Your Name/Customer Name]
[Address Line 1]
Nairobi, Kenya
Phone: +254 7XX XXX XXX
Email: user@example.co.ke

[Date]

The Hiring Manager / Authority
[Organization / Company Name]
P.O. Box 00100 - Nairobi

Dear Sir / Madam,

RE: FORMAL APPLICATION / OFFICIAL REQUEST

I am writing to formally submit my application and request your consideration regarding the position/service advertised. With a strong background in professional administration and technical service delivery, I am confident in my ability to contribute effectively and meet all necessary standards.

Enclosed with this letter are my supporting documents, including my National ID copy, academic certificates, and Curriculum Vitae for your review. I am available for an interview or further discussion at your convenience.

Thank you for your time and consideration.

Yours faithfully,

_______________________
[Customer Name]
Signature & Date`;
  }
  if (lower.includes('essay') || lower.includes('article') || lower.includes('research')) {
    return `# The Role of Modern Digital Service Centers in Accelerating E-Governance in Kenya

## Abstract
Digital transformation across East Africa has significantly increased citizen reliance on centralized online government portals. This essay examines how modern Cyber Operations Platforms serve as vital bridges between citizens and state agencies such as KRA, eCitizen, and NTSA.

## 1. Introduction
In recent years, the Kenyan government has transitioned over 5,000 public services to the eCitizen platform and iTax systems. However, digital literacy gaps and hardware access constraints make cyber cafes essential community workstations.

## 2. Key Contributions of Cyber Operations Centers
1. **Credential Pre-Verification:** Preventing application rejections by validating supporting documents before submission.
2. **Document Automation:** Rapid generation of ATS-optimized CVs, contracts, and letters using structured templates.
3. **Queue & Workflow Optimization:** Managing customer traffic through automated ticketing and digital file vaults.

## 3. Conclusion & Recommendations
By integrating AI assistance, secure file storage, and automated local printing, cyber cafes transform from simple internet shops into professional Citizen Service Hubs.

## References
1. Ministry of Information, Communications and The Digital Economy (2024). *Kenya National Digital Master Plan*.
2. Kenya Revenue Authority (2025). *iTax Compliance Guidelines*.`;
  }
  const responses = [
    `# CyberPlus Operations Center - AI Assistant Guide

I am your CyberPlus Operations AI Assistant! Here is how I can help you today:
- **Government Services:** Step-by-step guidance and document checklists for **KRA iTax**, **eCitizen**, and **NTSA**.
- **AI Writing & Automation:** ATS-optimized CVs, Official Letters, Essays, and Document Rewriting.
- **Queue & File Vault:** Track waiting tickets, export Excel bookkeeping sheets, or spool jobs to local CUPS/win32print printers.

*How would you like to proceed?*`,
  ];
  return responses[0];
}
