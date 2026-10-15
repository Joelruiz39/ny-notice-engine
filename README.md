# ny-notice-engine

Deadline math, validation, and address rules for New York State (outside New York City) landlord notices. It powers [evictionforms.io](https://evictionforms.io).

> **Not legal advice.** This is self-help software provided as is, under the MIT license. It does not create an attorney-client relationship, and the authors are not a law firm. Deadlines and service rules vary and change. Consult a licensed New York attorney if you are unsure.

## What is here

| File | What it does |
| --- | --- |
| `src/notice-types.ts` | Form data types, the Good Cause Eviction Law exemption list, RPL § 226-c termination tiers (30/60/90 days), earliest move-out date, validation |
| `src/nyc-check.ts` | Detects New York City addresses by ZIP, county and city, because the forms here are written for outside NYC only |
| `src/pdf.ts` | Fills the official court PDFs (5-day notice, 14-day demand with the Good Cause notice, termination notice) from the form data |
| `src/petition-types.ts` | Petition form data, validation, which petition follows which notice |
| `src/petition.ts` | Fills the official nonpayment (LT-N2) and holdover (LT-H2) petitions and builds the filing packet: petition, statement of service, and the served notice as Exhibit A |
| `src/interview.ts` | The ordered interview: which questions to ask, which to skip, and how each answer is stored. It never calls an AI; free text is turned into structured values before it reaches this code |
| `src/interview-es.ts` | Spanish wording for the interview. The documents themselves stay in English |
| `src/node.ts` | Loads the form PDFs from the `forms/` folder in Node |

The official court PDFs are in `forms/` (see [forms/README.md](forms/README.md) for sources). Tests check that every field the engine fills still exists in each form, so a revised court form fails loudly instead of printing a blank line.

## Known issues for attorney review

These are open questions about legal behavior, not confirmed errors. Each one is how the engine works today and what a lawyer should confirm. Please don't "fix" them in a pull request without a cited source.

1. **The 5-day notice names one month but states the total for all of them.** The court form has a single "month of" field, so the engine fills the first unpaid period there, while the total rent owed is the sum of every period. Confirm this is acceptable, or whether a separate 5-day notice is needed per month.
2. **Good Cause form, exempt units (rent demand).** For an exempt unit the engine checks the exemption box in question 2 and leaves questions 3 and 4 blank (it checks 3A and 4E only for covered units). Question 4A reads "This unit is exempt from Article 6-A." Confirm whether 4A should be checked for exempt units.
3. **Good Cause form, holdover petition.** The engine checks 4A only when the unit is exempt (it used to check it when the unit was covered, which contradicts the form's own text). For covered units it leaves question 4 blank, because a covered unit needs a specific reason from the list and the engine does not guess one. Confirm the right handling.
4. **30/60/90-day period and lease term.** The engine chooses the period from how long the tenant has occupied the unit (RPL § 226-c). The form's wording for the 30, 60 and 90 day options also mentions the length of the lease term. The engine does not collect the lease term. Confirm whether it should.
5. **Earliest move-out date.** The engine does not count the month the notice is served, starts counting on the first of the next month, adds 30/60/90 days, and rounds up to the last day of that month. Confirm this reading of the statute.
6. **"Unit" label.** The address line always prints "Unit" before the apartment identifier, so a non-numbered unit prints as "Unit North Wing." Cosmetic, but it appears on a court form.

Also worth knowing for maintainers: on the holdover petition the 30/60/90 choices are three separate one-button fields matched to their printed labels by position on the page (see `src/petition.ts`). If the court reissues that form, the tests that read those buttons back will fail and the mapping must be rechecked.

## Run the tests

```
npm install
npm test
npm run test:ny    # same tests in America/New_York time, where daylight saving can matter
```

The tests are the most useful part of this repo. Before changing any date or deadline rule, add a test that shows the case you are fixing.

## What is not here

Accounts, payments, email, hosting, and anything tied to the live site stay private. This repo contains no secrets and should never be given any. See [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Changes to legal logic are reviewed carefully and may take time.

## License

[MIT](LICENSE). The name and domain "evictionforms.io" are not licensed for use by others.
