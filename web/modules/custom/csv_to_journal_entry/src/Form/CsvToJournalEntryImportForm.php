<?php

namespace Drupal\csv_to_journal_entry\Form;

use Drupal\Core\File\FileExists;
use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\file\Entity\File;
use Drupal\node\Entity\Node;

class CsvToJournalEntryImportForm extends FormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'csv_to_journal_entry_import_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $form['#cache']['max-age'] = 0;
    $form['#attributes']['enctype'] = 'multipart/form-data';

    $directory = 'temporary://csv_to_journal_entry/';
    \Drupal::service('file_system')->prepareDirectory(
      $directory,
      FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS
    );

    $tempstore = $this->getTempstore();

    if (!$tempstore->get('csv_fid') && $tempstore->get('importing_csv_fid')) {
      self::cleanupStoredFile('importing_csv_fid');
    }

    if ($tempstore->get('import_done')) {
      $form_state->set('preview_rows', NULL);
      $tempstore->delete('import_done');
      $form['message'] = [
        '#markup' => '<p>Import finished. Upload a new CSV file to continue.</p>',
      ];
    }

    $form['instructions'] = [
      '#type' => 'details',
      '#title' => $this->t('CSV format'),
      '#open' => TRUE,
    ];
    $form['instructions']['example'] = [
      '#markup' => '<p>Required columns: <code>amount</code>, <code>date</code>, <code>debit_account</code>, <code>credit_account</code>. Optional columns: <code>title</code>, <code>description</code>, <code>comment</code>. Field-style headers such as <code>field_amount</code> and <code>field_date</code> are also supported.</p>',
    ];

    $fid = $tempstore->get('csv_fid');

    if (!$fid) {
      $form['csv_file'] = [
        '#type' => 'file',
        '#title' => $this->t('Upload CSV file'),
        '#description' => $this->t('Select a CSV file and click "Upload and preview".'),
      ];

      $form['upload'] = [
        '#type' => 'submit',
        '#value' => $this->t('Upload and preview'),
        '#validate' => ['::validateUpload'],
        '#submit' => ['::uploadFile'],
      ];
    }

    if ($fid && ($file = File::load($fid))) {
      $filepath = \Drupal::service('file_system')->realpath($file->getFileUri());

      if ($form_state->get('preview_rows') === NULL) {
        $form_state->set('preview_rows', $this->processCsv($filepath));
      }

      $rows = $form_state->get('preview_rows') ?? [];

      if (!empty($rows)) {
        $form['preview'] = [
          '#type' => 'table',
          '#header' => [
            'title' => $this->t('Title'),
            'amount' => $this->t('Amount'),
            'date' => $this->t('Date'),
            'debit_account' => $this->t('Debit account'),
            'credit_account' => $this->t('Credit account'),
            'description' => $this->t('Description'),
            'comment' => $this->t('Comment'),
          ],
          '#empty' => $this->t('No valid rows found in the CSV.'),
        ];

        foreach (array_slice($rows, 0, 20) as $index => $row) {
          foreach (['title', 'amount', 'date', 'debit_account', 'credit_account', 'description', 'comment'] as $column) {
            $form['preview'][$index][$column] = [
              '#markup' => $row[$column] !== '' ? $row[$column] : '-',
            ];
          }
        }

        $form['confirm'] = [
          '#type' => 'submit',
          '#value' => $this->t('Confirm import'),
          '#button_type' => 'primary',
          '#submit' => ['::confirmImport'],
        ];
      }

      $form['reset'] = [
        '#type' => 'submit',
        '#value' => $this->t('Upload new file'),
        '#submit' => ['::resetForm'],
      ];
    }

    return $form;
  }

  /**
   * Validates the uploaded CSV file.
   */
  public function validateUpload(array &$form, FormStateInterface $form_state) {
    $directory = 'temporary://csv_to_journal_entry/';
    $upload = file_save_upload(
      'csv_file',
      ['FileExtension' => ['extensions' => 'csv']],
      $directory,
      0,
      FileExists::Rename
    );

    if ($upload === NULL) {
      $form_state->setErrorByName('csv_file', $this->t('Please upload a CSV file.'));
      return;
    }

    if ($upload === FALSE) {
      $form_state->setErrorByName('csv_file', $this->t('The uploaded CSV file could not be processed.'));
      return;
    }

    $form_state->set('uploaded_fid', $upload->id());
  }

  /**
   * Stores the uploaded file for preview/import.
   */
  public function uploadFile(array &$form, FormStateInterface $form_state) {
    $fid = $form_state->get('uploaded_fid');
    $tempstore = $this->getTempstore();

    if (!$fid) {
      $this->messenger()->addError($this->t('No file uploaded.'));
      return;
    }

    if ($file = File::load($fid)) {
      $previous_fid = $tempstore->get('csv_fid');

      if ($previous_fid && (int) $previous_fid !== (int) $fid) {
        self::cleanupStoredFile('csv_fid');
      }

      self::cleanupStoredFile('importing_csv_fid');
      $tempstore->delete('import_done');
      $tempstore->delete('existing_signatures');
      $tempstore->set('csv_fid', $file->id());
      $tempstore->set('csv_fid_owned', TRUE);

      $form_state->set('preview_rows', NULL);
      $form_state->setRebuild(TRUE);
    }
  }

  /**
   * Imports all previewed rows via Batch API.
   */
  public function confirmImport(array &$form, FormStateInterface $form_state) {
    $rows = $form_state->get('preview_rows') ?? [];

    if (empty($rows)) {
      $this->messenger()->addError($this->t('There is nothing to import.'));
      return;
    }

    $field_map = self::resolveJournalFieldMap();
    $missing_fields = array_filter([
      'amount' => $field_map['amount'] ? NULL : 'field_amount',
      'date' => $field_map['date'] ? NULL : 'field_date / field_data',
      'credit_account' => $field_map['credit_account'] ? NULL : 'field_credit_account',
      'debit_account' => $field_map['debit_account'] ? NULL : 'field_debit_account / field_debit_acount',
    ]);

    if (!empty($missing_fields)) {
      $this->messenger()->addError($this->t('The acc_journal_entry content type is missing required fields: @fields.', [
        '@fields' => implode(', ', $missing_fields),
      ]));
      return;
    }

    $tempstore = $this->getTempstore();
    $tempstore->set('existing_signatures', self::loadExistingSignatures($rows, $field_map));
    $fid = $tempstore->get('csv_fid');

    if ($fid) {
      $tempstore->set('importing_csv_fid', $fid);
      if ($tempstore->get('csv_fid_owned')) {
        $tempstore->set('importing_csv_fid_owned', TRUE);
      }
      $tempstore->delete('csv_fid');
      $tempstore->delete('csv_fid_owned');
    }

    $form_state->set('preview_rows', NULL);

    $batch = [
      'title' => $this->t('Importing journal entries...'),
      'operations' => [],
      'finished' => [self::class, 'batchFinished'],
    ];

    foreach ($rows as $row) {
      $batch['operations'][] = [
        [self::class, 'processRow'],
        [$row],
      ];
    }

    batch_set($batch);
    $response = batch_process(\Drupal\Core\Url::fromRoute('csv_to_journal_entry.form'));

    $form_state->setRebuild(FALSE);
    if ($response) {
      $form_state->setResponse($response);
    }
  }

  /**
   * Processes a single CSV row.
   */
  public static function processRow(array $row, array &$context) {
    try {
      $signature = self::buildSignature(
        $row['title'],
        $row['amount'],
        $row['date'],
        $row['debit_account'],
        $row['credit_account']
      );

      $existing_signatures = self::getStoredExistingSignatures();
      if (isset($existing_signatures[$signature])) {
        $context['results']['skipped'][] = $row['title'];
        return;
      }

      $field_map = self::resolveJournalFieldMap();

      $node = Node::create([
        'type' => 'acc_journal_entry',
        'title' => $row['title'],
        'status' => 1,
      ]);

      $node->set($field_map['amount'], $row['amount']);
      $node->set($field_map['date'], $row['date']);
      $node->set($field_map['credit_account'], ['target_id' => self::getOrCreateLedgerId($row['credit_account'])]);
      $node->set($field_map['debit_account'], ['target_id' => self::getOrCreateLedgerId($row['debit_account'])]);

      $text_format = self::resolveTextFormat();

      if ($field_map['description']) {
        $node->set($field_map['description'], [
          'value' => $row['description'],
          'format' => $text_format,
        ]);
      }

      if ($field_map['comment']) {
        $node->set($field_map['comment'], [
          'value' => $row['comment'],
          'format' => $text_format,
        ]);
      }

      $node->save();
      $context['results']['imported'][] = $row['title'];
    }
    catch (\Throwable $exception) {
      \Drupal::logger('csv_to_journal_entry')->error('CSV import failed for title "@title": @message', [
        '@title' => $row['title'] ?? 'Untitled',
        '@message' => $exception->getMessage(),
      ]);
      $context['results']['errors'][] = $row['title'] ?? 'Untitled';
    }
  }

  /**
   * Batch completion callback.
   */
  public static function batchFinished($success, array $results, array $operations) {
    self::cleanupStoredFile('importing_csv_fid');

    if (!$success) {
      self::getSharedTempstore()->delete('existing_signatures');
      \Drupal::messenger()->addError(t('The CSV import did not finish successfully.'));
      return;
    }

    $imported = count($results['imported'] ?? []);
    $errors = count($results['errors'] ?? []);
    $skipped = count($results['skipped'] ?? []);

    \Drupal::messenger()->addStatus(t('Imported @count journal entries.', ['@count' => $imported]));

    if ($skipped) {
      \Drupal::messenger()->addWarning(t('Skipped @count duplicate journal entries.', ['@count' => $skipped]));
    }

    if ($errors) {
      \Drupal::messenger()->addWarning(t('@count rows could not be imported. Check the logs for details.', [
        '@count' => $errors,
      ]));
    }

    self::getSharedTempstore()->delete('existing_signatures');
    self::getSharedTempstore()->set('import_done', TRUE);
  }

  /**
   * Resets the upload state.
   */
  public function resetForm(array &$form, FormStateInterface $form_state) {
    self::cleanupStoredFile('csv_fid');
    self::cleanupStoredFile('importing_csv_fid');
    $this->getTempstore()->delete('existing_signatures');
    $this->getTempstore()->delete('import_done');
    $form_state->set('preview_rows', NULL);
    $form_state->setRedirect('csv_to_journal_entry.form');
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    // Intentionally unused. The form uses custom submit handlers.
  }

  /**
   * Parses and validates a CSV file.
   */
  private function processCsv(string $filepath): array {
    $rows = [];
    $errors = [];
    $row_number = 1;
    $seen_signatures = [];

    if (($handle = fopen($filepath, 'r')) === FALSE) {
      $this->messenger()->addError($this->t('The CSV file could not be opened.'));
      return [];
    }

    $header = fgetcsv($handle);
    if (empty($header)) {
      fclose($handle);
      $this->messenger()->addError($this->t('The CSV header row is missing.'));
      return [];
    }

    $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]);
    $normalized_header = array_map([self::class, 'normalizeHeader'], $header);

    while (($csv_row = fgetcsv($handle)) !== FALSE) {
      $row_number++;

      if (empty(array_filter($csv_row, static fn($value) => trim((string) $value) !== ''))) {
        continue;
      }

      if (count($normalized_header) !== count($csv_row)) {
        $errors[] = (string) $this->t('Row @row was skipped because the column count does not match the header.', [
          '@row' => $row_number,
        ]);
        continue;
      }

      $row = array_combine($normalized_header, array_map('trim', $csv_row));
      $mapped_row = $this->mapCsvRow($row, $row_number, $errors);

      if ($mapped_row !== NULL) {
        $signature = self::buildSignature(
          $mapped_row['title'],
          $mapped_row['amount'],
          $mapped_row['date'],
          $mapped_row['debit_account'],
          $mapped_row['credit_account']
        );

        if (isset($seen_signatures[$signature])) {
          $errors[] = (string) $this->t('Row @row was skipped because it duplicates another row in the same CSV.', [
            '@row' => $row_number,
          ]);
          continue;
        }

        $seen_signatures[$signature] = TRUE;
        $rows[] = $mapped_row;
      }
    }

    fclose($handle);

    foreach (array_slice($errors, 0, 20) as $error) {
      $this->messenger()->addWarning($error);
    }

    return $rows;
  }

  /**
   * Maps one raw CSV row to the journal entry structure.
   */
  private function mapCsvRow(array $row, int $row_number, array &$errors): ?array {
    $amount = self::firstValue($row, ['amount', 'field_amount']);
    $date = self::firstValue($row, ['date', 'data', 'field_date', 'field_data']);
    $debit_account = self::firstValue($row, ['debit_account', 'debit_acount', 'field_debit_account', 'field_debit_acount']);
    $credit_account = self::firstValue($row, ['credit_account', 'field_credit_account']);
    $description = self::firstValue($row, ['description', 'field_description']) ?? '';
    $comment = self::firstValue($row, ['comment', 'field_comment']) ?? '';
    $title = self::firstValue($row, ['title']);

    if ($amount === NULL || $amount === '' || !is_numeric($amount)) {
      $errors[] = (string) $this->t('Row @row was skipped because amount is missing or not numeric.', [
        '@row' => $row_number,
      ]);
      return NULL;
    }

    if (empty($debit_account) || empty($credit_account)) {
      $errors[] = (string) $this->t('Row @row was skipped because debit or credit account is missing.', [
        '@row' => $row_number,
      ]);
      return NULL;
    }

    $normalized_date = self::normalizeCsvDate($date);
    if ($normalized_date === NULL) {
      $errors[] = (string) $this->t('Row @row was skipped because the date is invalid. Supported formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY.', [
        '@row' => $row_number,
      ]);
      return NULL;
    }

    $title = $title ?: self::buildGeneratedTitle($normalized_date, $debit_account, $credit_account, $amount);

    return [
      'title' => $title,
      'amount' => (string) $amount,
      'date' => $normalized_date,
      'debit_account' => $debit_account,
      'credit_account' => $credit_account,
      'description' => $description,
      'comment' => $comment,
    ];
  }

  /**
   * Creates or loads an accounting ledger node.
   */
  private static function getOrCreateLedgerId(string $title): int {
    $title = trim($title);
    $storage = \Drupal::entityTypeManager()->getStorage('node');
    $existing = $storage->loadByProperties([
      'type' => 'accounting_ledger',
      'title' => $title,
    ]);

    if ($ledger = reset($existing)) {
      return (int) $ledger->id();
    }

    $ledger = $storage->create([
      'type' => 'accounting_ledger',
      'title' => $title,
      'status' => 1,
    ]);
    $ledger->save();

    return (int) $ledger->id();
  }

  /**
   * Loads duplicate signatures for matching journal entries already in Drupal.
   */
  private static function loadExistingSignatures(array $rows, array $field_map): array {
    $titles = array_values(array_unique(array_map(static fn(array $row) => $row['title'], $rows)));

    if (empty($titles)) {
      return [];
    }

    $ids = \Drupal::entityQuery('node')
      ->condition('type', 'acc_journal_entry')
      ->condition('title', $titles, 'IN')
      ->accessCheck(FALSE)
      ->execute();

    if (empty($ids)) {
      return [];
    }

    $signatures = [];
    $nodes = \Drupal::entityTypeManager()->getStorage('node')->loadMultiple($ids);

    foreach ($nodes as $node) {
      $signature = self::buildNodeSignature($node, $field_map);
      if ($signature !== NULL) {
        $signatures[$signature] = TRUE;
      }
    }

    return $signatures;
  }

  /**
   * Resolves acc_journal_entry field names, including fallback variants.
   */
  private static function resolveJournalFieldMap(): array {
    static $field_map;

    if (isset($field_map)) {
      return $field_map;
    }

    $definitions = \Drupal::service('entity_field.manager')->getFieldDefinitions('node', 'acc_journal_entry');

    $field_map = [
      'amount' => isset($definitions['field_amount']) ? 'field_amount' : NULL,
      'comment' => isset($definitions['field_comment']) ? 'field_comment' : NULL,
      'date' => self::resolveFirstExistingField($definitions, ['field_date', 'field_data']),
      'description' => isset($definitions['field_description']) ? 'field_description' : NULL,
      'credit_account' => isset($definitions['field_credit_account']) ? 'field_credit_account' : NULL,
      'debit_account' => self::resolveFirstExistingField($definitions, ['field_debit_account', 'field_debit_acount']),
    ];

    return $field_map;
  }

  /**
   * Finds the first existing field name from a list of candidates.
   */
  private static function resolveFirstExistingField(array $definitions, array $candidates): ?string {
    foreach ($candidates as $candidate) {
      if (isset($definitions[$candidate])) {
        return $candidate;
      }
    }

    return NULL;
  }

  /**
   * Selects a usable text format for formatted text fields.
   */
  private static function resolveTextFormat(): string {
    static $format;

    if ($format !== NULL) {
      return $format;
    }

    $formats = \Drupal::entityTypeManager()->getStorage('filter_format')->loadMultiple();
    foreach (['basic_html', 'restricted_html', 'plain_text'] as $candidate) {
      if (isset($formats[$candidate])) {
        $format = $candidate;
        return $format;
      }
    }

    $format = (string) key($formats);
    return $format;
  }

  /**
   * Builds a duplicate-check signature for a row.
   */
  private static function buildSignature(string $title, string $amount, string $date, string $debit_account, string $credit_account): string {
    return implode('|', [
      self::normalizeText($title),
      self::normalizeAmount($amount),
      trim($date),
      self::normalizeText($debit_account),
      self::normalizeText($credit_account),
    ]);
  }

  /**
   * Builds a duplicate-check signature for an existing journal entry node.
   */
  private static function buildNodeSignature(Node $node, array $field_map): ?string {
    $amount_field = $field_map['amount'];
    $date_field = $field_map['date'];
    $debit_field = $field_map['debit_account'];
    $credit_field = $field_map['credit_account'];

    if (!$amount_field || !$date_field || !$debit_field || !$credit_field) {
      return NULL;
    }

    $debit_title = self::getReferencedNodeTitle($node, $debit_field);
    $credit_title = self::getReferencedNodeTitle($node, $credit_field);

    return self::buildSignature(
      $node->label(),
      (string) $node->get($amount_field)->value,
      (string) $node->get($date_field)->value,
      $debit_title,
      $credit_title
    );
  }

  /**
   * Returns the title of a referenced node field.
   */
  private static function getReferencedNodeTitle(Node $node, string $field_name): string {
    $entity = $node->get($field_name)->entity;
    return $entity ? (string) $entity->label() : '';
  }

  /**
   * Builds a title when the CSV does not include one.
   */
  private static function buildGeneratedTitle(string $date, string $debit_account, string $credit_account, string $amount): string {
    return sprintf(
      'Journal Entry %s | %s -> %s | %s',
      $date,
      trim($debit_account),
      trim($credit_account),
      trim($amount)
    );
  }

  /**
   * Normalizes a text value for duplicate matching.
   */
  private static function normalizeText(string $value): string {
    return strtolower(trim($value));
  }

  /**
   * Normalizes a decimal string for duplicate matching.
   */
  private static function normalizeAmount(string $amount): string {
    $amount = trim($amount);

    if ($amount === '' || !is_numeric($amount)) {
      return $amount;
    }

    $negative = str_starts_with($amount, '-') ? '-' : '';
    $amount = ltrim($amount, '+-');

    if (stripos($amount, 'e') !== FALSE) {
      $amount = sprintf('%.14F', (float) $amount);
    }

    [$integer, $fraction] = array_pad(explode('.', $amount, 2), 2, '');
    $integer = ltrim($integer, '0');
    $integer = $integer === '' ? '0' : $integer;
    $fraction = rtrim($fraction, '0');

    return $negative . $integer . ($fraction !== '' ? '.' . $fraction : '');
  }

  /**
   * Normalizes a CSV date string into Y-m-d.
   */
  private static function normalizeCsvDate(?string $value): ?string {
    $value = trim((string) $value);
    if ($value === '') {
      return NULL;
    }

    foreach (['Y-m-d', 'd/m/Y', 'm/d/Y', 'd-m-Y', 'm-d-Y'] as $format) {
      $date = \DateTimeImmutable::createFromFormat('!' . $format, $value);
      $errors = \DateTimeImmutable::getLastErrors();

      if (
        $date instanceof \DateTimeImmutable &&
        $date->format($format) === $value &&
        ($errors === FALSE || (($errors['warning_count'] ?? 0) === 0 && ($errors['error_count'] ?? 0) === 0))
      ) {
        return $date->format('Y-m-d');
      }
    }

    return NULL;
  }

  /**
   * Gets the first populated value from a row.
   */
  private static function firstValue(array $row, array $keys): ?string {
    foreach ($keys as $key) {
      if (isset($row[$key]) && trim((string) $row[$key]) !== '') {
        return trim((string) $row[$key]);
      }
    }

    return NULL;
  }

  /**
   * Normalizes CSV header names.
   */
  private static function normalizeHeader(string $header): string {
    $header = strtolower(trim($header));
    return preg_replace('/[^a-z0-9]+/', '_', $header) ?? '';
  }

  /**
   * Removes stored files tracked in tempstore.
   */
  private static function cleanupStoredFile(string $tempstore_key): void {
    $tempstore = self::getSharedTempstore();
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

  /**
   * Returns the tempstore collection used by the current user.
   */
  private function getTempstore() {
    return self::getSharedTempstore();
  }

  /**
   * Returns the tempstore collection used for import state.
   */
  private static function getSharedTempstore() {
    return \Drupal::service('tempstore.private')->get('csv_to_journal_entry');
  }

  /**
   * Returns the preloaded duplicate signatures stored for the import.
   */
  private static function getStoredExistingSignatures(): array {
    return self::getSharedTempstore()->get('existing_signatures') ?? [];
  }

}
