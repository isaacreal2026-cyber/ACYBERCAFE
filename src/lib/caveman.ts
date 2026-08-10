export interface CavemanEntities {
  pin?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  name?: string;
  otp?: string;
  amount?: number;
  refCode?: string;
  intent?: string;
  rawText: string;
}

export function parseCavemanClipboard(rawText: string): CavemanEntities {
  const text = (rawText || "").trim();
  const entities: CavemanEntities = {
    rawText: text,
  };

  if (!text) return entities;

  // 1. KRA PIN (e.g. A001234567X)
  const pinMatch = text.match(/\b([A-P]\d{9}[A-Z])\b/i);
  if (pinMatch) {
    entities.pin = pinMatch[1].toUpperCase();
  }

  // 2. National ID Number (7-9 digits, avoiding KRA PIN internals or phone numbers)
  const idMatch = text.match(/\b(?:ID|ID\s*NO|ID\s*NUMBER|SERIAL|NATIONAL\s*ID)?\s*[:#-]?\s*(\d{7,9})\b/i);
  if (idMatch) {
    // Make sure it doesn't match a phone number starting with 07 or 01
    const cand = idMatch[1];
    if (!cand.startsWith("07") && !cand.startsWith("01")) {
      entities.nationalId = cand;
    }
  }

  // 3. Kenyan Phone Number (M-Pesa format)
  const phoneMatch = text.match(/(?:\+?254|0)?(7\d{8}|1\d{8})\b/);
  if (phoneMatch) {
    entities.phone = `0${phoneMatch[1]}`;
  }

  // 4. Email Address
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    entities.email = emailMatch[0].toLowerCase();
  }

  // 5. OTP / Verification Code (4-6 digits)
  const otpMatch = text.match(/\b(?:OTP|CODE|VERIFICATION|PASSCODE)\s*[:#-]?\s*(\d{4,6})\b/i);
  if (otpMatch) {
    entities.otp = otpMatch[1];
  }

  // 6. M-Pesa Transaction Reference Code (10 alphanumeric chars starting with Q/R/S/T/U/V/W/X/Y/Z)
  const mpesaRefMatch = text.match(/\b([Q-Z][A-Z0-9]{9})\b/i);
  if (mpesaRefMatch) {
    entities.refCode = mpesaRefMatch[1].toUpperCase();
  }

  // 7. Amount (KES / KSH)
  const amountMatch = text.match(/(?:KES|KSH|KSHS|AMOUNT|PAID|FEE)\.?\s*[:#-]?\s*([\d,]+)/i);
  if (amountMatch) {
    const parsedAmt = parseInt(amountMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(parsedAmt) && parsedAmt > 0) {
      entities.amount = parsedAmt;
    }
  }

  // 8. Customer Name
  const nameMatch = text.match(/(?:NAME|APPLICANT|CUSTOMER|CLIENT|FULL\s*NAME|MR\.|MRS\.|MS\.)\s*[:#-]?\s*([A-Za-z\s]{3,35})(?:\r?\n|,|\.|$)/i);
  if (nameMatch) {
    const cleaned = nameMatch[1].trim();
    if (cleaned.length > 2 && !cleaned.toLowerCase().includes("http") && !cleaned.toLowerCase().includes("kra")) {
      entities.name = cleaned;
    }
  }

  // 9. Service Intent Heuristic
  const lower = text.toLowerCase();
  if (lower.includes("kra") || lower.includes("nil") || lower.includes("tax") || lower.includes("itax") || lower.includes("tcc")) {
    entities.intent = "KRA Government Service";
  } else if (lower.includes("ecitizen") || lower.includes("good conduct") || lower.includes("dci") || lower.includes("passport")) {
    entities.intent = "eCitizen Government Application";
  } else if (lower.includes("ntsa") || lower.includes("license") || lower.includes("logbook") || lower.includes("vehicle") || lower.includes("tims")) {
    entities.intent = "NTSA Driving / Vehicle Service";
  } else if (lower.includes("cv") || lower.includes("resume") || lower.includes("job") || lower.includes("application")) {
    entities.intent = "AI CV & Resume Generation";
  } else if (lower.includes("print") || lower.includes("copy") || lower.includes("pages")) {
    entities.intent = "Document Printing Center";
  } else if (lower.includes("scan") || lower.includes("ocr")) {
    entities.intent = "Scanner Center & Vault";
  } else if (lower.includes("mpesa") || lower.includes("confirmed") || lower.includes("sent to")) {
    entities.intent = "M-Pesa Payment Verification";
  } else {
    entities.intent = "General Cyber Cafe Task";
  }

  return entities;
}

export function generateCavemanScriptFromEntities(entities: CavemanEntities): string {
  const data: Record<string, string> = {};
  if (entities.pin) data.pin = entities.pin;
  if (entities.nationalId) data.nationalId = entities.nationalId;
  if (entities.phone) data.phone = entities.phone;
  if (entities.email) data.email = entities.email;
  if (entities.name) data.fullName = entities.name;
  if (entities.otp) data.otp = entities.otp;

  return `javascript:(function(){
  console.log('[CyberPlus Caveman Clipboard Engine] Initiating DOM Autofill...');
  const data = ${JSON.stringify(data, null, 2)};
  let count = 0;
  const matchers = {
    pin: ['pin', 'kra_pin', 'taxpayer', 'id_number', 'nationalid'],
    nationalId: ['id', 'nationalid', 'id_no', 'idnumber', 'serial', 'reference'],
    fullName: ['name', 'fullname', 'first_name', 'applicant_name', 'client_name'],
    phone: ['phone', 'mobile', 'tel', 'contact', 'msisdn'],
    email: ['email', 'mail', 'user_email'],
    otp: ['otp', 'code', 'passcode', 'verification', 'token']
  };
  for (const [key, value] of Object.entries(data)) {
    const aliases = matchers[key] || [key];
    for (const alias of aliases) {
      const el = document.querySelector(
        'input[name*="' + alias + '" i], input[id*="' + alias + '" i], input[placeholder*="' + alias + '" i], select[name*="' + alias + '" i]'
      );
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.style.border = '2px solid #10b981';
        el.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        count++;
        break;
      }
    }
  }
  alert('[CyberPlus Caveman Engine] Autofilled ' + count + ' matching form fields from clipboard! Please review before clicking Submit.');
})();`;
}

export function generateCavemanTaskPrompt(entities: CavemanEntities): string {
  const parts: string[] = [];
  parts.push(`**[CAVEMAN CLIPBOARD TASK BOOST]**`);
  if (entities.intent) parts.push(`- **Detected Intent:** ${entities.intent}`);
  if (entities.name) parts.push(`- **Customer Name:** ${entities.name}`);
  if (entities.pin) parts.push(`- **KRA PIN:** ${entities.pin}`);
  if (entities.nationalId) parts.push(`- **National ID:** ${entities.nationalId}`);
  if (entities.phone) parts.push(`- **Phone:** ${entities.phone}`);
  if (entities.email) parts.push(`- **Email:** ${entities.email}`);
  if (entities.otp) parts.push(`- **OTP / Verification Code:** ${entities.otp}`);
  if (entities.refCode) parts.push(`- **M-Pesa Reference:** ${entities.refCode}`);
  if (entities.amount) parts.push(`- **Amount:** KES ${entities.amount}`);
  parts.push(`\n**Raw Clipboard Source:** "${entities.rawText.slice(0, 300)}"`);
  parts.push(`\n*Please provide a direct action plan, processing checklist, and step-by-step guidance for this cyber cafe task.*`);
  return parts.join("\n");
}
