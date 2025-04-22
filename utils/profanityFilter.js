const profanityList = [
  // Turkish profanity words (200+ words)
  "abaza", "abazan", "ağzına sıçayım", "ahmak", "amcık", "amcıklar", "amcık hoşafı", "amınakoyim", 
  "amk", "amına", "amınakoyayım", "amına koyarım", "amına koyayım", "amkun", "amlı", "amlar", 
  "amuna", "ana", "ananı", "ananızı", "ananıza", "anneni", "annenizin", "annesiz", "aptal", "aq", 
  "beyinsiz", "bitch", "bok", "boku", "boktan", "boktur", "boşluğuma", "bull", "bullshit", "burdur", 
  "butt", "butthole", "çük", "dalyarak", "dangalak", "dallama", "daltassak", "dalyarrak", "dangalak", 
  "dassak", "dırzı", "dildo", "dingil", "dingilini", "dinsiz", "dkerim", "domal", "domalan", "domalmak", 
  "domaltıp", "domaltarak", "domalsın", "domalt", "domaltarak", "domalsın", "dölü", "dönek", "düdük", 
  "eben", "ebeni", "ebenin", "ebeninki", "ecdadını", "ecdadini", "embesil", "enayi", "engerek", 
  "enayiler", "fahişe", "fahise", "feriştah", "fıstık", "fuck", "fucker", "gavad", "gavat", "geber", 
  "geberik", "gebermek", "gebermiş", "gebertir", "gerızekalı", "gerizekalı", "gerzek", "giberim", 
  "giberler", "gibis", "gibiş", "gibmek", "gibtiler", "goddamn", "godoş", "godumun", "gotelek", 
  "gotlalesi", "göt", "götdeliği", "götherif", "götlalesi", "götloglu", "götü", "götün", "götüne", 
  "götünekoyim", "götünü", "götünüze", "götürgelelim", "götüsiken", "götveren", "gtveren", "hasiktir", 
  "hassiktir", "haysiyetsiz", "hayvan", "hödük", "hsktr", "huur", "ıbnelık", "ibina", "ibine", "ibinenin", 
  "ibne", "ibnedir", "ibneleri", "ibnelik", "ibnelri", "ibneni", "ibnenin", "ibnesi", "ipne", "itoğluit", 
  "kahpe", "kahpenin", "kahpenin feryadı", "kaka", "kaltak", "kanciik", "kancik", "kappe", "karhane", 
  "kavat", "kavatak", "kaypak", "kaşar", "kerane", "kerhane", "kerhanelerde", "kevase", "kevaşe", 
  "kevvase", "koduğmun", "koduğmunun", "kodumun", "kodumunun", "koduumun", "koyiim", "koyiiym", 
  "koyim", "koyum", "kukudaym", "laciye", "liboş", "madafaka", "mal", "malafat", "mcık", "memelerini", 
  "meme", "mezveleli", "minaamcık", "mincikliyim", "monakkoluyum", "motherfucker", "mudik", "ocuu", 
  "oğlancı", "oğlu it", "orosbucocuu", "orospu", "orospuccocugu", "orospu cocugu", "orospuçocuğu", 
  "orospu çocuğu", "orospuçocuklarından", "orospuçocukları", "orospudur", "orospular", "orospunun", 
  "orospunun evladı", "orospuoğlu", "orospuydu", "orospuyuz", "orostoban", "orostopol", "orrospu", 
  "oruspu", "oruspuçocuğu", "osbir", "ossurduum", "osuruk", "osururum", "otuzbir", "öküz", "öşex", 
  "patlak zar", "pezevengi", "pezevenk", "pezeveng", "pezo", "pic", "piç", "piçi", "piçinin", "piçler", 
  "pis", "porno", "pussy", "puşt", "puşttur", "rahminde", "revizyonist", "s1kerim", "s1kerm", "s1krm", 
  "sakso", "saksofon", "salaak", "salak", "salaksın", "saxo", "sekis", "serefsiz", "sevgi koyarım", "sevişelim", 
  "sexs", "sıçarım", "sıçtığım", "sıecem", "sicarsin", "sie", "sik", "sikdi", "sikediyor", "sikerim", 
  "sikerler", "sikersin", "sikertir", "sikertmek", "sikesen", "sikesicenin", "sikey", "sikeydim", "sikeyim", 
  "sikeym", "sikicem", "sikici", "sikiciler", "sikiiim", "sikiiimmm", "sikiim", "sikiir", "sikiirken", "sikik", 
  "sikil", "sikildiini", "sikilesice", "sikilmi", "sikilmie", "sikilmis", "sikilmiş", "sikilsin", "sikim", 
  "sikimde", "sikimden", "sikime", "sikimi", "sikimiin", "sikimin", "sikimle", "sikimsonik", "sikimtrak", 
  "sikin", "sikinde", "sikinden", "sikine", "sikini", "sikip", "sikis", "sikisek", "sikisen", "sikish", "sikismis", 
  "sikiş", "sikişen", "sikişme", "sikitiin", "sikiyim", "sikiym", "sikiyorum", "sikkim", "sikko", "sikleri", 
  "sikleriii", "sikli", "sikm", "sikmek", "sikmem", "sikmiler", "sikmisligim", "siksem", "sikseydin", "sikseyidin", 
  "siksin", "siksinbaya", "siksinler", "siksiz", "siksok", "siksz", "sikt", "sikti", "siktigimin", "siktigiminin", 
  "siktiğim", "siktiğimin", "siktiğiminin", "siktii", "siktiim", "siktiimin", "siktiiminin", "siktiler", "siktim", 
  "siktim", "siktimin", "siktiminin", "siktir", "siktir et", "siktirgit", "siktir git", "siktirir", "siktiririm", 
  "siktiriyor", "siktir lan", "siktirolgit", "siktir ol git", "sittimin", "sittir", "skcem", "skecem", "skem", 
  "sker", "skerim", "skerm", "skeyim", "skiim", "skik", "skim", "skime", "skmek", "sksin", "sksn", "sksz", 
  "sktiimin", "sktrr", "skyim", "slaleni", "sokam", "sokarım", "sokarim", "sokarm", "sokarmkoduumun", 
  "sokayım", "sokaym", "sokiim", "soktuğumunun", "sokuk", "sokum", "sokuş", "sokuyum", "soxum", "sulaleni", 
  "sülaleni", "sülalenizi", "sürtük", "şerefsiz", "şıllık", "taaklarn", "taaklarna", "tarrakimin", "tasak", 
  "tassak", "taşak", "taşşak", "tipini s.k", "tipinizi s.keyim", "tiyniyat", "toplarm", "topsun", "totoş", 
  "vajina", "vajinanı", "veled", "veledizina", "veled i zina", "verdiimin", "weled", "weledizina", "whore", 
  "xikeyim", "yaaraaa", "yalama", "yalarım", "yalarun", "yaraaam", "yarak", "yaraksız", "yaraktr", "yaram", 
  "yaraminbasi", "yaramn", "yararmorospunun", "yarra", "yarraaaa", "yarraak", "yarraam", "yarraamı", "yarragi", 
  "yarragimi", "yarragina", "yarragindan", "yarragm", "yarrağ", "yarrağım", "yarrağımı", "yarraimin", "yarrak", 
  "yarram", "yarramin", "yarraminbaşı", "yarramn", "yarran", "yarrana", "yarrrak", "yavak", "yavş", "yavşak", 
  "yavşaktır", "yrrak", "zigsin", "zikeyim", "zikiiim", "zikiim", "zikik", "zikim", "ziksiiin", "ziksiin", "zulliyetini"
];

/**
 * Check if text contains profanity
 * @param {string} text - Text to check for profanity
 * @returns {boolean} - Returns true if text contains profanity
 */
function checkProfanity(text) {
  if (!text) return false;
  
  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Check for exact matches and matches with special characters
  for (const word of profanityList) {
    // Check for exact match
    if (lowerText.includes(word)) {
      return true;
    }
    
    // Check for match with special characters (like dots or spaces between letters)
    const regex = new RegExp(
      word
        .split('')
        .map(char => `${char}[\\s.,*_-]*`)
        .join(''),
      'i'
    );
    
    if (regex.test(lowerText)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Censor profanity in text
 * @param {string} text - Text to censor
 * @returns {string} - Censored text
 */
function censorProfanity(text) {
  if (!text) return text;
  
  let censoredText = text;
  const lowerText = text.toLowerCase();
  
  for (const word of profanityList) {
    if (lowerText.includes(word)) {
      // Replace the word with asterisks
      const replacement = '*'.repeat(word.length);
      
      // Use regular expression to replace all occurrences case-insensitive
      const regex = new RegExp(word, 'gi');
      censoredText = censoredText.replace(regex, replacement);
    }
  }
  
  return censoredText;
}

module.exports = { checkProfanity, censorProfanity, profanityList }; 