<?php

namespace Drupal\journal_import\Service;

class CsvValidator {
    public function validate($file_path) {

      $required_headers = [
        'title',
        'date',
        'amount',
        'debit_account',
        'credit_account',
      ];

      $errors = [];
      $rows = [];

      if (($handle = fopen($file_path, 'r')) !== FALSE) {

        $headers = fgetcsv($handle);

        if (!$headers) {
          return [
            'errors' => ['CSV file is empty or invalid'],
            'rows' => [],
          ];
        }

        // Normalize headers
        $headers = array_map('trim', $headers);
        $headers = array_map('strtolower', $headers);

        // Check required headers
        foreach ($required_headers as $header) {
          if (!in_array($header, $headers)) {
            $errors[] = "Missing column: $header";
          }
        }

        $row_number = 1;

        while (($data = fgetcsv($handle)) !== FALSE) {
          $row_number++;

          // Skip empty rows
          if (empty(array_filter($data))) {
            continue;
          }

          // Prevent array_combine crash
          if (count($headers) !== count($data)) {
            $errors[] = "Row $row_number: Column count mismatch";
            continue;
          }

          $row = array_combine($headers, $data);

          // Validation
          if (empty($row['title'])) {
            $errors[] = "Row $row_number: Title is empty";
          }

          if (!is_numeric($row['amount'])) {
            $errors[] = "Row $row_number: Amount must be numeric";
          }

          if (empty($row['debit_account']) || empty($row['credit_account'])) {
            $errors[] = "Row $row_number: Debit/Credit missing";
          }

          $rows[] = $row;
        }

        fclose($handle);
      }

      return [
        'errors' => $errors,
        'rows' => $rows,
      ];
    }
}