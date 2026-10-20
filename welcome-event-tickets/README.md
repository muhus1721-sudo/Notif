# Event Tickets

A small phone app for the welcome event. You upload your finished ticket design,
and the app adds a serial number to every ticket (`NW-001`, `NW-002`, …) and
makes a print-ready PDF for the printing vendor. It then keeps track of who
bought each ticket in a **shared Google Sheet** that the whole team sees live
and that opens in Excel.

Three screens, nothing else:

| Tab | What it does |
|---|---|
| **Ticket** | Upload the design (PNG or JPG). Tap where the number goes; pick its size and colour. |
| **Print** | Say how many tickets. Get one PDF with every ticket numbered, laid out on A4. |
| **Sales** | One row per serial. Tap a ticket → enter the buyer → **Mark as sold**. Search, filter, share. |

## How printing works

- Each ticket is exactly **7 × 3.5 in** — never shrunk, stretched or cropped.
- The app tries the page both ways round and picks the one that fits more
  tickets. On **A4** that is **3 tickets per page** (page upright, tickets
  sideways), leaving about 0.63 in at the sides and 0.6 in at the top and bottom.
  200 tickets = **67 pages**.
- Tickets touch each other, so one cut separates two of them. Thin **cut marks**
  in the white margin show the vendor exactly where to cut. Every page has the
  same marks, so the vendor can stack the sheets and cut them all at once.
- Before making the PDF the app checks every ticket is full size, inside the
  printable area and not overlapping, and refuses to make a PDF that fails.
- Numbering carries on between batches: print 200 now (`NW-001`–`NW-200`) and
  50 later, and the second batch starts at `NW-201`. If you re-print numbers
  that already exist (e.g. to replace spoiled tickets), the app warns you.
- Settings on the Print tab: **US Letter** paper (also 3 per page) or **1 per
  page** (each page is exactly 7 × 3.5 in), in case the vendor asks for it.

**Design tips:** export the design at **2100 × 1050 px** (300 DPI) — the app
warns you if it's smaller. A4 sheets have no room for bleed, so give the design
a plain border and keep text at least 3 mm (⅛ in) from the edges. The app also
warns you if the serial number is too close to an edge.

**Tell the vendor:** "A4, 3 tickets per sheet, cut on the marks, final size
7 × 3.5 in, no bleed." If they need bleed, switch the app to **1 per page**.

## Connect the Google Sheet (one person, once — about 5 minutes)

1. Go to [sheets.new](https://sheets.new) and name the sheet, e.g. *Welcome Event Tickets*.
2. In the sheet: **Extensions → Apps Script**. Delete what's there, paste in the
   whole of [`google-apps-script/Code.gs`](google-apps-script/Code.gs), and change
   `TEAM_KEY` near the top to a password of your choice. Click **Save**.
3. Click **Deploy → New deployment**. Click the gear ⚙ → **Web app**.
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - Click **Deploy**, then **Authorize access**, pick your Google account.
     Google warns that the app isn't verified (it's your own script): click
     **Advanced → Go to … (unsafe) → Allow**.
4. Copy the **Web app URL** (it ends in `/exec`).
5. In the app: **Sales → Share → Connect Google Sheet**. Paste the URL, type the
   team key, your name and the ticket price, and tap **Connect**.
6. Send the URL and team key to the other sellers so they can do step 5 too.
   Use the sheet's own **Share** button to let people view it in Google Sheets.

The sheet gets a **Tickets** tab with the columns
`Serial | Buyer Name | Phone | Price | Sold By | Date Sold | Status`.
Phone numbers keep their leading zero; Price is a number, so you can total it.

**Changing the script later:** Deploy → Manage deployments → ✏️ → Version: *New
version* → Deploy. The URL stays the same.

**Keep the team key private** — anyone with the URL and key can record sales.

### How the live sheet behaves

- Every sale goes to the sheet straight away, and each phone pulls everyone
  else's changes every 20 seconds (and whenever the app is opened).
- **No signal?** Keep selling. Sales are saved on the phone and upload by
  themselves when the connection is back. The Sales tab shows "Offline · 3
  changes waiting".
- **Two people sell the same ticket?** The first sale wins. The second phone is
  told "NW-017 is already sold to …" and its sale is not saved.
- Without a sheet connected the app still works on its own; connecting later
  uploads everything recorded so far.

### Getting it into Excel

From **Sales → Share**:
- **Download as Excel** — the live sheet as an `.xlsx` (needs a Google login
  that can see the sheet).
- **Share as CSV** — a file from the phone that opens in Excel, Numbers or
  Google Sheets; send it by WhatsApp or email.
- Or in Google Sheets: **File → Download → Microsoft Excel (.xlsx)**.

## Install on Android

Every push builds an APK with GitHub Actions (*Build Tickets APK*). Open the
repository's **Releases** on your phone, pick the newest **Event Tickets - build
N**, and tap the `.apk`. Android will ask to allow installing from your browser —
that's expected for an app not from the Play Store.

## For developers

```bash
npm install
npx expo start     # scan the QR code with Expo Go
npm test           # jest, against iOS and Android module resolution
npm run typecheck
npm run assets     # redraws the icons in assets/
```

```
App.tsx                         tab bar + the three screens
src/
  layout.ts                     page maths: orientation choice, fit check, cut marks
  pdf.ts                        builds the numbered PDF with pdf-lib
  serial.ts                     NW-001 formatting/parsing and text measuring
  design.ts                     picking/storing the design, design warnings, sharing files
  sheet.ts                      Google Sheet client, CSV export
  useTickets.ts                 the store: local rows + queue of changes synced to the sheet
  storage.ts                    AsyncStorage persistence
  screens/                      TicketScreen, PrintScreen, SalesScreen
  components/                   SellSheet, ConnectSheet, small UI pieces
google-apps-script/Code.gs      the script that runs inside the Google Sheet
test-utils/fakeSheet.ts         runs Code.gs against an in-memory sheet in tests
```

`metro.config.js` pins `tslib` (a pdf-lib dependency) to its CommonJS build;
without it the web bundle fails at start-up.
