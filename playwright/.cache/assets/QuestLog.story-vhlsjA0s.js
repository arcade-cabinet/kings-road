import { j as jsxRuntimeExports } from './jsx-runtime-CLliEFxU.js';
import { r as reactExports } from './index-BAe1oPKr.js';
import { b as create, c as cn, u as useGameStore } from './utils-Ds8l1iD7.js';
import './three.module-DXn-rEMf.js';

const id$o = "main-chapter-00";
const tier$o = "macro";
const title$o = "The Call";
const estimatedMinutes$o = 25;
const anchorAffinity$o = "home";
const trigger$o = {"type":"anchor","anchorId":"home"};
const branches$e = {"A":{"label":"Accept the quest eagerly, inspired by the legend","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"pilgrim","dialogue":"Please, traveller, come closer. I was bound for Grailsend, walking the old King's Road as my father did before me. But my strength has failed. The Grail still waits at the road's end, and someone must carry word to the scholar in your village. Promise me you will seek him out.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"investigate","description":"Search the dying pilgrim's belongings and find a weathered map fragment bearing ancient waypoint markings."},{"id":"a-03","type":"dialogue","npcArchetype":"scholar","dialogue":"This map fragment is genuine. I have spent decades studying the old texts, and I recognise these waypoint glyphs. The Holy Grail lies beyond Grailsend at the road's end. Many have sought it and failed, but the pilgrim's map changes everything. You must follow the King's Road north.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-04","type":"dialogue","npcArchetype":"priest","dialogue":"Old Tomas speaks the truth. I have read the parish records, and they tell of knights who walked this very road in search of the Grail. Go with my blessing, child. The saints will watch over you, and I shall pray for your safe return to Ashford.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-05","type":"travel","destination":"anchor-01","description":"Set out from Ashford along the King's Road, heading north toward Millbrook with the pilgrim's map fragment in hand."}],"reward":{"type":"modifier","modifierId":"eager-pilgrim"}},"B":{"label":"Reluctantly agree after the village comes under threat","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"pilgrim","dialogue":"Please, traveller, come closer. I was bound for Grailsend, walking the old King's Road as my father did before me. But my strength has failed. The Grail still waits at the road's end, and someone must carry word to the scholar in your village. Promise me you will seek him out.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"investigate","description":"Search the dying pilgrim's belongings and find a weathered map fragment bearing ancient waypoint markings."},{"id":"b-03","type":"dialogue","npcArchetype":"scholar","dialogue":"I feared this day would come. Dark riders were seen on the moors beyond Millbrook, and the harvest has been failing for three seasons now. These are the signs the old texts warned of. The land itself is dying because the Grail covenant has been broken. Unless someone restores it, Ashford will fall.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-04","type":"encounter","encounterId":"ashford-wolves-at-the-gate","description":"Wolves driven mad by the failing land attack the village outskirts. Defend the farmsteads with the other villagers."},{"id":"b-05","type":"dialogue","npcArchetype":"priest","dialogue":"You saw what happened. The wolves have never come this close to the village before. Old Tomas is right, the land grows sick and only the Grail can heal it. I know you did not ask for this burden, but Ashford needs you. Will you walk the King's Road for our sake?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-06","type":"travel","destination":"anchor-01","description":"Leave Ashford reluctantly, driven by duty to save the village, heading north along the King's Road toward Millbrook."}],"reward":{"type":"modifier","modifierId":"reluctant-hero"}}};
const reward$o = {"type":"item","itemId":"map-fragment-01"};
const chapter00 = {
  id: id$o,
  tier: tier$o,
  title: title$o,
  estimatedMinutes: estimatedMinutes$o,
  anchorAffinity: anchorAffinity$o,
  trigger: trigger$o,
  branches: branches$e,
  reward: reward$o,
};

const id$n = "main-chapter-01";
const tier$n = "macro";
const title$n = "The First Sign";
const estimatedMinutes$n = 35;
const anchorAffinity$n = "anchor-01";
const trigger$n = {"type":"anchor","anchorId":"anchor-01"};
const prerequisites$6 = ["main-chapter-00"];
const branches$d = {"A":{"label":"Gain Captain Hale's trust by helping clear the bandits","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"knight","dialogue":"Hold there, stranger. Millbrook has had enough trouble without outsiders adding to it. Strange lights have been seen at the old mill every night this week, and now bandits are raiding the eastern farms. Prove you mean no harm and help me deal with these raiders, then we can talk about the mill.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"dialogue","npcArchetype":"innkeeper","dialogue":"Captain Hale means well, but he is stretched thin. The bandits struck Wynn's farm two nights past and took half his grain store. They camp somewhere along the river east of town. If you help the captain, he will open every door in Millbrook for you.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-03","type":"encounter","encounterId":"millbrook-river-bandits","description":"Track the bandits to their riverside camp and defeat them to recover the stolen grain."},{"id":"a-04","type":"dialogue","npcArchetype":"knight","dialogue":"You have done Millbrook a great service. I misjudged you, and I am not too proud to say so. Now about those lights at the old mill. My men are afraid to go near the place after dark. If you have the courage, go and investigate. I will lend you a lantern and the key to the mill gate.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-05","type":"investigate","description":"Enter the old mill with Captain Hale's key and search for the source of the strange lights."},{"id":"a-06","type":"puzzle","description":"Discover that the lights emanate from an ancient map fragment hidden beneath the millstone, its Grail-script glowing faintly in the dark."},{"id":"a-07","type":"dialogue","npcArchetype":"priest","dialogue":"This map fragment bears the same Grail-script as the texts in our chapel records. The markings point north toward the Thornfield Ruins, a place long shunned by travellers. Whatever the builders of the King's Road hid there, this fragment is the key to finding it.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"hales-ally"}},"B":{"label":"Sneak into the old mill at night without Hale's permission","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"knight","dialogue":"Hold there, stranger. Millbrook has had enough trouble without outsiders adding to it. Strange lights have been seen at the old mill every night this week, and I have sealed the place until my men can investigate. Move along and do not cause any problems.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"dialogue","npcArchetype":"merchant","dialogue":"Hale has locked the mill and posted a guard, but there is a way in through the old sluice channel on the river side. The grate has been rusted through for years. If you go at night when the guard changes shift, you could slip in unseen. Just do not tell the captain I told you.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-03","type":"encounter","encounterId":"millbrook-mill-stealth","description":"Sneak past the guard patrol and enter the old mill through the rusted sluice grate under cover of darkness."},{"id":"b-04","type":"investigate","description":"Navigate the dark interior of the mill, following the faint glow emanating from beneath the ancient millstone."},{"id":"b-05","type":"puzzle","description":"Pry the millstone loose and retrieve the glowing map fragment hidden beneath, its Grail-script casting pale light across the walls."},{"id":"b-06","type":"dialogue","npcArchetype":"priest","dialogue":"You found this in the mill? I have read of such things in the chapel records. This is genuine Grail-script, and it points toward the Thornfield Ruins north of here. Brother Thomas must not speak of this to Captain Hale, or he will think you a thief. Go quickly before dawn.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"shadow-seeker"}}};
const reward$n = {"type":"item","itemId":"map-fragment-01b"};
const chapter01 = {
  id: id$n,
  tier: tier$n,
  title: title$n,
  estimatedMinutes: estimatedMinutes$n,
  anchorAffinity: anchorAffinity$n,
  trigger: trigger$n,
  prerequisites: prerequisites$6,
  branches: branches$d,
  reward: reward$n,
};

const id$m = "main-chapter-02";
const tier$m = "macro";
const title$m = "The Ruins Speak";
const estimatedMinutes$m = 45;
const anchorAffinity$m = "anchor-02";
const trigger$m = {"type":"anchor","anchorId":"anchor-02"};
const prerequisites$5 = ["main-chapter-01"];
const branches$c = {"A":{"label":"Break through by force","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"knight","dialogue":"These ruins are sealed by ancient stonework, but no wall stands forever. I can see the mortar has weakened along the eastern face. With enough force we could bring the passage open, though whatever sleeps within may not welcome the disturbance.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"encounter","encounterId":"ruins-guardian-stone-golem","description":"Battle the awakened stone golem guarding the collapsed eastern passage."},{"id":"a-03","type":"investigate","description":"Search the shattered antechamber for the mechanism that opens the inner sanctum."},{"id":"a-04","type":"encounter","encounterId":"ruins-guardian-spectral-warden","description":"Defeat the spectral warden roused by the forced entry into the sanctum."},{"id":"a-05","type":"puzzle","description":"Align the broken seal fragments to unlock the reliquary containing the second map fragment."},{"id":"a-06","type":"dialogue","npcArchetype":"scholar","dialogue":"The map fragment speaks of Ravensgate, a walled town to the north. Its lord once served as custodian of the Grail road, but the inscriptions suggest he has turned from that sacred duty. We must go there next and learn what he knows, willing or not.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"ruins-breaker"}},"B":{"label":"Solve the riddles with Brother Thomas's knowledge","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"priest","dialogue":"I have studied texts that speak of Thornfield's builders. They were scholars who valued wisdom above brute strength. The entrance responds to an old liturgical cipher, one I learned from a manuscript in our chapel library. Let me try the inscription here.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"puzzle","description":"Decipher the liturgical inscription on the ruins entrance using Brother Thomas's knowledge of the old texts."},{"id":"b-03","type":"investigate","description":"Explore the peacefully opened corridors, reading wall carvings that reveal the history of the Grail road's custodians."},{"id":"b-04","type":"puzzle","description":"Solve the three-part riddle of the inner sanctum: the riddle of the pilgrim, the riddle of the road, and the riddle of the cup."},{"id":"b-05","type":"encounter","encounterId":"ruins-guardian-trial-of-worth","description":"Face the trial of worth — a guardian spirit tests your resolve through a ritual combat that rewards wisdom over aggression."},{"id":"b-06","type":"dialogue","npcArchetype":"priest","dialogue":"The second map fragment is ours, and with it comes a troubling revelation. These carvings name Lord Ashwick of Ravensgate as the last appointed custodian of this very shrine. Yet the wards were sealed against him. Something dark has taken root in that town, and we must go there to learn the truth.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"ruins-scholar"}}};
const reward$m = {"type":"item","itemId":"map-fragment-02"};
const chapter02 = {
  id: id$m,
  tier: tier$m,
  title: title$m,
  estimatedMinutes: estimatedMinutes$m,
  anchorAffinity: anchorAffinity$m,
  trigger: trigger$m,
  prerequisites: prerequisites$5,
  branches: branches$c,
  reward: reward$m,
};

const id$l = "main-chapter-03";
const tier$l = "macro";
const title$l = "The Iron Gate";
const estimatedMinutes$l = 40;
const anchorAffinity$l = "anchor-03";
const trigger$l = {"type":"anchor","anchorId":"anchor-03"};
const prerequisites$4 = ["main-chapter-02"];
const branches$b = {"A":{"label":"Work with Elara to infiltrate Ravensgate through diplomacy and deception","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"healer","dialogue":"The gate guards answer only to Lord Ashwick, and he turns away all strangers. But there is a merchant caravan expected at dusk, and I have arranged passage for you among their number. Once inside, seek the prison tower on the northern wall. Silas is held in the upper cell. Take this healer's token to explain your presence if questioned.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"encounter","encounterId":"ravensgate-caravan-infiltration","description":"Blend in with the merchant caravan and pass through the gate without raising suspicion from Ashwick's guards."},{"id":"a-03","type":"investigate","description":"Navigate the narrow streets of Ravensgate after dark, following Elara's directions to the prison tower on the northern wall."},{"id":"a-04","type":"dialogue","npcArchetype":"scholar","dialogue":"You came from the healer? Then listen well, for we have little time. The third map fragment is hidden beneath the hearthstone in the manor library. Ashwick does not know its true significance. He imprisoned me for speaking against his rule, not for the fragment. Take it and flee before the dawn watch. The eastern postern gate is rarely guarded.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-05","type":"encounter","encounterId":"ravensgate-library-stealth","description":"Steal into Ashwick's manor library under cover of night and retrieve the map fragment from beneath the hearthstone without alerting the household guard."},{"id":"a-06","type":"dialogue","npcArchetype":"healer","dialogue":"You have the fragment? Good. The eastern postern is unlatched as I promised. Go now, while the mist still clings to the moors. Silas will remain my burden to bear, but knowing the Grail road continues gives us both hope. The next sign points north to a monastery the pilgrims call the Pilgrim's Rest.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"shadow-diplomat"}},"B":{"label":"Confront Lord Ashwick directly and take the fragment by force","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"knight","dialogue":"Ravensgate is closed to outsiders by order of Lord Ashwick. Turn back the way you came, pilgrim, or face the consequences. These walls have stood for three hundred years, and no wanderer from the road will breach them while I draw breath.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"encounter","encounterId":"ravensgate-gate-assault","description":"Storm the gatehouse and fight through Ashwick's guards to force entry into the walled town."},{"id":"b-03","type":"dialogue","npcArchetype":"noble","dialogue":"You dare storm my gates and march through my town like some conquering hero? I am the lord of Ravensgate, and you are nothing but a trespasser. Guards, seize this fool and throw them in the tower with the other wretch. Let the stones teach them respect.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-04","type":"encounter","encounterId":"ravensgate-manor-battle","description":"Battle Lord Ashwick's personal guard in the manor courtyard and defeat his captain to reach the prison tower."},{"id":"b-05","type":"investigate","description":"Break open Silas's cell in the prison tower and search the manor library for the map fragment hidden beneath the hearthstone."},{"id":"b-06","type":"dialogue","npcArchetype":"scholar","dialogue":"So Ashwick has fallen at last. I knew his tyranny would draw a reckoning. The third map fragment lies beneath the hearthstone in the manor library. I hid it there before my arrest. Take it quickly. With Ashwick defeated, the townsfolk will help us reach the eastern road. The next sign points north to the Pilgrim's Rest.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"gate-breaker"}}};
const reward$l = {"type":"item","itemId":"map-fragment-03"};
const chapter03 = {
  id: id$l,
  tier: tier$l,
  title: title$l,
  estimatedMinutes: estimatedMinutes$l,
  anchorAffinity: anchorAffinity$l,
  trigger: trigger$l,
  prerequisites: prerequisites$4,
  branches: branches$b,
  reward: reward$l,
};

const id$k = "main-chapter-04";
const tier$k = "macro";
const title$k = "The Pilgrim's Wisdom";
const estimatedMinutes$k = 30;
const anchorAffinity$k = "anchor-04";
const trigger$k = {"type":"anchor","anchorId":"anchor-04"};
const prerequisites$3 = ["main-chapter-03"];
const branches$a = {"A":{"label":"Accept the spiritual path and prove your worth through faith and understanding","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"healer","dialogue":"You look as though you have walked through fire and shadow both. Come, rest a while. The Abbot has been expecting a traveller bearing map fragments, though he will not say how he knew. Let me tend your wounds first. Sister Maeve's poultice has mended many a pilgrim before the real journey begins.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"investigate","description":"Search the monastery library with Brother Anselm, laying out the three map fragments on his reading table and piecing together the full route to Grailsend."},{"id":"a-03","type":"dialogue","npcArchetype":"scholar","dialogue":"Remarkable. When the three fragments are placed together, they form not merely a map but a cipher. The route to Grailsend is clear enough, yet these marginal inscriptions speak of trials, not treasure. The knight who bore the Grail wrote warnings, not directions. You should hear what the Abbot has to say about this.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-04","type":"dialogue","npcArchetype":"priest","dialogue":"I have waited many years for someone to bring all three fragments to this table. Now hear the truth that the old order guarded. The Grail is no golden cup, child. It is a test of character, a covenant between the land and those who walk it with honest purpose. The temple at Grailsend will judge you by the choices you have made along the Road. Go now with faith as your compass, and let your deeds speak for you.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-05","type":"puzzle","description":"Meditate in the monastery chapel and solve the Abbot's three spiritual reflections: what you sacrificed, what you showed mercy to, and what truth you upheld on your journey along the Road."},{"id":"a-06","type":"dialogue","npcArchetype":"priest","dialogue":"You have answered well, and the chapel light shines brighter for it. The road to Grailsend leads through the highlands beyond our walls. Take the Abbot's blessing and this pilgrim's seal as proof that you have understood the Grail's true nature. The Guardian at the temple will know you by your spirit, not your sword.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"pilgrim-blessed"}},"B":{"label":"Demand the Grail's location by force, threatening the monastery","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"scholar","dialogue":"You carry the fragments? Let me examine them at once. The Abbot has long guarded secrets about the Grail's resting place, and with these three pieces assembled I can read the full cipher. But I must warn you, the Abbot will not part with his knowledge willingly. He believes the Grail must be earned through devotion, not claimed by force.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"investigate","description":"Piece together the three map fragments in the library, reading the cipher that reveals Grailsend's exact location in the highlands beyond the monastery."},{"id":"b-03","type":"dialogue","npcArchetype":"priest","dialogue":"You would threaten this place of peace? These walls have sheltered pilgrims for three centuries. The Grail is no golden cup to be seized and hoarded. It is a test of character, and you are failing it now. But I see the iron in your eyes and I know words alone will not turn you. Very well, the road to Grailsend lies through the highlands, but the temple's Guardian will not be so easily cowed.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-04","type":"encounter","encounterId":"pilgrims-rest-monastery-confrontation","description":"Overcome the monastery's lay brothers who block your path when you threaten the Abbot and ransack the library for the Grail's secrets."},{"id":"b-05","type":"investigate","description":"Ransack the Abbot's private study, finding ancient manuscripts that confirm the route through the highlands and the nature of the temple trials at Grailsend."},{"id":"b-06","type":"dialogue","npcArchetype":"healer","dialogue":"You have broken the peace of this abbey and scattered brothers who wished you no harm. The Abbot spoke true, the Grail tests the seeker. Take your maps and your pride and go north through the highlands to Grailsend. But know that the Guardian at the temple will see what you have done here, and the stones remember every act of cruelty.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"abbey-breaker"}}};
const reward$k = {"type":"item","itemId":"assembled-map"};
const chapter04 = {
  id: id$k,
  tier: tier$k,
  title: title$k,
  estimatedMinutes: estimatedMinutes$k,
  anchorAffinity: anchorAffinity$k,
  trigger: trigger$k,
  prerequisites: prerequisites$3,
  branches: branches$a,
  reward: reward$k,
};

const id$j = "main-chapter-05";
const tier$j = "macro";
const title$j = "The Grail";
const estimatedMinutes$j = 40;
const anchorAffinity$j = "anchor-05";
const trigger$j = {"type":"anchor","anchorId":"anchor-05"};
const prerequisites$2 = ["main-chapter-04"];
const branches$9 = {"A":{"label":"Pass the Guardian's trials of wisdom, mercy, and sacrifice","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"knight","dialogue":"You stand before the threshold of Grailsend, the last temple on the King's Road. I am its Guardian, bound here since before your grandfather's grandfather drew breath. Three trials await you within, and none may be overcome by the sword alone. Tell me, pilgrim, are you prepared to be judged?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"puzzle","description":"The Trial of Wisdom: answer the Guardian's three riddles drawn from the history of the King's Road. Each riddle references events from Ashford, Thornfield, and Ravensgate that you witnessed on your journey."},{"id":"a-03","type":"encounter","encounterId":"grailsend-trial-of-mercy","description":"The Trial of Mercy: a wounded enemy begs for help. Choose to heal them rather than strike, proving compassion over vengeance."},{"id":"a-04","type":"puzzle","description":"The Trial of Sacrifice: the temple demands you surrender your most valued possession — the map fragments that guided you here — to unseal the inner sanctum."},{"id":"a-05","type":"dialogue","npcArchetype":"knight","dialogue":"You have passed all three trials. Few have walked this far, and fewer still have proven worthy. The sanctum is open to you now. Seek the Oracle within, for she holds the final truth of the Grail. Go with my blessing, and know that the road remembers your choices.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-06","type":"dialogue","npcArchetype":"scholar","dialogue":"You came seeking a golden cup, did you not? The Grail is no vessel of gold. It is the ancient covenant between the land and those who tend it. Your journey along the King's Road has already restored it. Every act of wisdom, mercy, and sacrifice renewed the bond. The land will heal now, pilgrim. Ashford will bloom again.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"grail-worthy"}},"B":{"label":"Fight through the temple guardians by force","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"knight","dialogue":"You stand before the threshold of Grailsend. I am its Guardian, and I will not step aside for bluster or steel. If you refuse the trials, you must prove your worth the old way. Raise your weapon, pilgrim, and let the stones judge whether your cause is just.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"encounter","encounterId":"grailsend-guardian-battle","description":"Battle the ancient Guardian, a towering knight wreathed in spectral light who has guarded the temple for centuries."},{"id":"b-03","type":"encounter","encounterId":"grailsend-temple-sentinels","description":"Fight through the temple sentinels — stone warriors that animate from the corridor walls as you force your way deeper into the sanctum."},{"id":"b-04","type":"investigate","description":"Navigate the shattered inner corridors, using brute strength to clear collapsed archways and force open sealed doors that the trials would have opened peacefully."},{"id":"b-05","type":"encounter","encounterId":"grailsend-final-ward","description":"Defeat the final ward — a spectral echo of every Guardian who served before, rising as one last defence of the Grail's secret."},{"id":"b-06","type":"dialogue","npcArchetype":"scholar","dialogue":"So you have come by force. The Guardian lies broken and the wards are shattered. Very well, hear the truth you have fought so hard to reach. The Grail is no golden cup. It is the covenant between land and people, and you have damaged it further by your violence here. The land may yet heal, but the road ahead will be harder for what you have done.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"grail-breaker"}}};
const reward$j = {"type":"item","itemId":"grail-covenant"};
const chapter05 = {
  id: id$j,
  tier: tier$j,
  title: title$j,
  estimatedMinutes: estimatedMinutes$j,
  anchorAffinity: anchorAffinity$j,
  trigger: trigger$j,
  prerequisites: prerequisites$2,
  branches: branches$9,
  reward: reward$j,
};

const id$i = "side-aldrics-missing-hammer";
const tier$i = "micro";
const title$i = "Aldric's Missing Hammer";
const estimatedMinutes$i = 5;
const anchorAffinity$i = "home";
const trigger$i = {"type":"anchor","anchorId":"home"};
const steps$9 = [{"id":"s-01","type":"dialogue","npcArchetype":"blacksmith","dialogue":"I cannot forge a single nail without my good hammer and the blasted thing has gone missing. I had it leaning by the anvil yesterday evening but when I came in at dawn it was nowhere to be found. Old Tomas says he saw a fox dragging something shiny toward the forest edge. Would you search the tree line for me? I would go myself but orders are piling up.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"s-02","type":"fetch","itemId":"aldrics_hammer","description":"Search the forest edge near Ashford for Aldric's hammer, likely dragged there by a fox."},{"id":"s-03","type":"dialogue","npcArchetype":"blacksmith","dialogue":"Ha, there she is! Good as new, not a scratch on the head. You have saved me a week of work and the village a week without horseshoes. Take this blade I finished this morning. It is honest steel and will serve you well on the road ahead. Come back any time you need something mended.","dialogueMinWords":15,"dialogueMaxWords":80}];
const reward$i = {"type":"item","itemId":"iron_sword"};
const aldricsMissingHammer = {
  id: id$i,
  tier: tier$i,
  title: title$i,
  estimatedMinutes: estimatedMinutes$i,
  anchorAffinity: anchorAffinity$i,
  trigger: trigger$i,
  steps: steps$9,
  reward: reward$i,
};

const id$h = "side-bandit-ambush";
const tier$h = "micro";
const title$h = "Bandit Ambush";
const estimatedMinutes$h = 8;
const anchorAffinity$h = "anchor-01";
const trigger$h = {"type":"roadside","distanceRange":[7000,10000]};
const steps$8 = [{"id":"s-01","type":"encounter","encounterId":"roadside-bandit-ambush","description":"A band of highwaymen springs from the treeline, blocking the road with drawn blades and demanding your coin."},{"id":"s-02","type":"investigate","description":"Search the bandits' makeshift camp hidden among the forest undergrowth for stolen goods and a crude map of ambush points along the King's Road."},{"id":"s-03","type":"dialogue","npcArchetype":"wanderer","dialogue":"You cleared those wretches out, did you? I saw their fire smoke from the ridge and feared the worst. They have been preying on travellers for weeks now. The map you found should be taken to the next town guard. Here, take what little coin I can spare for your trouble.","dialogueMinWords":15,"dialogueMaxWords":80}];
const reward$h = {"type":"currency","amount":25};
const banditAmbush = {
  id: id$h,
  tier: tier$h,
  title: title$h,
  estimatedMinutes: estimatedMinutes$h,
  anchorAffinity: anchorAffinity$h,
  trigger: trigger$h,
  steps: steps$8,
  reward: reward$h,
};

const id$g = "side-besss-secret-recipe";
const tier$g = "micro";
const title$g = "Bess's Secret Recipe";
const estimatedMinutes$g = 5;
const anchorAffinity$g = "home";
const trigger$g = {"type":"anchor","anchorId":"home"};
const steps$7 = [{"id":"s-01","type":"dialogue","npcArchetype":"innkeeper","dialogue":"Oh, you look like someone who knows their way around the countryside. My grandmother's stew recipe calls for fresh moonpetal herbs but the patch I used to pick from has gone dry. The wise woman who camps beyond the eastern meadow told me they still grow along the brook past the old stone wall. Could you gather a handful for me before the evening crowd arrives?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"s-02","type":"fetch","itemId":"rare_herb","description":"Gather fresh moonpetal herbs from the brook beyond the old stone wall east of Ashford."},{"id":"s-03","type":"dialogue","npcArchetype":"innkeeper","dialogue":"Perfect, these are just what I needed. The leaves are still dewy and fragrant. Tonight the whole tavern will smell of grandmother's stew and every soul in Ashford will be lining up for a bowl. Here, take this recipe scroll as thanks. It has a few other remedies written in the margins that might prove useful on the road.","dialogueMinWords":15,"dialogueMaxWords":80}];
const reward$g = {"type":"item","itemId":"secret_recipe"};
const besssSecretRecipe = {
  id: id$g,
  tier: tier$g,
  title: title$g,
  estimatedMinutes: estimatedMinutes$g,
  anchorAffinity: anchorAffinity$g,
  trigger: trigger$g,
  steps: steps$7,
  reward: reward$g,
};

const id$f = "side-father-cedrics-lost-hymnal";
const tier$f = "micro";
const title$f = "Father Cedric's Lost Hymnal";
const estimatedMinutes$f = 8;
const anchorAffinity$f = "home";
const trigger$f = {"type":"anchor","anchorId":"home"};
const steps$6 = [{"id":"s-01","type":"dialogue","npcArchetype":"priest","dialogue":"Bless you, child. I wonder if you might help an old man with a small mystery. My illuminated hymnal has vanished from the lectern. I have searched the nave and the vestry twice over but it is nowhere to be found. The chapel attic has not been swept in years and I fear my knees will not survive the ladder. Would you have a look up there for me?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"s-02","type":"investigate","description":"Climb into the dusty chapel attic and search among old crates, moth-eaten vestments, and cobwebs for Father Cedric's missing hymnal."},{"id":"s-03","type":"fetch","itemId":"lost_hymnal","description":"Retrieve the illuminated hymnal from behind the stack of old sermon scrolls in the attic."},{"id":"s-04","type":"dialogue","npcArchetype":"priest","dialogue":"Oh, wonderful, you found it tucked behind the scrolls. A crow must have carried it up through the belfry window. The pages are a little dusty but the gold leaf still shines. The saints smile upon you, traveller. Take this blessing for the road. It will keep the dark at bay when the night grows long.","dialogueMinWords":15,"dialogueMaxWords":80}];
const reward$f = {"type":"item","itemId":"pilgrim_medallion"};
const fatherCedricsLostHymnal = {
  id: id$f,
  tier: tier$f,
  title: title$f,
  estimatedMinutes: estimatedMinutes$f,
  anchorAffinity: anchorAffinity$f,
  trigger: trigger$f,
  steps: steps$6,
  reward: reward$f,
};

const id$e = "side-lord-ashwicks-secret";
const tier$e = "meso";
const title$e = "Lord Ashwick's Secret";
const estimatedMinutes$e = 28;
const anchorAffinity$e = "anchor-03";
const trigger$e = {"type":"anchor","anchorId":"anchor-03"};
const branches$8 = {"A":{"label":"Bribe the tower guards","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"healer","dialogue":"I tend to the sick and wounded of Ravensgate, but there are prisoners in that tower whom even I am forbidden to visit. Whatever Lord Ashwick hides up there, it frightens his own guards. I have seen them cross themselves when they change the watch. If you could find a way inside, you might discover the truth that keeps this town in chains.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"investigate","description":"Observe the tower guard rotation from the tavern window and identify which guards seem unhappy with their post. Look for signs of discontent or gambling debts."},{"id":"a-03","type":"encounter","encounterId":"merchant_negotiation","description":"Approach the disgruntled tower guard during his break at the tavern and negotiate a price for looking the other way during the next watch change."},{"id":"a-04","type":"fetch","itemId":"ashwick_ledger","description":"Slip into the tower while the bribed guard holds the door. Climb to the upper chamber and find Lord Ashwick's secret ledger hidden behind a loose stone in the wall."},{"id":"a-05","type":"dialogue","npcArchetype":"healer","dialogue":"A ledger of payments to bandits on the King's Road — Ashwick has been funding the very outlaws who terrorise the pilgrims, then charging travellers for safe passage through his lands. This is the proof the people need. I will see that copies reach the right hands. You have struck a blow against tyranny today, stranger. Take this salve — you may need it before your journey ends.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"item","itemId":"healing_salve"}},"B":{"label":"Find the secret passage into the tower","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"scholar","dialogue":"You wish to know what Ashwick hides in the tower? I can tell you, for I was imprisoned there until they moved me to this pit. There is a passage — older than the town itself — that runs beneath the manor walls. The old lord showed it to me when I served as his chronicler. Its entrance lies behind the standing stone in the eastern cemetery, marked with a mason's compass.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"investigate","description":"Search the eastern cemetery outside Ravensgate's walls for the standing stone marked with a mason's compass. Clear the ivy to reveal the passage entrance."},{"id":"b-03","type":"puzzle","description":"Navigate the ancient passage beneath the manor walls. Solve the lock mechanism — three rotating stone discs that must align to show the old lord's sigil — to open the sealed door."},{"id":"b-04","type":"fetch","itemId":"ashwick_ledger","description":"Emerge inside the tower's upper chamber through a trapdoor concealed beneath a moth-eaten rug. Find the secret ledger and a cache of letters proving Ashwick's treachery."},{"id":"b-05","type":"dialogue","npcArchetype":"scholar","dialogue":"You found it. The ledger and the letters both — more than I dared hope. When I was his chronicler, I suspected Ashwick was funding the road bandits, but I never had proof until now. Take this to Elara, and she will see it spread through the town. And take my thanks as well. Forty-seven days in this cell, and you are the first glimmer of justice I have seen.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"item","itemId":"old_lords_signet"}}};
const reward$e = {"type":"modifier","modifierId":"ashwick-exposed"};
const lordAshwicksSecret = {
  id: id$e,
  tier: tier$e,
  title: title$e,
  estimatedMinutes: estimatedMinutes$e,
  anchorAffinity: anchorAffinity$e,
  trigger: trigger$e,
  branches: branches$8,
  reward: reward$e,
};

const id$d = "side-lost-pilgrim";
const tier$d = "micro";
const title$d = "The Lost Pilgrim";
const estimatedMinutes$d = 7;
const anchorAffinity$d = "home";
const trigger$d = {"type":"roadside","distanceRange":[2000,5000]};
const steps$5 = [{"id":"s-01","type":"dialogue","npcArchetype":"pilgrim","dialogue":"Thank the saints, a kind face at last. I set out from Ashford at dawn but the path split three ways and I have been walking in circles ever since. The meadow tracks all look the same once the morning mist rolls in. Could you lead me back to the nearest town? I fear I shall never find the road again on my own.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"s-02","type":"escort","description":"Guide the lost pilgrim safely back to the nearest settlement along the King's Road."},{"id":"s-03","type":"dialogue","npcArchetype":"pilgrim","dialogue":"Bless you, traveller. I can see the town gates from here and my old legs will carry me the rest of the way. Take this small token of thanks. The road ahead grows wilder, so keep your wits about you and may the saints light your path.","dialogueMinWords":15,"dialogueMaxWords":80}];
const reward$d = {"type":"currency","amount":15};
const lostPilgrim = {
  id: id$d,
  tier: tier$d,
  title: title$d,
  estimatedMinutes: estimatedMinutes$d,
  anchorAffinity: anchorAffinity$d,
  trigger: trigger$d,
  steps: steps$5,
  reward: reward$d,
};

const id$c = "side-merchants-broken-cart";
const tier$c = "micro";
const title$c = "The Merchant's Broken Cart";
const estimatedMinutes$c = 8;
const anchorAffinity$c = "anchor-03";
const trigger$c = {"type":"roadside","distanceRange":[18000,20000]};
const steps$4 = [{"id":"s-01","type":"dialogue","npcArchetype":"merchant","dialogue":"Oh, what rotten luck. The axle snapped clean through on that last rut and now my wares are scattered across the moorland. I cannot lift the cart alone and every moment my goods sit in the damp they lose their worth. Would you lend your strength, friend?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"s-02","type":"fetch","description":"Search the nearby copse for a sturdy branch that can serve as a replacement axle for the merchant's damaged cart.","itemId":"sturdy-branch"},{"id":"s-03","type":"investigate","description":"Fit the branch beneath the cart and secure the wheel, working alongside the merchant to lever the cart upright and reload the scattered goods."},{"id":"s-04","type":"dialogue","npcArchetype":"merchant","dialogue":"Marvellous work, truly marvellous. The wheel turns true again and my silks are no worse for their tumble. Take your pick from my wares as payment. A merchant never forgets a kindness on the road, and I travel this way often.","dialogueMinWords":15,"dialogueMaxWords":80}];
const reward$c = {"type":"item","itemId":"travel_cloak"};
const merchantsBrokenCart = {
  id: id$c,
  tier: tier$c,
  title: title$c,
  estimatedMinutes: estimatedMinutes$c,
  anchorAffinity: anchorAffinity$c,
  trigger: trigger$c,
  steps: steps$4,
  reward: reward$c,
};

const id$b = "side-sister-maeves-garden";
const tier$b = "micro";
const title$b = "Sister Maeve's Garden";
const estimatedMinutes$b = 12;
const anchorAffinity$b = "anchor-04";
const trigger$b = {"type":"anchor","anchorId":"anchor-04"};
const steps$3 = [{"id":"s-01","type":"dialogue","npcArchetype":"healer","dialogue":"Bless you for stopping, traveller. The abbey's herb garden keeps us supplied through most seasons, but the frost came early this year and three of my most vital plants have wilted. I need fresh cuttings of yarrow, comfrey, and wild thyme from the hills beyond the monastery walls. They grow among the rocky slopes where the moorland meets the highland grass. Could you gather them before nightfall?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"s-02","type":"fetch","itemId":"wild_yarrow","description":"Gather a bundle of wild yarrow from the sunny ledges on the hillside east of the monastery, where it grows in pale clusters among the loose stones."},{"id":"s-03","type":"fetch","itemId":"wild_comfrey","description":"Collect fresh comfrey leaves from the damp hollow beside the stream that runs down from the highlands, just north of the abbey walls."},{"id":"s-04","type":"fetch","itemId":"wild_thyme","description":"Pick sprigs of wild thyme from the windswept ridge above the monastery, where the moorland heather gives way to highland grass."},{"id":"s-05","type":"dialogue","npcArchetype":"healer","dialogue":"All three, and in fine condition too. The yarrow will staunch wounds, the comfrey will mend broken bones, and the thyme will keep fever at bay through the winter months. You have done the abbey a kindness that will outlast your visit, friend. Take this salve for the road ahead — I brewed it fresh this morning and it will close a wound faster than any prayer alone.","dialogueMinWords":15,"dialogueMaxWords":80}];
const reward$b = {"type":"item","itemId":"healing_salve"};
const sisterMaevesGarden = {
  id: id$b,
  tier: tier$b,
  title: title$b,
  estimatedMinutes: estimatedMinutes$b,
  anchorAffinity: anchorAffinity$b,
  trigger: trigger$b,
  steps: steps$3,
  reward: reward$b,
};

const id$a = "side-strange-shrine";
const tier$a = "micro";
const title$a = "The Strange Shrine";
const estimatedMinutes$a = 7;
const anchorAffinity$a = "anchor-04";
const trigger$a = {"type":"roadside","distanceRange":[23000,26000]};
const steps$2 = [{"id":"s-01","type":"investigate","description":"A faint golden light pulses from a moss-covered shrine half-hidden among the highland pines. Approach carefully and examine the source of the eerie glow."},{"id":"s-02","type":"puzzle","description":"The shrine bears three carved symbols that correspond to phases of the moon. Rotate the stone rings until the symbols align with the current sky to unlock the shrine's inner chamber."},{"id":"s-03","type":"dialogue","npcArchetype":"scholar","dialogue":"You have opened the shrine. Few possess the patience to read the old signs. This place was built by pilgrims who walked the King's Road long before the towns were raised. They left blessings sealed in stone for those who would come after. The warmth you feel is their gift to you.","dialogueMinWords":15,"dialogueMaxWords":80}];
const reward$a = {"type":"modifier","modifierId":"pilgrims-blessing"};
const strangeShrine = {
  id: id$a,
  tier: tier$a,
  title: title$a,
  estimatedMinutes: estimatedMinutes$a,
  anchorAffinity: anchorAffinity$a,
  trigger: trigger$a,
  steps: steps$2,
  reward: reward$a,
};

const id$9 = "side-the-bridge-troll";
const tier$9 = "meso";
const title$9 = "The Bridge Troll";
const estimatedMinutes$9 = 18;
const anchorAffinity$9 = "anchor-03";
const trigger$9 = {"type":"roadside","distanceRange":[15000,18000]};
const branches$7 = {"A":{"label":"Fight the troll for passage","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"wanderer","dialogue":"None shall cross my bridge without paying the toll, and the toll is whatever I say it is today. You look strong enough to carry a sword but not clever enough to use your tongue. So what will it be, little traveller? Your coin, your blood, or will you turn back the way you came?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"encounter","encounterId":"bridge-troll-fight","description":"Battle the massive bridge troll on the narrow stone crossing, using the tight quarters to avoid its sweeping blows."},{"id":"a-03","type":"investigate","description":"Search the troll's nest beneath the bridge and recover stolen goods from previous travellers."},{"id":"a-04","type":"dialogue","npcArchetype":"merchant","dialogue":"You killed that brute? Bless you, traveller. I have been camped on this side for three days, too frightened to cross. My wares are spoiling in the damp. Please, take something for your trouble. The road to Ravensgate is open again thanks to you.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"troll-slayer"}},"B":{"label":"Solve the troll's riddle to pass","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"wanderer","dialogue":"None shall cross my bridge without paying the toll, and the toll is whatever I say it is today. But I am feeling generous. Answer my riddle and you may pass free. Get it wrong and I eat your horse. Do not have a horse? Then I eat your boots. Do we have an accord?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"puzzle","description":"Solve the troll's riddle: 'I have cities but no houses, forests but no trees, and water but no fish. What am I?'"},{"id":"b-03","type":"dialogue","npcArchetype":"wanderer","dialogue":"A map! Curse it, you are the first to answer correctly in a fortnight. Very well, a bargain is a bargain. Cross and be gone before I change my mind. But I will think of a harder one next time, mark my words. Nobody outwits old Grukk twice.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-04","type":"dialogue","npcArchetype":"merchant","dialogue":"You talked your way past that creature? I tried offering it half my stock and it only laughed. Perhaps there is hope yet for those of us who trade in words rather than swords. Here, take this for the road ahead. You have earned it with wit alone.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"riddle-master"}}};
const reward$9 = {"type":"currency","amount":40};
const theBridgeTroll = {
  id: id$9,
  tier: tier$9,
  title: title$9,
  estimatedMinutes: estimatedMinutes$9,
  anchorAffinity: anchorAffinity$9,
  trigger: trigger$9,
  branches: branches$7,
  reward: reward$9,
};

const id$8 = "side-the-cartographers-map";
const tier$8 = "macro";
const title$8 = "The Cartographer's Map";
const estimatedMinutes$8 = 75;
const anchorAffinity$8 = "home";
const trigger$8 = {"type":"anchor","anchorId":"home"};
const prerequisites$1 = ["main-chapter-01"];
const branches$6 = {"A":{"label":"Chart the road through direct exploration","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"scholar","dialogue":"I am Gerold, once the royal cartographer. The old maps of the King's Road were burned during the wars, and now pilgrims walk blind into danger. I am too old to make the journey myself, but if you carry my instruments and sketch what you see at each landmark, I can piece together a true map. Visit every anchor along the road and record what you find there.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"investigate","description":"Survey Ashford and its surroundings using Gerold's cartography instruments. Record the position of the tavern, blacksmith, and the hill paths leading to the King's Road."},{"id":"a-03","type":"travel","destination":"anchor-01","description":"Follow the King's Road north through the Ashford Meadows to Millbrook, noting terrain features, river crossings, and landmarks along the way."},{"id":"a-04","type":"investigate","description":"Chart Millbrook's layout from the high ground above the River Mill crossing. Mark the market square, chapel, and the road's fork toward the forests."},{"id":"a-05","type":"travel","destination":"anchor-02","description":"Push deeper along the road through the Millbrook Forests to the Thornfield Ruins, recording the forest trails and ancient waymarkers."},{"id":"a-06","type":"investigate","description":"Map the Thornfield Ruins and their surroundings. Sketch the dungeon entrance, the camp perimeter, and the crumbling walls that mark the old settlement boundary."},{"id":"a-07","type":"travel","destination":"anchor-03","description":"Traverse the Thornfield Hills toward Ravensgate, charting the winding road through heather slopes and rocky passes."},{"id":"a-08","type":"investigate","description":"Sketch Ravensgate's walls, gate, and tower from a vantage point on the eastern ridge. Note the prison tower and the road that passes through the town centre."},{"id":"a-09","type":"travel","destination":"anchor-04","description":"Cross the Ravensgate Moors to reach the Pilgrim's Rest monastery, marking the standing stones and mist-prone hollows on the map."},{"id":"a-10","type":"investigate","description":"Document the Pilgrim's Rest monastery grounds — the chapel, garden, library, and the road's continuation toward the highlands."},{"id":"a-11","type":"travel","destination":"anchor-05","description":"Make the final ascent through the Grailsend Highlands to the temple at Grailsend, charting the steep mountain paths and pine groves."},{"id":"a-12","type":"investigate","description":"Complete the map with a survey of Grailsend — the temple entrance, the guardian's chamber, and the sacred stones that mark the end of the King's Road."},{"id":"a-13","type":"dialogue","npcArchetype":"scholar","dialogue":"Every anchor, every crossing, every ruin — you have given me more than enough to restore the true map of the King's Road. And look here, your sketches reveal paths the old maps never showed. Hidden trails through the forests, a cave system beneath the moors, a forgotten shrine in the highlands. This map will guide pilgrims safely for generations. You have my deepest gratitude.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"unlock","unlockId":"world-map-explorer"}},"B":{"label":"Recover the lost map fragments from each region","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"scholar","dialogue":"There is another way, perhaps faster. The old royal map was not destroyed entirely — it was torn into six pieces and hidden by the last custodians before the wars reached them. One fragment was left at each anchor along the King's Road. Find them all and I can restore the original, which showed not just the road but every secret path and hidden place between Ashford and Grailsend.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"fetch","itemId":"map-fragment-ashford","description":"Search beneath the hearthstone in the old cartographer's study in Ashford. Gerold recalls the first fragment was hidden there before the fires came."},{"id":"b-03","type":"travel","destination":"anchor-01","description":"Travel to Millbrook and seek the second fragment hidden somewhere in the town."},{"id":"b-04","type":"puzzle","description":"Solve the inscription on the chapel's foundation stone in Millbrook to reveal a hollow compartment containing the second map fragment."},{"id":"b-05","type":"travel","destination":"anchor-02","description":"Journey to the Thornfield Ruins to find the third fragment somewhere among the ancient stonework."},{"id":"b-06","type":"fetch","itemId":"map-fragment-thornfield","description":"Retrieve the third fragment from inside a sealed reliquary in the Thornfield Ruins, hidden behind a wall carving of the pilgrim's road."},{"id":"b-07","type":"travel","destination":"anchor-03","description":"Make your way to Ravensgate to recover the fourth fragment from within the walled town."},{"id":"b-08","type":"investigate","description":"Search the old records room beneath Ravensgate's gatehouse for the fourth map fragment, hidden among tax scrolls that no one has read in decades."},{"id":"b-09","type":"travel","destination":"anchor-04","description":"Continue to the Pilgrim's Rest monastery to find the fifth fragment."},{"id":"b-10","type":"fetch","itemId":"map-fragment-monastery","description":"Ask the monastery librarian about old documents. The fifth fragment is pressed between the pages of an illuminated manuscript in the restricted archive."},{"id":"b-11","type":"travel","destination":"anchor-05","description":"Ascend to Grailsend for the final fragment, said to be sealed within the temple's outer wall."},{"id":"b-12","type":"fetch","itemId":"map-fragment-grailsend","description":"Pry the sixth and final fragment from a niche in the temple wall at Grailsend, sealed with wax bearing the old royal cartographer's sigil."},{"id":"b-13","type":"dialogue","npcArchetype":"scholar","dialogue":"All six fragments, and the seals still intact. When I piece them together the old map reveals everything — every hidden cave, forgotten shrine, and smuggler's trail along the entire King's Road. This is worth more than gold. The secrets it holds will serve you well in the journey ahead. Take this copy I have made for you, and may it light your path.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"unlock","unlockId":"world-map-antiquarian"}}};
const reward$8 = {"type":"modifier","modifierId":"master-cartographer"};
const theCartographersMap = {
  id: id$8,
  tier: tier$8,
  title: title$8,
  estimatedMinutes: estimatedMinutes$8,
  anchorAffinity: anchorAffinity$8,
  trigger: trigger$8,
  prerequisites: prerequisites$1,
  branches: branches$6,
  reward: reward$8,
};

const id$7 = "side-the-cursed-ring";
const tier$7 = "meso";
const title$7 = "The Cursed Ring";
const estimatedMinutes$7 = 22;
const anchorAffinity$7 = "anchor-02";
const trigger$7 = {"type":"roadside","distanceRange":[10000,13000]};
const branches$5 = {"A":{"label":"Find the witch who cursed the ring","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"merchant","dialogue":"That ring I sold you, I am sorry. I did not know it was cursed when I bought it from the old woman in the hills. Strange things have followed me since I handled it — crows circling, milk souring, a shadow at my door. Please, find the witch and make her undo this wretched hex.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"investigate","description":"Follow the trail of withered flowers and dead songbirds into the thornwood to locate the witch's dwelling."},{"id":"a-03","type":"puzzle","description":"Solve the witch's three-part ward puzzle to gain entry to her cottage without triggering the protective hexes."},{"id":"a-04","type":"dialogue","npcArchetype":"hermit","dialogue":"So you found me. That ring was never meant for clumsy merchants. It binds itself to the worthy and tests their resolve. You passed through my wards without violence, which tells me enough. Give it here and I shall lift the curse. Consider it a lesson about buying trinkets from strangers.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"hex-breaker"}},"B":{"label":"Destroy the ring at the standing stones","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"merchant","dialogue":"That ring I sold you, I am sorry. I did not know it was cursed when I bought it from the old woman in the hills. Strange things have followed me since I handled it — crows circling, milk souring, a shadow at my door. There must be some way to destroy the wretched thing.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"investigate","description":"Seek out the ancient standing stones on the hilltop, said to be a place where cursed objects can be unmade."},{"id":"b-03","type":"encounter","encounterId":"cursed-ring-shade","description":"The ring's curse manifests as a shade that rises from the stone circle, fighting to preserve its vessel."},{"id":"b-04","type":"puzzle","description":"Place the ring upon the altar stone and align the moonlight through the standing stones to channel enough sacred energy to shatter the curse."},{"id":"b-05","type":"dialogue","npcArchetype":"wanderer","dialogue":"I saw the light from the stones half a league away. Whatever you did up there, the air feels cleaner for it. The old folk say those stones were placed to burn away wickedness. Seems they still have some power left in them after all these ages.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"curse-shatterer"}}};
const reward$7 = {"type":"item","itemId":"purified-ring"};
const theCursedRing = {
  id: id$7,
  tier: tier$7,
  title: title$7,
  estimatedMinutes: estimatedMinutes$7,
  anchorAffinity: anchorAffinity$7,
  trigger: trigger$7,
  branches: branches$5,
  reward: reward$7,
};

const id$6 = "side-the-deserter";
const tier$6 = "meso";
const title$6 = "The Deserter";
const estimatedMinutes$6 = 20;
const anchorAffinity$6 = "anchor-01";
const trigger$6 = {"type":"roadside","distanceRange":[5000,8000]};
const branches$4 = {"A":{"label":"Help the soldier escape","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"knight","dialogue":"Please, I beg you, do not raise the alarm. I am no criminal, just a man who cannot bear another day under Lord Ashwick's banner. His orders grow crueller by the week. I only wish to reach the coast and start anew. Will you help me slip past the patrol on the north road?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"fetch","itemId":"peasant-disguise","description":"Find a set of peasant clothes from a nearby farmstead to disguise the soldier."},{"id":"a-03","type":"escort","description":"Guide the disguised soldier along a hidden forest path that bypasses the patrol checkpoint on the north road."},{"id":"a-04","type":"dialogue","npcArchetype":"knight","dialogue":"I will not forget this kindness, stranger. If ever you find yourself on the western coast, ask for Edric at the dockyards. I owe you a debt that coin alone cannot repay. May the road treat you gently.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"modifier","modifierId":"merciful-heart"}},"B":{"label":"Turn the soldier in to his captain","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"knight","dialogue":"Please, I beg you, do not raise the alarm. I am no criminal, just a man who cannot bear another day under Lord Ashwick's banner. His orders grow crueller by the week. I only wish to reach the coast and start anew. Will you help me slip past the patrol on the north road?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"travel","destination":"patrol-camp","description":"Lead the soldier toward the patrol camp under the pretense of helping him, then alert the guards."},{"id":"b-03","type":"encounter","encounterId":"deserter-struggle","description":"The soldier realises your betrayal and fights desperately to escape before the guards arrive."},{"id":"b-04","type":"dialogue","npcArchetype":"knight","dialogue":"Well done, traveller. Desertion is a rot that spreads if left unchecked. Lord Ashwick will hear of your service. Take this purse and know that the law stands because good folk uphold it, even when the choice is hard.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"currency","amount":50}}};
const reward$6 = {"type":"modifier","modifierId":"road-judge"};
const theDeserter = {
  id: id$6,
  tier: tier$6,
  title: title$6,
  estimatedMinutes: estimatedMinutes$6,
  anchorAffinity: anchorAffinity$6,
  trigger: trigger$6,
  branches: branches$4,
  reward: reward$6,
};

const id$5 = "side-the-herbalists-journey";
const tier$5 = "macro";
const title$5 = "The Herbalist's Journey";
const estimatedMinutes$5 = 60;
const anchorAffinity$5 = "anchor-01";
const trigger$5 = {"type":"anchor","anchorId":"anchor-01"};
const prerequisites = ["main-chapter-01"];
const branches$3 = {"A":{"label":"Follow the old herbalist's teachings","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"healer","dialogue":"You have a keen eye, traveller. Not many notice the meadowsweet growing by the River Mill. I was an herbalist once, before my hands grew too stiff to gather. There are five rare herbs along the King's Road, each blooming only in its own soil. Bring them to me and I will teach you the healer's art that saved more lives on this road than any sword ever did.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"fetch","itemId":"silverleaf","description":"Gather silverleaf from the damp meadows near the River Mill at Millbrook. It grows in clusters along the bank where the current slows beneath the old stone bridge."},{"id":"a-03","type":"travel","destination":"millbrook-forests","description":"Journey into the dense Millbrook Forests between Millbrook and Thornfield Ruins to search for the second herb."},{"id":"a-04","type":"fetch","itemId":"shadowmoss","description":"Collect shadowmoss from the moss-covered roots in the deepest part of the Millbrook Forests, where the canopy blocks all sunlight."},{"id":"a-05","type":"travel","destination":"thornfield-hills","description":"Continue along the King's Road through the Thornfield Hills toward Ravensgate, searching the rocky outcrops for highland herbs."},{"id":"a-06","type":"fetch","itemId":"windcrown","description":"Harvest windcrown from the exposed ridgeline above Thornfield Ruins, where the constant gales have shaped it into a hardy spiral."},{"id":"a-07","type":"travel","destination":"ravensgate-moors","description":"Press onward past Ravensgate into the misty moors, where the rarest herbs survive in the boggy hollows."},{"id":"a-08","type":"fetch","itemId":"boglantern","description":"Gather boglantern from the peat pools of the Ravensgate Moors. Its pale glow is visible only at dusk, flickering among the standing stones."},{"id":"a-09","type":"travel","destination":"grailsend-highlands","description":"Make the final journey to the Grailsend Highlands to find the last and rarest herb near the sacred stones."},{"id":"a-10","type":"fetch","itemId":"grailbloom","description":"Pluck the grailbloom from a crevice beside the sacred stones in the Grailsend Highlands. Legend says it grows only where holy ground meets mountain air."},{"id":"a-11","type":"dialogue","npcArchetype":"healer","dialogue":"All five. You truly walked the length of the King's Road for these. With the silverleaf and grailbloom I can brew a tincture that closes wounds in moments. The shadowmoss draws poison, the windcrown steadies a faltering heart, and the boglantern soothes a troubled mind. You have earned the healer's gift, child. Use it wisely on the road ahead.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"unlock","unlockId":"healer-craft-traditional"}},"B":{"label":"Study under the monastery's apothecary","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"priest","dialogue":"The brothers at the Pilgrim's Rest monastery keep an apothecary garden, but their stores run low. They seek the same five rare herbs that grow wild along the road. If you bring the herbs to Brother Anselm instead, he will teach you the monastic tradition of healing — slower perhaps, but with deeper knowledge of which ailments each remedy truly cures.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"fetch","itemId":"silverleaf","description":"Gather silverleaf from the damp meadows near the River Mill at Millbrook. Mark the location carefully so the monastery can cultivate it in future seasons."},{"id":"b-03","type":"travel","destination":"millbrook-forests","description":"Travel deep into the Millbrook Forests to find the second herb for the monastery's apothecary."},{"id":"b-04","type":"fetch","itemId":"shadowmoss","description":"Carefully scrape shadowmoss from the ancient roots in the darkest glades of the Millbrook Forests, preserving the root stock for regrowth."},{"id":"b-05","type":"fetch","itemId":"windcrown","description":"Climb the windswept ridges of the Thornfield Hills and harvest windcrown where it clings to the rocky outcrops above the ruins."},{"id":"b-06","type":"fetch","itemId":"boglantern","description":"Wade into the peat pools of the Ravensgate Moors at twilight and gather the glowing boglantern that rises from the dark water."},{"id":"b-07","type":"fetch","itemId":"grailbloom","description":"Ascend to the sacred stones in the Grailsend Highlands and harvest the grailbloom, taking care to replant seeds in the crevice for future pilgrims."},{"id":"b-08","type":"travel","destination":"anchor-04","description":"Carry all five herbs to the Pilgrim's Rest monastery and deliver them to Brother Anselm in the apothecary garden."},{"id":"b-09","type":"dialogue","npcArchetype":"priest","dialogue":"Five specimens, each one pristine. You have a gatherer's patience, which is half of what makes a true healer. The other half is knowing when a remedy will help and when it will only prolong suffering. Stay a while and study our texts. I will teach you the apothecary's discipline — the art of diagnosis before cure. This knowledge will serve you well beyond the King's Road.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"unlock","unlockId":"healer-craft-apothecary"}}};
const reward$5 = {"type":"modifier","modifierId":"herbalist-trained"};
const theHerbalistsJourney = {
  id: id$5,
  tier: tier$5,
  title: title$5,
  estimatedMinutes: estimatedMinutes$5,
  anchorAffinity: anchorAffinity$5,
  trigger: trigger$5,
  prerequisites,
  branches: branches$3,
  reward: reward$5,
};

const id$4 = "side-the-missing-manuscript";
const tier$4 = "micro";
const title$4 = "The Missing Manuscript";
const estimatedMinutes$4 = 10;
const anchorAffinity$4 = "anchor-04";
const trigger$4 = {"type":"anchor","anchorId":"anchor-04"};
const steps$1 = [{"id":"s-01","type":"dialogue","npcArchetype":"scholar","dialogue":"Traveller, I am in a terrible state. A manuscript I was studying has gone missing from my reading desk — an illuminated treatise on the Grail knights, centuries old and irreplaceable. I locked the library last night as always, yet this morning the desk was bare. I suspect it has been misplaced rather than stolen, but my eyes are too weary to search every shelf. Would you help me look?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"s-02","type":"investigate","description":"Search the monastery library methodically — check the upper shelves, the reading alcoves, and the stack of unsorted volumes near the south window."},{"id":"s-03","type":"fetch","itemId":"grail_treatise","description":"Retrieve the illuminated treatise from behind a row of prayer books on the topmost shelf, where it was shelved by mistake."},{"id":"s-04","type":"dialogue","npcArchetype":"scholar","dialogue":"Behind the prayer books — of course! Brother Thomas must have reshelved it after vespers without reading the spine. Thank the saints it is undamaged. You have saved weeks of work, friend. Take this ink-stamp as thanks. The monks use it to mark safe passages along the Road and it may open a door or two before journey's end.","dialogueMinWords":15,"dialogueMaxWords":80}];
const reward$4 = {"type":"item","itemId":"monastery_ink_stamp"};
const theMissingManuscript = {
  id: id$4,
  tier: tier$4,
  title: title$4,
  estimatedMinutes: estimatedMinutes$4,
  anchorAffinity: anchorAffinity$4,
  trigger: trigger$4,
  steps: steps$1,
  reward: reward$4,
};

const id$3 = "side-the-missing-merchant";
const tier$3 = "meso";
const title$3 = "The Missing Merchant";
const estimatedMinutes$3 = 22;
const anchorAffinity$3 = "anchor-01";
const trigger$3 = {"type":"anchor","anchorId":"anchor-01"};
const branches$2 = {"A":{"label":"Track the bandits who took him","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"merchant","dialogue":"My partner Osbert left for Ravensgate three days past and has not returned. His cart was found overturned on the forest road with the goods scattered and boot prints everywhere. The reeve says it is bandits, the same ones who have been plaguing the Millbrook road since midsummer. Please, find Osbert before they do him worse harm.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"investigate","description":"Examine the overturned cart on the forest road for tracks and clues about which direction the bandits dragged Osbert."},{"id":"a-03","type":"encounter","encounterId":"bandit_ambush","description":"Follow the trail to a hidden bandit camp in the forest. Fight through the lookouts to reach the clearing where Osbert is bound to a tree."},{"id":"a-04","type":"dialogue","npcArchetype":"merchant","dialogue":"You came for me. I had given up hope after the second night. Those ruffians wanted the location of our warehouse in Ravensgate but I told them nothing. My partner will be overjoyed. Here, I hid this in my boot before they searched me — take it as thanks. It is the finest thing I ever traded for.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"item","itemId":"travel_cloak"}},"B":{"label":"Discover the merchant fled his debts","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"merchant","dialogue":"My partner Osbert left for Ravensgate three days past and has not returned. His cart was found overturned on the forest road with the goods scattered and boot prints everywhere. I fear the worst but something nags at me — he has been anxious of late, whispering with strangers at the tavern. Please, find out what happened to him.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"investigate","description":"Search the overturned cart and notice the damage looks staged — the axle was removed, not broken, and the scattered goods are the cheapest stock."},{"id":"b-03","type":"encounter","encounterId":"merchant_negotiation","description":"Visit the tavern and press the innkeeper for information about Osbert's secretive meetings with a moneylender from Ravensgate."},{"id":"b-04","type":"travel","destination":"river-crossing","description":"Follow Osbert's true trail to the river crossing south of Millbrook, where he arranged passage on a barge heading downstream."},{"id":"b-05","type":"dialogue","npcArchetype":"merchant","dialogue":"He staged his own disappearance? I cannot believe it. The debts, the whispering — it all makes sense now. Part of me is relieved he is alive but the betrayal stings. At least I know the truth and can settle his accounts before they come after me instead. You have saved me from ruin, traveller. Take this for your trouble.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"currency","amount":40}}};
const reward$3 = {"type":"modifier","modifierId":"truth-seeker"};
const theMissingMerchant = {
  id: id$3,
  tier: tier$3,
  title: title$3,
  estimatedMinutes: estimatedMinutes$3,
  anchorAffinity: anchorAffinity$3,
  trigger: trigger$3,
  branches: branches$2,
  reward: reward$3,
};

const id$2 = "side-the-poisoned-well";
const tier$2 = "meso";
const title$2 = "The Poisoned Well";
const estimatedMinutes$2 = 25;
const anchorAffinity$2 = "anchor-01";
const trigger$2 = {"type":"anchor","anchorId":"anchor-01"};
const branches$1 = {"A":{"label":"Confront the herbalist","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"farmer","dialogue":"Something is wrong with our water, stranger. Half the folk along Mill Lane have taken ill this past week — fevers, shaking, a terrible wasting. Old Agnes says it started the same day that new herbalist set up shop near the well. Nobody wants to accuse her outright, but the timing is too neat to ignore. Would you look into it before more of us fall sick?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"investigate","description":"Examine the town well for signs of contamination and speak with the sick villagers to learn when their symptoms began."},{"id":"a-03","type":"fetch","itemId":"rare_herb","description":"Search the herbalist's garden for the distinctive purple nightveil plant whose roots produce the toxin found in the well water."},{"id":"a-04","type":"encounter","encounterId":"merchant_negotiation","description":"Confront the herbalist with the evidence. She insists it was an accident — her compost heap leached into the groundwater — but her defensive manner suggests otherwise."},{"id":"a-05","type":"dialogue","npcArchetype":"farmer","dialogue":"So it was her doing after all. Whether by carelessness or design, she has much to answer for. The reeve will deal with her now. You have done Millbrook a great service, traveller. The market folk have gathered a purse for you, and I have added my best laying hen's weight in silver besides.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"item","itemId":"antidote"}},"B":{"label":"Trace the poison source upstream","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"farmer","dialogue":"Something is wrong with our water, stranger. Half the folk along Mill Lane have taken ill this past week — fevers, shaking, a terrible wasting. The well draws from the River Mill, and I reckon whatever foulness plagues us flows down from upstream. Would you follow the water and find the source before the whole town sickens?","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"investigate","description":"Follow the River Mill upstream from the town well, testing the water at intervals and searching for signs of contamination."},{"id":"b-03","type":"travel","destination":"upstream-cave","description":"Trek through the forested riverbank to reach a cave where a foul runoff seeps into the current from an old mineral deposit disturbed by recent rains."},{"id":"b-04","type":"puzzle","description":"Redirect the cave's drainage channel using loose stones and fallen timber to divert the contaminated runoff away from the river."},{"id":"b-05","type":"dialogue","npcArchetype":"farmer","dialogue":"The water already runs clearer, I can see it from the bridge. You found the true source and mended it with your own hands. The herbalist sends her thanks as well — she was afraid the town would turn on her next. Take this tonic she brewed. She says it will ward off any lingering poison in your blood.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"item","itemId":"health_potion"}}};
const reward$2 = {"type":"modifier","modifierId":"millbrook-healer"};
const thePoisonedWell = {
  id: id$2,
  tier: tier$2,
  title: title$2,
  estimatedMinutes: estimatedMinutes$2,
  anchorAffinity: anchorAffinity$2,
  trigger: trigger$2,
  branches: branches$1,
  reward: reward$2,
};

const id$1 = "side-the-underground";
const tier$1 = "meso";
const title$1 = "The Underground";
const estimatedMinutes$1 = 25;
const anchorAffinity$1 = "anchor-03";
const trigger$1 = {"type":"anchor","anchorId":"anchor-03"};
const branches = {"A":{"label":"Join the resistance openly","steps":[{"id":"a-01","type":"dialogue","npcArchetype":"innkeeper","dialogue":"Keep your voice down, stranger. You have been asking questions that draw the wrong kind of attention in Ravensgate. If you truly wish to help, come to the cellar of the Black Raven after the midnight bell. Knock three times and ask for the old vintage. But know this — once you walk through that door, there is no walking back out.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-02","type":"investigate","description":"Wait for nightfall and descend into the cellar beneath the Black Raven tavern. Find the hidden passage behind the wine casks that leads to the resistance meeting hall."},{"id":"a-03","type":"dialogue","npcArchetype":"knight","dialogue":"So Greta vouches for you. That is no small thing. We are soldiers, merchants, healers — ordinary folk who have suffered enough under Ashwick's boot. We need someone from outside these walls, someone the captain's spies do not yet know. Will you carry a message to our allies in the moors? The guards search everyone at the gate, but a pilgrim on the King's Road might pass unnoticed.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"a-04","type":"travel","destination":"ravensgate-moors","description":"Smuggle the coded message past the gate guards and deliver it to the resistance contact camped in the moors beyond Ravensgate's walls."},{"id":"a-05","type":"dialogue","npcArchetype":"innkeeper","dialogue":"The message reached them safely. You have done more for Ravensgate in one night than we have managed in months of whispering. The resistance is stronger now, and when the time comes to act, you will have a place among us. Take this — it belonged to the old lord, before Ashwick seized the manor. Wear it and our people will know you as a friend.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"item","itemId":"resistance_token"}},"B":{"label":"Infiltrate the resistance as a spy","steps":[{"id":"b-01","type":"dialogue","npcArchetype":"merchant","dialogue":"You have sharp eyes, traveller. I have noticed the same things you have — the whispers in the tavern, the strangers who arrive after dark and leave before dawn. Lord Ashwick's captain pays well for information about dissidents. If you could get inside their little conspiracy and bring me names, I will see that you are richly rewarded. Thornton always pays his debts.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"b-02","type":"investigate","description":"Pose as a sympathiser and gain the trust of the tavern regulars at the Black Raven. Listen for talk of secret meetings and coded phrases."},{"id":"b-03","type":"encounter","encounterId":"merchant_negotiation","description":"Attend a resistance gathering in the cellar beneath the tavern and memorise the faces and plans discussed without arousing suspicion."},{"id":"b-04","type":"dialogue","npcArchetype":"merchant","dialogue":"Six names and a meeting place — you have earned every coin of this. The captain will be most pleased. But between you and me, do not linger in Ravensgate once the arrests begin. Ashwick's gratitude has a short memory, and those who know too much often end up in the Oubliette alongside the people they betrayed.","dialogueMinWords":15,"dialogueMaxWords":80}],"reward":{"type":"currency","amount":60}}};
const reward$1 = {"type":"modifier","modifierId":"ravensgate-insider"};
const theUnderground = {
  id: id$1,
  tier: tier$1,
  title: title$1,
  estimatedMinutes: estimatedMinutes$1,
  anchorAffinity: anchorAffinity$1,
  trigger: trigger$1,
  branches,
  reward: reward$1,
};

const id = "side-wounded-soldier";
const tier = "micro";
const title = "The Wounded Soldier";
const estimatedMinutes = 6;
const anchorAffinity = "anchor-02";
const trigger = {"type":"roadside","distanceRange":[13000,16000]};
const steps = [{"id":"s-01","type":"dialogue","npcArchetype":"knight","dialogue":"Stay your hand, I mean no harm. I was set upon by brigands on the hillside pass and my leg is badly cut. If you have any salve or clean cloth I would be in your debt. Otherwise I fear this wound will fester before I reach shelter.","dialogueMinWords":15,"dialogueMaxWords":80},{"id":"s-02","type":"investigate","description":"Tend to the soldier's wound using herbs from the nearby hillside, binding the gash with a strip of clean linen torn from his own cloak."},{"id":"s-03","type":"dialogue","npcArchetype":"knight","dialogue":"You have a steady hand and a good heart. I serve the garrison at Ravensgate, though I wonder what that service is worth these days. Take my old blade, it has seen better years but the steel is still true. You will need it on the road ahead.","dialogueMinWords":15,"dialogueMaxWords":80}];
const reward = {"type":"item","itemId":"iron_sword"};
const woundedSoldier = {
  id,
  tier,
  title,
  estimatedMinutes,
  anchorAffinity,
  trigger,
  steps,
  reward,
};

const ALL_QUESTS = [
  chapter00,
  chapter01,
  chapter02,
  chapter03,
  chapter04,
  chapter05,
  aldricsMissingHammer,
  banditAmbush,
  besssSecretRecipe,
  fatherCedricsLostHymnal,
  lordAshwicksSecret,
  lostPilgrim,
  merchantsBrokenCart,
  sisterMaevesGarden,
  strangeShrine,
  theBridgeTroll,
  theCartographersMap,
  theCursedRing,
  theDeserter,
  theHerbalistsJourney,
  theMissingMerchant,
  theMissingManuscript,
  thePoisonedWell,
  theUnderground,
  woundedSoldier
];
const QUEST_BY_ID = /* @__PURE__ */ new Map();
for (const q of ALL_QUESTS) {
  QUEST_BY_ID.set(q.id, q);
}
function getQuestDefinition(id) {
  return QUEST_BY_ID.get(id);
}
function getAllQuests() {
  return ALL_QUESTS;
}
const useQuestStore = create((set) => ({
  activeQuests: [],
  completedQuests: [],
  triggeredQuests: [],
  activateQuest: (questId, branch) => set((state) => {
    if (state.activeQuests.some((q) => q.questId === questId)) return state;
    if (state.completedQuests.includes(questId)) return state;
    return {
      activeQuests: [
        ...state.activeQuests,
        { questId, currentStep: 0, branch }
      ],
      triggeredQuests: state.triggeredQuests.includes(questId) ? state.triggeredQuests : [...state.triggeredQuests, questId]
    };
  }),
  advanceStep: (questId) => set((state) => ({
    activeQuests: state.activeQuests.map(
      (q) => q.questId === questId ? { ...q, currentStep: q.currentStep + 1 } : q
    )
  })),
  chooseBranch: (questId, branch) => set((state) => ({
    activeQuests: state.activeQuests.map(
      (q) => q.questId === questId ? { ...q, branch, currentStep: 0 } : q
    )
  })),
  completeQuest: (questId) => set((state) => ({
    activeQuests: state.activeQuests.filter((q) => q.questId !== questId),
    completedQuests: state.completedQuests.includes(questId) ? state.completedQuests : [...state.completedQuests, questId]
  })),
  failQuest: (questId) => set((state) => ({
    activeQuests: state.activeQuests.filter((q) => q.questId !== questId)
  })),
  markTriggered: (questId) => set((state) => ({
    triggeredQuests: state.triggeredQuests.includes(questId) ? state.triggeredQuests : [...state.triggeredQuests, questId]
  })),
  resetQuests: () => set({
    activeQuests: [],
    completedQuests: [],
    triggeredQuests: []
  })
}));

function QuestEntry({ quest }) {
  const def = getQuestDefinition(quest.questId);
  if (!def) return null;
  let totalSteps;
  if (quest.branch && def.branches) {
    totalSteps = def.branches[quest.branch].steps.length;
  } else if (def.steps) {
    totalSteps = def.steps.length;
  } else {
    totalSteps = 0;
  }
  const isMain = def.id.startsWith("main-");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: cn(
            "text-xs font-bold uppercase tracking-wider",
            isMain ? "text-amber-300" : "text-stone-400"
          ),
          children: isMain ? "◆" : "◇"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold text-yellow-100 truncate", children: def.title })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-5 text-xs text-stone-400", children: [
      "Step ",
      quest.currentStep + 1,
      " / ",
      totalSteps,
      quest.branch && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-amber-400/70", children: [
        "Path ",
        quest.branch
      ] })
    ] })
  ] });
}
function QuestLog() {
  const activeQuests = useQuestStore((s) => s.activeQuests);
  const gameActive = useGameStore((s) => s.gameActive);
  const [expanded, setExpanded] = reactExports.useState(false);
  if (!gameActive || activeQuests.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-20 right-6 pointer-events-auto z-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setExpanded((v) => !v),
        className: "mb-1 px-3 py-1 bg-stone-900/80 border border-yellow-700/40 rounded text-xs text-yellow-200 font-bold uppercase tracking-wider hover:bg-stone-800/90 transition-colors",
        children: [
          "Quests (",
          activeQuests.length,
          ") ",
          expanded ? "▾" : "▸"
        ]
      }
    ),
    expanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-stone-900/85 border border-yellow-700/30 rounded p-3 min-w-[220px] max-w-[280px] backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2", children: activeQuests.map((q) => /* @__PURE__ */ jsxRuntimeExports.jsx(QuestEntry, { quest: q }, q.questId)) }) })
  ] });
}

function QuestLogWithQuests() {
  reactExports.useEffect(() => {
    useGameStore.setState({ gameActive: true });
    useQuestStore.setState({
      activeQuests: [
        { questId: "main-chapter-00", currentStep: 1 },
        { questId: "side-lost-pilgrim", currentStep: 0 }
      ]
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QuestLog, {});
}
function QuestLogExpanded() {
  const [ready, setReady] = reactExports.useState(false);
  reactExports.useEffect(() => {
    useGameStore.setState({ gameActive: true });
    useQuestStore.setState({
      activeQuests: [
        { questId: "main-chapter-00", currentStep: 2 },
        { questId: "side-aldrics-missing-hammer", currentStep: 0, branch: "A" }
      ]
    });
    setReady(true);
  }, []);
  if (!ready) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QuestLog, {});
}
function QuestLogHidden() {
  reactExports.useEffect(() => {
    useGameStore.setState({ gameActive: false });
    useQuestStore.setState({ activeQuests: [] });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-testid": "quest-hidden-wrapper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(QuestLog, {}) });
}
function QuestLogEmpty() {
  reactExports.useEffect(() => {
    useGameStore.setState({ gameActive: true });
    useQuestStore.setState({ activeQuests: [] });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-testid": "quest-empty-wrapper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(QuestLog, {}) });
}

export { QuestLogEmpty, QuestLogExpanded, QuestLogHidden, QuestLogWithQuests };
//# sourceMappingURL=QuestLog.story-vhlsjA0s.js.map
