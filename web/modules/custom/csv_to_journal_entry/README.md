# CSV to Journal Entry

This custom Drupal module imports CSV rows into `acc_journal_entry` nodes and automatically creates missing `accounting_ledger` nodes for debit and credit accounts.

## Access

- Admin route: `/admin/content/csv-to-journal-entry`
- Permission: `import csv to journal entry`

## Usage

1. Prepare a CSV file with one journal entry per row.
2. Visit the import page.
3. Upload the CSV and click **Upload and preview**.
4. Confirm the import after reviewing the preview.
5. If needed, click **Upload new file** to start over.

## Required CSV columns

The CSV must include these columns:

- `amount`
- `date` 
- `debit_account`
- `credit_account`

If you use field-style headers, the module also accepts:

- `field_amount`
- `field_date`
- `field_debit_account` or `field_debit_acount`
- `field_credit_account`

## Optional CSV columns

- `title`
- `description`
- `comment`

Optional field-style columns are also supported:

- `field_description`
- `field_comment`

## Header normalization

Header names are normalized by lowercasing and replacing non-alphanumeric characters with underscores. For example:

- `Amount` → `amount`
- `Debit Account` → `debit_account`

## Supported date formats

The importer accepts dates in these formats:

- `YYYY-MM-DD`
- `DD/MM/YYYY`
- `MM/DD/YYYY`
- `DD-MM-YYYY`
- `MM-DD-YYYY`

All dates are converted to `YYYY-MM-DD` before import.

## Row validation rules

A row is skipped if:

- `amount` is missing or not numeric
- `debit_account` or `credit_account` is missing
- the date cannot be normalized
- the CSV row has a different column count than the header

Duplicate rows are skipped in two ways:

- duplicate rows within the same CSV upload
- existing journal entries already stored in Drupal, based on title, amount, date, debit account, and credit account

## Field mapping requirements

The module expects the `acc_journal_entry` content type to have these field names:

- `field_amount`
- `field_date` 
- `field_debit_account` or `field_debit_acount`
- `field_credit_account`

Optional fields used when present:

- `field_description`
- `field_comment`

If a title value is missing in the CSV, the module generates one automatically using the date, debit account, credit account, and amount.

## Ledger creation

When importing a row, the module resolves the referenced debit and credit account titles. If a matching `accounting_ledger` node does not already exist, it creates one automatically.

## Preview and batch import

- The upload step validates and parses the CSV.
- A preview table displays the first 20 valid rows.
- Confirming the import launches a Batch API process.
- The Batch API imports all previewed rows and reports totals.

## Troubleshooting

- If the file cannot be opened, verify the CSV is valid and not empty.
- If rows are skipped, warnings appear on the import page.
- Detailed import failures are logged to Drupal's log system (`admin/reports/dblog`).
- To restart the workflow, use **Upload new file**.

## Example CSV

```csv
amount,date,debit_account,credit_account,title,description,comment
100.00,2026-07-08,Cash,Sales,Sale invoice 123,Sale of goods,Imported from CSV
200,08/07/2026,Bank,Revenue,Deposit,Deposit from customer
```

## Notes

- The import page uses temporary file storage at `temporary://csv_to_journal_entry/`.
- The module is designed for Drupal 10/11 and depends on `drupal:file`, `drupal:filter`, and `drupal:node`.
