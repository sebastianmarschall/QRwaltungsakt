# Security Policy

QRwaltungsakt generiert Zahlungs-QR-Codes – Fehler können hier reales Geld
fehlleiten. Sicherheitsmeldungen sind ausdrücklich willkommen.

## Scope

Besonders interessant:

- Alles, was dazu führen kann, dass ein QR-Code andere Daten enthält als das
  Formular anzeigt (Parser-Verwechslungen, Encoding-Tricks im EPC-Payload).
- Verletzungen des Trust-Modells: jede Möglichkeit, dass Daten das Gerät
  verlassen (CSP-Bypass, Abhängigkeiten mit Netzwerkzugriff).
- Manipulierte PDFs, die den Parser zu falschen, aber warnungsfreien
  Ergebnissen bringen.

## Melden

Bitte **nicht** als öffentliches Issue. Stattdessen:

- GitHub: [Privately report a vulnerability](https://github.com/sebastianmarschall/QRwaltungsakt/security/advisories/new)
- E-Mail: sebastian@nicebyte.io

Antwort normalerweise innerhalb weniger Tage. Unterstützt wird immer nur der
aktuelle Stand von `main` bzw. das aktuelle Deployment auf
[qrwaltungsakt.at](https://qrwaltungsakt.at).
