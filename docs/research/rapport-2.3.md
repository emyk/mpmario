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
| Verktøy/modeller brukt | Claude Code CLI, Claude Sonnet 4.6, Superpowers plugin v5.0.7 |
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

Etter merge ble spillet kjørt og testet interaktivt for første gang, og ytterligere feil ble funnet og fikset i en oppfølgingsøkt.

#### Betingelser

| Betingelse | Beskrivelse |
|---|---|
| A – Agentstyrt TDD (oppgave 1–17) | Subagenter implementerer én oppgave av gangen med TDD. Ingen menneskelig kode-skriving. To-stegs gjennomgang etter hver oppgave (spec-samsvar, deretter kodekvalitet). |
| B – Interaktiv feilretting (post-launch) | Etter at alle tester passerte og kode ble merget, ble spillet kjørt i nettleser for første gang. Feil ble oppdaget og fikset i dialog med agenten. |

#### Målemetoder

- Antall tester som passerte etter betingelse A (kvantitativ)
- Antall runtime-feil funnet i betingelse B som ikke ble fanget av tester (kvantitativ)
- Kategorisering av feil etter type (runtime-omgivelse, visuell rendering, spillmekanikk, deployment)
- Antall iterasjoner for å løse hvert problem i betingelse B
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
| Feil fanget av spec-gjennomgang | 6 (se under) |

Feil fanget av gjennomgangsprosessen (ikke av tester):
- LobbyRoom race condition (oppgave 3)
- X-akse veggtelling dobbelt (oppgave 6)
- `heightTiles * 32` magisk tall (oppgave 8)
- Ildkule dreper to ganger (oppgave 9)
- VoteScene død-kode-overgang (oppgave 15/16)
- `joinGame` WebSocket-lekkasje (oppgave 12/16)

### Betingelse B – Interaktiv feilretting

Følgende feil ble oppdaget ved første kjøring og ble ikke fanget av noen test:

| Feil | Type | Antall iterasjoner å løse |
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

### Kvalitative observasjoner

- Agenten diagnostiserte alle feil korrekt ved første eller andre forsøk, gitt en feilmelding eller skjermbeskrivelse fra brukeren.
- Den vanskeligste feilen å diagnostisere var dekoratorkrasjet: første diagnose (root-tsconfig) var feil. Korrekt årsak (esbuild TC39 vs. legacy TypeScript decorator-format pga. `paths`-override) krevde dypere forståelse av tsx/esbuild-internals.
- Tunneling-feilen i stompdeteksjon var konseptuelt ikke-triviell: feilen skyldes at `MAX_FALL_SPEED = 12` overstiger stompvinduet på 8 px på én tick. Agenten foreslo pre-fysikk-posisjon som løsning uten hint.
- Railway-byggfeilene krevde 3 iterasjoner pga. mangel på klar dokumentasjon om Nixpacks vs. `buildCommand`-prioritet.

---

## 5. Diskusjon

#### Hva funket

**Strukturert plan med fullstendig kode i hvert steg** var avgjørende for subagentenes effektivitet. Subagenter trengte ikke å lese design-spec – planen var selvforsynt. Dette reduserte kontekstfeil betydelig.

**To-stegs gjennomgang** (spec-samsvar + kodekvalitet) fanget feil som tester ikke fanget. Spec-gjennomgangen var særlig verdifull fordi den hindret over-bygging («det var ikke i spec»-kontroll) og fant én planfeil der planen selv var gal.

**Agentens feildiagnostisering** var sterk når det forelå konkrete feilmeldinger. Å lime inn en stack trace eller console-feil ga nesten alltid korrekt diagnose på første forsøk.

**Ferskt kontekst per subagent** holdt implementørene fokuserte. Ingen akkumulert forvirring mellom oppgaver.

#### Hva funket ikke

**Visuell rendering ble aldri verifisert end-to-end** under betingelse A. Alle 17 klientoppgaver ble verifisert kun via TypeScript-kompilering. Dette er strukturelt uunngåelig i en container uten port-forwarding, men det betyr at hele klientrenderingspipelinen var uverifisert ved merge.

**Tester dekker ikke kjøretidsomgivelse.** Dekoratorkrasjet, Vite-port-konflikten og Railway-byggfeilene er utenfor hva enhetstester kan fange. Disse feilene er reelle produksjonsfeil som kun oppdages ved faktisk kjøring.

**Spillmekanikk er vanskelig å teste med enhetstester.** Stompvinduet på 8 px og `MAX_FALL_SPEED = 12` er begge enhetstestet isolert, men kombinasjonen (tunneling) testet aldri. Integrasjonstester som simulerer en full físikk-tick med entitetskollisjon ville ha fanget dette.

**Agenten kan ikke se skjermen.** Visuelle feil (feil farger, manglende sprites, feil posisjonering) krever at brukeren beskriver hva de ser. Kvaliteten på diagnosen er direkte proporsjonal med kvaliteten på brukerens beskrivelse.

#### Begrensninger

- Kun én deltaker – ingen sammenligning mellom ulike utvikleres erfaringer med samme arbeidsflyt.
- Ingen tidsmåling per fase – det er vanskelig å kvantifisere koordineringskostnad vs. implementeringstid.
- Betingelse A og B er ikke isolerte eksperimenter med samme oppgave – de er sekvensielle faser i én prosess.
- Railway-deployment er en ekstern faktor med dårlig dokumentasjon; byggfeilene sier mer om Railway enn om agenten.

---

## 6. Konklusjon

Agentstyrt TDD med subagent-driven development produserte et fullstendig fungerende multiplayer-spill (31/31 tester, ren TypeScript-kompilering) uten at utvikleren skrev en eneste kodelinje – men 8 kategorier av feil ble bare oppdaget ved interaktiv kjøring av det faktiske spillet. Dette bekrefter hypotesen: det eksisterer et systematisk gap mellom «testene passerer» og «systemet fungerer i praksis», særlig for kjøretidsomgivelse, visuell rendering og deployment. Det viktigste funnet for praksis er at agentstyrt utvikling krever et eksplisitt end-to-end verifikasjonssteg etter automatiske tester – strukturert interaktiv testing er ikke et alternativ, men et nødvendig komplement.
