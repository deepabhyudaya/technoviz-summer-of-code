# Student Wars: War Types System Design Document

This document outlines the exact technical and mechanical specifications for implementing the 8 War Types within the Student Wars system. It is written as a direct implementation guide for backend, frontend, and database engineers.

---

## WAR TYPE 1: KNOWLEDGE DUEL

**NAME & DESCRIPTION**
Knowledge Duel is the classic academic showdown. It is a structured, synchronous trivia-style bout where both students answer a set of identical questions. Speed and accuracy both matter. It feels tense, quiet, and highly competitive—the purest test of who actually knows the material better.

**REQUIRES TEACHER?**
Yes.
The teacher creates/selects the questions, triggers the start of the duel, validates open-answer responses, and monitors for technical issues or cheating. If the teacher is unavailable, the fallback is Karma Sprint.

**MECHANIC**
- **Question Format**: 15 questions per bout (long enough to prevent lucky wins, short enough to keep focus). Subjects must be from courses both students are mutually enrolled in. Format is a mix of Multiple Choice (MC) and Short Open Answer. The teacher authors these or pulls them from the Q&A feed via their dashboard.
- **Timing**: 30 seconds for MC, 90 seconds for Open Answer. No overall time limit—the duel ends when all questions are processed.
- **Answer Submission**: The UI locks the answer upon clicking "Submit" (no changing answers). The timer is visible in real-time. If a student runs out of time, they score a 0 for that question.
- **Visibility**: Both students see the question simultaneously. The next question loads only after *both* submit or the timer expires. Answers are revealed immediately after both have submitted.
- **Ally Role**: The ally gets "Spectator Mode." They see the questions and a live status ("Fighter A is typing..."), but they cannot type in the war server chat until the bout concludes to prevent feeding answers.

**SCORING**
- **Base**: +10 points for correct answer.
- **Speed Bonus (MC Only)**: $+5 \times (1 - \frac{\text{Time Taken}}{\text{Max Time}})$. Rounded to nearest whole number.
- **Streak Bonus**: +2 points for every consecutive correct answer starting from the 3rd correct answer.
- **Final Score**: Cumulative points. Tie broken by highest average speed.

**DURATION**
One continuous period (usually 15–20 minutes). Cannot be paused unless the teacher manually hits "Emergency Pause."

**ANTI-GAMING**
- **Tab-switching**: Frontend tracks `visibilitychange`. Every tab switch flags the teacher dashboard. 3 tab switches = auto-forfeit of the current question.
- **IP Detection**: If both fighters are on the same local network/IP as their ally, a warning flags the teacher to verify they aren't physically in the same room collaborating.

**DISPLAY IN WAR SERVER**
- **Live Scoreboard**: Progress bar showing `Question 4/15`. Scores update silently until the question resolves.
- **Active Channel**: Automated bot posts: `[System] Question 4 deployed.` -> `[System] Student A locked in.` -> `[System] Student B locked in.` -> `[System] Result: Student A (+14), Student B (+0)`.

**BEST USED WHEN**
Favors students with high retention and fast recall. A smart CR nominates this when their fighter is a top-tier academic but maybe not popular or socially active.

**STUDENT WAR SPECIFIC NOTES**
Unlike Branch Wars where a team can crowdsource the answer, this is strictly isolated. The pressure is entirely on the individual.

---

## WAR TYPE 2: KARMA SPRINT

**NAME & DESCRIPTION**
Karma Sprint is an endurance race where both students attempt to earn as much karma as possible in a fixed time window. It measures sustained, genuine academic contribution to the platform against a ticking clock. It feels like a marathon where every helpful answer counts.

**REQUIRES TEACHER?**
No.

**MECHANIC**
- **Karma Sources**: Only karma generated from answering questions on the *main platform Q&A feed* and receiving "Helpful" marks counts. Posts, comments, and war-server specific karma are excluded.
- **Time Window**: 48-hour fixed window starting simultaneously for both. To ensure fairness for night owls vs early birds, the clock pauses globally from 12:00 AM to 6:00 AM local time.
- **Ally Role**: Guardian. The ally is granted a special "Audit" button on the opponent's answers. If the ally suspects the opponent is plagiarizing or giving low-effort answers just for points, they can flag it. Flagged karma is quarantined from the sprint score until an admin clears it.

**SCORING**
1 point per karma earned from valid sources during the active window. Highest score wins. Tie broken by the student who answered *fewer* questions (rewarding quality/efficiency over spam).

**ANTI-GAMING (NEUTRALITY ENFORCEMENT)**
- **Detection**: The system explicitly drops karma points for the sprint (though keeps them globally) if the "Helpful" mark comes from the fighter's own ally, branch members, or mutual friends (defined as following each other).
- **Flagging**: If >3 helpful marks come from the same user within 1 hour, that user's votes are voided for the remainder of the war, and an admin flag is generated.

**DISPLAY IN WAR SERVER**
Live scoreboard showing exact sprint points. The active channel streams events: `[System] Student A earned +5 Karma (Answered: "How does React state work?")`.

**BEST USED WHEN**
Favors highly active, consistently helpful students. Best used when the fighter is already a known top-contributor to the platform.

---

## WAR TYPE 3: ATTENDANCE SIEGE

**NAME & DESCRIPTION**
Attendance Siege is the ultimate test of discipline. There are no questions or answers. The student who maintains the highest formal class attendance percentage over the duration of the war wins. It sounds boring but is incredibly stressful and devastating to lose.

**REQUIRES TEACHER?**
No.

**MECHANIC**
- **What Counts**: Only formal, biometric/register class attendance. Platform login activity does not count.
- **Normalization**: Score is calculated as `(Classes Attended / Classes Held) * 100`. This perfectly normalizes different schedules between branches.
- **Partial Credit**: Marked "Late" counts as 0.5 of a class. Medical leave or official holidays are removed from the denominator (skipped entirely for calculation).
- **Ally Role**: Accountability Partner. The ally receives automated SMS/Push notifications 15 minutes before the fighter's class begins: `"Your fighter has a class in 15 mins. Make sure they are awake."`

**PSYCHOLOGICAL WARFARE**
Attendance updates are published at the end of each day (11:59 PM). It is not strictly real-time to allow for teacher register entry delays, but the daily drop creates a highly anticipated, dramatic event.

**SCORING**
Highest normalized percentage at the end of the duration wins. Tie goes to the student with the higher absolute number of classes attended.

**DURATION**
14 days continuous. Cannot end early.

**ANTI-GAMING**
Proxy attendance (proxying bio-metrics or ID cards) is the main threat. The platform relies on existing college disciplinary measures for proxying, but if a student is caught proxying by the administration during an Attendance Siege, they are instantly banned from all Student Wars permanently.

**BEST USED WHEN**
Favors the relentlessly disciplined student. Used strategically against a "genius slacker" who gets good grades but skips lectures.

---

## WAR TYPE 4: CREATIVE CLASH

**NAME & DESCRIPTION**
Creative Clash is a community-judged showdown where students create a high-quality explanation, diagram, or solution based on a prompt. The college community votes on the best submission. This gives the quiet, creative student a massive arena to shine.

**REQUIRES TEACHER?**
Yes. Role: Assigns the topic, validates the submissions, and handles manipulation overrides.

**MECHANIC**
- **Submission Type**: Teacher chooses at setup: Written Explanation (max 1000 words), Digital Diagram, or Short Video (max 3 mins).
- **Topic**: Teacher assigns a complex, open-ended topic. Revealed simultaneously to both.
- **Creation Window**: 48 hours to submit. Submissions are strictly blind (students cannot see opponent's work until voting opens).
- **Teacher Validation**: Teacher reviews both for topic adherence and originality. Teacher clicks "Approve & Open Voting."
- **Voting**: Platform-wide voting opens for 48 hours. Submissions are displayed side-by-side anonymously (Sub A vs Sub B).

**VOTING SYSTEM & ANTI-MANIPULATION**
- **Eligibility**: Students from *neither* fighter's branch can vote. (Complete neutrality). Minimum 50 total votes required for a valid outcome.
- **Detection**: IP duplicate block. Velocity detection: If a submission receives >20 votes in 2 minutes, voting pauses automatically, and the teacher/admin must review for botting.
- **Ally Role**: Cannot vote. Acts as a campaign manager, sharing the anonymous voting link to neutral servers.

**SCORING**
Simple majority of valid community votes wins. In a perfect tie, the teacher casts the deciding vote.

**DISPLAY IN WAR SERVER**
During creation: "Awaiting Submissions."
During voting: Live vote count is HIDDEN from fighters and public until voting closes to prevent bandwagon voting.

**BEST USED WHEN**
Favors artistic, articulate, and deeply conceptual thinkers.

---

## WAR TYPE 5: SPEED ROUND

**NAME & DESCRIPTION**
Speed Round is pure chaos and adrenaline. A set of questions is dropped, and the fastest correct answer wins the question. No time to think, no going back. It’s over in minutes.

**REQUIRES TEACHER?**
Yes. Role: Schedules the drop or pulls the surprise trigger.

**MECHANIC**
- **The Moment**: "Surprise Trigger." The teacher sets a 4-hour window (e.g., 6 PM - 10 PM). The system fires the war randomly within that window. Both students get a notification: `"SPEED ROUND COMMENCING IN 60 SECONDS."`
- **Question Delivery**: 15 questions, strictly Multiple Choice. Delivered via Socket.io. Next question appears 3 seconds after the current one is resolved.
- **Simultaneous Answering**: First student to click the correct answer wins the point. The question instantly locks for the other.
- **Latency Fairness**: Client-side timestamping combined with server-time sync (NTP approach over websockets). If Student B's answer arrives later but their cryptographically signed client timestamp shows they clicked earlier (within a 150ms acceptable latency window), the server corrects the outcome.
- **Ally Role**: Observer only.

**SCORING**
1 point per question won.
**Tiebreaker (The 100ms rule)**: If both select the correct answer within 100ms of each other based on normalized timestamps, *both* receive the point.

**DURATION**
~5 minutes.

**BEST USED WHEN**
Favors high-reaction-time, confident, high-stress performers.

---

## WAR TYPE 6: SILENT WAR

**NAME & DESCRIPTION**
Silent War is a test of pure ego and endurance. No Q&A, no karma, no messaging allowed to count. Just attendance. It is the ultimate statement of superiority: "I will outwork you without saying a single word."

**REQUIRES TEACHER?**
No.

**MECHANIC**
- **Rules**: Identical to Attendance Siege, but driven by a cultural phenomenon. 
- **Platform Usage**: Fighters can use the platform normally, but they gain exactly zero war points for any activity. If the opponent tries to post a lot to flex, it means nothing.
- **Ally Role**: The ally cannot help mechanically, but they have a special ability: **"Request Conversion"**. Once per war, the ally can petition the opponent's ally to convert the Silent War into a Karma Sprint. If accepted, the war transforms mid-stream.
- **Tension**: The war server chat is locked. Nobody can type in it. The only thing that posts is a daily system message at midnight: `[System] Day 4 completes. The silence holds.` or `[System] Day 5: Student B missed a lecture. First blood.`

**SCORING**
Highest attendance %.

**BEST USED WHEN**
The ultimate flex. Declared when you have a flawless academic record and want to humiliate an opponent who talks too much on the platform.

---

## WAR TYPE 7: REPUTATION WAR

**NAME & DESCRIPTION**
Both students answer normal questions on the Q&A feed, but only helpful marks from 2nd-degree strangers count. You cannot fake a stranger's vote. This proves who actually provides objective value to the college.

**REQUIRES TEACHER?**
No.

**MECHANIC**
- **Neutrality Rule (Strict)**: A vote only counts if the voter:
  1. Is not in the same branch as either fighter.
  2. Does not follow either fighter.
  3. Does not share >1 server with either fighter.
  4. Is not followed by the fighter's ally.
- **Scope**: Only answers provided to questions asked *during* the 7-day war window count. Both fighters are allowed (and encouraged) to answer the exact same question.
- **Gaming**: If a fighter's "Helpful" to "Unhelpful" mark ratio on war answers drops below 20% (indicating they are spamming answers to fish for votes), their score multiplier drops to 0.5x.
- **Ally Role**: Research Assistant. The ally has a special dashboard showing unanswered neutral questions and can click "Send to Fighter," which DMs the link to the fighter.

**SCORING**
1 point per strictly neutral Helpful mark.

**DISPLAY IN WAR SERVER**
The scoreboard does not update live. It does a "Daily Snapshot" at 8:00 PM, creating immense tension.

**BEST USED WHEN**
Favors articulate explainers who don't rely on friend groups for clout.

---

## WAR TYPE 8: WILDCARD WAR

**NAME & DESCRIPTION**
Neither student knows what war they are fighting until the exact moment it begins. The platform randomly assigns one of the other 7 war types. Pure adaptability.

**REQUIRES TEACHER?**
Depends on the revealed type.

**MECHANIC**
- **The Reveal**: Both students enter `#war-announcements`. A 60-second Socket.io countdown plays. At 0:00, a dramatic slot-machine UI spins through the names of the 7 types. It lands, confetti fires on the frontend, and the rules auto-post into the chat.
- **Weights**: 
  - Knowledge Duel (20%)
  - Karma Sprint (20%)
  - Attendance Siege (15%)
  - Speed Round (15%)
  - Creative Clash (15%)
  - Reputation War (10%)
  - Silent War (5% - Rare/Dramatic)
- **Teacher Fallback**: If Wildcard lands on a Teacher-required war, and no teacher was nominated at proposal, **Option C triggers**: It dramatically "glitches" out on the UI and defaults to **Karma Sprint**. This is chosen because it is universal, requires zero setup, and instantly begins the action without blocking on admin approval.
- **Consent**: The accept screen explicitly states: `"You are accepting the unknown. This cannot be undone."`

---

## AUTO RANDOM WAR TYPE SELECTION

This is distinct from Wildcard. The proposing student clicks "Let the platform decide" because they want to be impartial.
- **Timing**: Assigned instantly at *submission*.
- **Opponent View**: The opponent CR/Student *sees* the assigned type before accepting. They aren't going in blind.
- **Weights**: Same as Wildcard.
- **Counter-propose**: The opponent can reject the random type and counter-propose a specific type.

---

## TEACHER NOMINATION FLOW

1. **Nomination**: Proposing student selects a war requiring a teacher. A dropdown appears containing only teachers who teach *at least one* course common to both students (ensuring domain knowledge).
2. **Notification**: 
   > **Subject**: URGENT: Student War Judgement Requested
   > **Body**: "Student A and Student B have declared a [Knowledge Duel]. They have requested you as the presiding judge. Role requires: 15 mins to write questions, 20 mins to supervise live. Do you accept?"
   > [Accept] [Decline] (Expires in 24h)
3. **Teacher Accepts**: Granted `WAR_JUDGE` role. Gains access to the private teacher dashboard in the war server to configure the bout.
4. **Teacher Declines/Timeout**: Proposing student is notified and gets 12 hours to pick another. If that fails, the war auto-converts to its nearest non-teacher equivalent:
   - Knowledge Duel -> Karma Sprint
   - Speed Round -> Karma Sprint
   - Creative Clash -> Reputation War

---

## WAR TYPE SELECTION UI

**LAYOUT**
- 3x3 Grid of Cards (8 types + Auto Random).
- Each card has: Name, 1-line description, "Favors: [Skill]" pill.
- **Teacher Required Indicator**: A prominent golden gavel icon appears on KD, CC, and SR. 
- **Expansion**: Clicking a card slides down a drawer with the full rules, duration, and the teacher picker (if applicable).

**STRATEGIC HINTS (Tooltips)**
- *Knowledge Duel*: "Choose this if you have perfect recall."
- *Karma Sprint*: "Choose this for pure hustle and high activity."
- *Attendance Siege*: "Choose this if you never skip a day."
- *Creative Clash*: "Choose this to let your work speak for itself."
- *Speed Round*: "Choose this if you thrive under extreme pressure."
- *Silent War*: "Choose this to make a point."
- *Reputation War*: "Choose this if your answers help strangers."
- *Wildcard*: "Choose this if you fear nothing."

---

## COMPLETE WAR TYPE COMPARISON TABLE

| War Type | Teacher Req. | Duration | Favors | Ally Role | Gameable? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Knowledge Duel** | Yes | 15-30 Mins | Retention | Spectator | Low (IP checks) |
| **Karma Sprint** | No | 48 Hours | Hustle | Guardian (Flags) | Medium |
| **Attendance Siege**| No | 14 Days | Discipline | Accountability | Very Low |
| **Creative Clash** | Yes | 4 Days | Creativity | Campaigner | Medium (Voting) |
| **Speed Round** | Yes | ~5 Mins | Reactions | Spectator | Low (Latency checks)|
| **Silent War** | No | 14 Days | Ego/Discipline | Moral Support | Very Low |
| **Reputation War** | No | 7 Days | Objectivity | Researcher | High (Mitigated) |
| **Wildcard War** | Depends | Varies | Adaptability | Varies | Varies |

### FORBIDDEN COMBINATIONS
- **Attendance Siege / Silent War**: Cannot be configured for a duration under 7 days.
- **Speed Round**: Cannot be initiated if either student has a ping > 500ms to the Socket.io server.

### RECOMMENDED PAIRINGS (For Best-of-3 Bouts)
- **The Classic**: Knowledge Duel -> Karma Sprint -> Wildcard
- **The Marathon**: Attendance Siege -> Reputation War -> Karma Sprint
- **The Gladiator**: Speed Round -> Knowledge Duel -> Speed Round

---

## DATABASE SCHEMA (Prisma/SQL Reference)

```prisma
model WarType {
  id                           String  @id @default(uuid())
  name                         String  @unique // e.g., "KNOWLEDGE_DUEL"
  description                  String
  requiresTeacher              Boolean
  minDurationHours             Int
  maxDurationHours             Int
  isAvailableForStudentWar     Boolean @default(true)
  isAvailableForBranchWar      Boolean @default(false)
  probabilityWeightForRandom   Int     // e.g., 20
  fallbackTypeId               String? // Self-relation for teacher decline
  fallbackType                 WarType? @relation("FallbackType", fields: [fallbackTypeId], references: [id])
  
  bouts                        StudentWarBoutConfig[]
}

model StudentWarBoutConfig {
  id               String   @id @default(uuid())
  warId            String   // FK to main StudentWar table
  warTypeId        String   // FK to WarType
  status           String   // PENDING, ACTIVE, COMPLETED, CONVERTED
  teacherId        String?  // FK to User (Teacher)
  teacherStatus    String?  // NOMINATED, ACCEPTED, DECLINED
  startTime        DateTime?
  endTime          DateTime?

  // Type-specific config JSON to avoid massive table sprawl for rare fields
  // Contains schema-validated JSON based on the warTypeId
  typeConfigData   Json     
}

// Example typeConfigData JSON structures expected by the application:

// KNOWLEDGE_DUEL config JSON
// {
//   "questionIds": ["q1", "q2"],
//   "timePerMcSec": 30,
//   "timePerOpenSec": 90
// }

// KARMA_SPRINT config JSON
// {
//   "pausedWindowStartHour": 0, // midnight
//   "pausedWindowEndHour": 6,
//   "excludeSources": ["POST", "COMMENT"]
// }

// SPEED_ROUND config JSON
// {
//   "scheduledWindowStart": "2024-05-15T18:00:00Z",
//   "scheduledWindowEnd": "2024-05-15T22:00:00Z",
//   "questionCount": 15,
//   "latencyCompensationMs": 150
// }
```
