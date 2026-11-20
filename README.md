# Gradebook

A student grade tracker for the University of Ruhuna Faculty of Engineering. React and Vite serve the frontend. The same Node.js API runs in Vite locally and in a Vercel Function after deployment. Both environments use Clever Cloud MySQL.

## Run locally

1. Install Node.js 24 and run `npm ci`.
2. Add your database configuration to `.env.local`. The supplied installation uses the connection settings in `.env.example`, with the password and the private MySQL CA in the ignored local environment file. Keep both the password and the environment file out of version control.
3. Run `npm run db:setup` to create the Gradebook tables and initial accounts. This command preserves existing account credentials and results when rerun. It prints generated temporary passwords at account creation. Each account changes its temporary password at first sign-in.
4. Run `npm run dev` and open the Local URL printed by Vite. Run `npm test` for the grading and curriculum regression checks or `npm run build` for the production bundle.

## Vercel

Import this folder or its Git repository as a Vite project using Node.js 24. Set `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, and the private `DATABASE_CA` when applicable in the project's server-side environment. Use the trusted CA PEM for this specific database. The local copy pins the CA presented by the supplied Clever Cloud endpoint during setup. Obtain a replacement trusted CA from the provider if the certificate authority changes. Run the schema setup from a trusted machine before using the deployment.

The included configuration sends API requests to the Node.js function and browser routes to the Vite SPA. The function region is Paris, near Clever Cloud's MySQL infrastructure. Preview and production environment settings control which database each deployment accesses.

## Curriculum and GPA

- The 24th–27th batch handbooks supply the common core and five specialization templates. The 23rd batch starts with the 24th-batch template and the 28th starts with the 27th-batch template until their handbooks are available.
- A student can edit names, codes, credits, grade scales, and module types or remove and add modules. Selecting a specialization in the profile fills empty semesters with its defaults. Multi-semester projects shown twice under one code divide the coded credit total across their entries. The 25th- and 26th-batch Computer Engineering templates carry the undergraduate project into Semester 8 by convention.
- Pending and non-GPA grades and zero-credit modules contribute no GPA credits. Explicit GPA grade E contributes zero grade points and retains its credits. MC, AC, and WH suppress the applicable SGPA and the cumulative value. The app computes with unrounded credit totals. It displays the SGPA and current CGPA to two decimals.
- Current CGPA reflects all entered GPA results. For official degree classification, the faculty also considers completion requirements and optimization of excess electives. Gradebook currently reports the cumulative figure.
