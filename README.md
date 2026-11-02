# Manage Myself

Manage Myself is a personal vault built with Next.js. It stores website credentials, payment cards, identity and insurance records, Markdown notes, and lending or borrowing records in category-based vaults. Sensitive values are encrypted in the browser before they are sent to the database, except Notes and Cash, which are intentionally stored unencrypted.

## Application Flow

1. A visitor selects **Sign In / Register with Google**.
2. Google OAuth authenticates the user and returns the profile to `/api/auth/callback`.
3. The application creates or updates the user record, creates a 30-day session, and redirects to `/dashboard`.
4. The dashboard shows the user's vault categories and counts, plus records shared with or by the user.
5. The user creates an item and submits the form. Encrypted categories require an encrypting PIN of at least four digits; Notes and Cash do not.
6. For encrypted categories, the browser encrypts secret fields and metadata with AES-256-GCM before they are sent to the database. Cash and Notes are stored unencrypted.
7. To reveal or edit an encrypted item, the user enters its PIN. Cash and Notes open without a PIN.
8. Revealed values are visible for 30 seconds, then the local reveal state is cleared.

## Features

- Google sign-in and registration with an HTTP-only session cookie.
- Category-based vaults for Websites, Cards, Identity, Money Matters, Notes, Insurance, and Cash.
- Create, reveal, edit, and delete vault items.
- Browser-side encryption for passwords, card data, identity numbers, insurance policies, and metadata.
- Markdown notes stored without encryption and shared through the same access controls as other vault records.
- Cash lending and borrowing records with plaintext partial or full repayment entries and automatic outstanding-balance calculations.
- Sharing with another registered user by email.
- Share modes: `once` (one reveal), `view`, and `edit`.
- Individual or complete share revocation by the credential owner.
- Responsive client-side dashboard with loading and toast feedback.

## Categories

| Category | Subcategories | Stored data |
| --- | --- | --- |
| Websites | Banking, Social Media, Work Tools, Shopping, Entertainment, Misc | URL, login ID, password, description |
| Cards | Debit, Credit | Card number, CVV, expiry date, cardholder name, card PIN |
| Identity | Aadhar, PAN, VOTER ID | Identity number |
| Money Matters | Bank Account, Demat Accounts, Insurance, Mutual Funds, Stocks | URL, login ID, password, description |
| Notes | — | Markdown title and body (stored without encryption) |
| Insurance | Medical Wealth, Health, Term, Auto | Encrypted provider, policy, coverage, premium, and period details |
| Cash | Lent, Borrowed | Plaintext person, principal, date, and repayment ledger |

Every item also has a required nickname. A nickname must be unique within the owner's vault.

## Requirements

- Node.js 20 or newer
- npm
- A Google OAuth application with the callback URL configured
- Turso/libSQL for deployed or remote storage, or the local SQLite-compatible fallback for development

## Local Setup

1. Install dependencies:

	```bash
	npm install
	```

2. Create `.env.local` with the values for the environment you are running:

	```dotenv
	TURSO_DATABASE_URL=file:local.db
	TURSO_AUTH_TOKEN=
	GOOGLE_CLIENT_ID=your-google-client-id
	GOOGLE_CLIENT_SECRET=your-google-client-secret
	NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
	NEXT_AUTHURL=http://localhost:3000
	NEXTAUTH_SECRET=replace-with-a-random-secret
	LOCAL_BYPASS=false
	```

	For Turso, replace `TURSO_DATABASE_URL` with the `libsql://` database URL and provide `TURSO_AUTH_TOKEN`.

3. Initialize a local database when using the local fallback:

	```bash
	node init-db.js
	```

	For a Turso database, execute [`schema.sql`](schema.sql) against the database before first use. The application also performs small compatibility migrations for columns added after the initial schema.

4. Add `http://localhost:3000/api/auth/callback` to the authorized redirect URIs in Google Cloud Console.

5. Start the development server:

	```bash
	npm run dev
	```

	Open [http://localhost:3000](http://localhost:3000).

## Usage Guide

### Add an item

1. Sign in with Google and open a vault category.
2. Select **Add**.
3. Choose a subcategory and enter a nickname.
2. Select **Add**.
3. Enter a nickname and choose a subcategory when the category uses them.
4. Enter the category-specific values. Encrypted categories require an encrypting PIN of at least four digits; Notes do not use encryption or a PIN.
5. Submit the form. Encrypted data is processed in the browser before the request reaches `/api/credentials`.

For Cash records, open the record to add partial or full repayments. Payments are stored as plaintext, and the outstanding balance updates from the repayment history.

Keep the encrypting PIN available for encrypted items. It is required to decrypt them and is not stored by the application.

### Reveal or edit an item

Select an encrypted item and enter its encrypting PIN. The decrypted values are held in client state for the 30-second reveal window. Editing requires PIN verification and re-encrypts the updated values before saving. Notes and new Cash records open without a PIN and remain unencrypted in storage.

### Share an item

1. Open the item's action menu and choose sharing.
2. Enter the email address of another user who has already registered.
3. Choose `once`, `view`, or `edit` access.
4. Submit the share. Existing access for the same recipient is updated to the selected mode.

The owner can review recipients in **Shared by me** and revoke selected recipients or all access. Recipients can find available items in **Shared with me**. One-time shares are removed after the recipient reveals the item.

## Technical Specification

### Stack

- Next.js `14.2.x` App Router
- React `18.3.x`
- Node.js crypto APIs
- `@libsql/client` for Turso/libSQL access
- Google OAuth 2.0 with OpenID Connect profile data
- SQLite-compatible SQL schema

### Encryption

`lib/crypto.js` derives a 32-byte key from the user PIN with PBKDF2-HMAC-SHA256 using 100,000 iterations and a random 16-byte salt. It encrypts values with AES-256-GCM and a random 12-byte IV. The stored ciphertext includes the authentication tag, while the salt and IV are stored beside the ciphertext.

The client encrypts payloads for encrypted categories (not Notes or Cash):

- Metadata: website URL, login ID, and description.
- Secret data: password or identity number, or the complete card payload for Cards.
- Structured Insurance policy data.

The server receives and stores encrypted fields but does not perform the PIN-based encryption or decryption.

Notes and Cash are stored in plaintext so they can be used without a PIN. Do not put secrets in either category that must remain encrypted at rest.

### Session and authorization

- OAuth state is stored in a short-lived HTTP-only cookie during sign-in.
- Successful login creates a random session token in the `sessions` table.
- The session token is stored in an HTTP-only, same-site cookie.
- Sessions expire after 30 days.
- Credential reads, writes, shares, and revocations verify the current session.
- Only owners can delete credentials or change sharing. Users with `edit` access can update a shared credential.

### Database model

| Table | Purpose |
| --- | --- |
| `users` | Google profile identity and account metadata |
| `sessions` | Session tokens, owners, and expiration timestamps |
| `credentials` | Credential ownership, category, encrypted payloads, salts, IVs, and timestamps |
| `credential_shares` | Recipient access, share mode, and share timestamp |
| `notes` | Plaintext Markdown notes, kept separate from credential records |
| `note_shares` | Recipient access and share mode for Notes |
| `cash_transactions` | Plaintext repayment entries linked to Cash credentials |

Credential rows use `UNIQUE(owner_id, nickname)`. Notes have their own `UNIQUE(owner_id, nickname)` constraint; the API also checks names across both tables. Share rows use a composite key within their respective share table.

### API routes

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/auth/signin` | `GET` | Start Google OAuth |
| `/api/auth/callback` | `GET` | Validate OAuth state, exchange code, and create a session |
| `/api/auth/logout` | `GET` | End the current session |
| `/api/dashboard` | `GET` | Load dashboard credential and sharing summaries |
| `/api/categories/[name]` | `GET` | Load credentials for a category |
| `/api/credentials` | `GET`, `POST` | List and create credentials |
| `/api/credentials/[id]` | `PUT`, `DELETE` | Update or delete a credential |
| `/api/credentials/[id]/info` | `GET`, `POST` | Return encrypted data for local decryption |
| `/api/credentials/[id]/transactions` | `GET`, `POST` | Load or append encrypted Cash repayments under the record's sharing permissions |
| `/api/notes` | `POST` | Create a plaintext Markdown note |
| `/api/notes/[id]` | `PUT`, `DELETE` | Update or delete a note |
| `/api/notes/[id]/info` | `GET` | Read a note under its sharing permissions |
| `/api/share` | `GET`, `POST` | List and create/update shares |
| `/api/share/revoke` | `POST` | Revoke selected or all shares |

## Commands

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm start         # Serve the production build
npm run lint      # Run Next.js linting
```

## Security Notes

- Never commit `.env.local`, OAuth secrets, Turso tokens, or production session secrets.
- Rotate any credentials that may have been exposed in source control or shared logs. Development configuration should be moved to environment variables before deployment.
- Use HTTPS in production so OAuth redirects and session cookies remain protected in transit.
- The encryption PIN cannot be recovered by the application. Losing it makes the encrypted item unreadable.
- Notes are not encrypted at rest. Anyone with authorized access to a shared note can read its Markdown body without a PIN.
- Cash records and repayment entries are not encrypted at rest. Anyone with authorized access to a shared Cash record can read its details and ledger.
- This project is a self-hosted vault implementation, not a formal security product audit. Review dependencies, deployment headers, backups, logging, and access controls before storing production secrets.

## Project Layout

```text
app/                 Next.js pages and route handlers
components/          Client-side dashboard, forms, rows, and sharing UI
lib/                 Database, OAuth, encryption, loading, and toast helpers
schema.sql           Turso/libSQL schema
init-db.js            Local SQLite-compatible database initializer
public/               Static assets
```
