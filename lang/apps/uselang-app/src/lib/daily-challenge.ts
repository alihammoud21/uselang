// ── Daily challenge (tongue twisters) ────────────────────────────────────────
// One real, hard tongue twister per language per day. Deterministic pick by
// `hash(dateKey + languageCode) % pool.length` so every device sees the same
// twister on the same day. Midnight local resets. Attempts are recorded in
// progress-store so the Drill surface can show streak + best score.

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Corpus ───────────────────────────────────────────────────────────────────
// Curated for each language \u2014 real native tongue twisters, not beginner
// phrases. Each entry includes the phrase itself, a phonetic hint, a
// short English gloss so the user knows what they're saying, and the
// "hard bit" \u2014 the sound the coach should target feedback on.

export interface TongueTwister {
  phrase: string;
  phonetic: string;
  gloss: string;
  focus: string;    // the challenging phoneme or pattern
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export const TWISTER_CORPUS: Record<string, TongueTwister[]> = {
  en: [
    { phrase: "Red lorry, yellow lorry, red lorry, yellow lorry.", phonetic: "red lor-ee · yel-oh lor-ee", gloss: "A British truck-color tangle.", focus: "r / l alternation", difficulty: 4 },
    { phrase: "She sells seashells by the seashore.", phonetic: "shee sellz see-shellz by thuh see-shor", gloss: "The classic s/sh drill.", focus: "s vs. sh", difficulty: 3 },
    { phrase: "Peter Piper picked a peck of pickled peppers.", phonetic: "pee-ter pie-per pikt uh pek uhv pik-uld pep-erz", gloss: "About a pepper-picking Peter.", focus: "plosive p", difficulty: 3 },
    { phrase: "The sixth sick sheikh's sixth sheep's sick.", phonetic: "thuh siksth sik sheyks siksth sheeps sik", gloss: "Considered the hardest English twister.", focus: "s / sh / th clusters", difficulty: 5 },
    { phrase: "Unique New York, you know you need unique New York.", phonetic: "yoo-neek nyoo york", gloss: "A tourist's tangle.", focus: "y / n / k chain", difficulty: 4 },
    { phrase: "Toy boat, toy boat, toy boat.", phonetic: "toy boht", gloss: "Say it three times fast.", focus: "oy → oh glide", difficulty: 3 },
    { phrase: "Irish wristwatch, Swiss wristwatch.", phonetic: "eye-rish rist-wotch · swiss rist-wotch", gloss: "Watchmaker of the isles.", focus: "wr / sw clusters", difficulty: 4 },
  ],

  es: [
    { phrase: "Tres tristes tigres tragaban trigo en un trigal.", phonetic: "tres · TREES-tes · TEE-gres · tra-GA-ban · TREE-go · en un tree-GAL", gloss: "Three sad tigers ate wheat in a wheat field.", focus: "rolled r (rr)", difficulty: 4 },
    { phrase: "El perro de San Roque no tiene rabo, porque Ramón Ramírez se lo ha cortado.", phonetic: "el PE-rro · de san ROH-keh · no tye-neh RAH-bo", gloss: "Saint Roque's dog has no tail because Ramón Ramírez cut it off.", focus: "double rr + flap r", difficulty: 5 },
    { phrase: "Pablito clavó un clavito en la calva de un calvito.", phonetic: "pa-BLEE-to · kla-VOH · un kla-VEE-to", gloss: "Little Pablo nailed a little nail on a little bald man's head.", focus: "cl / kl clusters", difficulty: 4 },
    { phrase: "¡Cómo quieres que te quiera si el que quiero que me quiera no me quiere como quiero que me quiera!", phonetic: "KO-mo kye-res keh te KYE-ra", gloss: "How can I love you like you want when the one I want doesn't want me…", focus: "que / quiero chain", difficulty: 5 },
    { phrase: "Erre con erre cigarro, erre con erre barril.", phonetic: "eh-rreh kon eh-rreh · si-GA-rro · ba-RREEL", gloss: "R with R, cigar; R with R, barrel.", focus: "pure rr drill", difficulty: 5 },
    { phrase: "Compadre, cómpreme un coco; compadre, coco no compro.", phonetic: "kom-PA-dreh · KOM-preh-meh un KO-ko", gloss: "Friend, buy me a coconut; friend, I don't buy coconuts.", focus: "co / com repetition", difficulty: 4 },
    { phrase: "Pepe Pecas pica papas con un pico.", phonetic: "PEH-peh PEH-kas · PEE-ka PA-pas kon un PEE-ko", gloss: "Freckled Pepe chops potatoes with a pick.", focus: "p plosives", difficulty: 3 },
    { phrase: "Juan tuvo un tubo, y el tubo que tuvo se le rompió.", phonetic: "hwan TOO-vo un TOO-bo", gloss: "Juan had a tube, and the tube he had broke.", focus: "tuvo / tubo contrast", difficulty: 4 },
    { phrase: "Pancha plancha con cuatro planchas.", phonetic: "PAN-cha PLAN-cha kon KWA-tro PLAN-chas", gloss: "Pancha irons with four irons.", focus: "pl / ch clusters", difficulty: 4 },
    { phrase: "La sucesión sucesiva de sucesos sucede sucesivamente.", phonetic: "la soo-seh-SYON · soo-seh-SEE-va", gloss: "The successive succession of events happens successively.", focus: "s / c chain", difficulty: 5 },
    { phrase: "Me han dicho que has dicho un dicho que he dicho yo.", phonetic: "meh an DEE-cho keh as DEE-cho", gloss: "They told me you said a saying that I said.", focus: "dicho repetition", difficulty: 4 },
    { phrase: "R con r guitarra, r con r carril.", phonetic: "EH-rreh kon EH-rreh gee-TA-rra", gloss: "R with R, guitar; R with R, rail.", focus: "rr in middle and initial", difficulty: 5 },
    { phrase: "El cielo está encapotado, ¿quién lo desencapotará?", phonetic: "el SYEH-lo es-TA en-ka-po-TA-do", gloss: "The sky is overcast; who will uncover it?", focus: "ca / co / ta rhythm", difficulty: 4 },
    { phrase: "Poquito a poquito Paquito empaca poquitas copitas.", phonetic: "po-KEE-to a po-KEE-to pa-KEE-to", gloss: "Little by little, Paquito packs a few little cups.", focus: "quito / quitas chain", difficulty: 4 },
  ],

  fr: [
    { phrase: "Les chaussettes de l'archiduchesse sont-elles sèches, archi-sèches?", phonetic: "lay shoh-SET · duh lar-shee-dy-SHES · son-tèl · SESH · ar-shee-SESH", gloss: "Are the archduchess's socks dry, arch-dry?", focus: "sh / s sibilant switching", difficulty: 5 },
    { phrase: "Un chasseur sachant chasser sait chasser sans son chien.", phonetic: "uh(n) sha-SUR · sa-SHAN sha-SAY · say sha-SAY san son shyen", gloss: "A hunter who knows how to hunt hunts without his dog.", focus: "sh / s flip", difficulty: 4 },
    { phrase: "Ton thé t'a-t-il ôté ta toux?", phonetic: "ton tay · ta-teel oh-TAY · ta too", gloss: "Did your tea take your cough away?", focus: "nasal t + liaison", difficulty: 3 },
    { phrase: "Je veux et j'exige d'exquises excuses.", phonetic: "zhuh vuh ay zhek-ZEEZH · dek-SKEEZ ek-skyooz", gloss: "I want and demand exquisite apologies.", focus: "ks / gz clusters", difficulty: 4 },
    { phrase: "Trois tortues trottaient sur trois étroits toits.", phonetic: "trwah tor-TY · tro-TAY · syr trwah ay-TRWAH twah", gloss: "Three tortoises trotted on three narrow roofs.", focus: "tr / rw cluster", difficulty: 4 },
    { phrase: "Seize chaises sèches dans seize chambres.", phonetic: "sez SHEZ · SESH · don sez SHOM-bruh", gloss: "Sixteen dry chairs in sixteen rooms.", focus: "s / sh / z blend", difficulty: 4 },
    { phrase: "Si six scies scient six cyprès, six cent six scies scient six cent six cyprès.", phonetic: "see see see · syon see SEE-prey", gloss: "If six saws saw six cypresses, 606 saws saw 606 cypresses.", focus: "s / ss string", difficulty: 5 },
    { phrase: "Didon dîna dit-on du dos d'un dodu dindon.", phonetic: "dee-DAWN dee-NA · deet-ON · dy doh dun doh-DY dan-DAWN", gloss: "Dido dined, they say, on the back of a plump turkey.", focus: "d / n chain", difficulty: 4 },
    { phrase: "Natacha n'attacha pas son chat Pacha qui s'échappa.", phonetic: "na-TA-sha na-ta-SHA pa · son sha pa-SHA · kee say-sha-PA", gloss: "Natacha did not tie up her cat Pacha who escaped.", focus: "cha / sha liaison", difficulty: 4 },
    { phrase: "Ces cyprès sont si loin qu'on ne sait si c'en sont.", phonetic: "say see-PRAY son see LWAN · kon nuh say see son", gloss: "These cypresses are so far away one can't tell if they are.", focus: "s / c alternation", difficulty: 3 },
    { phrase: "Pauvre petit pêcheur, prends patience pour pouvoir prendre quelques petits poissons.", phonetic: "POH-vruh puh-TEE peh-SHUR · pron pa-SYONS", gloss: "Poor little fisherman, be patient to catch some little fish.", focus: "p plosive chain", difficulty: 4 },
    { phrase: "Le ver vert va vers le verre vert.", phonetic: "luh vair vair va vair luh vair vair", gloss: "The green worm goes toward the green glass.", focus: "vair homophone clusters", difficulty: 3 },
  ],

  de: [
    { phrase: "Fischers Fritze fischt frische Fische; frische Fische fischt Fischers Fritze.", phonetic: "FISH-ers FRIT-seh fisht FRISH-eh FISH-eh", gloss: "Fisher Fritz fishes fresh fish\u2026", focus: "f / sh alternation", difficulty: 4 },
    { phrase: "Blaukraut bleibt Blaukraut und Brautkleid bleibt Brautkleid.", phonetic: "BLOW-krowt blybt BLOW-krowt \u00b7 unt BROWT-klyt blybt BROWT-klyt", gloss: "Red cabbage stays red cabbage and a wedding dress stays a wedding dress.", focus: "bl / br clusters", difficulty: 4 },
    { phrase: "Zwischen zwei Zwetschgenzweigen zwitschern zwei Schwalben.", phonetic: "TSVISH-en tsvy TSVETSH-gen-tsvy-gen TSVIT-shern tsvy SHVAL-ben", gloss: "Between two plum branches, two swallows chirp.", focus: "tsv / tsh clusters", difficulty: 5 },
    { phrase: "Wenn Fliegen hinter Fliegen fliegen, fliegen Fliegen Fliegen nach.", phonetic: "ven FLEE-gen HIN-ter FLEE-gen FLEE-gen", gloss: "When flies fly behind flies, flies fly after flies.", focus: "fl homograph chain", difficulty: 4 },
    { phrase: "Brautkleid bleibt Brautkleid, auch wenn Brautkleid Brautkleid bleibt.", phonetic: "BROWT-klyt blybt BROWT-klyt", gloss: "A bridal gown remains a bridal gown, even if a bridal gown remains.", focus: "kt / bl ending", difficulty: 3 },
    { phrase: "Der Cottbusser Postkutscher putzt den Cottbusser Postkutschkasten.", phonetic: "der KOT-bus-er POST-kut-sher PUTS den KOT-bus-er POST-kutsh-kas-ten", gloss: "The Cottbus mail coachman cleans the Cottbus mail coach box.", focus: "ts / ks / p chain", difficulty: 5 },
    { phrase: "Schnecken erschrecken, wenn Schnecken an Schnecken schlecken.", phonetic: "SHNEK-en er-SHREK-en ven SHNEK-en an SHNEK-en SHLEK-en", gloss: "Snails are startled when snails lick snails.", focus: "shn / shl / chr", difficulty: 4 },
    { phrase: "Rote Lotte lottet mit einer roten Lote.", phonetic: "ROH-teh LOT-teh LOT-tet mit EYE-ner ROH-ten LOH-teh", gloss: "Red Lotte plumbs with a red plumb line.", focus: "r / l switch + geminate tt", difficulty: 3 },
    { phrase: "Drei Dinge braucht der Mann: Dach, Brot und Drachen.", phonetic: "dry DING-eh browkht der MAN \u00b7 dach \u00b7 broht \u00b7 unt DRA-khen", gloss: "Three things a man needs: roof, bread, and kite.", focus: "dr / dach ch fricative", difficulty: 3 },
    { phrase: "Sprechen Sie Deutsch? Ja, ich spreche Deutsch, aber schlecht.", phonetic: "SHPRE-khen zee DOYTSH \u00b7 ya \u00b7 ikh SHPRE-kheh DOYTSH \u00b7 AH-ber shlekht", gloss: "Do you speak German? Yes, I speak German, but badly.", focus: "spr / shl / kh chain", difficulty: 3 },
  ],

  it: [
    { phrase: "Sopra la panca la capra campa, sotto la panca la capra crepa.", phonetic: "SOH-pra la PAN-ka la KA-pra KAM-pa", gloss: "On the bench the goat lives, under the bench the goat dies.", focus: "kra / pra flap cluster", difficulty: 4 },
    { phrase: "Trentatr\u00e9 trentini entrarono a Trento tutti e trentatr\u00e9 trotterellando.", phonetic: "tren-ta-TRAY tren-TEE-nee en-TRA-ro-no a TREN-to", gloss: "33 people from Trento entered Trento all 33 trotting.", focus: "tr / tt sequences", difficulty: 5 },
    { phrase: "Apelle, figlio di Apollo, fece una palla di pelle di pollo.", phonetic: "a-PEL-le \u00b7 FEE-lyo dee a-POL-lo", gloss: "Apelles, son of Apollo, made a ball from chicken skin.", focus: "double l + single l", difficulty: 3 },
    { phrase: "Chi fu che fe' fare a te quella pelle di capretto?", phonetic: "kee foo \u00b7 keh feh FA-reh a teh \u00b7 KWEL-la PEL-leh dee ka-PRET-to", gloss: "Who was it who had that kidskin made for you?", focus: "keh / kwel palatal", difficulty: 4 },
    { phrase: "Tito, nipote di titio, fu teso da tizio.", phonetic: "TEE-to \u00b7 nee-PO-teh dee TEE-tsyo \u00b7 foo TEH-zo da TEE-tsyo", gloss: "Tito, nephew of Titius, was ensnared by Titius.", focus: "t / ts geminate", difficulty: 3 },
    { phrase: "Se l'arcivescovo di Costantinopoli si disarcivescovolicostantinopolizzasse, tutti si disarcivescovolicostantinopolizzerebbero.", phonetic: "se lar-chee-ves-KO-vo dee kos-tan-ti-NO-po-li", gloss: "If the Archbishop of Constantinople un-archbishoped himself, everyone would un-archbishop themselves.", focus: "rolling Italian polysyllable", difficulty: 5 },
    { phrase: "Una rana nera e rara sulla rupe rognosa rosicchiava una rosa.", phonetic: "OO-na RA-na NEH-ra e RA-ra \u00b7 SU-lla ROO-peh ro-NYO-za", gloss: "A rare black frog on the rough rocky cliff nibbled a rose.", focus: "rr / nr / rn sequences", difficulty: 4 },
    { phrase: "Tigre contro tigre, tigre con tigre.", phonetic: "TEE-greh KON-tro TEE-greh \u00b7 TEE-greh kon TEE-greh", gloss: "Tiger against tiger, tiger with tiger.", focus: "gr clusters", difficulty: 3 },
  ],

  ja: [
    { phrase: "\u751f\u9ea6\u3001\u751f\u7c73\u3001\u751f\u5375\u3002", phonetic: "na-ma-mu-gi \u00b7 na-ma-go-me \u00b7 na-ma-ta-ma-go", gloss: "Raw wheat, raw rice, raw eggs.", focus: "nasal n + geminate m", difficulty: 4 },
    { phrase: "\u6771\u4eac\u7279\u8a31\u8a31\u53ef\u5c40\u3002", phonetic: "toh-kyo-toh-kyo-kyo-ka-kyo-ku", gloss: "Tokyo Patent Licensing Bureau.", focus: "kyo stream", difficulty: 5 },
    { phrase: "\u300c\u30b7\u30e3\u30a4\u30f3\u30a4\u30eb\u30df\u30ca\u30b7\u30e7\u30f3\u300d\u3068\u8a00\u3063\u305f\u3002", phonetic: "sha-in-i-ru-mi-ne\u0301-shon", gloss: "(I) said 'employee illumination'.", focus: "sha / shon glide", difficulty: 4 },
    { phrase: "\u8d64\u5dfb\u7d19\u3001\u9752\u5dfb\u7d19\u3001\u9ec4\u5dfb\u7d19\u3002", phonetic: "a-ka-ma-ki-ga-mi \u00b7 a-o-ma-ki-ga-mi \u00b7 ki-ma-ki-ga-mi", gloss: "Red rolled paper, blue rolled paper, yellow rolled paper.", focus: "vowel color sequence", difficulty: 3 },
    { phrase: "\u5750\u3063\u3066\u3044\u308b\u8f8e\u306b\u7c4f\u3063\u305f\u8f8e\u304c\u8fbc\u307f\u3084\u3059\u3044\u3002", phonetic: "su-wa-t-te-i-ru-ku-ru-ma-ni-ma-i-t-ta-ku-ru-ma-ga-ko-mi-ya-su-i", gloss: "A car crashed into a parked car.", focus: "ku-ru-ma mora count", difficulty: 5 },
    { phrase: "\u30d0\u30b9\u30ac\u30b9\u7206\u767a\u3002", phonetic: "ba-su-ga-su-ba-ku-ha-tsu", gloss: "Bus gas explosion.", focus: "su / ba / tsu chains", difficulty: 5 },
    { phrase: "\u5c71\u5c71\u5c71\u306e\u4e2d\u306b\u3042\u308b\u5c71\u306e\u540d\u524d\u3002", phonetic: "ya-ma ya-ma ya-ma no na-ka ni a-ru ya-ma no na-ma-e", gloss: "The name of the mountain that is among mountains.", focus: "ya-ma repetition", difficulty: 3 },
    { phrase: "\u8fd1\u8fba\u3001\u9060\u8fba\u3001\u5c11\u3057\u9060\u3044\u5c71\u8fba\u306b\u3002", phonetic: "chi-ka-be · to-o-be · su-ko-shi-to-o-i-ya-ma-be-ni", gloss: "Near shore, far shore, a little farther mountain shore.", focus: "be / chi / too pitch", difficulty: 4 },
  ],

  zh: [
    { phrase: "\u56db\u662f\u56db\uff0c\u5341\u662f\u5341\uff0c\u5341\u56db\u662f\u5341\u56db\uff0c\u56db\u5341\u662f\u56db\u5341\u3002", phonetic: "s\u00ec sh\u00ec s\u00ec \u00b7 sh\u00ed sh\u00ec sh\u00ed \u00b7 sh\u00edsh\u00ec sh\u00ec sh\u00edsh\u00ec \u00b7 s\u00ecsh\u00ed sh\u00ec s\u00ecsh\u00ed", gloss: "Four is four, ten is ten, fourteen is fourteen, forty is forty.", focus: "s ↔ sh retroflex", difficulty: 5 },
    { phrase: "\u9ed1\u5316\u808a\u53d1\u9ed1\u53d1\u5316\u4e86\u706b\u3002", phonetic: "h\u0113i hu\u00e0 ji\u0101 f\u0101 h\u0113i f\u0101 hu\u00e0 le hu\u014f", gloss: "The black fertilizer made black hair catch fire.", focus: "h / hu tone control", difficulty: 5 },
    { phrase: "\u5403\u8461\u8404\u4e0d\u5410\u8461\u8404\u76ae\u3002", phonetic: "ch\u012b p\u00fa t\u00e0o b\u00f9 t\u01d4 p\u00fa t\u00e0o p\u00ed", gloss: "Eat grapes without spitting out the grape skin.", focus: "p / b aspirated pairs", difficulty: 4 },
    { phrase: "\u5403\u8461\u8404\u4e0d\u5410\u8461\u8404\u76ae\uff0c\u4e0d\u5403\u8461\u8404\u5012\u5410\u8461\u8404\u76ae\u3002", phonetic: "ch\u012b p\u00fa t\u00e0o b\u00f9 t\u01d4 p\u00fa t\u00e0o p\u00ed · b\u00f9 ch\u012b p\u00fa t\u00e0o d\u00e0o t\u01d4 p\u00fa t\u00e0o p\u00ed", gloss: "Eat grapes without spitting seeds; if you don't eat grapes you still spit seeds.", focus: "p/b contrast extended", difficulty: 5 },
    { phrase: "\u5357\u8fb9\u6765\u4e86\u4e00\u53ea\u7259\u3002", phonetic: "n\u00e1n bi\u0101n l\u00e1i le y\u012b zh\u012b y\u00e1", gloss: "From the south came a tooth.", focus: "nan/lai/zhi tone control", difficulty: 3 },
    { phrase: "\u5c71\u4e0a\u6709\u4e00\u6761\u86c7\uff0c\u5c71\u4e0b\u6709\u4e00\u4e2a\u5d50\u3002", phonetic: "sh\u0101n sh\u00e0ng y\u01d2u y\u012b ti\u00e1o sh\u00e9 · sh\u0101n xi\u00e0 y\u01d2u y\u012b g\u00e8 k\u0113ng", gloss: "On the mountain is a snake; below the mountain is a pit.", focus: "sh / sh / x alternation", difficulty: 4 },
  ],

  pt: [
    { phrase: "O rato roeu a roupa do rei de Roma.", phonetic: "oo HA-too \u00b7 ho-EH-oo a HOH-pa doo hay dji HO-ma", gloss: "The rat gnawed the King of Rome's clothes.", focus: "gutteral r (rr)", difficulty: 4 },
    { phrase: "Tr\u00eas pratos de trigo para tr\u00eas tigres tristes.", phonetic: "trays PRA-toosh \u00b7 dji TREE-goo \u00b7 PA-ra trays TEE-grish TREESH-tish", gloss: "Three plates of wheat for three sad tigers.", focus: "tr clusters", difficulty: 4 },
    { phrase: "O doce perguntou ao doce qual \u00e9 o doce mais doce.", phonetic: "oo DOH-seh per-gun-TOO ao DOH-seh \u00b7 kwal eh oo DOH-seh MAYS DOH-seh", gloss: "The sweet asked the sweet which sweet is the sweetest.", focus: "doce homophone chain", difficulty: 3 },
    { phrase: "Num ninho de mafagafos, h\u00e1 cinco mafagafinhos.", phonetic: "num NEE-nyo dji ma-fa-GA-foosh \u00b7 ah SIN-ko ma-fa-ga-FEE-nyoosh", gloss: "In a nest of mafagafos there are five little mafagafinhos.", focus: "ga / fi / nyo cluster", difficulty: 5 },
    { phrase: "O papa papou o papo do pato.", phonetic: "oo PA-pa pa-POO oo PA-poo doo PA-too", gloss: "The pope ate the duck's pouch.", focus: "pa / po minimal pairs", difficulty: 3 },
    { phrase: "Pedro Prates prega pratos pintados.", phonetic: "PEH-droo PRA-tesh PREH-ga PRA-toosh pin-TA-doos", gloss: "Pedro Prates nails painted plates.", focus: "pr / pin clusters", difficulty: 4 },
  ],

  nl: [
    { phrase: "De kat krabt de krullen van de trap.", phonetic: "duh KAHT krapt duh KRUL-luhn van duh trahp", gloss: "The cat scratches the curls off the stairs.", focus: "kr / k clusters", difficulty: 3 },
    { phrase: "Als vliegen achter vliegen vliegen, vliegen vliegen vliegen achterna.", phonetic: "als VLEE-gen AKH-ter VLEE-gen VLEE-gen · VLEE-gen VLEE-gen VLEE-gen AKH-ter-na", gloss: "When flies fly behind flies, flies fly after flies.", focus: "vl homograph string", difficulty: 4 },
    { phrase: "De meid van de weduwe heeft weder weinig geweid.", phonetic: "duh mayd van duh WEH-dew-uh HAYFT WAY-der WAY-nikh khuh-VAYD", gloss: "The widow's maid has again grazed little.", focus: "w / v / ei diphthong", difficulty: 4 },
    { phrase: "Op de grasvlakte graasde een grasgeit.", phonetic: "op duh KHRAS-vlak-tuh KHRAS-duh en KHRAS-khayt", gloss: "On the grassland a grass goat grazed.", focus: "gr / kh fricatives", difficulty: 4 },
    { phrase: "Wij willen wel witte witlofsla.", phonetic: "vay VIL-len vel VIT-tuh VIT-lof-sla", gloss: "We do want white chicory salad.", focus: "w / v split", difficulty: 3 },
    { phrase: "De bakker bakt brood in de broodoven.", phonetic: "duh BAK-ker BAKT broht in duh BROHT-oh-ven", gloss: "The baker bakes bread in the bread oven.", focus: "br / bk voiced stops", difficulty: 3 },
    { phrase: "Zeven zalmen zwemmen zwijgend langs de zeesloot.", phonetic: "ZAY-ven ZAL-men ZVEM-men ZVAY-khent LANGS duh ZAY-sloht", gloss: "Seven salmon swim silently along the sea ditch.", focus: "z / zv / zw clusters", difficulty: 4 },
  ],

  hi: [
    { phrase: "\u0915\u091a\u094d\u091a\u093e \u092a\u093e\u092a\u0921\u093c \u092a\u0915\u094d\u0915\u093e \u092a\u093e\u092a\u0921\u093c\u0964", phonetic: "KACH-cha PAA-par \u00b7 PAK-ka PAA-par", gloss: "Raw papad, cooked papad.", focus: "retroflex \u0921\u093c + geminates", difficulty: 4 },
    { phrase: "\u0906\u0917\u0930\u093e \u0915\u093e \u091c\u0941\u0917\u093e\u0921\u093c\u0942 \u091c\u0941\u0917\u093e\u0921\u093c\u0942 \u0906\u0917\u0930\u093e \u0917\u092f\u093e\u0964", phonetic: "aa-gra ka ju-gaa-roo ju-gaa-roo aa-gra ga-ya", gloss: "The juggler from Agra went back to Agra.", focus: "g / j / r chain", difficulty: 4 },
    { phrase: "\u0a2a\u0a15\u0a3e \u0a2a\u0a2a\u0a40\u0a24\u0a3e \u0a2a\u0a40\u0a32\u0a3e \u0a28\u0a39\u0a40\u0902\u0964", phonetic: "pa-ka pa-pee-ta pee-la na-hee", gloss: "A ripe papaya is not yellow.", focus: "p / pa retroflex sequence", difficulty: 3 },
    { phrase: "\u091a\u0902\u0926\u0928 \u091a\u0902\u0926\u0928 \u091a\u0902\u0926\u0928 \u091a\u0902\u0926\u0928\u0964", phonetic: "chan-dan chan-dan chan-dan chan-dan", gloss: "Sandalwood, sandalwood, sandalwood, sandalwood.", focus: "nasal anusvara chain", difficulty: 3 },
    { phrase: "\u0916\u091a\u093e\u0916\u091a \u091a\u0916\u093e\u091a\u0916 \u091a\u0916\u093e\u091a\u0916\u0964", phonetic: "kha-cha-kha cha-kha-cha cha-kha-cha-kha", gloss: "A meaningless ka-cha drum pattern.", focus: "kh / ch aspirated flip", difficulty: 5 },
  ],

  ar: [
    { phrase: "\u062e\u064a\u0637 \u062d\u0631\u064a\u0631 \u0639\u0644\u0649 \u062d\u0627\u0626\u0637 \u062e\u0644\u064a\u0644.", phonetic: "khayt ha-REER \u00b7 ala HAA-it kha-LEEL", gloss: "A silk thread on Khalil's wall.", focus: "kh ↔ h pharyngeal", difficulty: 4 },
    { phrase: "\u0627\u0644\u062d\u0645\u0627\u0645 \u0641\u064a \u062d\u0645\u0627\u0645 \u062d\u062f\u064a\u062f\u064a.", phonetic: "al-ha-MAAM fi ha-MAAM ha-di-DEE", gloss: "The dove is in an iron bathroom.", focus: "h / kh emphatic pairs", difficulty: 4 },
    { phrase: "\u0635\u0641 \u0635\u0641\u0627 \u0635\u062f\u0641\u064a\u0629 \u0641\u064a \u0635\u062d\u0631\u0627\u0621.", phonetic: "saf-sa-FA sada-FI-ya fi sa-HRA", gloss: "A row of shells in the desert.", focus: "emphatic s vs regular s", difficulty: 4 },
    { phrase: "\u0633\u0627\u0644 \u0633\u0627\u0626\u0644 \u0633\u0627\u0626\u0644 \u0633\u0627\u0626\u0644\u064a\u0646.", phonetic: "sa-al-sa-el-sa-el-sa-ELEE", gloss: "A questioner asked questioners.", focus: "sa / el / ee chain", difficulty: 3 },
    { phrase: "\u0642\u0644 \u0644\u0640\u0644\u0627 \u0641\u0644\u0627 \u0642\u0644 \u0644\u0640\u0644\u0627.", phonetic: "qul la-la fa-la · qul la-la", gloss: "Say no, say no otherwise.", focus: "q / l / f sequence", difficulty: 3 },
  ],

};

// Fallback so unsupported languages still get a useful challenge.
const FALLBACK_POOL = TWISTER_CORPUS.en;

// ── Storage for daily attempts ───────────────────────────────────────────────

const KEY_PREFIX = "lang:drill:";

function dayKey(d: Date = new Date()): string {
  // Local midnight; YYYY-M-D (no padding; stable for hashing too).
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Small deterministic string hash (djb2).
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h >>> 0;
}

/**
 * Today's tongue twister for a given language.
 * Identical on every device as long as the date and language match.
 */
export function getTodayTwister(languageCode: string, at: Date = new Date()): TongueTwister {
  const pool = TWISTER_CORPUS[languageCode]?.length ? TWISTER_CORPUS[languageCode] : FALLBACK_POOL;
  const idx = hash(`${dayKey(at)}|${languageCode}`) % pool.length;
  return pool[idx];
}

// ── Attempt tracking ─────────────────────────────────────────────────────────

export interface DrillAttempt {
  date: string;           // dayKey
  languageCode: string;
  phrase: string;
  score: number;          // 0-100
  transcript?: string;
  ts: number;
}

function storageKey(languageCode: string, day = dayKey()) {
  return `${KEY_PREFIX}${day}:${languageCode}`;
}

export async function getTodayAttempt(languageCode: string): Promise<DrillAttempt | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(languageCode));
    return raw ? (JSON.parse(raw) as DrillAttempt) : null;
  } catch {
    return null;
  }
}

export async function recordDrillAttempt(
  attempt: Omit<DrillAttempt, "date" | "ts">
): Promise<DrillAttempt> {
  const entry: DrillAttempt = {
    ...attempt,
    date: dayKey(),
    ts: Date.now(),
  };
  await AsyncStorage.setItem(storageKey(attempt.languageCode), JSON.stringify(entry));
  // Also store in an "all drills" log for the progress tab.
  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}log`);
    const log: DrillAttempt[] = raw ? JSON.parse(raw) : [];
    log.unshift(entry);
    await AsyncStorage.setItem(`${KEY_PREFIX}log`, JSON.stringify(log.slice(0, 365)));
  } catch {
    /* ignore \u2014 log is best-effort */
  }
  return entry;
}

export async function getDrillHistory(limit = 30): Promise<DrillAttempt[]> {
  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}log`);
    const log: DrillAttempt[] = raw ? JSON.parse(raw) : [];
    return log.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * How many consecutive days the user has attempted a drill, ending today.
 */
export async function getDrillStreak(): Promise<number> {
  const log = await getDrillHistory(365);
  if (log.length === 0) return 0;

  const days = new Set(log.map((a) => a.date));
  let streak = 0;
  const cursor = new Date();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!days.has(dayKey(cursor))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
