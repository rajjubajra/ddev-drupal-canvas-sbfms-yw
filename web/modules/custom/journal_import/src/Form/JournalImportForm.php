<?php

namespace Drupal\journal_import\Form;

use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\file\Entity\File;
use Drupal\node\Entity\Node;

class JournalImportForm extends FormBase {

  public function getFormId() {
    return 'journal_import_form';
  }

  public function validateUpload(array &$form, FormStateInterface $form_state) {

    $fid = $form_state->getValue('csv_file');

    if (empty($fid)) {
      $form_state->setErrorByName('csv_file', 'Please upload a CSV file.');
      return;
    }

    $file = File::load($fid[0] ?? NULL);

    if (!$file) {
      $form_state->setErrorByName('csv_file', 'Invalid file uploaded.');
      return;
    }

    $ext = strtolower(pathinfo($file->getFilename(), PATHINFO_EXTENSION));
    if ($ext !== 'csv') {
      $form_state->setErrorByName('csv_file', 'Only CSV files allowed.');
    }
  }

  public function buildForm(array $form, FormStateInterface $form_state) {

    $form['#cache']['max-age'] = 0;

    // Ensure upload directory exists.
    $directory = 'temporary://journal_import/';
    \Drupal::service('file_system')->prepareDirectory(
      $directory,
      FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS
    );

    // Tempstore.
    $tempstore = \Drupal::service('tempstore.private')->get('journal_import');

    // Clean up any file left behind by a finished or failed batch.
    if (!$tempstore->get('csv_fid') && $tempstore->get('importing_csv_fid')) {
      self::cleanupStoredFile('importing_csv_fid');
    }

    if ($tempstore->get('import_done')) {
      $form_state->set('preview_rows', NULL);
      $tempstore->delete('import_done');

      $form['message'] = [
        '#markup' => '<p>Import finished. Upload a new file to continue.</p>',
      ];
    }

    $form['csv_file'] = [
      '#type' => 'managed_file',
      '#title' => $this->t('Upload CSV File'),
      '#upload_location' => 'temporary://journal_import/',
      '#upload_validators' => [
        'file_validate_extensions' => ['csv'],
      ],
    ];

    $form['upload'] = [
      '#type' => 'submit',
      '#value' => $this->t('Upload & Preview'),
      '#validate' => ['::validateUpload'],
      '#submit' => ['::uploadFile'],
    ];

    $fid = $tempstore->get('csv_fid');

    if ($fid) {
      $file = File::load($fid);

      if ($file) {
        $filepath = \Drupal::service('file_system')->realpath($file->getFileUri());

        if ($form_state->get('preview_rows') === NULL) {
          $rows = $this->processCsv($filepath);
          $form_state->set('preview_rows', $rows);
        }

        $rows = $form_state->get('preview_rows');

        if (!empty($rows)) {
          $header = array_keys($rows[0]);

          $form['preview'] = [
            '#type' => 'table',
            '#header' => $header,
          ];

          foreach (array_slice($rows, 0, 20) as $i => $row) {
            foreach ($row as $key => $value) {
              $form['preview'][$i][$key] = [
                '#markup' => ($value !== '' && is_scalar($value)) ? $value : '-',
              ];
            }
          }

          $form['confirm'] = [
            '#type' => 'submit',
            '#value' => $this->t('Confirm Import'),
            '#submit' => ['::confirmImport'],
          ];

          $form['reset'] = [
            '#type' => 'submit',
            '#value' => 'Upload New File',
            '#submit' => ['::resetForm'],
          ];
        }
        else {
          $form['message'] = [
            '#markup' => '<p>No valid rows found in the CSV.</p>',
          ];
        }
      }
      else {
        self::cleanupStoredFile('csv_fid');
        $form['message'] = [
          '#markup' => '<p>Invalid file.</p>',
        ];
      }
    }

    return $form;
  }

  /**
   * Process CSV safely
   */
  private function processCsv($filepath) {

    $rows = [];
    $errors = [];
    $row_number = 1;
    $seen_titles = [];

    if (($handle = fopen($filepath, 'r')) !== FALSE) {

      $header = fgetcsv($handle);

      if (empty($header)) {
        \Drupal::messenger()->addError('CSV header is missing.');
        return [];
      }

      // Clean header (remove BOM)
      $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]);
      $header = array_map('trim', $header);

      $required = [
        'title',
        'amount',
        'date',
        'debit_account',
        'credit_account',
      ];

      foreach ($required as $col) {
        if (!in_array($col, $header)) {
          \Drupal::messenger()->addError("Missing column: $col");
          return [];
        }
      }

      while (($row = fgetcsv($handle)) !== FALSE) {
        $row_number++;

        if (empty(array_filter($row))) {
          continue;
        }

        if (count($header) !== count($row)) {
          $errors[] = "Row $row_number skipped: column mismatch";
          continue;
        }

        $data = array_combine($header, $row);
        $data = array_map('trim', $data);

        if (!is_numeric($data['amount'])) {
          $errors[] = "Row $row_number skipped: amount must be numeric";
          continue;
        }

        if (!$this->isValidCsvDate($data['date'])) {
          $errors[] = "Row $row_number skipped: invalid date format (expected YYYY-MM-DD)";
          continue;
        }

        if (empty($data['title'])) {
          $errors[] = "Row $row_number skipped: title required";
          continue;
        }

        $normalized_title = self::normalizeTitle($data['title']);
        if (isset($seen_titles[$normalized_title])) {
          $errors[] = "Row $row_number skipped: duplicate title in CSV";
          continue;
        }

        $seen_titles[$normalized_title] = TRUE;
        $rows[] = $data;
      }

      fclose($handle);
    }

    foreach (array_slice($errors, 0, 20) as $error) {
      \Drupal::messenger()->addWarning($error);
    }

    return $rows;
  }

  /**
   * Confirm import using Batch API
   */
  public function confirmImport(array &$form, FormStateInterface $form_state) {

    $rows = $form_state->get('preview_rows');
    $tempstore = \Drupal::service('tempstore.private')->get('journal_import');
    $fid = $tempstore->get('csv_fid');

    if (empty($rows)) {
      \Drupal::messenger()->addError('Nothing to import.');
      return;
    }

    // ✅ Clear preview BEFORE batch starts
    $form_state->set('preview_rows', NULL);

    // 🔥 Preload existing titles (FAST duplicate detection)
    $titles = array_column($rows, 'title');

    $existing = \Drupal::entityQuery('node')
      ->condition('type', 'acc_journal_entry')
      ->condition('title', $titles, 'IN')
      ->accessCheck(FALSE)
      ->execute();

    $existing_titles = [];

    if (!empty($existing)) {
      $nodes = Node::loadMultiple($existing);
      foreach ($nodes as $node) {
        $existing_titles[] = self::normalizeTitle($node->getTitle());
      }
    }

    if ($fid) {
      $was_uploaded_via_form = (bool) $tempstore->get('csv_fid_owned');
      $tempstore->set('importing_csv_fid', $fid);
      if ($was_uploaded_via_form) {
        $tempstore->set('importing_csv_fid_owned', TRUE);
      }
      $tempstore->delete('csv_fid');
      $tempstore->delete('csv_fid_owned');
    }

    $form_state->set('preview_rows', NULL);

    $batch = [
      'title' => 'Importing CSV...',
      'operations' => [],
      'finished' => [self::class, 'batchFinished'],
    ];

    foreach ($rows as $row) {
      $batch['operations'][] = [
        [self::class, 'processRow'],
        [$row, $existing_titles],
      ];
    }

    batch_set($batch);
    batch_process(\Drupal\Core\Url::fromRoute('journal_import.form'));

    $form_state->setRebuild(FALSE);
    $form_state->setRedirect('journal_import.form');

  }

  /**
   * Process each row (Batch)
   */
  public static function processRow($row, $existing_titles, &$context) {

    $title = trim($row['title']);
    $normalized_title = self::normalizeTitle($title);

    if (in_array($normalized_title, $existing_titles, TRUE)) {
      $context['results']['skipped'][] = $title;
      return;
    }

    try {

      $debit_id = self::getOrCreateLedgerStatic($row['debit_account']);
      $credit_id = self::getOrCreateLedgerStatic($row['credit_account']);

      $node = Node::create([
        'type'  => 'acc_journal_entry',
        'title' => $title,
        'field_amount' => floatval($row['amount']),
        'field_date'   => $row['date'],
        'field_debit_account'  => $debit_id,
        'field_credit_account' => $credit_id,
        'field_description' => trim($row['description'] ?? ''),
        'field_comment' => trim($row['comment'] ?? ''),
        'status' => 1,
      ]);

      $node->save();

      $context['results']['imported'][] = $title;

    } catch (\Exception $e) {
      \Drupal::logger('journal_import')->error('Error importing row: @error', ['@error' => $e->getMessage()]);
      $context['results']['errors'][] = $title;
    }
  }

  public function uploadFile(array &$form, FormStateInterface $form_state) {

    $fid = $form_state->getValue('csv_file')[0] ?? NULL;
    $tempstore = \Drupal::service('tempstore.private')->get('journal_import');

    if (!$fid) {
      \Drupal::messenger()->addError('No file uploaded.');
      return;
    }

    $file = File::load($fid);

    if ($file) {
      $previous_fid = $tempstore->get('csv_fid');
      if ($previous_fid && (int) $previous_fid !== (int) $fid) {
        self::cleanupStoredFile('csv_fid');
      }

      self::cleanupStoredFile('importing_csv_fid');
      $tempstore->delete('import_done');
      $tempstore->set('csv_fid', $fid);
      $tempstore->set('csv_fid_owned', TRUE);

      $form_state->setRebuild(TRUE);
    }
  }

  /**
   * Batch finished callback
   */
  public static function batchFinished($success, $results, $operations) {

    if ($success) {
      $count = count($results['imported'] ?? []);
      $skipped = count($results['skipped'] ?? []);
      $errors = count($results['errors'] ?? []);

      \Drupal::messenger()->addStatus("Imported: $count");
      if ($skipped > 0) {
        \Drupal::messenger()->addWarning("Skipped duplicates: $skipped");
      }
      if ($errors > 0) {
        \Drupal::messenger()->addWarning("Rows with errors: $errors");
      }

      $tempstore = \Drupal::service('tempstore.private')->get('journal_import');

      self::cleanupStoredFile('importing_csv_fid');
      $tempstore->set('import_done', TRUE);

    }
    else {
      self::cleanupStoredFile('importing_csv_fid');
      \Drupal::messenger()->addError('Import failed.');
    }
  }

  /**
   * Static ledger creation
   */
  private static function getOrCreateLedgerStatic($title) {

    if (empty(trim($title))) {
      return NULL;
    }

    $storage = \Drupal::entityTypeManager()->getStorage('node');

    $existing = $storage->loadByProperties([
      'type' => 'accounting_ledger',
      'title' => trim($title),
    ]);

    if ($ledger = reset($existing)) {
      return $ledger->id();
    }

    $ledger = $storage->create([
      'type' => 'accounting_ledger',
      'title' => trim($title),
      'status' => 1,
    ]);

    $ledger->save();

    return $ledger->id();
  }

  private function isValidCsvDate($date) {

    $parsed_date = \DateTime::createFromFormat('!Y-m-d', $date);
    $errors = \DateTime::getLastErrors();

    return $parsed_date
      && $parsed_date->format('Y-m-d') === $date
      && (($errors['warning_count'] ?? 0) === 0)
      && (($errors['error_count'] ?? 0) === 0);
  }

  private static function normalizeTitle($title) {
    return strtolower(trim((string) $title));
  }

  private static function cleanupStoredFile($tempstore_key) {

    $tempstore = \Drupal::service('tempstore.private')->get('journal_import');
    $fid = $tempstore->get($tempstore_key);
    $owned_key = $tempstore_key . '_owned';
    $delete_file = (bool) $tempstore->get($owned_key);

    if ($fid) {
      if ($delete_file && ($file = File::load($fid))) {
        $file->delete();
      }

      $tempstore->delete($tempstore_key);
    }

    $tempstore->delete($owned_key);
  }

  public function resetForm(array &$form, FormStateInterface $form_state) {

    self::cleanupStoredFile('csv_fid');
    self::cleanupStoredFile('importing_csv_fid');
    \Drupal::service('tempstore.private')->get('journal_import')->delete('import_done');
    $form_state->set('preview_rows', NULL);

    $form_state->setRedirect('journal_import.form');
  }

  public function submitForm(array &$form, FormStateInterface $form_state) {
    // Not used
  }

}
