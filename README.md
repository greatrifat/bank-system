# Tour Management System

A project-based tour expense-management application built with Next.js, TypeScript, MongoDB, and Tailwind CSS. An admin manages tours, members, shared costs, payments, and notices, while members can view their own tour-specific cost details and download statements.

## Features

### Member features

- Secure email and password login
- View assigned and active tours
- Select a tour to open its dashboard
- View a personal tour balance and cost summary
- Review payment and expense history
- See total credited and deducted amounts
- Read notices for the selected tour
- Download a tour-specific PDF statement

### Admin features

- Create and switch between tours
- Create member accounts
- Add or remove members from tours
- Activate or deactivate a member for each tour
- View all members and their tour balances
- Record payments and costs for individual members
- Distribute a shared tour cost or adjustment equally among active members
- View the combined balance for a tour
- Inspect each member's complete transaction history
- Publish tour-specific notices
- Review paginated login activity with search and status filters

### Security and data behavior

- Passwords are hashed with bcrypt
- Authentication uses JWTs that expire after 40 minutes
- Admin operations are protected with role-based authorization
- Members can access only their own balance and transaction information
- Memberships, balances, notices, and transactions are separated by tour
- Inactive members are excluded from shared cost distributions
- MongoDB uses a cached connection during development

## How It Works

Each project in the application represents a tour. A member can participate in multiple tours, and their balance and cost history are maintained independently for every tour.

The system currently stores financial entries as:

- `CREDIT` — money paid or added to a member's tour balance
- `DEBIT` — a tour cost or deduction charged to a member

The admin maintains these entries. Members have read-only access to their own tour summary and history.

## Tech Stack

- [Next.js 16](https://nextjs.org/) with the App Router
- [React 19](https://react.dev/)
- TypeScript
- MongoDB and Mongoose
- Tailwind CSS 4
- bcryptjs for password hashing
- jsonwebtoken for authentication
- jsPDF and jsPDF-AutoTable for downloadable statements

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- A MongoDB database

### Installation

1. Clone the repository and enter the project directory.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root:

   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
   JWT_SECRET=<a-long-random-secret>
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

### Create the first admin

With the development server running, send a one-time request to the seed endpoint:

```bash
curl -X POST http://localhost:3000/api/seed-admin
```

This endpoint does not create another admin when one already exists. The current seed credentials are defined in `app/api/seed-admin/route.ts`; change them before using the application outside local development.

## Available Scripts

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run start    # Start the production server
npm run lint     # Run ESLint
```

## Application Routes

| Route | Description |
| --- | --- |
| `/` | Landing page |
| `/login` | Shared login for admins and members |
| `/projects` | Member tour selection |
| `/dashboard` | Member's tour cost dashboard |
| `/admin` | Tour, member, cost, and payment management |
| `/admin/notice` | Tour notice editor |
| `/admin/loginactivity` | Searchable and paginated login audit log |

## Project Structure

```text
app/
  api/                  Authentication and management API routes
  admin/                Admin dashboard, notices, and login activity
  dashboard/            Member tour-cost dashboard
  login/                Shared authentication page
  projects/             Member tour selector
lib/                    Database, JWT, password, and authorization helpers
models/                 Mongoose data models
public/                 Static assets
```

## Data Model

The codebase retains some generic project and account naming internally, but these models represent tour-management concepts:

| Model | Tour-management purpose |
| --- | --- |
| `User` | Admin or tour-member identity and login details |
| `Project` | A tour and its unique code |
| `UserProject` | A member's participation and status in a tour |
| `Account` | A member's current balance for a tour |
| `Transaction` | A payment, cost, or adjustment recorded for a member |
| `Notice` | An announcement displayed for a tour |
| `LoginActivity` | Successful and failed login records |

## Typical Workflow

1. Create the first admin and sign in.
2. Create a new tour from the admin dashboard.
3. Create member accounts or assign existing members to the tour.
4. Record individual payments and expenses.
5. Distribute shared tour costs among active members when needed.
6. Publish tour announcements.
7. Members sign in, select a tour, and view or download their cost details.

## Production Notes

- Replace the seeded admin credentials before deployment.
- Use a strong, private `JWT_SECRET` and never commit `.env.local`.
- Restrict or remove development-only endpoints such as `/api/seed-admin` and `/api/test-db`.
- Run `npm run lint` and `npm run build` before deployment.

## License

No license has been specified for this project.
