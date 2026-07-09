# Changelog

## [1.0.1] – 2026-02-02
### Summary
 Improvement on user experience and convenience. No impact on existing accounting data.

### Added
- Income Statement
- Date range filtering for reports

### Improved
- Ledger performance, 
    - Ledger item is linked to Journal entry. 
    - Dr or Cr account is visible on each item.
- Date range filtering and default date to financial year setting option


### Content Type
 - New content type 'Financial Year' is created
 - On Taxonomy term 'Account Types' 'Statement Type' field is added and populated all 
   the Account type with dropdown item 'Balance Sheet' or 'Income Statement'.


### Fixed
- No any fix required.

### Database Impact
- No schema changes
- No data migration required

### Update Notes
- Create Duplicate up and runing backup site. Very important.
- Create Content type 'Financial Year' [financial_year] 
    - Manage Fields
    - Date From [field_date_from] (Single, Required)
    - Date To [field_date_to] (Single, Required)
- Update Date Picking code on each page.
- Update Ledger Account linking href with NodeId.
- Update Ledger Account that Dr / Cr account is visible on each item.
- Update Ledget Total Amount Dr and Cr.