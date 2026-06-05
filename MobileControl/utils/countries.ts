export interface Country {
  name: string;
  iso2: string;
  dialCode: string;
  flag: string;
}

export const countries: Country[] = [
  { name: "United Arab Emirates", iso2: "AE", dialCode: "+971", flag: "🇦🇪" },
  { name: "Saudi Arabia",         iso2: "SA", dialCode: "+966", flag: "🇸🇦" },
  { name: "Kuwait",               iso2: "KW", dialCode: "+965", flag: "🇰🇼" },
  { name: "Bahrain",              iso2: "BH", dialCode: "+973", flag: "🇧🇭" },
  { name: "Qatar",                iso2: "QA", dialCode: "+974", flag: "🇶🇦" },
  { name: "Oman",                 iso2: "OM", dialCode: "+968", flag: "🇴🇲" },
  { name: "Jordan",               iso2: "JO", dialCode: "+962", flag: "🇯🇴" },
  { name: "Egypt",                iso2: "EG", dialCode: "+20",  flag: "🇪🇬" },
  { name: "Lebanon",              iso2: "LB", dialCode: "+961", flag: "🇱🇧" },
  { name: "Iraq",                 iso2: "IQ", dialCode: "+964", flag: "🇮🇶" },
  { name: "USA",                  iso2: "US", dialCode: "+1",   flag: "🇺🇸" },
  { name: "UK",                   iso2: "GB", dialCode: "+44",  flag: "🇬🇧" },
  { name: "India",                iso2: "IN", dialCode: "+91",  flag: "🇮🇳" },
  { name: "Pakistan",             iso2: "PK", dialCode: "+92",  flag: "🇵🇰" },
  { name: "Germany",              iso2: "DE", dialCode: "+49",  flag: "🇩🇪" },
  { name: "France",               iso2: "FR", dialCode: "+33",  flag: "🇫🇷" },
  { name: "Turkey",               iso2: "TR", dialCode: "+90",  flag: "🇹🇷" },
  { name: "Iran",                 iso2: "IR", dialCode: "+98",  flag: "🇮🇷" },
  { name: "China",                iso2: "CN", dialCode: "+86",  flag: "🇨🇳" },
  { name: "Australia",            iso2: "AU", dialCode: "+61",  flag: "🇦🇺" },
  { name: "Canada",               iso2: "CA", dialCode: "+1",   flag: "🇨🇦" },
  { name: "Russia",               iso2: "RU", dialCode: "+7",   flag: "🇷🇺" },
  { name: "Brazil",               iso2: "BR", dialCode: "+55",  flag: "🇧🇷" },
  { name: "South Africa",         iso2: "ZA", dialCode: "+27",  flag: "🇿🇦" },
  { name: "Nigeria",              iso2: "NG", dialCode: "+234", flag: "🇳🇬" },
  { name: "Kenya",                iso2: "KE", dialCode: "+254", flag: "🇰🇪" },
  { name: "Singapore",            iso2: "SG", dialCode: "+65",  flag: "🇸🇬" },
  { name: "Malaysia",             iso2: "MY", dialCode: "+60",  flag: "🇲🇾" },
  { name: "Philippines",          iso2: "PH", dialCode: "+63",  flag: "🇵🇭" },
  { name: "Indonesia",            iso2: "ID", dialCode: "+62",  flag: "🇮🇩" },
];
