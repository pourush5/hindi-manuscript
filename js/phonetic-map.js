/**
 * Kalam (कलाम) - Offline Hindi Phonetic Map & Dictionary
 * Provides high-speed, 100% offline transliteration fallback
 * for common conversational words and phonetic rules.
 */

window.KalamPhonetics = (function () {
  'use strict';

  // 1. High-frequency conversational & literary dictionary (Hinglish -> Hindi)
  // Handles irregular phonetic patterns, nuances, and common words instantly.
  const DICTIONARY = {
    // Pronouns & Demonstratives
    "main": "मैं", "mai": "मैं", "mera": "मेरा", "meri": "मेरी", "mere": "मेरे", "mujh": "मुझ",
    "mujhe": "मुझे", "mujhko": "मुझको", "hum": "हम", "ham": "हम", "hamara": "हमारा", "hamari": "हमारी",
    "hamare": "हमारे", "humein": "हमें", "hamein": "हमें", "humko": "हमको", "tu": "तू", "tera": "तेरा",
    "teri": "तेरी", "tere": "तेरे", "tujhe": "तुझे", "tujhko": "तुझको", "tum": "तुम", "tumhara": "तुम्हारा",
    "tumhari": "तुम्हारी", "tumhare": "तुम्हारे", "tumhein": "तुम्हें", "tumko": "तुमको", "aap": "आप",
    "aapka": "आपका", "aapki": "आपकी", "aapke": "आपके", "aapko": "आपको", "ye": "ये", "yeh": "यह",
    "is": "इस", "iska": "इसका", "iski": "इसकी", "iske": "इसके", "isse": "इससे", "isko": "इसको",
    "ismein": "इसमें", "isme": "इसमें", "in": "इन", "inka": "इनका", "inki": "इनकी", "inke": "इनके",
    "inse": "इनसे", "inhe": "इन्हें", "inhein": "इन्हें", "vo": "वो", "voh": "वह", "wo": "वो", "woh": "वह",
    "us": "उस", "uska": "उसका", "uski": "उसकी", "uske": "उसके", "usse": "उससे", "usko": "उसको",
    "usmein": "उसमें", "usme": "उसमें", "un": "उन", "unka": "उनका", "unki": "उनकी", "unke": "उनके",
    "unse": "उनसे", "unhe": "उन्हें", "unhein": "उन्हें", "apna": "अपना", "apni": "अपनी", "apne": "अपने",
    "khud": "खुद", "swayam": "स्वयं",

    // Auxiliary & Verbs (Tenses)
    "hai": "है", "hain": "हैं", "ho": "हो", "hoon": "हूँ", "hu": "हूँ", "hun": "हूँ",
    "tha": "था", "the": "थे", "thi": "थी", "theen": "थीं", "thin": "थीं",
    "hoga": "होगा", "hogi": "होगी", "hoge": "होगे", "honge": "होंगे", "raha": "रहा", "rahe": "रहे",
    "rahi": "रही", "raheen": "रहीं", "rahin": "रहीं", "gaya": "गया", "gaye": "गए", "gayi": "गई",
    "gayin": "गईं", "aaya": "आया", "aaye": "आए", "aayi": "आई", "diya": "दिया", "diye": "दिए",
    "de": "दे", "liya": "लिया", "liye": "लिए", "le": "ले", "kiya": "किया", "kiye": "किए",
    "karna": "करना", "karti": "करती", "karta": "करता", "karte": "करते", "kar": "कर", "karo": "करो",
    "kijiye": "कीजिए", "kijie": "कीजिए", "hona": "होना", "hoti": "होती", "hota": "होता", "hote": "होते",
    "aana": "आना", "aata": "आता", "aati": "आती", "aate": "आते", "jaana": "जाना", "jaata": "जाता",
    "jaati": "जाती", "jaate": "जाते", "bolna": "बोलना", "bol": "बोल", "boli": "बोली", "bola": "बोला",
    "bole": "बोले", "kehna": "कहना", "kaha": "कहा", "kahi": "कही", "kahe": "कहे", "sunna": "सुनना",
    "suno": "सुनो", "suna": "सुना", "suni": "सुनी", "dekhna": "देखना", "dekha": "देखा", "dekho": "देखो",
    "dekhi": "देखी", "dekhe": "देखे", "samajhna": "समझना", "samajh": "समझ", "samjha": "समझा",
    "samjhe": "समझे", "sochna": "सोचना", "socha": "सोचा", "socho": "सोचो", "jaanna": "जानना",
    "jaanta": "जानता", "jaanti": "जानती", "jaante": "जानते",

    // Question Words
    "kya": "क्या", "kyon": "क्यों", "kyun": "क्यों", "kaise": "कैसे", "kaisa": "कैसा", "kaisi": "कैसी",
    "kab": "कब", "kahan": "कहाँ", "kaha": "कहाँ", "kahanpe": "कहाँ पे", "kidhar": "किधर", "kaun": "कौन",
    "kiska": "किसका", "kiski": "किसकी", "kiske": "किसके", "kisko": "किसको", "kise": "किसे",
    "kitna": "कितना", "kitni": "कितनी", "kitne": "कितने",

    // Conjunctions & Prepositions
    "aur": "और", "ya": "या", "lekin": "लेकिन", "magar": "मगर", "par": "पर", "parantu": "परंतु",
    "kintu": "किंतु", "balki": "बल्कि", "kyunki": "क्योंकि", "isliye": "इसलिए", "isiliye": "इसीलिए",
    "taki": "ताकि", "agar": "अगर", "yadi": "यदि", "to": "तो", "toh": "तो", "bhi": "भी", "hi": "ही",
    "se": "से", "ko": "को", "mein": "में", "me": "में", "pe": "पे", "tak": "तक", "bina": "बिना",
    "ke": "के", "ki": "की", "ka": "का", "saath": "साथ", "paas": "पास", "baad": "बाद", "pehle": "पहले",
    "andar": "अंदर", "baahar": "बाहर", "bahar": "बाहर", "upar": "ऊपर", "neeche": "नीचे", "niche": "नीचे",
    "aage": "आगे", "peeche": "पीछे", "piche": "पीछे",

    // Common Adverbs & Quantifiers
    "bahut": "बहुत", "bohot": "बहुत", "kam": "कम", "zyada": "ज़्यादा", "jyada": "ज़्यादा", "thoda": "थोड़ा",
    "thodi": "थोड़ी", "thode": "थोड़े", "sab": "सब", "sabhi": "सभी", "kuch": "कुछ", "koi": "कोई",
    "kabhi": "कभी", "ab": "अब", "abhi": "अभी", "tab": "तब", "tabhi": "तभी", "jab": "जब", "jabki": "जबकि",
    "aaj": "आज", "kal": "कल", "parson": "परसों", "hamesha": "हमेशा", "kabhi-kabhi": "कभी-कभी",
    "shayad": "शायद", "bilkul": "बिल्कुल", "zaroor": "ज़रूर", "zarur": "ज़रूर", "sirf": "सिर्फ़",
    "keval": "केवल", "khas": "ख़ास", "aam": "आम", "sach": "सच", "jhooth": "झूठ", "jhut": "झूठ",

    // Greetings & Courtesies
    "namaste": "नमस्ते", "namaskar": "नमस्कार", "pranam": "प्रणाम", "dhanyawad": "धन्यवाद",
    "shukriya": "शुक्रिया", "alvida": "अलविदा", "swagat": "स्वागत", "kripya": "कृपया", "kripa": "कृपा",
    "maaf": "माफ़", "shama": "क्षमा",

    // Literary, Poetry & Storytelling Vocabulary
    "kavita": "कविता", "kahani": "कहानी", "upanyas": "उपन्यास", "kissa": "क़िस्सा", "dastan": "दास्तान",
    "shayari": "शायरी", "shayar": "शायर", "ghazal": "ग़ज़ल", "nazm": "नज़्म", "sher": "शेर", "pankti": "पंक्ति",
    "lekhak": "लेखक", "kavi": "कवि", "kalam": "क़लम", "panna": "पन्ना", "adhyaay": "अध्याय", "adhyay": "अध्याय",
    "sheershak": "शीर्षक", "shirshak": "शीर्षक", "kitab": "किताब", "pustak": "पुस्तक", "akshar": "अक्षर",
    "shabd": "शब्द", "bhasha": "भाषा", "roop": "रूप", "bhav": "भाव", "ehsaas": "एहसास", "jazbaat": "जज़्बात",
    "pyar": "प्यार", "prem": "प्रेम", "ishq": "इश्क़", "mohabbat": "मोहब्बत", "dosti": "दोस्ती", "yaar": "यार",
    "dost": "दोस्त", "humsafar": "हमसफ़र", "saathi": "साथी", "zindagi": "ज़िंदगी", "jeevan": "जीवन",
    "sansar": "संसार", "duniya": "दुनिया", "jahan": "जहाँ", "khwaab": "ख़्वाब", "sapna": "सपना",
    "sapne": "सपने", "yaad": "याद", "yaadein": "यादें", "dard": "दर्द", "aansoo": "आँसू", "aansu": "आँसू",
    "muskaan": "मुस्कान", "khushi": "ख़ुशी", "gham": "ग़म", "tanhaai": "तन्हाई", "tanhai": "तन्हाई",
    "roshni": "रोशनी", "prakash": "प्रकाश", "andhera": "अंधेरा", "chand": "चाँद", "suraj": "सूरज",
    "sitare": "सितारे", "aasmaan": "आसमान", "aasman": "आसमान", "hawa": "हवा", "baadal": "बादल",
    "barish": "बारिश", "nadi": "नदी", "samandar": "समंदर", "raat": "रात", "subah": "सुबह", "shaam": "शाम",
    "waqt": "वक़्त", "samay": "समय", "pal": "पल", "sadiyan": "सदियाँ", "manzil": "मंज़िल", "raasta": "रास्ता",
    "rasta": "रास्ता", "safar": "सफ़र", "kadam": "क़दम", "aankhein": "आँखें", "ankhein": "आँखें",
    "dil": "दिल", "dhadkan": "धड़कन", "saansein": "साँसें", "baat": "बात", "baatein": "बातें",
    "aawaz": "आवाज़", "khamoshi": "ख़ामोशी", "geet": "गीत", "dhun": "धुन", "rang": "रंग", "khushboo": "ख़ुशबू"
  };

  // 2. Character mapping tables for phonetic rule fallback
  const INDEPENDENT_VOWELS = {
    "aa": "आ", "a": "अ", "A": "आ",
    "ee": "ई", "ii": "ई", "i": "इ", "I": "ई",
    "oo": "ऊ", "uu": "ऊ", "u": "उ", "U": "ऊ",
    "ri": "ऋ", "R": "ऋ",
    "ai": "ऐ", "e": "ए", "E": "ए",
    "au": "औ", "ou": "औ", "o": "ओ", "O": "ओ"
  };

  const MATRAS = {
    "aa": "ा", "A": "ा",
    "ee": "ी", "ii": "ी", "i": "ि", "I": "ी",
    "oo": "ू", "uu": "ू", "u": "ु", "U": "ू",
    "ri": "ृ", "R": "ृ",
    "ai": "ै", "e": "े", "E": "े",
    "au": "ौ", "ou": "ौ", "o": "ो", "O": "ो"
  };

  const CONSONANTS = {
    "k": "क", "kh": "ख", "g": "ग", "gh": "घ", "ng": "ङ",
    "ch": "च", "chh": "छ", "j": "ज", "jh": "झ", "ny": "ञ",
    "T": "ट", "Th": "ठ", "D": "ड", "Dh": "ढ", "N": "ण",
    "t": "त", "th": "थ", "d": "द", "dh": "ध", "n": "न",
    "p": "प", "ph": "फ", "f": "फ़", "b": "ब", "bh": "भ", "m": "म",
    "y": "य", "r": "र", "l": "ल", "v": "व", "w": "व",
    "sh": "श", "shh": "ष", "s": "स", "h": "ह",
    "ksh": "क्ष", "ksha": "क्ष", "tr": "त्र", "tra": "त्र", "gy": "ज्ञ", "gya": "ज्ञ", "shr": "श्र",
    "z": "ज़", "q": "क़", "khh": "ख़", "ghh": "ग़"
  };

  // Convert a single word phonetically when offline or missing from dictionary
  function ruleBasedTransliterate(word) {
    if (!word) return "";
    const lower = word.toLowerCase();

    // Check exact dictionary match first
    if (DICTIONARY[lower]) {
      return DICTIONARY[lower];
    }

    let result = "";
    let i = 0;
    const len = lower.length;

    // Pattern matching tokens: try 3-chars, 2-chars, 1-char
    while (i < len) {
      // 1. Try 4-char conjuncts
      const sub4 = lower.substring(i, i + 4);
      if (CONSONANTS[sub4]) {
        result += handleConsonant(sub4, lower, i);
        i += sub4.length;
        continue;
      }

      // 2. Try 3-char tokens
      const sub3 = lower.substring(i, i + 3);
      if (CONSONANTS[sub3]) {
        const nextIdx = i + 3;
        const res = processConsonantWithVowel(sub3, lower, nextIdx);
        result += res.text;
        i = res.newIndex;
        continue;
      }

      // 3. Try 2-char tokens
      const sub2 = lower.substring(i, i + 2);
      if (CONSONANTS[sub2]) {
        const nextIdx = i + 2;
        const res = processConsonantWithVowel(sub2, lower, nextIdx);
        result += res.text;
        i = res.newIndex;
        continue;
      }
      if (INDEPENDENT_VOWELS[sub2] && (i === 0 || isVowelOrPunct(lower[i - 1]))) {
        result += INDEPENDENT_VOWELS[sub2];
        i += 2;
        continue;
      }

      // 4. Try 1-char token
      const sub1 = lower[i];
      if (CONSONANTS[sub1]) {
        const nextIdx = i + 1;
        const res = processConsonantWithVowel(sub1, lower, nextIdx);
        result += res.text;
        i = res.newIndex;
        continue;
      }
      if (INDEPENDENT_VOWELS[sub1]) {
        result += (i === 0 || isVowelOrPunct(lower[i - 1])) ? INDEPENDENT_VOWELS[sub1] : (MATRAS[sub1] || "");
        i += 1;
        continue;
      }

      // Non-phonetic or punctuation char
      result += lower[i];
      i += 1;
    }

    // Post-processing rules (terminal 'a' removal in Hindi unless stressed)
    return finalizeDevanagari(result);
  }

  function processConsonantWithVowel(consKey, str, nextIdx) {
    const consChar = CONSONANTS[consKey];
    if (nextIdx >= str.length) {
      // Terminal consonant
      return { text: consChar, newIndex: nextIdx };
    }

    // Check next 2 characters for matra
    const next2 = str.substring(nextIdx, nextIdx + 2);
    if (MATRAS[next2]) {
      return { text: consChar + MATRAS[next2], newIndex: nextIdx + 2 };
    }

    // Check next 1 character for matra
    const next1 = str[nextIdx];
    if (next1 === 'a') {
      // Inherited vowel sound 'a'
      return { text: consChar, newIndex: nextIdx + 1 };
    }
    if (MATRAS[next1]) {
      return { text: consChar + MATRAS[next1], newIndex: nextIdx + 1 };
    }

    // If next character is another consonant, add halant (अर्ध-अक्षर)
    if (isConsonant(next1)) {
      return { text: consChar + "्", newIndex: nextIdx };
    }

    return { text: consChar, newIndex: nextIdx };
  }

  function isConsonant(char) {
    return /[bcdfghjklmnpqrstvwxyz]/i.test(char);
  }

  function isVowelOrPunct(char) {
    return !char || /[aeiou \n\t\.,!?-]/i.test(char);
  }

  function finalizeDevanagari(text) {
    return text
      .replace(/्$/g, "") // remove trailing halant at end of standalone word
      .replace(/न्$/g, "ं") // terminal 'n' often becomes anusvara
      .replace(/म्$/g, "ं");
  }

  return {
    dictionary: DICTIONARY,
    transliterateWord: ruleBasedTransliterate,
    getDictionaryMatch: function (word) {
      if (!word) return null;
      return DICTIONARY[word.toLowerCase()] || null;
    }
  };
})();

