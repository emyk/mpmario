---
tema: "Agentstyrt programvareutvikling med Claude Code"
---

# Rapport 2.3 – Agentstyrt implementasjon av et multiplayer-spill

---

## 1. Gruppeinformasjon

| Felt | Verdi |
|---|---|
| Gruppenummer | 2.3 |
| Deltakere | Espen Myklevoll |
| Tema | Tema 2 – Utvikler + agent i praksis |
| Dato(er) for eksperiment | 2026-04-24 |
| Verktøy/modeller brukt | Claude Code CLI, Claude Sonnet 4.6, Claude Opus 4.7, Superpowers plugin v5.0.7 |
| Repo / kodebase / case brukt | https://github.com/emyk/mpmario |

---

## 2. Valgt problemstilling

**Forskningsspørsmål:**
Kan en AI-agent (Claude Code med Superpowers-ferdigheter) implementere en komplett, fungerende multiplayer-nettleserapplikasjon fra scratch – og hvilke typer feil unngår den å oppdage på egenhånd?

**Hypotese:**
Agentstyrt utvikling med TDD vil produsere kode som passerer automatiske tester, men det vil finnes et gap mellom «testene passerer» og «spillet fungerer i praksis». Feil knyttet til kjøretidsomgivelse, visuell rendering og interaktiv spillatferd vil ikke bli fanget opp av enhetstester alene.

---

## 3. Eksperimentoppsett

#### Hva ble testet

Et fullstendig multiplayer-nettleser-plattformspill («mpMario») ble implementert fra bunnen av ved hjelp av en strukturert agentstyrt arbeidsflyt. Spillet er en 2–4 spillers «last man standing»-variant av Super Mario med server-autoritativ fysikk, fiende-AI, power-ups, ildkuler og post-kamp-votering om neste nivå.

Teknisk stack: Phaser 3 (klient-rendering), Colyseus 0.15 (server + WebSocket-tilstand), TypeScript, pnpm monorepo, Vite (klient-bygg), Railway (deployment).

Arbeidsflyten fulgte Superpowers-ferdighetene i rekkefølge:
1. **Brainstorming** → design-spec (teknisk stack, arkitektur, spillmekanikk)
2. **Writing-plans** → 17-stegs TDD-implementasjonsplan med fullstendig kode i hvert steg
3. **Using-git-worktrees** → isolert `implement`-gren
4. **Subagent-driven development** → én fersk subagent per oppgave, to-stegs gjennomgang (spec-samsvar + kodekvalitet) etter hver oppgave
5. **Finishing-a-development-branch** → merge til main
6. **Interaktiv testing** → første kjøring i nettleser, feil oppdaget og fikset
7. **Uavhengig kodegjennomgang** → to separate AI-modeller (Opus 4.7 og Sonnet 4.6) gjennomgikk hele repoet etter implementasjon

#### Betingelser

| Betingelse | Beskrivelse |
|---|---|
| A – Agentstyrt TDD (oppgave 1–17) | Subagenter implementerer én oppgave av gangen med TDD. Ingen menneskelig kode-skriving. To-stegs gjennomgang etter hver oppgave (spec-samsvar, deretter kodekvalitet). |
| B – Interaktiv feilretting (post-launch) | Etter at alle tester passerte og kode ble merget, ble spillet kjørt i nettleser for første gang. Feil ble oppdaget og fikset i dialog med agenten. |
| C – Uavhengig kodegjennomgang | To AI-modeller (Claude Opus 4.7 med 1M kontekst og Claude Sonnet 4.6) gjennomgikk hele repoet uten kjennskap til implementasjonshistorikken. |

#### Målemetoder

- Antall tester som passerte etter betingelse A (kvantitativ)
- Antall runtime-feil funnet i betingelse B som ikke ble fanget av tester (kvantitativ)
- Kategorisering av feil etter type (runtime-omgivelse, visuell rendering, spillmekanikk, deployment)
- Antall iterasjoner for å løse hvert problem i betingelse B
- Funn fra uavhengig kodegjennomgang (betingelse C): arkitektur, sikkerhet, testdekning, spec-samsvar
- Subjektiv vurdering av agentens evne til å diagnostisere og forklare feil

---

## 4. Resultater

### Betingelse A – Agentstyrt TDD

Alle 17 oppgaver ble fullført. Ved avslutning av betingelse A:

| Metrikk | Verdi |
|---|---|
| Serverenhetstester | 31 / 31 passerte |
| TypeScript-kompilering (alle pakker) | Ingen feil |
| Klient-bygg (Vite) | Vellykket (1,57 MB bundle) |
| Antall commits på `implement`-gren | 30+ |
| Feil fanget av spec-gjennomgang (ikke av tester) | 6 |

Feil fanget av gjennomgangsprosessen, ikke av tester:
- LobbyRoom race condition (oppgave 3)
- X-akse veggtelling dobbelt (oppgave 6)
- `heightTiles * 32` magisk tall (oppgave 8)
- Ildkule dreper to ganger (oppgave 9)
- VoteScene død-kode-overgang (oppgave 15/16)
- `joinGame` WebSocket-lekkasje (oppgave 12/16)

### Betingelse B – Interaktiv feilretting

Følgende feil ble oppdaget ved første kjøring og ble ikke fanget av noen test:

| Feil | Type | Antall iterasjoner |
|---|---|---|
| Server krasjer ved oppstart (`__decorateElement`-dekoratorfeil) | Kjøretidsomgivelse | 2 (første diagnose feil) |
| Colyseus 4211-feil («no rooms found») | Nettverksprotokoll | 1 |
| To separate lobby-rom per fane (én vinner umiddelbart) | Matchmaking-design | 1 (designendring) |
| Blå bakgrunn, ingen nivåfliser, spillere usynlige | Visuell rendering | 1 |
| Stomp dreper spilleren i stedet for fienden | Spillmekanikk (fysikktunneling) | 1 |
| Stor spiller sitter fast i bakken etter respawn | Spillmekanikk (tilstandsreset) | 1 |
| Railway-bygg feiler (3 separate byggfeil) | Deployment | 3 |
| Localhost-tilkobling feil port (3000 vs. 2567) | Nettverkskonfigurasjon | 1 |

**Totalt: 8 kategorier av feil funnet ved interaktiv testing som ikke ble fanget av 31 automatiske tester.**

### Betingelse C – Uavhengig kodegjennomgang

Begge modellene var samstemte i sin overordnede vurdering: arkitekturen er solid, TypeScript-disiplinen er god (strict mode, null `any`, ingen `@ts-ignore`), og server-autoritativ design er korrekt implementert. Sonnet 4.6 ga en «produksjonsmodenhet»-vurdering på **8/10**.

**Styrker identifisert av begge gjennomganger:**
- Ren lagdeling (klient → NetworkManager → server) med minimal RPC-kommunikasjon
- `packages/shared` som eneste kilde til sannhet for skjema, konstanter og meldingstyper
- Fysikk, kollisjon og fiende-AI er rene funksjoner – testbare uavhengig av romtilstand
- Colyseus-tilstandsdiff sender kun endrede felt, ingen full state-broadcast per tick

**Problemer identifisert av gjennomgangene:**

| Problem | Alvorlighet | Beskrivelse |
|---|---|---|
| Manglende inputvalidering (`MSG_INPUT`) | Middels | Ingen typeguard – ondsinnet klient kan sende `{left: "yes", jump: null}` |
| Manglende grensekontroll på `levelIndex` i votering | Middels | `levelIndex: 999` krasjer serveren – potensiell DoS-vektor |
| Magiske kollisjonskonstanter | Lav | `14, 16` (spillerbredde/-høyde) hardkodet 5 steder i `GameRoom.ts`, ikke i `constants.ts` |
| Stille feil i `resolveVote()` | Lav | Ved rom-opprettingsfeil broadcastes `roomId: ""` – spillet henger uten feilmelding til spillerne |
| Overfladisk helsesjekk | Lav | `/health` returnerer `{ ok: true }` uten å verifisere at Colyseus faktisk kjører |
| Bullet Bill ikke implementert | Info | `EnemyAI.ts:16` kommenterer at «bullets spawnes per-tick i GameRoom», men ingen slik logikk finnes |
| Lokal spiller-markering mangler | Info | `StateRenderer.ts:12` har `// TODO: use to highlight the local player's sprite` – aldri implementert |

**Testdekning ifølge gjennomgang:**
- Enhetstester (Physics, Collision, EnemyAI, LevelLoader): **utmerket** – alle kritiske baner dekket
- Integrasjonstester (GameRoom): **god** – men mangler stomp, ildkule-treff, power-up-samling og tie-breaking ved votering
- End-to-end: **ingen** – ingen automatiserte tester for 2–4 samtidige klienter

---

## 5. Diskusjon

#### Hva funket

**Strukturert plan med fullstendig kode i hvert steg** var avgjørende for subagentenes effektivitet. Subagenter trengte ikke å lese design-spec – planen var selvforsynt. Dette reduserte kontekstfeil betydelig.

**To-stegs gjennomgang** (spec-samsvar + kodekvalitet) fanget feil som tester ikke fanget. Spec-gjennomgangen var særlig verdifull fordi den hindret over-bygging og fant én planfeil der planen selv var gal.

**Agentens feildiagnostisering** var sterk når det forelå konkrete feilmeldinger. Å lime inn en stack trace eller console-feil ga nesten alltid korrekt diagnose på første forsøk. Den konseptuelt vanskeligste feilen – stompdeteksjon med fysikktunneling – ble diagnostisert og løst korrekt uten hint, med en pre-fysikk-posisjonssjekk som løsning.

**Arkitekturkvaliteten** bekreftes av de uavhengige gjennomgangene: begge modellene fremhever den rene separasjonen mellom klient, nettverk og server som et genuint arkitekturmessig styrke – ikke bare «ser ryddig ut».

**Ferskt kontekst per subagent** holdt implementørene fokuserte. Ingen akkumulert forvirring mellom oppgaver.

#### Hva funket ikke

**Visuell rendering ble aldri verifisert end-to-end** under betingelse A. Alle 17 klientoppgaver ble verifisert kun via TypeScript-kompilering. Gjennomgangene bekrefter dette gapet: ingen klienttester eksisterer overhodet.

**Sikkerhetshull ble ikke fanget av TDD.** Manglende inputvalidering og grensekontroll på `levelIndex` er middels alvorlige sikkerhetsproblemer som verken spec-samsvar-gjennomgang, kvalitetsgjennomgang eller enhetstester fanget. Dette er bekymringsfullt fordi begge har tydelig riktig «fix» – de er altså ikke vanskelige å skrive tester for, de ble bare ikke skrevet.

**Tester dekker ikke kjøretidsomgivelse.** Dekoratorkrasjet, Vite-port-konflikten og Railway-byggfeilene er strukturelt utenfor hva enhetstester kan fange.

**Spillmekanikk krever integrasjonstester, ikke enhetstester.** Stompvinduet og `MAX_FALL_SPEED` er begge enhetstestet isolert, men kombinasjonen (tunneling) ble aldri testet. Gjennomgangene peker på det samme: manglende stomptest, ildkuletest og power-up-test er de viktigste hullene i testsuiten.

**Agenten kan ikke se skjermen.** Visuelle feil krever at brukeren beskriver hva de ser. Kvaliteten på diagnosen er direkte proporsjonal med kvaliteten på brukerens beskrivelse.

**Noen spec-krav ble ikke implementert.** Bullet Bill er beskrevet i spec og i kode-kommentarer men aldri implementert – og dette ble ikke fanget av noen gjennomgang under betingelse A. Det ble først oppdaget av den uavhengige kodegjennomgangen i betingelse C.

#### Begrensninger

- Kun én deltaker – ingen sammenligning mellom ulike utvikleres erfaringer med samme arbeidsflyt.
- Ingen tidsmåling per fase – koordineringskostnad vs. implementeringstid er ikke kvantifisert.
- Betingelse A og B er ikke isolerte eksperimenter – de er sekvensielle faser i én prosess.
- Railway-deployment er en ekstern faktor; byggfeilene sier mer om Nixpacks-dokumentasjon enn om agentens evner.
- Kodegjennomgangene (betingelse C) ble utført av samme modellfamilie som implementerte koden. Uavhengighet er begrenset.

---

## 6. Konklusjon

Agentstyrt TDD med subagent-driven development produserte et fullstendig fungerende multiplayer-spill (31/31 tester, ren TypeScript-kompilering, produksjonsmodenhet 8/10 ifølge uavhengig gjennomgang) uten at utvikleren skrev en eneste kodelinje. Likevel ble 8 kategorier av runtime-feil bare oppdaget ved interaktiv kjøring, og to middels alvorlige sikkerhetshull ble ikke fanget av noen automatisert prosess – verken tester, spec-gjennomgang eller kvalitetsgjennomgang. Det viktigste funnet er todelt: agentstyrt utvikling produserer overraskende høy arkitekturkvalitet og testdekning for kjernelogikk, men har systematiske blindsoner for kjøretidsomgivelse, visuell rendering og sikkerhetsbetingelser ved systemgrenser. Disse blindsonene er ikke tilfeldige – de korresponderer nøyaktig med kategorier av krav som er vanskelige å uttrykke som enhetstester.

---

*Gjennomgangskilder: `docs/reviews/2026-04-24-repo-review-opus.md` (Claude Opus 4.7) og `docs/reviews/2026-04-24-review-sonnet.md` (Claude Sonnet 4.6)*
