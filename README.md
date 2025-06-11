# Rev Avstemning System

Et system for å stemme på den søteste reven mellom to tilfeldige revebilder.

## Funksjonalitet

- Viser to tilfeldige revebilder fra [randomfox.ca](https://randomfox.ca)
- Brukere kan stemme på den søteste reven
- Viser toppliste over de mest populære revene
- Live-oppdateringer av stemmer via Socket.IO
- Responsivt design som fungerer på både desktop og mobil
- Universell utforming med god tilgjengelighet

## Teknisk Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js med Express
- **Database**: MongoDB
- **Templating**: EJS
- **Realtime**: Socket.IO
- **Styling**: Bootstrap 5
- **Notifikasjoner**: Toastr

## Systemkrav

- Node.js 14.x eller nyere
- MongoDB 4.x eller nyere
- npm eller yarn

## Installasjon

1. Klon repositoriet:
   ```bash
   git clone https://github.com/ashoplay/eksamen.git
   cd eksamen
   ```

2. Installer avhengigheter:
   ```bash
   npm install
   ```

3. Opprett `.env` fil i rotkatalogen:
   ```
   PORT=3000
   MONGODB_URI=mongodb://10.12.90.11:27017/fox_rating
   SESSION_SECRET= (det du ønsker)
   NODE_ENV=development
   ```

## Kjøring

1. Start serveren:
   ```bash
   npm start
   ```

2. Besøk `http://localhost:3000` i nettleseren

## VM Oppsett

### Frontend VM (10.12.90.10)

1. Installer Node.js og npm
2. Klon repositoriet
3. Installer avhengigheter
4. Konfigurer brannmur:
   ```bash
   sudo ufw allow 3000
   sudo ufw enable
   ```

### MongoDB VM (10.12.90.11)

1. Installer MongoDB
2. Konfigurer MongoDB til å lytte kun på intern IP:
   ```bash
   sudo nano /etc/mongod.conf
   ```
   Endre bindIp til:
   ```yaml
   bindIp: 127.0.0.1,10.12.90.11
   ```
3. Konfigurer brannmur:
   ```bash
   sudo ufw allow from 10.12.90.10 to any port 27017
   sudo ufw enable
   ```

## Sikkerhet

### Potensielle Sikkerhetshull

1. **Injeksjonsangrep**: MongoDB-spørringer må saniteres
2. **XSS-angrep**: Brukerinput må valideres og escapes
3. **DoS-angrep**: Implementer rate-limiting

### Mulige Angrepstyper

1. **DDoS-angrep**: Overbelastning av serveren
2. **Brute Force-angrep**: Gjentatte forsøk på å manipulere stemmer

### Sikkerhetstiltak

1. Implementert rate-limiting på API-endepunkter
2. IP-basert stemmeregistrering for å hindre duplikater
3. Input-validering på server-side
4. CORS-beskyttelse
5. Sikker MongoDB-konfigurasjon
6. Brannmurkonfigurasjon på begge VM-er

## API-dokumentasjon

### POST /api/vote
Registrerer en stemme på en rev.

**Request Body:**
```json
{
    "foxId": "string"
}
```

**Response:**
```json
{
    "success": true,
    "fox": {
        "imageId": "number",
        "imageUrl": "string",
        "votes": "number"
    }
}
```

### GET /api/top-foxes
Henter topplisten over de mest populære revene.

**Response:**
```json
[
    {
        "imageId": "number",
        "imageUrl": "string",
        "votes": "number"
    }
]
```

## Feilsøking

### Vanlige Problemer

1. **Kan ikke koble til MongoDB**
   - Sjekk at MongoDB kjører
   - Verifiser IP-adresse og port
   - Sjekk brannmurkonfigurasjonen

2. **Bilder lastes ikke**
   - Sjekk internettforbindelse
   - Verifiser at randomfox.ca er tilgjengelig
   - Sjekk nettleserens konsoll for feilmeldinger

3. **Live-oppdateringer fungerer ikke**
   - Sjekk at Socket.IO er konfigurert riktig
   - Verifiser at WebSocket-tilkoblingen er åpen
   - Sjekk nettleserens konsoll for feilmeldinger

## Universell Utforming

- Semantisk HTML-struktur
- ARIA-labels på interaktive elementer
- Høy kontrast for bedre lesbarhet
- Tastaturnavigasjon støttet
- Responsivt design for alle enheter
- Alt-tekst på alle bilder
- Støtte for skjermlesere 