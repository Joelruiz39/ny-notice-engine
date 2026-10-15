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
