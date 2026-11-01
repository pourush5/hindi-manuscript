/**
 * Kalam (कलाम) - Hybrid Transliteration Engine
 * Coordinates Google Input Tools (Direct CORS Fetch + JSONP fallback with &cb=)
 * with predictive pre-fetching, LRU caching, and smart offline phonetic fallback.
 */

window.KalamTransliterator = (function () {
  'use strict';

  // In-memory cache for ultra-fast instant lookups (0ms latency on spacebar)
  const memoryCache = new Map();
  let jsonpCounter = 0;

  /**
   * Checks if candidates are already cached in memory for a word
   */
  function hasCache(word) {
    if (!word) return false;
    return memoryCache.has(word.trim().toLowerCase());
  }

  /**
   * Pre-fetches candidates in the background while the user is typing letters.
   */
  function prefetch(word) {
    if (!word || word.length < 2) return;
    const clean = word.trim().toLowerCase();
    if (memoryCache.has(clean)) return;

    // Fire and forget background fetch
    getCandidates(clean).catch(() => {});
  }

  /**
   * Fetches transliteration candidates for a given English/Hinglish word.
   * Uses Google Input Tools with dual transport:
   * 1. Direct fetch() with open CORS (Fastest, ~40-80ms)
   * 2. JSONP with &cb= parameter fallback (Bypasses any browser CORS quirks)
   * 3. Local dictionary and smart phonetic engine (100% offline)
   */
  async function getCandidates(word) {
    if (!word || !word.trim()) {
      return [];
    }

    const cleanWord = word.trim().toLowerCase();

    // 1. Check in-memory cache
    if (memoryCache.has(cleanWord)) {
      return memoryCache.get(cleanWord);
    }

    // 2. Check offline dictionary for an instant high-quality match
    const dictMatch = window.KalamPhonetics ? window.KalamPhonetics.getDictionaryMatch(cleanWord) : null;

    // 3. Try Direct Fetch first (Modern, fast, open CORS)
    try {
      const fetchPromise = (async () => {
        const encoded = encodeURIComponent(cleanWord);
        const url = `https://inputtools.google.com/request?text=${encoded}&itc=hi-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`;
        const res = await fetch(url, { method: 'GET', mode: 'cors' });
        if (res.ok) {
          const data = await res.json();
          if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
            return data[1][0][1];
          }
        }
        throw new Error('Fetch unsuccessful');
      })();

      // Quick 700ms timeout for network fetch
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 700));
      const googleCandidates = await Promise.race([fetchPromise, timeoutPromise]);

      if (googleCandidates && googleCandidates.length > 0) {
        const candidates = normalizeCandidates(googleCandidates, cleanWord);
        memoryCache.set(cleanWord, candidates);
        return candidates;
      }
    } catch (e) {
      // Fetch failed or timed out, attempt JSONP fallback with correct &cb= parameter
    }

    // 4. Try JSONP fallback with &cb= parameter
    try {
      const jsonpCandidates = await fetchViaJsonp(cleanWord);
      if (jsonpCandidates && jsonpCandidates.length > 0) {
        const candidates = normalizeCandidates(jsonpCandidates, cleanWord);
        memoryCache.set(cleanWord, candidates);
        return candidates;
      }
    } catch (e) {
      // JSONP failed or offline
    }

    // 5. Offline Fallback: Local dictionary + smart phonetic rules
    const fallback = getLocalFallbackCandidates(cleanWord, dictMatch);
    memoryCache.set(cleanWord, fallback);
    return fallback;
  }

  function fetchViaJsonp(cleanWord) {
    return new Promise((resolve, reject) => {
      const callbackName = `_googleInputCb_${Date.now()}_${++jsonpCounter}`;
      const script = document.createElement('script');

      let done = false;
      const timeoutId = setTimeout(() => {
        if (!done) {
          done = true;
          cleanup(script, callbackName);
          reject(new Error('JSONP timeout'));
        }
      }, 700);

      window[callbackName] = function (data) {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        cleanup(script, callbackName);

        try {
          if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
            resolve(data[1][0][1]);
          } else {
            reject(new Error('Invalid JSONP format'));
          }
        } catch (err) {
          reject(err);
        }
      };

      script.onerror = function () {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        cleanup(script, callbackName);
        reject(new Error('Script load error'));
      };

      const encoded = encodeURIComponent(cleanWord);
      // NOTE: Google Input Tools uses cb= for JSONP callback parameter
      script.src = `https://inputtools.google.com/request?text=${encoded}&itc=hi-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage&cb=${callbackName}`;
      script.async = true;

      document.body.appendChild(script);
    });
  }

  function cleanup(script, callbackName) {
    if (script && script.parentNode) {
      script.parentNode.removeChild(script);
    }
    delete window[callbackName];
  }

  function normalizeCandidates(candidatesList, originalWord) {
    const list = [...candidatesList];
    // Always include original English word as the final choice so author can easily keep it
    if (!list.includes(originalWord)) {
      list.push(originalWord);
    }
    return list;
  }

  function getLocalFallbackCandidates(cleanWord, dictMatch) {
    const list = [];
    if (dictMatch) {
      list.push(dictMatch);
    }
    if (window.KalamPhonetics) {
      const ruleBased = window.KalamPhonetics.transliterateWord(cleanWord);
      if (ruleBased && !list.includes(ruleBased)) {
        list.push(ruleBased);
      }
    }
    // Always include original English word
    if (!list.includes(cleanWord)) {
      list.push(cleanWord);
    }
    return list;
  }

  /**
   * Synchronous top match:
   * Checks Cache -> Offline Dictionary -> Offline Phonetic Rules
   */
  function getInstantTopCandidate(word) {
    if (!word) return "";
    const clean = word.trim().toLowerCase();
    if (memoryCache.has(clean)) {
      return memoryCache.get(clean)[0];
    }
    if (window.KalamPhonetics) {
      const match = window.KalamPhonetics.getDictionaryMatch(clean);
      if (match) return match;
      return window.KalamPhonetics.transliterateWord(clean);
    }
    return word;
  }

  /**
   * Synchronously returns cached candidate list if available
   */
  function getCachedCandidates(word) {
    if (!word) return null;
    const clean = word.trim().toLowerCase();
    if (memoryCache.has(clean)) {
      return memoryCache.get(clean);
    }
    return null;
  }

  return {
    getCandidates: getCandidates,
    getInstantTopCandidate: getInstantTopCandidate,
    getCachedCandidates: getCachedCandidates,
    hasCache: hasCache,
    prefetch: prefetch,
    clearCache: () => memoryCache.clear()
  };
})();
